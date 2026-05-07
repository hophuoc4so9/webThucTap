import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import axios from "axios";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join, resolve } from "path";
import { Repository, LessThan, MoreThan } from "typeorm";
import { Job } from "../entities/job.entity";
import { MarketTrendCache } from "../entities/market-trend-cache.entity";
import { MarketTrendQueryDto } from "../dto/market-trend.dto";
import { SkillExtractionService } from "./skill-extraction.service";
import { CacheService } from "./cache.service";

const DEFAULT_DAYS = 90;
const DEFAULT_HORIZON = 14;
const DEFAULT_LIMIT_CLUSTERS = 8;
const CACHE_TTL_MS = 60 * 60 * 1000;
const CLUSTER_SIM_THRESHOLD = 0.25;
const EMBEDDING_SIM_THRESHOLD = 0.35;
const MARKET_TREND_CACHE_VERSION = 2;

type MajorItem = {
  name: string;
  group: string;
  code: string;
  key: string;
};

type JobTrendItem = {
  id: number;
  title?: string | null;
  requirement?: string | null;
  tagsRequirement?: string | null;
  description?: string | null;
  industry?: string | null;
  field?: string | null;
  extractedSkills?: string[] | null;
  skillsExtractedAt?: Date | null;
  postedAt?: Date | null;
  deadlineAt?: Date | null;
  createdAt?: Date | null;
  embedding?: number[] | null;
};

type SkillCluster = {
  id: string;
  jobIds: number[];
  jobs: JobTrendItem[];
  skillCounts: Map<string, number>;
  skillSet: Set<string>;
  label: string;
  centroid?: number[] | null;
};

