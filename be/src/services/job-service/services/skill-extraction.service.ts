import { Injectable } from "@nestjs/common";

type JobSkillSource = {
  title?: string | null;
  description?: string | null;
  field?: string | null;
  tagsRequirement?: string | null;
  industry?: string | null;
  requirement?: string | null;
};

type Candidate = {
  text: string;
  score: number;
};

/**
 * Extracts job skills with a lightweight local classifier.
 *
 * The crawler fields mix real skills with benefits, holidays, majors, and full
 * requirement sentences, so market trends should not treat every tag as a skill.
 */
@Injectable()
export class SkillExtractionService {
  private readonly maxSkillsPerJob = 12;

  private readonly hardSkillHints = [
    "api",
    "autocad",
    "aws",
    "azure",
    "báo cáo tài chính",
    "bê tông",
    "c#",
    "c++",
    "cad",
    "cơ khí",
    "css",
    "database",
    "docker",
    "excel",
    "fastapi",
    "figma",
    "git",
    "html",
    "java",
    "javascript",
    "kế toán",
    "kiểm toán",
    "kubernetes",
    "laravel",
    "linux",
    "machine learning",
    "misa",
    "node",
    "node.js",
    "photoshop",
    "php",
    "power bi",
    "python",
    "react",
    "sql",
    "thuế",
    "typescript",
    "ui/ux",
    "word",
  ];

  private readonly softSkillHints = [
    "bán hàng",
    "chăm sóc khách hàng",
    "đàm phán",
    "điều hành",
    "giao tiếp",
    "giải quyết vấn đề",
    "lãnh đạo",
    "lập kế hoạch",
    "phân tích",
    "quản lý dự án",
    "quản lý thời gian",
    "thuyết phục",
    "tư vấn",
  ];

  private readonly nonSkillPatterns = [
    /\b(chủ nhật|lễ tết|nghỉ|nghỉ phép|phúc lợi|bảo hiểm|du lịch|lương|thưởng)\b/i,
    /\b(nam|nữ|tuổi|sức khỏe|ngoại hình|ca làm|giờ làm|full-?time|part-?time)\b/i,
    /\b(đại học|cao đẳng|trung cấp|tốt nghiệp|bằng cấp|chứng chỉ|chuyên ngành)\b/i,
    /\b(kinh nghiệm|năm kinh nghiệm|tháng kinh nghiệm|trở lên|ưu tiên|yêu cầu)\b/i,
    /\b(có thể đi công tác|đi công tác|gắn bó lâu dài|chịu áp lực|chăm chỉ|trung thực)\b/i,
    /\b(cẩn thận|tỉ mỉ|nhiệt tình|năng động|vui vẻ|cởi mở|chủ động|trách nhiệm|quyết liệt)\b/i,
    /\b(nhà hàng|khách sạn|bất động sản|ngân hàng|giáo dục|làm đẹp|dịch vụ)\b/i,
    /^[\-\d\s().,/]+$/,
  ];

  private readonly sentenceNoisePatterns = [
    /\b(có khả năng|có kiến thức|nắm vững|sử dụng thành thạo|thành thạo|biết|am hiểu)\b/i,
    /\b(làm việc|công việc|nhiệm vụ|qui định|quy định|hồ sơ|báo cáo theo)\b/i,
  ];

