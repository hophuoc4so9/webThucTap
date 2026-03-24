import type { Cv } from "@/features/student/types";

export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export const FILE_COLOR: Record<string, string> = {
  pdf: "bg-red-50 text-red-600",
  doc: "bg-blue-50 text-blue-600",
  docx: "bg-blue-50 text-blue-600",
};

export const fileExt = (name?: string) =>
  name?.split(".").pop()?.toLowerCase() ?? "";

/** Chuẩn bị mảng skills từ CV */
export const getCvSkills = (cv: Cv): string[] => {
  try {
    return JSON.parse(cv.skills ?? "[]") as string[];
  } catch {
    return cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  }
};

/** Chuẩn bị mảng experience từ CV */
export const getCvExperiences = (cv: Cv): string[] => {
  try {
    const p = JSON.parse(cv.experience ?? "[]");
    return Array.isArray(p) ? p : [];
  } catch {
    return cv.experience ? [cv.experience] : [];
  }
};

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** HTML nội dung CV — định dạng theo mẫu chuẩn (tên hoa, contact ⋄, OBJECTIVE / EDUCATION / SKILLS / EXPERIENCE / PROJECTS) */
export const getCvPrintBodyHtml = (cv: Cv): string => {
  const skills = getCvSkills(cv);
  const experiences = getCvExperiences(cv);
  const rawName = cv.fullName || cv.title || "Hồ sơ xin việc";
  const name = escapeHtml(rawName).toUpperCase();
  const rawPosition = cv.jobPosition || "";
  const position = rawPosition ? escapeHtml(rawPosition).toUpperCase() : "";
  const contactParts: string[] = [];
  if (cv.phone) contactParts.push(`<span class="contact-item">${escapeHtml(cv.phone)}</span>`);
  if (cv.contactEmail) contactParts.push(`<span class="contact-item">${escapeHtml(cv.contactEmail)}</span>`);
  if (cv.address) contactParts.push(`<span class="contact-item">${escapeHtml(cv.address)}</span>`);
  const contactLine = contactParts.length
    ? `<div class="contact-line">${contactParts.join('<span class="contact-sep"> ◇ </span>')}</div>`
    : "";
  const linkedInLine = cv.linkedIn
    ? `<div class="linkedin-line">LinkedIn: ${escapeHtml(cv.linkedIn)}</div>`
    : "";

  const section = (title: string, body: string) =>
    body ? `<section class="pdf-section"><h2 class="pdf-section-title">${escapeHtml(title)}</h2><div class="pdf-section-body">${body}</div></section>` : "";

  const summaryBody = cv.summary ? `<p class="pdf-p">${escapeHtml(cv.summary).replace(/\n/g, "<br>")}</p>` : "";
  const skillsBody = skills.length
    ? `<ul class="pdf-bullet-list">${skills.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`
    : "";
  const educationBody = cv.education ? `<p class="pdf-p">${escapeHtml(cv.education).replace(/\n/g, "<br>")}</p>` : "";
  const expBody = experiences.length
    ? `<ul class="pdf-bullet-list">${experiences.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>`
    : "";
  const projectBody = cv.projectExperience
    ? `<div class="pdf-pre">${escapeHtml(cv.projectExperience).replace(/\n/g, "<br>")}</div>`
    : "";

  return `
  <div class="pdf-cv pdf-cv-template">
    <header class="pdf-header">
      <h1 class="pdf-name">${name}</h1>
      ${position ? `<p class="pdf-position">${position}</p>` : ""}
      ${contactLine}
      ${linkedInLine}
    </header>
    ${section("OBJECTIVE", summaryBody)}
    ${section("EDUCATION", educationBody)}
    ${section("SKILLS", skillsBody)}
    ${section("EXPERIENCE", expBody)}
    ${section("PROJECTS", projectBody)}
  </div>
  `;
};

/** Object giống Cv từ state form — dùng cho xem trước khi sửa */
export const formStateToCv = (state: {
  fullName: string;
  jobPosition: string;
  phone: string;
  contactEmail: string;
  address: string;
  linkedIn: string;
  title: string;
  summary: string;
  skills: string[];
  education: string;
  experience: string[];
  projectExperience: string;
}): Pick<Cv, "fullName" | "jobPosition" | "phone" | "contactEmail" | "address" | "linkedIn" | "title" | "summary" | "skills" | "education" | "experience" | "projectExperience"> => ({
  fullName: state.fullName,
  jobPosition: state.jobPosition,
  phone: state.phone,
  contactEmail: state.contactEmail,
  address: state.address,
  linkedIn: state.linkedIn,
  title: state.title,
  summary: state.summary,
  skills: JSON.stringify(state.skills),
  education: state.education,
  experience: JSON.stringify(state.experience),
  projectExperience: state.projectExperience,
});

/** Style chung cho khung xem CV (view + edit preview) — document, section gạch dưới */
export const VIEW_CV_STYLE = `
  .cv-view-document { font-family: 'Times New Roman', 'Segoe UI', serif; color: #1a1a1a; line-height: 1.5; max-width: 210mm; margin: 0 auto; padding: 24px 28px; background: #fff; min-height: 60vh; }
  .pdf-cv { line-height: 1.55; }
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
  @media print { .cv-view-header { display: none !important; } .cv-view-document { box-shadow: none; } }
`;

/** Full HTML document cho CV (in / iframe) — mẫu đẹp, chuyên nghiệp */
export const getCvPrintFullHtml = (cv: Cv): string => {
  const style = `
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Segoe UI',Helvetica,Arial,sans-serif;max-width:595px;margin:0 auto;padding:36px 40px;color:#1a1a1a;font-size:11px;line-height:1.5;-webkit-font-smoothing:antialiased;}
    .pdf-cv-template{line-height:1.55;}
    .pdf-header{text-align:center;margin-bottom:22px;padding-bottom:0;}
    .pdf-name{font-size:24px;font-weight:700;color:#000;letter-spacing:0.04em;margin-bottom:4px;line-height:1.15;}
    .pdf-position{font-size:12px;font-weight:600;color:#000;margin-bottom:10px;letter-spacing:0.03em;}
    .contact-line{font-size:11px;color:#333;margin-bottom:4px;}
    .contact-sep{color:#888;font-weight:400;margin:0 6px;}
    .linkedin-line{font-size:11px;color:#333;}
    .pdf-section{margin-bottom:18px;}
    .pdf-section-title{font-size:11px;font-weight:700;color:#000;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;padding-bottom:4px;border-bottom:1.2px solid #000;display:block;}
    .pdf-section-body{font-size:11px;color:#2d2d2d;line-height:1.55;}
    .pdf-p{margin:0 0 8px;line-height:1.55;}
    .pdf-pre{white-space:pre-wrap;line-height:1.55;margin:0;}
    .pdf-bullet-list{list-style:none;padding-left:0;margin:0;}
    .pdf-bullet-list li{position:relative;padding-left:14px;margin-bottom:6px;line-height:1.5;}
    .pdf-bullet-list li::before{content:"•";position:absolute;left:0;font-weight:700;color:#000;}
    @media print{body{padding:24px 32px;} .pdf-section{margin-bottom:16px;}}
  `;
  const title = (cv.title || cv.fullName || "CV").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>${title}</title><style>${style}</style></head><body>${getCvPrintBodyHtml(cv)}</body></html>`;
};
