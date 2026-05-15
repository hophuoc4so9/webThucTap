import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Repository } from "typeorm";
import { SkillTerm } from "../entities/skill-term.entity";
import { CacheService } from "./cache.service";

/**
 * SkillClusteringService — gom cụm pending/unknown candidates.
 *
 * Dùng Jaccard token similarity (chạy local, không cần API ngoài).
 * Admin xem clusters → approve/reject/merge nhanh hơn từng term.
 *
 * Features:
 *  - Daily refresh của clusters (background task)
 *  - Redis/Memory caching với TTL (default: 24h)
 *  - Auto-invalidation khi admin thực hiện action
 *  - Scope-aware caching (global, majorGroup, major)
 */

// Cache key constants
export const CLUSTER_CACHE_KEYS = {
  GLOBAL: "cluster:pending:global",
  BY_MAJOR_GROUP: (group: string) => `cluster:pending:majorGroup:${encodeURIComponent(group)}`,
  BY_MAJOR: (major: string) => `cluster:pending:major:${encodeURIComponent(major)}`,
  LAST_REFRESH: "cluster:last_refresh_time",
  REFRESH_LOCK: "cluster:refresh_lock",
};

type SkillClusterOutput = {
  clusterId: number;
  labelSuggested: string;
  terms: { id: number; canonicalName: string; normalizedText: string; frequency: number }[];
  totalFrequency: number;
  majorDistribution: Record<string, number>;
  examples: number[];
  suggestedAction: "approve" | "merge" | "review";
};

@Injectable()
export class SkillClusteringService {
  private readonly logger = new Logger(SkillClusteringService.name);
  private readonly SIMILARITY_THRESHOLD = 0.4;
  private readonly CACHE_TTL_SECONDS = 86400; // 24 hours

