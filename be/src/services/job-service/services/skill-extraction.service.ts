import { Injectable, Logger } from "@nestjs/common";

/**
 * Simple skill extraction from database fields.
 * Just parse structured fields and keep Vietnamese diacritics as-is.
 * No hardcoded aliases or blacklists - data-driven approach.
 */
@Injectable()
export class SkillExtractionService {
  private readonly logger = new Logger(SkillExtractionService.name);

  // Only filter truly generic stopwords
  private readonly STOPWORDS = new Set([
    // English
    "and", "or", "the", "a", "an", "with", "from", "for", "to", "of", "in", "by",
    "is", "are", "be", "been", "being", "have", "has", "do", "does",
    // Common non-skills
    "required", "requirement", "benefit", "job", "position", "team", "company",
    "experience", "ability", "skill", "knowledge", "work", "working",
  ]);

  /**
   * Extract skills directly from database fields
   * Keep Vietnamese diacritics, filter only obvious junk
   */
  extractSkillsFromJob(jobData: {
    field?: string | null;
    tagsRequirement?: string | null;
    industry?: string | null;
    requirement?: string | null;
  }): string[] {
    const skillsMap = new Map<string, number>(); // skill -> frequency/priority

    // 1. Parse field (highest priority - directly categorized)
    if (jobData.field) {
      const skills = this.parseDelimitedField(jobData.field);
      for (const skill of skills) {
        if (!this.isStopword(skill)) {
          skillsMap.set(skill, (skillsMap.get(skill) || 0) + 3); // +3 weight
        }
      }
    }

    // 2. Parse tags_requirement (high priority)
    if (jobData.tagsRequirement) {
      const skills = this.parseDelimitedField(jobData.tagsRequirement);
      for (const skill of skills) {
        if (!this.isStopword(skill)) {
          skillsMap.set(skill, (skillsMap.get(skill) || 0) + 2); // +2 weight
        }
      }
    }

    // 3. Parse industry (if provided)
    if (jobData.industry) {
      const skill = jobData.industry.trim();
      if (!this.isStopword(skill)) {
        skillsMap.set(skill, (skillsMap.get(skill) || 0) + 1);
      }
    }

    // 4. Extract from requirement text (lower priority)
    if (jobData.requirement && skillsMap.size < 5) {
      const extracted = this.extractFromText(jobData.requirement);
      for (const skill of extracted) {
        if (!this.isStopword(skill)) {
          skillsMap.set(skill, (skillsMap.get(skill) || 0) + 0.5);
        }
      }
    }

    // Return sorted by priority/frequency, with original Vietnamese text
    return Array.from(skillsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([skill]) => skill);
  }

  /**
   * Parse semicolon/comma-separated field
   * Keep text as-is (with Vietnamese diacritics)
   */
  private parseDelimitedField(field: string): string[] {
    if (!field) return [];
    return field
      .split(/[;,|]/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  /**
   * Extract key phrases from requirement text
   * Looks for patterns like "phần mềm Bravo", "Kế toán", etc.
   */
  private extractFromText(text: string): string[] {
    if (!text) return [];

    const results: string[] = [];

    // Split by common delimiters while preserving text
    const sentences = text.split(/[.\n,;]/g);

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length < 3 || trimmed.length > 100) continue;

      // Look for noun phrases (Vietnamese content)
      // Very simple: if it contains Vietnamese characters or specific patterns, keep it
      if (this.hasVietnese(trimmed) || this.isTechTerm(trimmed)) {
        results.push(trimmed);
      }
    }

    return results;
  }

  /**
   * Check if text contains Vietnamese diacritics
   */
  private hasVietnese(text: string): boolean {
    return /[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/i.test(
      text
    );
  }

  /**
   * Check if text looks like a tech term (contains numbers, tech keywords, etc.)
   */
  private isTechTerm(text: string): boolean {
    const lowerText = text.toLowerCase();
    const techKeywords = [
      "phần mềm", "software", "application", "app", "system", "database",
      "framework", "library", "tool", "plugin", "version", "api",
    ];
    return techKeywords.some((kw) => lowerText.includes(kw));
  }

  /**
   * Check if a skill is a stopword (generic junk)
   */
  private isStopword(skill: string): boolean {
    const normalized = skill.toLowerCase().trim();

    // Check English stopwords
    if (this.STOPWORDS.has(normalized)) return true;

    // Filter out mostly numbers or single letters
    if (normalized.length <= 1 || /^\d+$/.test(normalized)) return true;

    // Too long = probably not a skill
    if (normalized.length > 50) return true;

    // Lọc các từ khóa không phải kỹ năng chuyên môn (cả có dấu và không dấu bị lỗi)
    const nonSkillPatterns = [
      /kinh nghiệm|kinh nghiem/i,
      /đại học|dai hoc|ai hoc/i,
      /cao đẳng|cao dang|cao ang/i,
      /trung cấp|trung cap/i,
      /phổ thông|pho thong/i,
      /trở lên|tro len/i,
      /tốt nghiệp|tot nghiep/i,
      /tuổi|tuoi/i,
      /tháng|thang/i,
      /^nam$|^nữ$|^nu$/i,
      /yêu cầu|yeu cau/i,
      /ưu tiên|uu tien/i,
      /chuyên ngành|chuyen nganh/i,
      /bằng cấp|bang cap/i,
      /ngoại hình|ngoai hinh/i,
      /phát âm|phat am/i,
      /diễn đạt|dien at/i,
      /đọc hiểu|oc hieu/i,
      /giao tiếp|giao tiep/i, 
      /chăm chỉ|cham chi/i,
      /trung thực|trung thuc/i,
      /chịu khó|chiu kho/i,
      /áp lực|ap luc/i,
      /nhanh nhẹn|nhanh nhen/i,
      /trình độ|trinh o/i,
      /sức khỏe|suc khoe/i,
      /làm việc|lam viec/i,
      /kỹ năng|ky nang/i,
    ];

    for (const pattern of nonSkillPatterns) {
      if (pattern.test(normalized)) return true;
    }

    return false;
  }
}