  extractSkillsFromJob(jobData: JobSkillSource): string[] {
    const candidates: Candidate[] = [];

    for (const tag of this.parseStructuredField(jobData.tagsRequirement)) {
      candidates.push({ text: tag, score: 2.2 });
    }

    for (const phrase of this.extractFromRequirement(jobData.requirement)) {
      candidates.push({ text: phrase, score: 1.7 });
    }

    for (const phrase of this.extractFromRequirement(jobData.description)) {
      candidates.push({ text: phrase, score: 0.8 });
    }

    // Field/industry are context for filtering majors, not skill candidates.

    const merged = new Map<string, Candidate>();
    for (const candidate of candidates) {
      const normalized = this.normalize(candidate.text);
      if (!normalized || !this.looksLikeSkill(candidate.text, false)) continue;

      const canonical = this.canonicalize(candidate.text);
      const key = this.normalize(canonical);
      const current = merged.get(key);
      if (!current || candidate.score > current.score) {
        merged.set(key, { text: canonical, score: candidate.score + this.skillHintScore(canonical) });
      } else {
        current.score += 0.2;
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score || a.text.localeCompare(b.text, "vi"))
      .slice(0, this.maxSkillsPerJob)
      .map((candidate) => candidate.text);
  }

  private parseStructuredField(value?: string | null): string[] {
    if (!value) return [];
    const trimmed = value.trim();
    if (!trimmed) return [];

    const parsed = this.tryParseJsonArray(trimmed);
    const rawItems = parsed ?? [trimmed];

    return rawItems
      .flatMap((item) => String(item).split(/[;|•\n\r\t]+/g))
      .flatMap((item) => this.splitLooseList(item))
      .map((item) => this.clean(item))
      .filter(Boolean);
  }

  private tryParseJsonArray(value: string): unknown[] | null {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private splitLooseList(value: string): string[] {
    const normalized = value.replace(/\s+-\s+/g, "\n").replace(/^[\s\-–+*]+/, "");
    if (!normalized.includes(",")) return [normalized];

    return normalized
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }

  private extractFromRequirement(value?: string | null): string[] {
    if (!value) return [];

    const phrases: string[] = [];
    const chunks = value
      .replace(/<[^>]+>/g, " ")
      .split(/[.\n;•]+/g)
      .map((chunk) => this.clean(chunk))
      .filter((chunk) => chunk.length >= 3 && chunk.length <= 160);

    for (const chunk of chunks) {
      const direct = this.extractKnownSkills(chunk);
      phrases.push(...direct);

      if (direct.length > 0) continue;

      const afterSkillMarker = chunk.match(
        /(?:kỹ năng|ky nang|thành thạo|sử dụng|am hiểu|nắm vững|kiến thức về)\s+(.+)/i,
      )?.[1];
      if (afterSkillMarker) {
        phrases.push(...this.splitLooseList(afterSkillMarker).map((item) => this.clean(item)));
      }
    }

    return phrases;
  }

  private extractKnownSkills(text: string): string[] {
    const normalized = this.normalize(text);
    const hints = [...this.hardSkillHints, ...this.softSkillHints];
    return hints.filter((hint) => normalized.includes(this.normalize(hint)));
  }

  private looksLikeSkill(value: string, allowDomainSkill: boolean): boolean {
    const text = this.clean(value);
    const normalized = this.normalize(text);
    if (!normalized || normalized.length < 2 || normalized.length > 55) return false;
    if (normalized.split(" ").length > 6) return false;
    if (
      /\b(chu nhat|le tet|nghi|phuc loi|bao hiem|du lich|luong|thuong|uu the)\b/i.test(normalized) ||
      /\b(dai hoc|cao dang|trung cap|tot nghiep|bang cap|chung chi|chuyen nganh|nganh|cong nghe ky thuat)\b/i.test(normalized)
    ) {
      return false;
    }

    for (const pattern of this.nonSkillPatterns) {
      if (pattern.test(normalized) || pattern.test(text)) return false;
    }

    const hintScore = this.skillHintScore(text);
    if (hintScore > 0) return true;

    if (this.sentenceNoisePatterns.some((pattern) => pattern.test(normalized))) return false;
    if (/[a-z0-9][+#.]?/i.test(text) && normalized.length <= 35) return true;

    return allowDomainSkill && /\b(kế toán|thuế|bê tông|cơ khí|ô tô|xây dựng|pccc|điện|marketing)\b/i.test(normalized);
  }

  private skillHintScore(value: string): number {
    const normalized = this.normalize(value);
    if (this.hardSkillHints.some((hint) => normalized.includes(this.normalize(hint)))) return 2;
    if (this.softSkillHints.some((hint) => normalized.includes(this.normalize(hint)))) return 1;
    return 0;
  }

  private canonicalize(value: string): string {
    const text = this.clean(value);
    const normalized = this.normalize(text);
    const known = [...this.hardSkillHints, ...this.softSkillHints].find((hint) =>
      normalized.includes(this.normalize(hint)),
    );
    if (known) return this.titleTechSkill(known);
    return text.replace(/^[-–+*\s]+/, "").replace(/\s+/g, " ").trim();
  }

  private titleTechSkill(value: string): string {
    const exactUpper = new Set(["api", "aws", "azure", "cad", "css", "html", "pccc", "php", "sql", "ui/ux"]);
    const normalized = value.toLowerCase();
    if (exactUpper.has(normalized)) return normalized.toUpperCase();
    if (normalized === "node.js") return "Node.js";
    if (normalized === "c#") return "C#";
    if (normalized === "c++") return "C++";
    if (normalized === "excel") return "Excel";
    if (normalized === "word") return "Word";
    return value;
  }

  private clean(value: string): string {
    return value
      .replace(/\s+/g, " ")
      .replace(/^[\s\-–+*:/()]+/, "")
      .replace(/[\s\-–*:/(]+$/, "")
      .trim();
  }

  private normalize(value: string): string {
    return this.clean(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9#+./\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}
