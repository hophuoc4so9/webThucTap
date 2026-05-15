import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike, In } from "typeorm";
import { SkillTerm, SkillTermStatus, SkillTermType } from "../entities/skill-term.entity";
import { SkillAlias } from "../entities/skill-alias.entity";
import { SkillReviewLog, SkillReviewAction } from "../entities/skill-review-log.entity";
import { SkillCluster, SkillClusterScope } from "../entities/skill-cluster.entity";
import { SkillDictionaryService } from "./skill-dictionary.service";
import { SkillClusteringService } from "./skill-clustering.service";
import { MarketTrendService } from "./market-trend.service";
import {
  SkillCandidateQueryDto,
  ApproveSkillDto,
  MergeAliasDto,
  SetCategoryDto,
  BulkActionDto,
  MarkStopwordDto,
  CreateSkillClusterDto,
  RenameSkillClusterDto,
  MoveSkillToStopwordDto,
  RenameSkillTermDto,
} from "../dto/skill-admin.dto";

/**
 * SkillAdminService — admin review & management of skill terms.
 *
 * Mọi action đều:
 *  1. Ghi SkillReviewLog (audit trail)
 *  2. Invalidate dictionary cache → extraction tự cập nhật
 *  3. Invalidate market-trend cache → trends phản ánh data mới
 *  4. Support scoped stopwords (global/majorGroup/major)
 *  5. Manage skill clusters (naming, grouping, moving to stopword)
 */
@Injectable()
export class SkillAdminService {
  private readonly logger = new Logger(SkillAdminService.name);

  constructor(
    @InjectRepository(SkillTerm)
    private readonly skillTermRepo: Repository<SkillTerm>,
    @InjectRepository(SkillAlias)
    private readonly aliasRepo: Repository<SkillAlias>,
    @InjectRepository(SkillReviewLog)
    private readonly reviewLogRepo: Repository<SkillReviewLog>,
    @InjectRepository(SkillCluster)
    private readonly clusterRepo: Repository<SkillCluster>,
    private readonly dictionary: SkillDictionaryService,
    private readonly clustering: SkillClusteringService,
    private readonly marketTrend: MarketTrendService,
  ) {}

  // ─── Query ──────────────────────────────────────────────────────────

  async getSkillCandidates(query: SkillCandidateQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 200);
    const offset = (page - 1) * limit;

    const qb = this.skillTermRepo.createQueryBuilder("st");

    if (query.status) {
      qb.andWhere("st.status = :status", { status: query.status });
    }
    if (query.type) {
      qb.andWhere("st.type = :type", { type: query.type });
    }
    if (query.majorGroup) {
      qb.andWhere("st.majorGroup = :majorGroup", { majorGroup: query.majorGroup });
    }
    if (query.major) {
      qb.andWhere("st.major = :major", { major: query.major });
    }
    if (query.category) {
      qb.andWhere("st.category = :category", { category: query.category });
    }
    if (query.minFrequency) {
      qb.andWhere("st.frequency >= :minFreq", { minFreq: query.minFrequency });
    }
    if (query.search) {
      qb.andWhere("(st.canonicalName ILIKE :search OR st.rawText ILIKE :search)", {
        search: `%${query.search}%`,
      });
    }

    const sortBy = query.sortBy ?? "frequency";
    const sortOrder = query.sortOrder ?? "DESC";
    qb.orderBy(`st.${sortBy}`, sortOrder as "ASC" | "DESC");

    const [items, total] = await qb.skip(offset).take(limit).getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSkillClusters(filters?: {
    majorGroup?: string;
    major?: string;
    minFrequency?: number;
  }) {
    return this.clustering.clusterPendingCandidates(filters);
  }

  // ─── Actions ────────────────────────────────────────────────────────

  async approveSkill(id: number, dto: ApproveSkillDto, adminId?: number) {
    const term = await this.findTermOrThrow(id);
    const oldStatus = term.status;

    term.status = "approved";
    if (dto.canonicalName) term.canonicalName = dto.canonicalName;
    if (dto.type) term.type = dto.type as SkillTermType;
    if (dto.category) term.category = dto.category;
    if (dto.major) term.major = dto.major;
    if (dto.majorGroup) term.majorGroup = dto.majorGroup;

    await this.skillTermRepo.save(term);
    await this.logAction(id, "approve", oldStatus, "approved", adminId);
    await this.invalidateAll();

    return term;
  }