@Injectable()
export class MarketTrendService {
  private readonly logger = new Logger(MarketTrendService.name);
  private readonly cache = new Map<string, { expiresAt: number; payload: any }>();
  private readonly cacheTtlMs = Number(process.env.MARKET_TREND_CACHE_TTL_MS) || CACHE_TTL_MS;
  private catalog: MajorItem[] | null = null;

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(MarketTrendCache)
    private readonly cacheRepo: Repository<MarketTrendCache>,
    private readonly skillExtraction: SkillExtractionService,
    private readonly cacheService: CacheService,
  ) {}

  getTrendsByMajorGroup(majorGroup: string, days: number = DEFAULT_DAYS) {
    return this.getTrends({
      majorGroup: majorGroup.trim(),
      days,
      horizon: DEFAULT_HORIZON,
      limitClusters: DEFAULT_LIMIT_CLUSTERS,
      includeForecast: true,
    });
  }

  async getTrends(query: MarketTrendQueryDto) {
    const days = this.normalizeInt(query.days, DEFAULT_DAYS, 7, 365);
    const horizon = this.normalizeInt(query.horizon, DEFAULT_HORIZON, 1, 90);
    const limitClusters = this.normalizeInt(
      query.limitClusters,
      DEFAULT_LIMIT_CLUSTERS,
      1,
      25,
    );
    const includeForecast = query.includeForecast !== false;

    const cacheKey = JSON.stringify({
      version: MARKET_TREND_CACHE_VERSION,
      major: query.major ?? "",
      majorGroup: query.majorGroup ?? "",
      days,
      horizon,
      limitClusters,
      includeForecast,
    });

    // Check cache
    const cached = await this.getCachedAsync(cacheKey);
    if (cached) return cached;

    const { start, end } = this.buildRange(days);
    const jobs = await this.fetchJobs(start, end);
    const catalog = await this.getCatalog();

    const filteredJobs = this.filterJobsByMajor(jobs, catalog, query.major, query.majorGroup);

    const clusters = await this.clusterJobs(filteredJobs, limitClusters);

    // Build all time series first (fast, can be done in parallel)
    const clusterSeriesData = clusters.map((cluster, index) => ({
      index,
      cluster,
      series: this.buildTimeSeries(cluster.jobs, start, end),
    }));

    // Fetch all forecasts in parallel (much faster than sequentially)
    const forecastRequests = includeForecast
      ? clusterSeriesData.map((data) =>
          this.fetchForecast(data.series, horizon).then((forecast) => ({ ...data, forecast }))
        )
      : clusterSeriesData.map((data) => Promise.resolve({ ...data, forecast: [] }));

    const clusterResults = await Promise.all(forecastRequests).then((results) =>
      results.map((data) => ({
        id: data.cluster.id,
        label: data.cluster.label,
        jobCount: data.cluster.jobIds.length,
        topSkills: Array.from(data.cluster.skillSet),
        series: data.series,
        forecast: data.forecast,
        rank: data.index + 1,
      }))
    );

    const payload = {
      generatedAt: new Date().toISOString(),
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        days,
      },
      major: query.major
        ? {
            name: query.major,
            group: query.majorGroup ?? null,
          }
        : null,
      clusters: clusterResults,
      topMajors: query.major ? [] : this.computeTopMajors(jobs, catalog, start, end),
    };

    this.setCached(cacheKey, payload);
    return payload;
  }

  @Cron("0 2 * * *")
  async refreshDailyCache() {
    try {
      const catalog = await this.getCatalog();

      // Refresh overall trends
      await this.getTrends({ days: DEFAULT_DAYS, horizon: DEFAULT_HORIZON, limitClusters: DEFAULT_LIMIT_CLUSTERS });
      await this.getTrends({ days: 30, horizon: DEFAULT_HORIZON, limitClusters: DEFAULT_LIMIT_CLUSTERS });
      await this.getTrends({ days: 180, horizon: DEFAULT_HORIZON, limitClusters: DEFAULT_LIMIT_CLUSTERS });

      // Get unique major groups
      const majorGroups = [...new Set(catalog.map(item => item.group))].filter(Boolean);
      this.logger.log(`Refreshing cache for ${majorGroups.length} major groups...`);

      // Refresh by major groups (ưu tiên 1)
      for (const group of majorGroups) {
        try {
          await this.getTrendsByMajorGroup(group, 90);
          this.logger.debug(`Refreshed cache for group: ${group}`);
        } catch (error: any) {
          this.logger.warn(`Failed to refresh group ${group}: ${error?.message ?? error}`);
        }
      }

      // Refresh by individual majors (ưu tiên 2)
      this.logger.log(`Refreshing cache for ${catalog.length} individual majors...`);
      for (const major of catalog) {
        try {
          await this.getTrends({
            major: major.name,
            days: 90,
            horizon: DEFAULT_HORIZON,
            limitClusters: DEFAULT_LIMIT_CLUSTERS,
          });
          this.logger.debug(`Refreshed cache for major: ${major.name}`);
        } catch (error: any) {
          this.logger.warn(`Failed to refresh major ${major.name}: ${error?.message ?? error}`);
        }
      }

      this.logger.log(`Market trend cache refreshed (${majorGroups.length} groups + ${catalog.length} majors)`);
    } catch (error: any) {
      this.logger.warn(`Market trend refresh failed: ${error?.message ?? error}`);
    }
  }

  @Cron("0 3 * * *")
  async cleanupExpiredCache() {
    try {
      const result = await this.cacheRepo.delete({
        expiresAt: LessThan(new Date()),
      });
      this.logger.log(`Cleaned up ${result.affected} expired cache entries`);
    } catch (error: any) {
      this.logger.warn(`Cache cleanup failed: ${error?.message ?? error}`);
    }
  }

  private async fetchJobs(start: Date, end: Date): Promise<JobTrendItem[]> {
    const qb = this.jobRepo.createQueryBuilder("job");
    qb.select([
      "job.id",
      "job.title",
      "job.requirement",
      "job.tagsRequirement",
      "job.description",
      "job.industry",
      "job.field",
      "job.extractedSkills",
      "job.skillsExtractedAt",
      "job.postedAt",
      "job.deadlineAt",
      "job.createdAt",
      "job.embedding",
    ]);

    qb.where(
      "(job.deadlineAt BETWEEN :start AND :end) OR (job.postedAt BETWEEN :start AND :end) OR (job.createdAt BETWEEN :start AND :end)",
      { start, end },
    );

    return qb.getMany();
  }

  private async getCatalog(): Promise<MajorItem[]> {
    if (this.catalog) return this.catalog;

    const candidates = [
      process.env.MAJOR_CATALOG_PATH,
      resolve(process.cwd(), "data-crawl", "donviTDMU_phan_cap.json"),
      resolve(process.cwd(), "donviTDMU_phan_cap.json"),
      resolve(process.cwd(), "donviTDMU.json"),
      resolve(process.cwd(), "..", "donviTDMU.json"),
      join(__dirname, "..", "..", "..", "..", "..", "donviTDMU.json"),
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      if (!candidate || !existsSync(candidate)) continue;
      try {
        const raw = await readFile(candidate, "utf-8");
        const parsed = JSON.parse(raw);
        const majors: MajorItem[] = [];
        const groups = Array.isArray(parsed) ? parsed : (parsed?.du_lieu_nganh ?? []);
        for (const group of groups) {
          const groupName = String(group?.nhom ?? "").trim();
          for (const item of group?.nganh_hoc ?? []) {
            const name = String(item?.ten ?? "").trim();
            if (!name) continue;
            majors.push({
              name,
              group: groupName,
              code: String(item?.id_news ?? "").trim(),
              key: this.normalizeKey(name),
            });
          }
        }
        this.catalog = majors;
        return majors;
      } catch (error: any) {
        this.logger.warn(`Failed to load major catalog from ${candidate}: ${error?.message ?? error}`);
      }
    }

    this.catalog = [];
    return [];
  }

  private filterJobsByMajor(
    jobs: JobTrendItem[],
    catalog: MajorItem[],
    major?: string,
    majorGroup?: string,
  ): JobTrendItem[] {
    if (!major && !majorGroup) return jobs;

    const majorKey = major ? this.normalizeKey(major) : null;
    const groupKey = majorGroup ? this.normalizeKey(majorGroup) : null;

    return jobs.filter((job) => {
      const text = this.normalizeKey(
        [job.title, job.industry, job.field, job.requirement, job.description]
          .filter(Boolean)
          .join(" "),
      );

      if (groupKey) {
        const match = this.resolveMajor(job, catalog);
        if (!match || this.normalizeKey(match.group) !== groupKey) return false;
      }

      if (majorKey) {
        const match = this.resolveMajor(job, catalog);
        if (match && match.key === majorKey) return true;
        if (!text.includes(majorKey)) return false;
      }

      return true;
    });
  }

  private resolveMajor(job: JobTrendItem, catalog: MajorItem[]): MajorItem | null {
    if (!catalog.length) return null;
    const text = this.normalizeKey(
      [job.title, job.industry, job.field, job.requirement, job.description]
        .filter(Boolean)
        .join(" "),
    );
    if (!text) return null;

    let best: MajorItem | null = null;
    for (const item of catalog) {
      if (!item.key) continue;
      if (text.includes(item.key)) {
        if (!best || item.key.length > best.key.length) {
          best = item;
        }
      }
    }
    return best;
  }

  private async clusterJobs(jobs: JobTrendItem[], limitClusters: number): Promise<SkillCluster[]> {
    const clusters: SkillCluster[] = [];

    for (const job of jobs) {
      const skills = await this.extractSkills(job);
      if (!skills.length) continue;
      const skillSet = new Set(skills);
      const best = this.pickCluster(clusters, skillSet);

      if (!best || best.score < CLUSTER_SIM_THRESHOLD) {
        const cluster = this.createCluster(skillSet, job);
        clusters.push(cluster);
        continue;
      }

      this.addJobToCluster(best.cluster, skillSet, job);
    }

    this.refineWithEmbeddings(clusters);

    const ranked = clusters
      .sort((a, b) => b.jobIds.length - a.jobIds.length)
      .slice(0, limitClusters);

    return ranked.map((cluster, index) => ({
      ...cluster,
      id: `cluster_${index + 1}`,
      label: cluster.label,
    }));
  }

  private pickCluster(
    clusters: SkillCluster[],
    skillSet: Set<string>,
  ): { cluster: SkillCluster; score: number } | null {
    let best: SkillCluster | null = null;
    let bestScore = 0;

    for (const cluster of clusters) {
      const score = this.jaccard(cluster.skillSet, skillSet);
      if (score > bestScore) {
        bestScore = score;
        best = cluster;
      }
    }

    if (!best) return null;
    return { cluster: best, score: bestScore };
  }

  private createCluster(skillSet: Set<string>, job: JobTrendItem): SkillCluster {
    const skillCounts = new Map<string, number>();
    for (const skill of skillSet) {
      skillCounts.set(skill, 1);
    }
    const label = this.buildClusterLabel(skillSet);
    return {
      id: "",
      jobIds: [job.id],
      jobs: [job],
      skillCounts,
      skillSet: new Set(skillSet),
      label,
      centroid: null,
    };
  }

  private addJobToCluster(cluster: SkillCluster, skillSet: Set<string>, job: JobTrendItem) {
    cluster.jobIds.push(job.id);
    cluster.jobs.push(job);
    for (const skill of skillSet) {
      cluster.skillCounts.set(skill, (cluster.skillCounts.get(skill) ?? 0) + 1);
    }
    cluster.skillSet = this.buildSkillSet(cluster.skillCounts, 12);
    cluster.label = this.buildClusterLabel(cluster.skillSet);
  }

  private refineWithEmbeddings(clusters: SkillCluster[]) {
    const clustersWithEmbedding = clusters.filter((cluster) =>
      cluster.jobs.some((job) => Array.isArray(job.embedding) && job.embedding.length > 0),
    );

    for (const cluster of clustersWithEmbedding) {
      const vectors = cluster.jobs
        .map((job) => job.embedding)
        .filter((embedding): embedding is number[] => Array.isArray(embedding));
      if (vectors.length < 2) continue;
      cluster.centroid = this.meanVector(vectors);
    }

    for (const cluster of clustersWithEmbedding) {
      if (!cluster.centroid) continue;
      for (const job of cluster.jobs) {
        if (!job.embedding) continue;
        let bestCluster = cluster;
        let bestScore = this.cosine(cluster.centroid, job.embedding);

        for (const candidate of clustersWithEmbedding) {
          if (!candidate.centroid) continue;
          const score = this.cosine(candidate.centroid, job.embedding);
          if (score > bestScore + 0.05) {
            bestScore = score;
            bestCluster = candidate;
          }
        }

        if (bestCluster !== cluster && bestScore >= EMBEDDING_SIM_THRESHOLD) {
          cluster.jobIds = cluster.jobIds.filter((id) => id !== job.id);
          cluster.jobs = cluster.jobs.filter((item) => item.id !== job.id);
          bestCluster.jobIds.push(job.id);
          bestCluster.jobs.push(job);
        }
      }
    }
  }

  private buildTimeSeries(jobs: JobTrendItem[], start: Date, end: Date) {
    const counts = new Map<string, number>();
    for (const job of jobs) {
      const date = this.toDateKey(job.deadlineAt ?? job.postedAt ?? job.createdAt ?? null);
      if (!date) continue;
      counts.set(date, (counts.get(date) ?? 0) + 1);
    }

    const series: { date: string; value: number }[] = [];
    let cursor = new Date(start);
    while (cursor <= end) {
      const key = this.toDateKey(cursor);
      series.push({ date: key, value: counts.get(key) ?? 0 });
      cursor = this.addDays(cursor, 1);
    }

    return series;
  }

  private async fetchForecast(series: { date: string; value: number }[], horizon: number) {
    if (!series.length) return [];
    const url = process.env.FORECAST_SERVICE_URL || "http://fastapi-llm-service:8099";

    try {
      const response = await axios.post(
        `${url}/v1/market/forecast`,
        { series, periods: horizon, freq: "D" },
        { timeout: 20000 },
      );
      return response?.data?.forecast ?? [];
    } catch (error: any) {
      this.logger.warn(`Forecast service failed: ${error?.message ?? error}`);
      return [];
    }
  }

  private computeTopMajors(
    jobs: JobTrendItem[],
    catalog: MajorItem[],
    start: Date,
    end: Date,
  ) {
    if (!catalog.length) return [];

    const byMajor: Record<string, { item: MajorItem; counts: Map<string, number> }> = {};
    for (const job of jobs) {
      const match = this.resolveMajor(job, catalog);
      if (!match) continue;
      if (!byMajor[match.key]) {
        byMajor[match.key] = { item: match, counts: new Map() };
      }
      const date = this.toDateKey(job.deadlineAt ?? job.postedAt ?? job.createdAt ?? null);
      if (!date) continue;
      const record = byMajor[match.key];
      record.counts.set(date, (record.counts.get(date) ?? 0) + 1);
    }

    const recentStart = this.addDays(end, -7);
    const previousStart = this.addDays(end, -14);

    return Object.values(byMajor)
      .map((record) => {
        const recent = this.sumRange(record.counts, recentStart, end);
        const previous = this.sumRange(record.counts, previousStart, recentStart);
        const trendScore = previous === 0 ? recent : (recent - previous) / previous;
        const direction = trendScore > 0.1 ? "up" : trendScore < -0.1 ? "down" : "flat";
        return {
          major: record.item.name,
          group: record.item.group,
          code: record.item.code,
          total: this.sumRange(record.counts, start, end),
          recent,
          previous,
          trendScore: Number(trendScore.toFixed(3)),
          direction,
        };
      })
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, 10);
  }

  private async extractSkills(job: JobTrendItem): Promise<string[]> {
    if (Array.isArray(job.extractedSkills) && job.extractedSkills.length > 0) {
      return job.extractedSkills;
    }

    const skills = this.skillExtraction.extractSkillsFromJob({
      title: job.title,
      description: job.description,
      field: job.field,
      tagsRequirement: job.tagsRequirement,
      industry: job.industry,
      requirement: job.requirement,
    });

    if (skills.length > 0) {
      this.jobRepo
        .update(job.id, {
          extractedSkills: skills,
          skillsExtractedAt: new Date(),
        } as Partial<Job>)
        .catch((error: any) => {
          this.logger.warn(`Failed to persist extracted skills for job #${job.id}: ${error?.message ?? error}`);
        });
      job.extractedSkills = skills;
    }

    return skills;
  }

  private buildSkillSet(counts: Map<string, number>, limit: number): Set<string> {
    return new Set(
      Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([skill]) => skill),
    );
  }

  private buildClusterLabel(skillSet: Set<string>): string {
    return Array.from(skillSet).slice(0, 3).join(", ") || "general";
  }

  private jaccard(a: Set<string>, b: Set<string>): number {
    if (!a.size || !b.size) return 0;
    let intersection = 0;
    for (const item of a) {
      if (b.has(item)) intersection += 1;
    }
    const union = a.size + b.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  private meanVector(vectors: number[][]): number[] {
    const length = vectors[0]?.length ?? 0;
    const sums = new Array<number>(length).fill(0);
    for (const vector of vectors) {
      for (let i = 0; i < length; i += 1) {
        sums[i] += vector[i] ?? 0;
      }
    }
    return sums.map((value) => value / vectors.length);
  }

  private cosine(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    const length = Math.min(a.length, b.length);
    for (let i = 0; i < length; i += 1) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (!normA || !normB) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private buildRange(days: number): { start: Date; end: Date } {
    const now = new Date();
    // Start from 'days' ago
    const start = this.addDays(now, -days);
    // End at 'days' from now to include future deadlines
    const end = this.addDays(now, days);
    return { start, end };
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  private toDateKey(date: Date | null): string {
    if (!date) return "";
    return new Date(date).toISOString().slice(0, 10);
  }

  private sumRange(counts: Map<string, number>, start: Date, end: Date): number {
    let total = 0;
    let cursor = new Date(start);
    while (cursor <= end) {
      const key = this.toDateKey(cursor);
      total += counts.get(key) ?? 0;
      cursor = this.addDays(cursor, 1);
    }
    return total;
  }

  private normalizeKey(value: string): string {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s#+.]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private normalizeInt(value: number | undefined, fallback: number, min: number, max: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.round(parsed)));
  }

  private getCached(key: string) {
    // First check in-memory cache
    const memCached = this.cache.get(key);
    if (memCached && memCached.expiresAt > Date.now()) {
      return memCached.payload;
    }
    this.cache.delete(key);
    return null;
  }

  private async getCachedAsync(key: string) {
    // First check in-memory cache
    const memCached = this.cache.get(key);
    if (memCached && memCached.expiresAt > Date.now()) {
      return memCached.payload;
    }

    const redisCached = await this.cacheService.get<any>(`market-trends:${key}`);
    if (redisCached) {
      this.cache.set(key, {
        payload: redisCached,
        expiresAt: Date.now() + this.cacheTtlMs,
      });
      return redisCached;
    }

    // Then check database cache
    try {
      const dbCached = await this.cacheRepo.findOne({
        where: { cacheKey: key, expiresAt: MoreThan(new Date()) },
      });
      if (dbCached) {
        // Restore to memory cache
        this.cache.set(key, {
          payload: dbCached.data,
          expiresAt: new Date(dbCached.expiresAt).getTime(),
        });
        return dbCached.data;
      }
    } catch (error: any) {
      this.logger.warn(`Database cache lookup failed: ${error?.message ?? error}`);
    }

    return null;
  }

  private setCached(key: string, payload: any) {
    const expiresAt = Date.now() + this.cacheTtlMs;

    // Set in-memory cache
    this.cache.set(key, {
      payload,
      expiresAt,
    });

    this.cacheService
      .set(`market-trends:${key}`, payload, Math.ceil(this.cacheTtlMs / 1000))
      .catch((error: any) => {
        this.logger.warn(`Redis cache set failed: ${error?.message ?? error}`);
      });

    // Set database cache (async, don't wait)
    this.setCachedAsync(key, payload, expiresAt).catch((error: any) => {
      this.logger.warn(`Database cache set failed: ${error?.message ?? error}`);
    });
  }

  private async setCachedAsync(key: string, payload: any, expiresAt: number) {
    try {
      await this.cacheRepo.upsert(
        {
          cacheKey: key,
          data: payload,
          expiresAt: new Date(expiresAt),
        },
        ["cacheKey"],
      );
    } catch (error: any) {
      this.logger.warn(`Database cache upsert failed: ${error?.message ?? error}`);
    }
  }
}
