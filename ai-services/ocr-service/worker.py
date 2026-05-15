import pika
import json
import os
import time
import requests
import easyocr
import cv2
import numpy as np
import re

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672//")
QUEUE_NAME = "ocr_queue"
RESULT_QUEUE = "job_queue"
UPLOADS_DIR = os.getenv("UPLOADS_DIR", "/uploads")

# Initialize EasyOCR reader for Vietnamese and English
reader = easyocr.Reader(['vi', 'en'])

def extract_business_info(image_path):
    print(f"Processing OCR for: {image_path}")
    if not os.path.exists(image_path):
        print(f"File not found: {image_path}")
        return None, None

    results = reader.readtext(image_path)
    # Join with newlines to help regex identify blocks
    full_text = "\n".join([res[1] for res in results])
    
    info = {
        "tax_code": None,
        "name_vn": None,
        "address": None,
        "charter_capital": None,
        "representative": None
    }

    # 1. Tax Code (Mã số doanh nghiệp/thuế)
    tax_code_match = re.search(r'(?:Mã số doanh nghiệp|Mã số thuế|Số doanh nghiệp):?\s*(\d{10}(?:\d{3})?)', full_text, re.IGNORECASE)
    if not tax_code_match:
        tax_code_match = re.search(r'\b(\d{10}(?:\d{3})?)\b', full_text)
    info["tax_code"] = tax_code_match.group(1) if tax_code_match else None

    # 2. Company Name (Tên công ty viết bằng tiếng Việt)
    # Search for "Tên công ty" then skip some lines until "Việt:" or similar
    name_match = re.search(r'Tên công ty.*?Việt:?\s*(.*?)(?:\n\s*\n|Tên công ty viết bằng tiếng nước ngoài|2\. Địa chỉ|$)', full_text, re.IGNORECASE | re.DOTALL)
    if not name_match:
        # Fallback: search for "CÔNG TY" after "Tên công ty"
        name_match = re.search(r'Tên công ty.*?\n\s*(CÔNG TY.*?)(?:\n\s*\n|Tên công ty viết bằng tiếng nước ngoài|2\. Địa chỉ|$)', full_text, re.IGNORECASE | re.DOTALL)
    
    if name_match:
        info["name_vn"] = name_match.group(1).strip().replace('\n', ' ')
        # Clean up double spaces
        info["name_vn"] = re.sub(r'\s+', ' ', info["name_vn"])

    # 3. Address (Địa chỉ trụ sở chính)
    # Match everything after "Địa chỉ trụ sở chính" or "2. Địa chỉ" until a line starting with a keyword
    address_match = re.search(r'(?:Địa chỉ trụ sở chính|2\. Địa chỉ):?\s*(.*?)(?:\n\s*(?:Điện thoại|Fax|Email|Website|3\. Vốn điều lệ)|$)', full_text, re.IGNORECASE | re.DOTALL)
    if address_match:
        addr = address_match.group(1).strip()
        # If the first line is just "trụ sở chính", skip it and look at next lines
        if addr.lower() == "trụ sở chính" or addr.lower().startswith("trụ sở chính"):
            # Re-run search but exclude the header line if it captured only that
            address_match_alt = re.search(r'(?:Địa chỉ trụ sở chính|2\. Địa chỉ).*?\n\s*(.*?)(?:\n\s*(?:Điện thoại|Fax|Email|Website|3\. Vốn điều lệ)|$)', full_text, re.IGNORECASE | re.DOTALL)
            if address_match_alt:
                addr = address_match_alt.group(1).strip()
        
        info["address"] = addr.replace('\n', ' ')
        info["address"] = re.sub(r'\s+', ' ', info["address"])

    # 4. Charter Capital (Vốn điều lệ)
    capital_match = re.search(r'Vốn điều lệ:?\s*([\d\.,\s]+)(?:đồng|$)', full_text, re.IGNORECASE)
    if capital_match:
        info["charter_capital"] = capital_match.group(1).strip()

    # 5. Representative (Người đại diện theo pháp luật - Họ và tên)
    rep_match = re.search(r'Họ và tên:?\s*([A-ZÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ\s]+)', full_text, re.IGNORECASE)
    if rep_match:
        info["representative"] = rep_match.group(1).strip()

    return info, full_text

def callback(ch, method, properties, body):
    try:
        data = json.loads(body)
        print(f"Received OCR task: {data}")
        
        # NestJS might send data in a different format if using Transport.RMQ
        # Usually it's { pattern: '...', data: { ... } }
        pattern = data.get('pattern')
        payload = data.get('data', data)
        
        if pattern == "cv_ocr_request":
            cv_id = payload.get('cvId')
            file_path = payload.get('filePath')
            if not file_path: return
            
            full_path = os.path.join(UPLOADS_DIR, file_path.replace('/api/uploads/', ''))
            _, raw_text = extract_business_info(full_path)
            
            if properties.reply_to:
                response_payload = {
                    "response": {"rawText": raw_text, "success": True},
                    "isDisposed": True
                }
                ch.basic_publish(
                    exchange='',
                    routing_key=properties.reply_to,
                    properties=pika.BasicProperties(correlation_id=properties.correlation_id),
                    body=json.dumps(response_payload)
                )
            return

        company_id = payload.get('companyId')
        license_path = payload.get('licensePath') 
        
        if not license_path:
            return

        full_path = os.path.join(UPLOADS_DIR, license_path.replace('/api/uploads/', ''))
        info, raw_text = extract_business_info(full_path)
        
        ocr_result_data = {
            "companyId": company_id,
            "taxCode": info["tax_code"] if info else None,
            "ocrData": json.dumps({
                "info": info,
                "raw": raw_text
            }, ensure_ascii=False) if info else None,
            "success": info["tax_code"] is not None if info else False
        }

        # Case 1: If this is a Request-Response from NestJS (e.g. analyze-license)
        if properties.reply_to:
            response_payload = {
                "response": ocr_result_data,
                "isDisposed": True
            }
            ch.basic_publish(
                exchange='',
                routing_key=properties.reply_to,
                properties=pika.BasicProperties(correlation_id=properties.correlation_id),
                body=json.dumps(response_payload)
            )
            print(f"Replied to {properties.reply_to} with correlation_id {properties.correlation_id}")
        
        # Case 2: Always emit event for Job Service to process and save
        event_payload = {
            "pattern": "company_ocr_result",
            "data": ocr_result_data
        }
        
        ch.basic_publish(
            exchange='',
            routing_key=RESULT_QUEUE,
            body=json.dumps(event_payload)
        )
        print(f"Emitted ocr_result event to {RESULT_QUEUE} for company {company_id}")
        
    except Exception as e:
        print(f"Error processing OCR: {e}")

def main():
    print("Connecting to RabbitMQ...")
    connection = None
    while not connection:
        try:
            connection = pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))
        except Exception as e:
            print(f"Waiting for RabbitMQ... {e}")
            time.sleep(5)

    channel = connection.channel()
    channel.queue_declare(queue=QUEUE_NAME, durable=False)
    channel.queue_declare(queue=RESULT_QUEUE, durable=False)

    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=callback, auto_ack=True)

    print(f"OCR Worker started. Waiting for messages in {QUEUE_NAME}...")
    channel.start_consuming()

if __name__ == "__main__":
    main()
