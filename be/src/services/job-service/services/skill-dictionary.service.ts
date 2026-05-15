import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SkillTerm, SkillTermStatus, SkillTermType } from "../entities/skill-term.entity";
import { SkillAlias } from "../entities/skill-alias.entity";

/**
 * SkillDictionaryService — single source of truth cho toàn bộ skill taxonomy.
 *
 * Mọi logic phân loại (type, category, stopword, alias, canonical name)
 * đều lấy từ DB → cache in-memory. Admin duyệt → invalidate → extraction
 * tự động cập nhật mà KHÔNG cần sửa code.
 *
 * Khi DB trống (lần đầu deploy), service tự seed BOOTSTRAP_DATA vào DB.
 * Sau đó admin có thể sửa/thêm/xoá thoải mái qua API.
 */

export type ApprovedSkillEntry = {
  id: number;
  canonicalName: string;
  normalizedText: string;
  type: SkillTermType;
  category: string | null;
  major: string | null;
  majorGroup: string | null;
};

export type AliasEntry = {
  normalizedAlias: string;
  canonicalSkillId: number;
  canonicalName: string;
  type: SkillTermType;
  category: string | null;
};

@Injectable()
export class SkillDictionaryService implements OnModuleInit {
  private readonly logger = new Logger(SkillDictionaryService.name);

  // ── In-memory cache (rebuilt from DB) ──
  private approvedMap = new Map<string, ApprovedSkillEntry>();
  private approvedById = new Map<number, ApprovedSkillEntry>();
  
  // Context-aware stopwords
  private globalStopwords = new Set<string>();
  private groupStopwords = new Map<string, Set<string>>(); // majorGroup -> Set<string>
  private majorStopwords = new Map<string, Set<string>>(); // major -> Set<string>
  
  private aliasMap = new Map<string, AliasEntry>();
  /** All approved canonical names for fast "known skill" check */
  private knownNormalized = new Set<string>();
  private loaded = false;

  constructor(
    @InjectRepository(SkillTerm)
    private readonly skillTermRepo: Repository<SkillTerm>,
    @InjectRepository(SkillAlias)
    private readonly aliasRepo: Repository<SkillAlias>,
  ) {}

