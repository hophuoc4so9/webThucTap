import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import type { Cv } from "@/features/student/types";
import { getCvPrintBodyHtml } from "./helpers";

/** Style PDF CV — mẫu đẹp, chuyên nghiệp (header căn giữa, section gạch dưới, khoảng cách rõ) */
const PDF_CV_STYLE = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .pdf-cv { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; color: #1a1a1a; line-height: 1.55; }
  .pdf-header { text-align: center; margin-bottom: 22px; }
  .pdf-name { font-size: 24px; font-weight: 700; color: #000; letter-spacing: 0.04em; margin-bottom: 4px; line-height: 1.15; }
  .pdf-position { font-size: 12px; font-weight: 600; color: #000; margin-bottom: 10px; letter-spacing: 0.03em; }
  .contact-line { font-size: 11px; color: #333; margin-bottom: 4px; }
  .contact-sep { color: #888; margin: 0 6px; }
  .linkedin-line { font-size: 11px; color: #333; }
  .pdf-section { margin-bottom: 18px; }
  .pdf-section-title { font-size: 11px; font-weight: 700; color: #000; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1.2px solid #000; display: block; }
  .pdf-section-body { font-size: 11px; color: #2d2d2d; line-height: 1.55; }
  .pdf-p { margin: 0 0 8px; line-height: 1.55; }
  .pdf-pre { white-space: pre-wrap; line-height: 1.55; margin: 0; }
  .pdf-bullet-list { list-style: none; padding-left: 0; margin: 0; }
  .pdf-bullet-list li { position: relative; padding-left: 14px; margin-bottom: 6px; line-height: 1.5; }
  .pdf-bullet-list li::before { content: "•"; position: absolute; left: 0; font-weight: 700; color: #000; }
`;

/**
 * Xuất CV (text) thành file PDF — layout đẹp, dễ đọc.
 */
export async function exportCvToPdf(cv: Cv): Promise<void> {
  const container = document.createElement("div");
  const contentW = 595; // A4 210mm @ 72dpi equivalent for sharp text
  container.style.cssText = [
    "position:fixed; left:-9999px; top:0;",
    "width:" + contentW + "px;",
    "background:#fff; padding: 38px 44px;",
    "font-family: 'Segoe UI', Helvetica, Arial, sans-serif;",
    "font-size: 11px; color: #1a1a1a; line-height: 1.55;",
    "box-sizing: border-box;",
  ].join(" ");
  container.innerHTML = `<style>${PDF_CV_STYLE}</style>${getCvPrintBodyHtml(cv)}`;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: contentW + 72,
      width: contentW + 72,
    });
    const imgData = canvas.toDataURL("image/png", 1.0);
    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageW - margin * 2;
    const contentHeight = pageH - margin * 2;
    const imgRatio = canvas.height / canvas.width;
    let drawW = contentWidth;
    let drawH = contentWidth * imgRatio;
    if (drawH > contentHeight) {
      drawH = contentHeight;
      drawW = contentHeight / imgRatio;
    }
    const x = margin + (contentWidth - drawW) / 2;
    pdf.addImage(imgData, "PNG", x, margin, drawW, drawH);
    const baseName = (cv.title || cv.fullName || "CV").trim().replace(/[^a-zA-Z0-9\u00C0-\u024F\s-]/g, "").replace(/\s+/g, " ").slice(0, 60) || "CV";
    pdf.save(`${baseName}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
