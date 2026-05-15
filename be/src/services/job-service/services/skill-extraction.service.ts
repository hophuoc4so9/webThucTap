import { Injectable, Logger } from "@nestjs/common";
import { SkillDictionaryService } from "./skill-dictionary.service";
import type { SkillTermType } from "../entities/skill-term.entity";
import type { MentionSource } from "../entities/job-skill-mention.entity";

// ─── Types ──────────────────────────────────────────────────────────────────

export type JobSkillSource = {
  title?: string | null;
  description?: string | null;
  field?: string | null;
  tagsRequirement?: string | null;
  industry?: string | null;
  requirement?: string | null;
};

export type ExtractedSkillItem = {
  rawText: string;
  normalizedText: string;
  canonicalName: string;
  type: SkillTermType;
  category: string | null;
  confidence: number;
  source: MentionSource;
  major: string | null;
  majorGroup: string | null;
  dictionaryStatus: "approved" | "alias" | "pending";
};

type RawCandidate = {
  text: string;
  score: number;
  source: MentionSource;
};

// ─── Non-skill regex patterns (structural, not domain-specific) ─────────────
// These are STRUCTURAL noise patterns — things that are never skills in any domain.
// Domain-specific stopwords (e.g. "thuế" in CNTT) are managed via DB stopword entries.

const NON_SKILL_PATTERNS = [
  /^[\-\d\s().,/]+$/,
];

const SENTENCE_NOISE_PATTERNS = [
  /\b(có khả năng|có kiến thức|nắm vững|sử dụng thành thạo|thành thạo|biết|am hiểu)\b/i,
  /\b(làm việc|công việc|nhiệm vụ|qui định|quy định|hồ sơ|báo cáo theo)\b/i,
];

/**
 * SkillExtractionService V2 — trích xuất kỹ năng có cấu trúc.
 *
 * KHÔNG có hardcoded taxonomy/stopword/category nào.
 * Mọi phân loại đều delegate sang SkillDictionaryService (lấy từ DB).
 *
 * Pipeline:
 *  1. Parse structured fields → raw candidates
 *  2. Normalize → dictionary.classify()
 *     - stopword → skip
 *     - alias → map canonical, get type/category from DB
 *     - approved → high confidence, get type/category from DB
 *     - unknown → pending candidate (heuristic type only)
 *  3. Merge duplicates, sort by confidence
 */
@Injectable()
export class SkillExtractionService {
  private readonly logger = new Logger(SkillExtractionService.name);
  private readonly maxSkillsPerJob = 15;

  constructor(private readonly dictionary: SkillDictionaryService) {}

  // ─── V1 Backward Compatibility ──────────────────────────────────────

  extractSkillsFromJob(jobData: JobSkillSource): string[] {
    const items = this.extractSkillsV2(jobData);
    return items
      .filter((item) => item.type !== "noise" && item.dictionaryStatus !== "pending")
      .map((item) => item.canonicalName);
  }

  // ─── V2 Structured Extraction ───────────────────────────────────────