  async markStopword(
    id: number,
    adminId?: number,
    dto?: MarkStopwordDto,
  ) {
    const term = await this.findTermOrThrow(id);
    const oldStatus = term.status;
    const scope = dto?.scope ?? "global";

    if (scope !== "global" && term.status === "approved") {
      const scopeContext = dto?.scopeContext?.trim();
      if (!scopeContext) {
        throw new BadRequestException(`scopeContext is required for ${scope} stopword`);
      }

      const scopedStopword = await this.upsertScopedStopword(term, scope, scopeContext);
      await this.logAction(
        scopedStopword.id,
        "mark_stopword",
        oldStatus,
        `stopword(${scope})`,
        adminId,
      );
      await this.invalidateAll();
      return scopedStopword;
    }

    term.status = "stopword";
    term.type = "noise";

    // Handle scoped stopwords
    if (scope === "global") {
      term.major = null;
      term.majorGroup = null;
    } else if (scope === "majorGroup" && dto?.scopeContext) {
      term.majorGroup = dto.scopeContext;
      term.major = null;
    } else if (scope === "major" && dto?.scopeContext) {
      term.major = dto.scopeContext;
      term.majorGroup = null;
    }

    await this.skillTermRepo.save(term);
    await this.logAction(
      id,
      "mark_stopword",
      oldStatus,
      `stopword(${scope})`,
      adminId,
    );
    await this.invalidateAll();

    return term;
  }

  async rejectSkill(id: number, adminId?: number) {
    const term = await this.findTermOrThrow(id);
    const oldStatus = term.status;

    term.status = "rejected";
    await this.skillTermRepo.save(term);

    await this.logAction(id, "reject", oldStatus, "rejected", adminId);
    await this.invalidateAll();

    return term;
  }

  async mergeAlias(id: number, dto: MergeAliasDto, adminId?: number) {
    const term = await this.findTermOrThrow(id);
    const targetTerm = await this.findTermOrThrow(dto.targetSkillId);

    const oldStatus = term.status;

    // Create alias entry
    const alias = this.aliasRepo.create({
      aliasText: term.rawText,
      normalizedAlias: term.normalizedText,
      canonicalSkillId: targetTerm.id,
    });
    await this.aliasRepo.save(alias);

    // Update source term status
    term.status = "alias";
    await this.skillTermRepo.save(term);

    // Increase target frequency
    targetTerm.frequency += term.frequency;
    await this.skillTermRepo.save(targetTerm);

    await this.logAction(id, "merge_alias", oldStatus, `alias→${targetTerm.canonicalName}`, adminId);
    await this.invalidateAll();

    return { alias, targetTerm };
  }

  async setCategory(id: number, dto: SetCategoryDto, adminId?: number) {
    const term = await this.findTermOrThrow(id);
    const oldCategory = term.category;

    term.category = dto.category;
    if (dto.type) term.type = dto.type as SkillTermType;
    await this.skillTermRepo.save(term);

    await this.logAction(id, "change_category", oldCategory ?? "", dto.category, adminId);
    await this.invalidateAll();

    return term;
  }

  async bulkAction(dto: BulkActionDto, adminId?: number) {
    const results: { id: number; success: boolean; error?: string }[] = [];

    if (dto.action === "merge_cluster" && dto.targetName && dto.ids.length > 0) {
      try {
        // Find existing approved target, or approve the first one with the new name
        let targetId = dto.ids[0];
        const targetTerm = await this.approveSkill(targetId, {
          canonicalName: dto.targetName,
          type: dto.type,
          category: dto.category,
        }, adminId);

        results.push({ id: targetId, success: true });

        // Merge others into target
        for (let i = 1; i < dto.ids.length; i++) {
          const id = dto.ids[i];
          try {
            await this.mergeAlias(id, { targetSkillId: targetId }, adminId);
            results.push({ id, success: true });
          } catch (err: any) {
            results.push({ id, success: false, error: err?.message });
          }
        }
        return { processed: results.length, results };
      } catch (err: any) {
        return { processed: 0, results: [{ id: dto.ids[0], success: false, error: err?.message }] };
      }
    }

    for (const id of dto.ids) {
      try {
        switch (dto.action) {
          case "approve":
            await this.approveSkill(id, {
              type: dto.type,
              category: dto.category,
            }, adminId);
            break;
          case "reject":
            await this.rejectSkill(id, adminId);
            break;
          case "mark_stopword":
            await this.markStopword(
              id,
              adminId,
              {
                scope: dto.stopwordScope as any,
                scopeContext: dto.stopwordContext,
              },
            );
            break;
        }
        results.push({ id, success: true });
      } catch (error: any) {
        results.push({ id, success: false, error: error?.message ?? "Unknown error" });
      }
    }

    return { processed: results.length, results };
  }

  // ─── Skill Cluster Management ────────────────────────────────────────

