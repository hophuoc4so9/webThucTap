import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import type { Cv } from "@/features/student/types";
import { getCvPrintBodyHtml } from "./helpers";

// ─── Design tokens ────────────────────────────────────────────────────────────
const COLORS = {
  ink: "#1a2332",
  muted: "#4a5568",
  subtle: "#718096",
  accent: "#1a56db",
  accentLight: "#ebf5ff",
  accentDark: "#1e40af",
  line: "#e2e8f0",
  bg: "#ffffff",
  sidebarBg: "#f0f4ff",
};

// ─── PDF layout config ────────────────────────────────────────────────────────
const A4_W_PX = 794;   // A4 width  @ 96dpi
const A4_H_PX = 1123;  // A4 height @ 96dpi
const PADDING = 48;
const SIDEBAR_W = 192;
const MAIN_W = A4_W_PX - SIDEBAR_W - PADDING * 2 - 16; // gap 16px

// ─── Stylesheet ───────────────────────────────────────────────────────────────
const PDF_CV_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Playfair+Display:wght@700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ink:         ${COLORS.ink};
    --muted:       ${COLORS.muted};
    --subtle:      ${COLORS.subtle};
    --accent:      ${COLORS.accent};
    --accent-d:    ${COLORS.accentDark};
    --accent-l:    ${COLORS.accentLight};
    --line:        ${COLORS.line};
    --sidebar-bg:  ${COLORS.sidebarBg};
  }

  /* ── Root wrapper ── */
  .pdf-cv {
    font-family: 'Lato', 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    color: var(--ink);
    line-height: 1.65;
    background: #fff;
    width: ${A4_W_PX}px;
  }

  /* ── Page wrapper: side-by-side sidebar + main ── */
  .pdf-page {
    display: flex;
    min-height: ${A4_H_PX}px;
    position: relative;
  }

  /* ── Left sidebar ── */
  .pdf-sidebar {
    width: ${SIDEBAR_W}px;
    flex-shrink: 0;
    background: var(--sidebar-bg);
    padding: ${PADDING}px 20px ${PADDING}px 24px;
    border-right: 2px solid var(--accent);
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* ── Main content ── */
  .pdf-main {
    flex: 1;
    padding: ${PADDING}px ${PADDING}px ${PADDING}px 28px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* ── Header (inside main) ── */
  .pdf-name {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 28px;
    font-weight: 700;
    color: var(--ink);
    line-height: 1.15;
    letter-spacing: -0.01em;
    margin-bottom: 4px;
  }

  .pdf-position {
    font-size: 11.5px;
    font-weight: 700;
    color: var(--accent);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .pdf-header-divider {
    height: 2px;
    background: linear-gradient(90deg, var(--accent) 0%, var(--line) 100%);
    border-radius: 2px;
    margin-bottom: 0;
  }

  /* ── Contact in sidebar ── */
  .contact-block { display: flex; flex-direction: column; gap: 6px; }

  .contact-item {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    font-size: 10px;
    color: var(--muted);
    line-height: 1.4;
    word-break: break-all;
  }

  .contact-icon {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    margin-top: 1px;
    fill: var(--accent);
  }

  /* ── Section label (sidebar & main) ── */
  .pdf-section { display: flex; flex-direction: column; gap: 8px; }

  .pdf-section-title {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--accent);
    padding-bottom: 5px;
    border-bottom: 1.5px solid var(--accent);
  }

  /* Sidebar section title — slightly different */
  .pdf-sidebar .pdf-section-title {
    font-size: 9px;
    color: var(--accent-d);
    border-bottom-color: var(--accent-d);
  }

  /* ── Body text ── */
  .pdf-section-body {
    font-size: 10.5px;
    color: var(--ink);
    line-height: 1.65;
  }

  .pdf-p { margin-bottom: 6px; }
  .pdf-pre { white-space: pre-wrap; margin: 0; }

  /* ── Bullet list ── */
  .pdf-bullet-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }

  .pdf-bullet-list li {
    position: relative;
    padding-left: 13px;
    font-size: 10.5px;
    line-height: 1.55;
    color: var(--ink);
  }

  .pdf-bullet-list li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 6px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--accent);
  }

  /* ── Entry block (experience / education) ── */
  .pdf-entry { margin-bottom: 12px; }
  .pdf-entry:last-child { margin-bottom: 0; }

  .pdf-entry-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
  .pdf-entry-title { font-size: 11px; font-weight: 700; color: var(--ink); }
  .pdf-entry-date { font-size: 9.5px; color: var(--subtle); white-space: nowrap; margin-left: 8px; flex-shrink: 0; }
  .pdf-entry-sub { font-size: 10px; font-weight: 700; color: var(--accent); margin-bottom: 4px; }
  .pdf-entry-desc { font-size: 10.5px; color: var(--muted); line-height: 1.55; }

  /* ── Skills chips ── */
  .pdf-skills { display: flex; flex-wrap: wrap; gap: 5px; }

  .pdf-skill-chip {
    background: var(--accent-l);
    color: var(--accent-d);
    font-size: 9.5px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 100px;
    letter-spacing: 0.03em;
    white-space: nowrap;
  }

  /* Sidebar skills: smaller, full-width */
  .pdf-sidebar .pdf-skills { flex-direction: column; gap: 4px; }

  .pdf-sidebar .pdf-skill-chip {
    border-radius: 4px;
    font-size: 9.5px;
    background: #fff;
    color: var(--accent-d);
    border-left: 3px solid var(--accent);
    padding: 2px 6px;
    width: 100%;
  }

  /* ── Avatar circle ── */
  .pdf-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: var(--accent);
    color: #fff;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 28px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 4px;
    letter-spacing: -0.02em;
    border: 3px solid var(--accent-d);
  }

  /* ── Footer watermark (subtle) ── */
  .pdf-footer {
    text-align: center;
    font-size: 8.5px;
    color: var(--line);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding-top: 8px;
    margin-top: auto;
  }