  extractSkillsV2(
    jobData: JobSkillSource,
    context?: { major?: string; majorGroup?: string },
  ): ExtractedSkillItem[] {
    const candidates: RawCandidate[] = [];

    // 1. Title → scan for known skills
    for (const key of this.scanForKnownSkills(jobData.title)) {
      candidates.push({ text: key, score: 1.5, source: "title" });
    }

    // 2. Tags (highest signal — structured data)
    for (const tag of this.parseStructuredField(jobData.tagsRequirement)) {
      candidates.push({ text: tag, score: 2.2, source: "tag" });
    }

    // 3. Requirement
    for (const phrase of this.extractFromFreeText(jobData.requirement)) {
      candidates.push({ text: phrase, score: 1.7, source: "requirement" });
    }

    // 4. Description (lowest signal)
    for (const phrase of this.extractFromFreeText(jobData.description)) {
      candidates.push({ text: phrase, score: 0.8, source: "description" });
    }

    // 5. Classify & merge via dictionary
    const merged = new Map<string, ExtractedSkillItem>();

    for (const candidate of candidates) {
      const normalized = this.normalize(candidate.text);
      if (!normalized || normalized.length < 2 || normalized.length > 55) continue;
      if (normalized.split(" ").length > 6) continue;

      // Structural noise check (only regex for purely numeric/punctuation strings)
      if (NON_SKILL_PATTERNS.some((p) => p.test(normalized))) continue;

      // ── Dictionary classification (DB-driven) ──
      const classification = this.dictionary.classify(normalized, context);

      if (classification.result === "stopword") continue;

      let canonicalName: string;
      let type: SkillTermType;
      let category: string | null;
      let confidenceBoost: number;
      let dictStatus: "approved" | "alias" | "pending";

      if (classification.result === "approved") {
        canonicalName = classification.canonicalName!;
        type = classification.type!;
        category = classification.category ?? null;
        confidenceBoost = 0.3;
        dictStatus = "approved";
      } else if (classification.result === "alias") {
        canonicalName = classification.canonicalName!;
        type = classification.type!;
        category = classification.category ?? null;
        confidenceBoost = 0.25;
        dictStatus = "alias";
      } else {
        // Unknown — pending candidate
        canonicalName = this.cleanForDisplay(candidate.text);
        type = this.inferTypeHeuristic(normalized);
        category = null; // admin sẽ gán sau
        confidenceBoost = 0;
        dictStatus = "pending";

        // For pending: basic structural validation
        if (!this.looksLikeSkillStructurally(candidate.text, normalized)) continue;
      }

      const key = this.normalize(canonicalName);
      const confidence = Math.min(
        this.calculateConfidence(candidate.score, dictStatus) + confidenceBoost,
        1.0,
      );

      const existing = merged.get(key);
      if (existing) {
        if (confidence > existing.confidence) {
          existing.confidence = confidence;
          existing.source = candidate.source;
        }
        existing.confidence = Math.min(existing.confidence + 0.05, 1.0);
      } else {
        merged.set(key, {
          rawText: candidate.text,
          normalizedText: normalized,
          canonicalName,
          type,
          category,
          confidence,
          source: candidate.source,
          major: context?.major ?? null,
          majorGroup: context?.majorGroup ?? null,
          dictionaryStatus: dictStatus,
        });
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => b.confidence - a.confidence || a.canonicalName.localeCompare(b.canonicalName, "vi"))
      .slice(0, this.maxSkillsPerJob);
  }

  // ─── Heuristic Type Inference (for unknown/pending terms only) ──────
  // Minimal heuristic — just checks if text looks like a language cert or has latin chars.
  // Admin will correct type after reviewing.

  private inferTypeHeuristic(normalized: string): SkillTermType {
    // Contains latin chars → likely hard skill
    if (/[a-z]{2,}/i.test(normalized) && normalized.length <= 35) return "hard";
    return "unknown";
  }

  // ─── Structural Validation (for pending terms only) ─────────────────
  // Only structural checks — no domain knowledge needed.

  private looksLikeSkillStructurally(raw: string, normalized: string): boolean {
    if (normalized.length < 2 || normalized.length > 55) return false;
    if (normalized.split(" ").length > 6) return false;

    // Sentence noise (filler words, not skills)
    if (SENTENCE_NOISE_PATTERNS.some((p) => p.test(raw) || p.test(normalized))) return false;

    // Has at least some meaningful content
    if (/[a-z0-9]/i.test(raw) && normalized.length <= 40) return true;

    return false;
  }

  // ─── Confidence (simpler — dictionary status is the main signal) ────

  private calculateConfidence(baseScore: number, dictStatus: "approved" | "alias" | "pending"): number {
    let confidence = Math.min(baseScore / 4.0, 0.6);

    // Dictionary-verified skills get higher base confidence
    if (dictStatus === "approved") confidence += 0.15;
    else if (dictStatus === "alias") confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  // ─── Scan for known skills in text (via dictionary) ─────────────────

  private scanForKnownSkills(text?: string | null): string[] {
    if (!text) return [];
    return this.dictionary.findKnownSkillsInText(this.normalize(text));
  }

  // ─── Text Parsing (structural — no domain knowledge) ────────────────

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
    } catch { return null; }
  }

  private splitLooseList(value: string): string[] {
    const n = value.replace(/\s+-\s+/g, "\n").replace(/^[\s\-–+*]+/, "");
    if (!n.includes(",")) return [n];
    return n.split(",").map((p) => p.trim()).filter((p) => p.length > 0);
  }

  private extractFromFreeText(value?: string | null): string[] {
    if (!value) return [];
    const phrases: string[] = [];
    const chunks = value
      .replace(/<[^>]+>/g, " ")
      .split(/[.\n;•]+/g)
      .map((c) => this.clean(c))
      .filter((c) => c.length >= 3 && c.length <= 160);

    for (const chunk of chunks) {
      // Scan for known skills in this chunk
      const found = this.dictionary.findKnownSkillsInText(this.normalize(chunk));
      if (found.length > 0) {
        phrases.push(...found);
        continue;
      }

      // After skill marker → extract what follows
      const afterMarker = chunk.match(
        /(?:kỹ năng|ky nang|thành thạo|sử dụng|am hiểu|nắm vững|kiến thức về)\s+(.+)/i,
      )?.[1];
      if (afterMarker) {
        phrases.push(...this.splitLooseList(afterMarker).map((i) => this.clean(i)));
      }
    }
    return phrases;
  }

  // ─── Text Utilities ─────────────────────────────────────────────────

  private cleanForDisplay(value: string): string {
    const text = this.clean(value);
    // Try to get canonical from dictionary
    const canonical = this.dictionary.getCanonicalName(this.normalize(text));
    if (canonical) return canonical;
    return text.replace(/^[-–+*\s]+/, "").replace(/\s+/g, " ").trim();
  }

  private clean(value: string): string {
    return value
      .replace(/\s+/g, " ")
      .replace(/^[\s\-–+*:/()]+/, "")
      .replace(/[\s\-–*:/(]+$/, "")
      .trim();
  }

  normalize(value: string): string {
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