  async onModuleInit() {
    await this.seedIfEmpty();
    await this.loadDictionary();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DICTIONARY LOADING
  // ═══════════════════════════════════════════════════════════════════════

  async loadDictionary(): Promise<void> {
    try {
      const [allTerms, aliases] = await Promise.all([
        this.skillTermRepo.find(),
        this.aliasRepo.find({ relations: ["canonicalSkill"] }),
      ]);

      this.approvedMap.clear();
      this.approvedById.clear();
      this.globalStopwords.clear();
      this.groupStopwords.clear();
      this.majorStopwords.clear();
      this.aliasMap.clear();
      this.knownNormalized.clear();

      for (const term of allTerms) {
        if (term.status === "approved") {
          const entry: ApprovedSkillEntry = {
            id: term.id,
            canonicalName: term.canonicalName,
            normalizedText: term.normalizedText,
            type: term.type,
            category: term.category,
            major: term.major,
            majorGroup: term.majorGroup,
          };
          this.approvedMap.set(term.normalizedText, entry);
          this.approvedById.set(term.id, entry);
          this.knownNormalized.add(term.normalizedText);
        } else if (term.status === "stopword") {
          const text = this.toStopwordLookupKey(term.normalizedText);
          if (term.major) {
            if (!this.majorStopwords.has(term.major)) this.majorStopwords.set(term.major, new Set());
            this.majorStopwords.get(term.major)!.add(text);
          } else if (term.majorGroup) {
            if (!this.groupStopwords.has(term.majorGroup)) this.groupStopwords.set(term.majorGroup, new Set());
            this.groupStopwords.get(term.majorGroup)!.add(text);
          } else {
            this.globalStopwords.add(text);
          }
        }
      }

      for (const alias of aliases) {
        if (!alias.canonicalSkill) continue;
        this.aliasMap.set(alias.normalizedAlias, {
          normalizedAlias: alias.normalizedAlias,
          canonicalSkillId: alias.canonicalSkillId,
          canonicalName: alias.canonicalSkill.canonicalName,
          type: alias.canonicalSkill.type,
          category: alias.canonicalSkill.category,
        });
        this.knownNormalized.add(alias.normalizedAlias);
      }

      this.loaded = true;
      let totalContextStopwords = 0;
      this.groupStopwords.forEach(set => totalContextStopwords += set.size);
      this.majorStopwords.forEach(set => totalContextStopwords += set.size);
      
      this.logger.log(
        `Dictionary loaded: ${this.approvedMap.size} approved, ` +
        `${this.globalStopwords.size} global stopwords, ${totalContextStopwords} context stopwords, ${this.aliasMap.size} aliases`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to load dictionary: ${error?.message ?? error}`);
    }
  }

  async invalidate(): Promise<void> {
    await this.loadDictionary();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LOOKUP METHODS — called by SkillExtractionService
  // ═══════════════════════════════════════════════════════════════════════

  isLoaded(): boolean { return this.loaded; }

  isStopword(normalizedText: string, context?: { majorGroup?: string | null; major?: string | null }): boolean {
    if (this.globalStopwords.has(normalizedText)) return true;
    if (context?.majorGroup && this.groupStopwords.get(context.majorGroup)?.has(normalizedText)) return true;
    if (context?.major && this.majorStopwords.get(context.major)?.has(normalizedText)) return true;
    return false;
  }

  /** Check if this normalized text is known (approved or alias) */
  isKnownSkill(normalizedText: string): boolean {
    return this.knownNormalized.has(normalizedText);
  }

  lookupApproved(normalizedText: string): ApprovedSkillEntry | null {
    return this.approvedMap.get(normalizedText) ?? null;
  }

  lookupAlias(normalizedText: string): AliasEntry | null {
    return this.aliasMap.get(normalizedText) ?? null;
  }

  getApprovedById(id: number): ApprovedSkillEntry | null {
    return this.approvedById.get(id) ?? null;
  }

  /** Get type for a known normalized text (from approved or alias) */
  getType(normalizedText: string): SkillTermType | null {
    const approved = this.approvedMap.get(normalizedText);
    if (approved) return approved.type;
    const alias = this.aliasMap.get(normalizedText);
    if (alias) return alias.type;
    return null;
  }

  /** Get category for a known normalized text */
  getCategory(normalizedText: string): string | null {
    const approved = this.approvedMap.get(normalizedText);
    if (approved) return approved.category;
    const alias = this.aliasMap.get(normalizedText);
    if (alias) return alias.category;
    return null;
  }

  /** Get canonical name for a known normalized text */
  getCanonicalName(normalizedText: string): string | null {
    const approved = this.approvedMap.get(normalizedText);
    if (approved) return approved.canonicalName;
    const alias = this.aliasMap.get(normalizedText);
    if (alias) return alias.canonicalName;
    return null;
  }

  /**
   * Full classification chain: stopword → alias → approved → unknown.
   * This is the ONLY method SkillExtractionService needs to call.
   */
  classify(normalizedText: string, context?: { majorGroup?: string | null; major?: string | null }): {
    result: "stopword" | "alias" | "approved" | "unknown";
    canonicalName?: string;
    type?: SkillTermType;
    category?: string | null;
    entry?: ApprovedSkillEntry | AliasEntry;
  } {
    if (this.isStopword(normalizedText, context)) {
      return { result: "stopword" };
    }
    const alias = this.aliasMap.get(normalizedText);
    if (alias) {
      return {
        result: "alias",
        canonicalName: alias.canonicalName,
        type: alias.type,
        category: alias.category,
        entry: alias,
      };
    }
    const approved = this.approvedMap.get(normalizedText);
    if (approved) {
      return {
        result: "approved",
        canonicalName: approved.canonicalName,
        type: approved.type,
        category: approved.category,
        entry: approved,
      };
    }
    return { result: "unknown" };
  }

  /**
   * Scan text for ALL known skill mentions (approved + alias).
   * Returns matched normalized keys, sorted longest-first to avoid partial matches.
   * This replaces the hardcoded HARD_SKILL_HINTS / SOFT_SKILL_HINTS arrays.
   */
  findKnownSkillsInText(normalizedText: string): string[] {
    const found: string[] = [];
    // Sort by length desc — match "react native" before "react"
    const sorted = Array.from(this.knownNormalized).sort((a, b) => b.length - a.length);
    for (const key of sorted) {
      if (key.length < 2) continue;
      if (normalizedText.includes(key)) {
        found.push(key);
      }
    }
    return found;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // UPSERT PENDING CANDIDATE
  // ═══════════════════════════════════════════════════════════════════════

  async upsertCandidate(params: {
    rawText: string;
    normalizedText: string;
    canonicalName: string;
    type: SkillTermType;
    category: string | null;
    confidence: number;
    major: string | null;
    majorGroup: string | null;
    jobId: number;
  }): Promise<SkillTerm> {
    const existing = await this.skillTermRepo.findOne({
      where: { normalizedText: params.normalizedText },
    });

    if (existing) {
      const newFreq = existing.frequency + 1;
      const newConfAvg =
        (existing.confidenceAvg * existing.frequency + params.confidence) / newFreq;
      const examples = existing.exampleJobIds ?? [];
      if (!examples.includes(params.jobId) && examples.length < 10) {
        examples.push(params.jobId);
      }
      await this.skillTermRepo.update(existing.id, {
        frequency: newFreq,
        confidenceAvg: Number(newConfAvg.toFixed(4)),
        exampleJobIds: examples,
      });
      existing.frequency = newFreq;
      existing.confidenceAvg = newConfAvg;
      return existing;
    }

    const term = this.skillTermRepo.create({
      rawText: params.rawText,
      normalizedText: params.normalizedText,
      canonicalName: params.canonicalName,
      status: "pending" as SkillTermStatus,
      type: params.type,
      category: params.category,
      major: params.major,
      majorGroup: params.majorGroup,
      frequency: 1,
      confidenceAvg: params.confidence,
      exampleJobIds: [params.jobId],
    });
    return this.skillTermRepo.save(term);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BOOTSTRAP SEED — chỉ chạy 1 lần khi DB trống
  // ═══════════════════════════════════════════════════════════════════════

  private async seedIfEmpty(): Promise<void> {
    const count = await this.skillTermRepo.count();
    if (count > 0) return;

    this.logger.log("DB empty. Ready for human-in-the-loop population.");
  }

  private norm(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9#+./\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private toStopwordLookupKey(normalizedText: string): string {
    return normalizedText.split("@@scope:")[0] || normalizedText;
  }
}