`;

// ─── HTML template builder ────────────────────────────────────────────────────
/**
 * Build a full-page HTML string for the CV.
 * Accepts the raw body HTML from getCvPrintBodyHtml() in `.pdf-cv-template`
 * but we reconstruct it here into the sidebar/main 2-col layout.
 *
 * NOTE: If your getCvPrintBodyHtml() returns structured JSON/data you can
 * replace the placeholder below with real field rendering.
 */
function buildCvHtml(cv: Cv): string {
  // Derive initials for avatar
  const initials = (cv.fullName ?? "CV")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  // Use the existing helper for body content
  const legacyBody = getCvPrintBodyHtml(cv);

  return `
    <div class="pdf-cv">
      <div class="pdf-page">

        <!-- ── Sidebar ── -->
        <aside class="pdf-sidebar">
          <!-- Avatar -->
          <div class="pdf-avatar">${initials}</div>

          <!-- Contact -->
          <div class="pdf-section">
            <div class="pdf-section-title">Liên hệ</div>
            <div class="contact-block">
              ${cv.email ? `
              <div class="contact-item">
                <svg class="contact-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                <span>${cv.email}</span>
              </div>` : ""}
              ${cv.phone ? `
              <div class="contact-item">
                <svg class="contact-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
                </svg>
                <span>${cv.phone}</span>
              </div>` : ""}
              ${cv.address ? `
              <div class="contact-item">
                <svg class="contact-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <span>${cv.address}</span>
              </div>` : ""}
              ${cv.linkedinUrl ? `
              <div class="contact-item">
                <svg class="contact-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                </svg>
                <span style="word-break:break-all">${cv.linkedinUrl}</span>
              </div>` : ""}
              ${cv.githubUrl ? `
              <div class="contact-item">
                <svg class="contact-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
                </svg>
                <span style="word-break:break-all">${cv.githubUrl}</span>
              </div>` : ""}
            </div>
          </div>

          <!-- Skills (sidebar) — rendered from legacy body if needed -->
          <!-- Placeholder: add your skills section here using cv.skills -->

          <div class="pdf-footer">CV · ${new Date().getFullYear()}</div>
        </aside>

        <!-- ── Main content ── -->
        <main class="pdf-main">
          <!-- Header -->
          <div>
            <div class="pdf-name">${cv.fullName ?? ""}</div>
            ${cv.title ? `<div class="pdf-position">${cv.title}</div>` : ""}
            <div class="pdf-header-divider"></div>
          </div>

          <!-- Legacy body content rendered here -->
          <div class="pdf-cv-template pdf-section-body">
            ${legacyBody}
          </div>
        </main>

      </div>
    </div>
  `;
}

// ─── Multi-page canvas → PDF ──────────────────────────────────────────────────
async function canvasToPdf(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageW_mm = pdf.internal.pageSize.getWidth();   // 210mm
  const pageH_mm = pdf.internal.pageSize.getHeight();  // 297mm
  const margin_mm = 0; // bleed to edge — change to 8 for margins

  const contentW_mm = pageW_mm - margin_mm * 2;
  const contentH_mm = pageH_mm - margin_mm * 2;

  // px per mm in the canvas
  const pxPerMm = canvas.width / pageW_mm;
  const pageH_px = Math.round(contentH_mm * pxPerMm);
  const totalH_px = canvas.height;
  const totalPages = Math.ceil(totalH_px / pageH_px);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage();

    const srcY = page * pageH_px;
    const srcH = Math.min(pageH_px, totalH_px - srcY);

    // Slice the canvas into a temp canvas for this page
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = srcH;
    const ctx = slice.getContext("2d")!;
    ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

    const imgData = slice.toDataURL("image/png", 1.0);
    const sliceH_mm = (srcH / pxPerMm);

    pdf.addImage(imgData, "PNG", margin_mm, margin_mm, contentW_mm, sliceH_mm);
  }

  pdf.save(filename);
}

// ─── Public export function ───────────────────────────────────────────────────
/**
 * Export a CV to a polished, multi-page PDF.
 * Drop-in replacement for the old exportCvToPdf().
 */
export async function exportCvToPdf(cv: Cv): Promise<void> {
  // 1. Build container
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed; left:-9999px; top:0; background:#fff; " +
    `width:${A4_W_PX}px; overflow:visible;`;

  container.innerHTML = `<style>${PDF_CV_STYLE}</style>${buildCvHtml(cv)}`;
  document.body.appendChild(container);

  try {
    // 2. Render to canvas (2× scale for sharpness)
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: A4_W_PX,
      windowWidth: A4_W_PX,
    });

    // 3. Safe filename
    const baseName = (cv.title || cv.fullName || "CV")
      .trim()
      .replace(/[^a-zA-Z0-9\u00C0-\u024F\s\-_]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 60) || "CV";

    // 4. Slice canvas into pages and build PDF
    await canvasToPdf(canvas, `${baseName}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}