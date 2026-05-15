from fastapi import FastAPI, BackgroundTasks
import os
import json
import pika

app = FastAPI(title="OCR Service")

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672//")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/verify-trigger")
def trigger_ocr(company_id: int, license_path: str):
    # This endpoint is just a helper if we want to trigger via HTTP
    connection = pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))
    channel = connection.channel()
    channel.queue_declare(queue="ocr_queue", durable=False)
    
    payload = {
        "pattern": "company_ocr_request",
        "data": {
            "companyId": company_id,
            "licensePath": license_path
        }
    }
    
    channel.basic_publish(
        exchange='',
        routing_key='ocr_queue',
        body=json.dumps(payload)
    )
    connection.close()
    return {"status": "queued", "companyId": company_id}