  async createCluster(dto: CreateSkillClusterDto, adminId?: number) {
    const terms = await this.resolveClusterSkillTerms(dto);
    if (!terms.length) {
      throw new BadRequestException("Cluster must include at least one approved skill");
    }

    const scope = dto.scope ?? "global";
    const scopeContext = dto.scopeContext ?? null;
    const existing = await this.findBestMatchingCluster(scope, scopeContext, terms);

    if (existing) {
      existing.clusterName = dto.clusterName;
      existing.description = dto.description ?? existing.description;
      existing.skillTerms = terms;
      const saved = await this.clusterRepo.save(existing);
      await this.invalidateAll();
      return saved;
    }

    // Create cluster
    const cluster = this.clusterRepo.create({
      clusterName: dto.clusterName,
      description: dto.description,
      scope,
      scopeContext,
      skillTerms: terms,
      status: "active",
    });

    await this.clusterRepo.save(cluster);
    this.logger.log(
      `Created cluster "${dto.clusterName}" with ${terms.length} skills (scope: ${dto.scope})`,
    );

    await this.invalidateAll();
    return cluster;
  }

  async getClustersByScope(
    scope?: SkillClusterScope,
    scopeContext?: string,
    majorGroup?: string,
    major?: string,
  ) {
    const qb = this.clusterRepo
      .createQueryBuilder("sc")
      .leftJoinAndSelect("sc.skillTerms", "st")
      .where("sc.status = :status", { status: "active" });

    if (scope) {
      qb.andWhere("sc.scope = :scope", { scope });
      if (scope !== "global" && scopeContext) {
        qb.andWhere("sc.scopeContext = :scopeContext", { scopeContext });
      }
    } else if (major || majorGroup) {
      qb.andWhere(
        "(sc.scope = :globalScope OR (sc.scope = :majorGroupScope AND sc.scopeContext = :majorGroup) OR (sc.scope = :majorScope AND sc.scopeContext = :major))",
        {
          globalScope: "global",
          majorGroupScope: "majorGroup",
          majorScope: "major",
          majorGroup: majorGroup ?? "",
          major: major ?? "",
        },
      );
    }

    return qb.orderBy("sc.createdAt", "DESC").getMany();
  }

  async renameCluster(clusterId: number, dto: RenameSkillClusterDto, adminId?: number) {
    const cluster = await this.clusterRepo.findOne({
      where: { id: clusterId },
    });

    if (!cluster) {
      throw new NotFoundException(`Cluster #${clusterId} not found`);
    }

    const oldName = cluster.clusterName;
    cluster.clusterName = dto.clusterName;
    if (dto.description !== undefined) cluster.description = dto.description;

    await this.clusterRepo.save(cluster);
    this.logger.log(
      `Renamed cluster from "${oldName}" to "${dto.clusterName}" by admin #${adminId}`,
    );

    await this.invalidateAll();
    return cluster;
  }

  async moveSkillToStopword(
    skillTermId: number,
    dto: MoveSkillToStopwordDto,
    adminId?: number,
  ) {
    return this.markStopword(
      skillTermId,
      adminId,
      {
        scope: dto.scope as any,
        scopeContext: dto.scopeContext,
      },
    );
  }

  async renameSkillTerm(skillTermId: number, dto: RenameSkillTermDto, adminId?: number) {
    const term = await this.findTermOrThrow(skillTermId);
    const oldName = term.canonicalName;

    term.canonicalName = dto.canonicalName;
    if (dto.type) term.type = dto.type as SkillTermType;
    if (dto.category) term.category = dto.category;

    await this.skillTermRepo.save(term);
    await this.logAction(
      skillTermId,
      "rename",
      oldName,
      dto.canonicalName,
      adminId,
    );

    await this.invalidateAll();
    return term;
  }