  constructor(
    @InjectRepository(SkillTerm)
    private readonly skillTermRepo: Repository<SkillTerm>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Lấy pending candidates, gom cụm theo token similarity.
   * Output: danh sách cluster cho admin review.
   *
   * Caching strategy:
   *  - Cache key tùy thuộc vào filters (global/majorGroup/major)
   *  - TTL: 24 hours
   *  - Auto-invalidate khi admin thực hiện action
   */
  async clusterPendingCandidates(filters?: {
    majorGroup?: string;
    major?: string;
    minFrequency?: number;
  }): Promise<SkillClusterOutput[]> {
    // Generate cache key based on filters
    const cacheKey = this.generateCacheKey(filters);
    
    // Try to get from cache first
    const cached = await this.cacheService.get<SkillClusterOutput[]>(cacheKey);
    if (cached) {
      this.logger.debug(`[Clustering] Cache hit for key: ${cacheKey}`);
      return cached;
    }

    this.logger.debug(`[Clustering] Cache miss for key: ${cacheKey}, computing clusters...`);

    // Compute clusters
    const clusters = await this.computeClustersPendingCandidates(filters);

    // Cache the result
    try {
      await this.cacheService.set<SkillClusterOutput[]>(cacheKey, clusters, this.CACHE_TTL_SECONDS);
      this.logger.debug(`[Clustering] Cached clusters under key: ${cacheKey} (TTL: 24h)`);
    } catch (error) {
      this.logger.warn(`[Clustering] Failed to cache clusters: ${error.message}`);
      // Continue anyway, non-critical
    }

    return clusters;
  }

  /**
   * Private method to compute clusters (actual logic).
   */
  private async computeClustersPendingCandidates(filters?: {
    majorGroup?: string;
    major?: string;
    minFrequency?: number;
  }): Promise<SkillClusterOutput[]> {
    const qb = this.skillTermRepo.createQueryBuilder("st");
    qb.where("st.status IN (:...statuses)", { statuses: ["pending", "unknown"] });

    if (filters?.majorGroup) {
      qb.andWhere("st.majorGroup = :majorGroup", { majorGroup: filters.majorGroup });
    }
    if (filters?.major) {
      qb.andWhere("st.major = :major", { major: filters.major });
    }
    if (filters?.minFrequency) {
      qb.andWhere("st.frequency >= :minFreq", { minFreq: filters.minFrequency });
    }

    qb.orderBy("st.frequency", "DESC");
    qb.limit(500);

    const terms = await qb.getMany();
    if (!terms.length) return [];

    // Greedy clustering by Jaccard token similarity
    const clusters: SkillClusterOutput[] = [];
    const assigned = new Set<number>();

    for (const term of terms) {
      if (assigned.has(term.id)) continue;

      const cluster: SkillTerm[] = [term];
      assigned.add(term.id);

      const tokensA = this.tokenize(term.normalizedText);

      for (const candidate of terms) {
        if (assigned.has(candidate.id)) continue;
        const tokensB = this.tokenize(candidate.normalizedText);
        const sim = this.jaccardTokens(tokensA, tokensB);
        if (sim >= this.SIMILARITY_THRESHOLD) {
          cluster.push(candidate);
          assigned.add(candidate.id);
        }
      }

      const totalFreq = cluster.reduce((sum, t) => sum + t.frequency, 0);
      const majorDist: Record<string, number> = {};
      const exampleIds: number[] = [];

      for (const t of cluster) {
        if (t.major) majorDist[t.major] = (majorDist[t.major] ?? 0) + t.frequency;
        for (const id of t.exampleJobIds ?? []) {
          if (exampleIds.length < 5 && !exampleIds.includes(id)) exampleIds.push(id);
        }
      }

      // Label = most frequent term in cluster
      const label = cluster.sort((a, b) => b.frequency - a.frequency)[0].canonicalName;

      let suggestedAction: "approve" | "merge" | "review" = "review";
      if (cluster.length === 1 && totalFreq >= 10) suggestedAction = "approve";
      else if (cluster.length > 1) suggestedAction = "merge";

      clusters.push({
        clusterId: clusters.length + 1,
        labelSuggested: label,
        terms: cluster.map((t) => ({
          id: t.id,
          canonicalName: t.canonicalName,
          normalizedText: t.normalizedText,
          frequency: t.frequency,
        })),
        totalFrequency: totalFreq,
        majorDistribution: majorDist,
        examples: exampleIds,
        suggestedAction,
      });
    }

    return clusters.sort((a, b) => b.totalFrequency - a.totalFrequency);
  }

  // ─── Cache Management ───────────────────────────────────────────────

  /**
   * Generate cache key based on filters.
   * Different scopes get different cache keys for independent TTL.
   */
  private generateCacheKey(filters?: {
    majorGroup?: string;
    major?: string;
    minFrequency?: number;
  }): string {
    let key = CLUSTER_CACHE_KEYS.GLOBAL;
    
    if (filters?.major) {
      key = CLUSTER_CACHE_KEYS.BY_MAJOR(filters.major);
    } else if (filters?.majorGroup) {
      key = CLUSTER_CACHE_KEYS.BY_MAJOR_GROUP(filters.majorGroup);
    }

    // Include minFrequency in key if specified
    if (filters?.minFrequency) {
      key += `:minfreq_${filters.minFrequency}`;
    }

    return key;
  }

  /**
   * Invalidate all cluster caches.
   * Called when admin performs actions that affect pending/unknown terms.
   */
  async invalidateClusterCache(majorGroup?: string, major?: string): Promise<void> {
    try {
      if (major) {
        await this.cacheService.deleteByPrefix(CLUSTER_CACHE_KEYS.BY_MAJOR(major));
        this.logger.debug(`[Clustering] Invalidated cluster cache for major: ${major}`);
      } else if (majorGroup) {
        await this.cacheService.deleteByPrefix(CLUSTER_CACHE_KEYS.BY_MAJOR_GROUP(majorGroup));
        this.logger.debug(`[Clustering] Invalidated cluster cache for majorGroup: ${majorGroup}`);
      } else {
        await this.cacheService.deleteByPrefix("cluster:pending:");
        this.logger.debug(`[Clustering] Invalidated all cluster caches`);
      }
    } catch (error) {
      this.logger.warn(`[Clustering] Failed to invalidate cache: ${error.message}`);
    }
  }

  /**
   * Refresh clusters for a specific scope (on-demand).
   * Force-recompute and update cache.
   */
  async refreshClustersForScope(filters?: {
    majorGroup?: string;
    major?: string;
    minFrequency?: number;
  }): Promise<SkillClusterOutput[]> {
    const cacheKey = this.generateCacheKey(filters);
    this.logger.log(`[Clustering] Manually refreshing clusters for scope: ${cacheKey}`);

    // Compute fresh clusters
    const clusters = await this.computeClustersPendingCandidates(filters);

    // Update cache
    try {
      await this.cacheService.set(cacheKey, clusters, this.CACHE_TTL_SECONDS);
      this.logger.log(`[Clustering] Successfully refreshed and cached clusters for ${cacheKey}`);
    } catch (error) {
      this.logger.warn(`[Clustering] Failed to cache refreshed clusters: ${error.message}`);
    }

    return clusters;
  }

  // ─── Daily Refresh Task ─────────────────────────────────────────────

  /**
   * Scheduled task to refresh all cluster caches daily at 2 AM.
   * This ensures the system always has fresh clustering data.
   *
   * Cron pattern: 0 2 * * * (2:00 AM every day)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async refreshClustersDaily(): Promise<void> {
    const lockKey = CLUSTER_CACHE_KEYS.REFRESH_LOCK;
    
    try {
      // Check if refresh is already in progress
      const isLocked = await this.cacheService.get<boolean>(lockKey);
      if (isLocked) {
        this.logger.debug(`[Clustering] Daily refresh already in progress, skipping...`);
        return;
      }

      // Set lock
      await this.cacheService.set(lockKey, true, 300); // 5 min lock

      this.logger.log(`[Clustering] Starting daily cluster refresh...`);
      const startTime = Date.now();

      // Refresh global clusters
      await this.refreshClustersForScope({});
      
      // If needed, refresh other scopes (majorGroup/major)
      // This can be extended based on your requirements
      
      const duration = Date.now() - startTime;
      this.logger.log(`[Clustering] Daily cluster refresh completed in ${duration}ms`);

      // Update last refresh time
      await this.cacheService.set(CLUSTER_CACHE_KEYS.LAST_REFRESH, new Date().toISOString(), 86400 * 7); // Keep for 7 days

    } catch (error) {
      this.logger.error(`[Clustering] Daily refresh failed: ${error.message}`, error.stack);
    } finally {
      // Release lock
      try {
        await this.cacheService.delete(lockKey);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Get last refresh time of clusters.
   * Useful for monitoring cache freshness.
   */
  async getLastRefreshTime(): Promise<string | null> {
    return this.cacheService.get<string>(CLUSTER_CACHE_KEYS.LAST_REFRESH);
  }

  // ─── Similarity helpers ─────────────────────────────────────────────

  private tokenize(text: string): Set<string> {
    return new Set(text.split(/[\s\-_./+#]+/).filter((t) => t.length > 0));
  }

  private jaccardTokens(a: Set<string>, b: Set<string>): number {
    if (!a.size || !b.size) return 0;
    let intersection = 0;
    for (const token of a) {
      if (b.has(token)) intersection++;
    }
    const union = a.size + b.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }
}