  async mergeCluster(sourceCluserId: number, targetCluserId: number, adminId?: number) {
    const sourceCluster = await this.clusterRepo.findOne({
      where: { id: sourceCluserId },
      relations: ["skillTerms"],
    });

    const targetCluster = await this.clusterRepo.findOne({
      where: { id: targetCluserId },
      relations: ["skillTerms"],
    });

    if (!sourceCluster || !targetCluster) {
      throw new NotFoundException("One or both clusters not found");
    }

    // Add all skills from source to target
    const allSkills = [...(targetCluster.skillTerms || []), ...(sourceCluster.skillTerms || [])];
    targetCluster.skillTerms = Array.from(
      new Map(allSkills.map((s) => [s.id, s])).values(),
    );

    await this.clusterRepo.save(targetCluster);

    // Mark source as merged
    sourceCluster.status = "merged";
    sourceCluster.mergedIntoClusterId = targetCluserId;
    await this.clusterRepo.save(sourceCluster);

    this.logger.log(
      `Merged cluster #${sourceCluserId} into cluster #${targetCluserId} by admin #${adminId}`,
    );

    await this.invalidateAll();
    return targetCluster;
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  private async findTermOrThrow(id: number): Promise<SkillTerm> {
    const term = await this.skillTermRepo.findOne({ where: { id } });
    if (!term) throw new NotFoundException(`SkillTerm #${id} not found`);
    return term;
  }

  private async logAction(
    skillTermId: number,
    action: SkillReviewAction,
    oldValue: string,
    newValue: string,
    adminId?: number,
  ) {
    const log = this.reviewLogRepo.create({
      skillTermId,
      action,
      oldValue,
      newValue,
      adminId: adminId ?? null,
    });
    await this.reviewLogRepo.save(log);
  }

  private async upsertScopedStopword(
    source: SkillTerm,
    scope: "majorGroup" | "major",
    scopeContext: string,
  ): Promise<SkillTerm> {
    const normalizedText = this.buildScopedStopwordKey(source.normalizedText, scope, scopeContext);
    const existing = await this.skillTermRepo.findOne({ where: { normalizedText } });

    if (existing) {
      existing.status = "stopword";
      existing.type = "noise";
      existing.rawText = source.rawText;
      existing.canonicalName = source.canonicalName;
      existing.majorGroup = scope === "majorGroup" ? scopeContext : null;
      existing.major = scope === "major" ? scopeContext : null;
      existing.frequency = source.frequency;
      existing.exampleJobIds = source.exampleJobIds;
      return this.skillTermRepo.save(existing);
    }

    return this.skillTermRepo.save(
      this.skillTermRepo.create({
        rawText: source.rawText,
        canonicalName: source.canonicalName,
        normalizedText,
        status: "stopword",
        type: "noise",
        category: source.category,
        majorGroup: scope === "majorGroup" ? scopeContext : null,
        major: scope === "major" ? scopeContext : null,
        frequency: source.frequency,
        confidenceAvg: source.confidenceAvg,
        exampleJobIds: source.exampleJobIds,
      }),
    );
  }

  private buildScopedStopwordKey(
    normalizedText: string,
    scope: "majorGroup" | "major",
    scopeContext: string,
  ) {
    return `${normalizedText}@@scope:${scope}:${this.normalizeKey(scopeContext)}`;
  }

  private async resolveClusterSkillTerms(dto: CreateSkillClusterDto): Promise<SkillTerm[]> {
    if (dto.skillTermIds?.length) {
      const terms = await this.skillTermRepo.find({
        where: { id: In(dto.skillTermIds), status: "approved" as SkillTermStatus },
      });

      if (terms.length !== dto.skillTermIds.length) {
        throw new BadRequestException(
          `Not all approved skill term IDs found. Expected ${dto.skillTermIds.length}, got ${terms.length}`,
        );
      }

      return terms;
    }

    const normalizedNames = Array.from(
      new Set((dto.skillNames ?? []).map((name) => this.normalizeKey(name)).filter(Boolean)),
    );
    if (!normalizedNames.length) return [];

    const terms = await this.skillTermRepo.find({
      where: {
        normalizedText: In(normalizedNames),
        status: "approved" as SkillTermStatus,
      },
    });

    const foundKeys = new Set(terms.map((term) => term.normalizedText));
    const missing = normalizedNames.filter((name) => !foundKeys.has(name));
    if (missing.length) {
      this.logger.warn(`Could not map ${missing.length} trend skills to approved terms: ${missing.join(", ")}`);
    }

    return terms;
  }

  private async findBestMatchingCluster(
    scope: SkillClusterScope,
    scopeContext: string | null,
    terms: SkillTerm[],
  ): Promise<SkillCluster | null> {
    const clusters = await this.clusterRepo.find({
      where: {
        scope,
        scopeContext,
        status: "active",
      },
      relations: ["skillTerms"],
    });
    if (!clusters.length) return null;

    const termIds = new Set(terms.map((term) => term.id));
    let best: { cluster: SkillCluster; overlap: number } | null = null;

    for (const cluster of clusters) {
      const overlap = (cluster.skillTerms ?? []).filter((term) => termIds.has(term.id)).length;
      if (!best || overlap > best.overlap) {
        best = { cluster, overlap };
      }
    }

    const threshold = Math.min(3, terms.length);
    return best && best.overlap >= threshold ? best.cluster : null;
  }

  private normalizeKey(value: string): string {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9\s#+.]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Invalidate cả dictionary cache (cho extraction) và market-trend cache.
   * Đảm bảo dữ liệu mới được reflect ngay sau admin action.
   */
  private async invalidateAll() {
    await this.dictionary.invalidate();
    await Promise.all([
      this.clustering.invalidateClusterCache(),
      this.marketTrend.invalidateCache(),
    ]);
  }
}
