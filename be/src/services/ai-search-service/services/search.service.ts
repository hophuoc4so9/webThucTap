import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { EmbeddingService } from "./embedding.service";
import { CacheService } from "./cache.service";
import {
  SearchQueryDto,
  AdvancedSearchResponseDto,
  AdvancedSearchResultDto,
} from "../dto/search-query.dto";

interface JobSearchSchema {
  hasSkills: boolean;
  hasCreatedAt: boolean;
  hasDeletedAt: boolean;
  hasApplyDeadline: boolean;
  hasApplyCount: boolean;
  hasPopularityScore: boolean;
  hasIndexedAt: boolean;
  hasCompanyReputation: boolean;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private jobSchemaPromise?: Promise<JobSearchSchema>;
  private readonly pendingRequests = new Map<string, Promise<AdvancedSearchResponseDto>>();

  constructor(
    private readonly dataSource: DataSource,
    private readonly embeddingService: EmbeddingService,
    private readonly cacheService: CacheService,
  ) {}

  async search(query: SearchQueryDto): Promise<AdvancedSearchResponseDto> {
    const startTime = Date.now();
    this.logger.log(`>> RECEIVED SEARCH REQUEST: ${JSON.stringify(query)}`);
    const cacheKey = `search_${Buffer.from(JSON.stringify(query)).toString("base64")}`;

    const cached = await this.cacheService.get<AdvancedSearchResponseDto>(cacheKey);
    if (cached) {
      return { ...cached, executionTimeMs: Date.now() - startTime };
    }

    if (this.pendingRequests.has(cacheKey)) {
      this.logger.log(`Joining pending search request for key: ${cacheKey}`);
      const result = await this.pendingRequests.get(cacheKey);
      return { ...result, executionTimeMs: Date.now() - startTime };
    }

    const promise = this.performSearch(query, startTime, cacheKey);
    this.pendingRequests.set(cacheKey, promise);
    return promise;
  }

  private async performSearch(
    query: SearchQueryDto,
    startTime: number,
    cacheKey: string,
  ): Promise<AdvancedSearchResponseDto> {
    try {
      const schema = await this.getJobSearchSchema();
      const page = query.page || 1;
      const limit = query.limit || 20;
      const searchTerms = this.extractSearchTerms(query.query);
      this.logger.log(`Performing search: "${query.query}"`);

      this.logger.log(`Step 1: Generating embedding...`);
      const queryEmbedding = await this.embeddingService.generateQueryEmbedding(query.query);
      const vectorLiteral = `[${queryEmbedding.join(",")}]`;

      const weights = {
        contentSim: query.weights?.contentSim ?? 0.35,
        popularity: query.weights?.popularity ?? 0.15,
        companyBoost: query.weights?.companyBoost ?? 0.15,
        recency: 0.15,
        urgency: 0.1,
        skillMatch: 0.1,
      };

      const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
      const normalizedWeights: Record<string, number> = Object.entries(weights).reduce(
        (acc, [key, val]) => ({ ...acc, [key]: val / totalWeight }),
        {},
      );

      const selectParameters: Record<string, any> = {
        queryVector: vectorLiteral,
        contentWeight: normalizedWeights.contentSim,
        popularityWeight: normalizedWeights.popularity,
        companyWeight: normalizedWeights.companyBoost,
        recencyWeight: normalizedWeights.recency,
        urgencyWeight: normalizedWeights.urgency,
        skillMatchWeight: normalizedWeights.skillMatch,
      };

      searchTerms.slice(0, 6).forEach((term, index) => {
        selectParameters[`skillKeyword${index + 1}`] = `%${term}%`;
      });

      this.logger.log(`Step 2: Building and executing query...`);
      const [rows, total] = await Promise.all([
        this.dataSource.createQueryBuilder()
          .select("candidates.*")
          .addSelect(`(candidates.similarity_score * :contentWeight + candidates.popularity_score * :popularityWeight + candidates.company_reputation * :companyWeight + candidates.recency_score * :recencyWeight + candidates.urgency_score * :urgencyWeight + candidates.skill_match_score * :skillMatchWeight)`, "combined_score")
          .from(sub => {
            sub
              .select("j.id", "id").addSelect("j.title", "title").addSelect("j.company", "company").addSelect("j.location", "location")
              .addSelect("j.salary", "salary").addSelect("j.salary_min", "salary_min").addSelect("j.salary_max", "salary_max")
              .addSelect("j.description", "description").addSelect("j.industry", "industry")
              .addSelect(this.buildPopularityExpr(schema), "popularity_score")
              .addSelect(this.buildCompanyReputationExpr(schema), "company_reputation")
              .addSelect(this.buildRecencyScore(schema), "recency_score")
              .addSelect(this.buildUrgencyScore(schema), "urgency_score")
              .addSelect(this.buildSkillMatchScore(schema, searchTerms), "skill_match_score")
              .addSelect(`1.0 - (j.embedding <=> :queryVector::vector)`, "similarity_score")
              .from("jobs", "j").leftJoin("companies", "c", "j.company_id = c.id")
              .where("j.embedding IS NOT NULL").andWhere(schema.hasDeletedAt ? "j.deleted_at IS NULL" : "1=1");

            if (query.location) sub.andWhere("j.location ILIKE :location", { location: `%${query.location}%` });
            if (query.industry) sub.andWhere("j.industry ILIKE :industry", { industry: `%${query.industry}%` });
            if (query.salaryMin) sub.andWhere("j.salary_min >= :salaryMin", { salaryMin: query.salaryMin });
            if (query.salaryMax) sub.andWhere("j.salary_max <= :salaryMax", { salaryMax: query.salaryMax });

            return sub.orderBy("j.embedding <=> :queryVector::vector", "ASC").limit(500);
          }, "candidates")
          .setParameters(selectParameters)
          .orderBy("combined_score", "DESC")
          .limit(limit)
          .offset((page - 1) * limit)
          .getRawMany(),
        this.buildFilteredQueryCount(query, schema),
      ]);
      this.logger.log(`Step 3: Found ${rows.length} results. Total: ${total}`);

      const data: AdvancedSearchResultDto[] = rows.map((row) => ({
        id: Number(row.id),
        title: row.title,
        company: row.company,
        location: row.location,
        salary: row.salary,
        salaryMin: row.salary_min ? Number(row.salary_min) : null,
        salaryMax: row.salary_max ? Number(row.salary_max) : null,
        description: row.description,
        industry: row.industry,
        similarityScore: Number(row.similarity_score || 0),
        combinedScore: Number(row.combined_score || 0),
        reason: this.determineReason(
          Number(row.similarity_score || 0),
          Number(row.popularity_score || 0),
          Number(row.company_reputation || 0),
          Number(row.recency_score || 0),
          Number(row.urgency_score || 0),
          Number(row.skill_match_score || 0),
        ),
      }));

      const result: AdvancedSearchResponseDto = { data, total, page, limit, executionTimeMs: Date.now() - startTime };
      await this.cacheService.set(cacheKey, result, 600);
      return result;
    } catch (error: any) {
      this.logger.error(`Semantic search failed: ${error.message}`, error.stack);
      throw error;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async getJobSearchSchema(): Promise<JobSearchSchema> {
    if (!this.jobSchemaPromise) this.jobSchemaPromise = this.loadJobSearchSchema();
    return this.jobSchemaPromise;
  }

  private async loadJobSearchSchema(): Promise<JobSearchSchema> {
    try {
      const [jobColumns, companyColumns] = await Promise.all([
        this.dataSource.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'jobs'`),
        this.dataSource.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'companies'`),
      ]);
      const jobColumnSet = new Set(jobColumns.map((r: any) => r.column_name));
      const companyColumnSet = new Set(companyColumns.map((r: any) => r.column_name));
      return {
        hasSkills: jobColumnSet.has("skills"),
        hasCreatedAt: jobColumnSet.has("created_at"),
        hasDeletedAt: jobColumnSet.has("deleted_at"),
        hasApplyDeadline: jobColumnSet.has("apply_deadline"),
        hasApplyCount: jobColumnSet.has("apply_count"),
        hasPopularityScore: jobColumnSet.has("popularity_score"),
        hasIndexedAt: jobColumnSet.has("indexed_at"),
        hasCompanyReputation: companyColumnSet.has("reputation_score"),
      };
    } catch {
      return { 
        hasSkills: false, 
        hasCreatedAt: true, 
        hasDeletedAt: false, 
        hasApplyDeadline: false, 
        hasApplyCount: false, 
        hasPopularityScore: false, 
        hasIndexedAt: false, 
        hasCompanyReputation: false 
      };
    }
  }

  private extractSearchTerms(query: string): string[] {
    return Array.from(new Set(query.toLowerCase().split(/[\s,.;:!?()\-_/\\|]+/).filter(t => t.length >= 3))).slice(0, 6);
  }

  private buildPopularityExpr(schema: JobSearchSchema): string {
    return schema.hasPopularityScore ? "COALESCE(j.popularity_score, 0.0)" : "0.0";
  }

  private buildCompanyReputationExpr(schema: JobSearchSchema): string {
    return schema.hasCompanyReputation ? "COALESCE(c.reputation_score, 0.0)" : "0.0";
  }

  private buildRecencyScore(schema: JobSearchSchema): string {
    const col = schema.hasCreatedAt ? "j.created_at" : schema.hasIndexedAt ? "j.indexed_at" : null;
    if (!col) return "0.5";
    return `CASE WHEN EXTRACT(DAY FROM NOW() - ${col}) <= 7 THEN 1.0 WHEN EXTRACT(DAY FROM NOW() - ${col}) <= 30 THEN 0.7 ELSE 0.1 END`;
  }

  private buildUrgencyScore(schema: JobSearchSchema): string {
    if (!schema.hasApplyDeadline) return "0.5";
    return `CASE WHEN j.apply_deadline IS NOT NULL AND EXTRACT(DAY FROM j.apply_deadline - NOW()) < 7 THEN 1.0 ELSE 0.5 END`;
  }

  private buildSkillMatchScore(schema: JobSearchSchema, searchTerms: string[]): string {
    if (searchTerms.length === 0) return "0.0";
    const fields = ["j.title", "j.description", "j.industry"];
    const weight = 1 / (fields.length * searchTerms.length);
    const exprs = searchTerms.map((_, i) => fields.map(f => `CASE WHEN ${f} ILIKE :skillKeyword${i + 1} THEN ${weight} ELSE 0.0 END`).join(" + "));
    return `(${exprs.join(" + ")})`;
  }

  private buildFilteredQuery(query: SearchQueryDto, schema: JobSearchSchema, searchTerms: string[]) {
    const qb = this.dataSource.createQueryBuilder()
      .select("j.id", "id").addSelect("j.title", "title").addSelect("j.company", "company").addSelect("j.location", "location")
      .addSelect("j.salary", "salary").addSelect("j.salary_min", "salary_min").addSelect("j.salary_max", "salary_max")
      .addSelect("j.description", "description").addSelect("j.industry", "industry")
      .addSelect(this.buildPopularityExpr(schema), "popularity_score")
      .addSelect(this.buildCompanyReputationExpr(schema), "company_reputation")
      .addSelect(this.buildRecencyScore(schema), "recency_score")
      .addSelect(this.buildUrgencyScore(schema), "urgency_score")
      .addSelect(this.buildSkillMatchScore(schema, searchTerms), "skill_match_score")
      .from("jobs", "j").leftJoin("companies", "c", "j.company_id = c.id")
      .where("j.embedding IS NOT NULL").andWhere(schema.hasDeletedAt ? "j.deleted_at IS NULL" : "1=1");
    if (query.location) qb.andWhere("j.location ILIKE :location", { location: `%${query.location}%` });
    if (query.industry) qb.andWhere("j.industry ILIKE :industry", { industry: `%${query.industry}%` });
    if (query.salaryMin) qb.andWhere("j.salary_min >= :salaryMin", { salaryMin: query.salaryMin });
    if (query.salaryMax) qb.andWhere("j.salary_max <= :salaryMax", { salaryMax: query.salaryMax });
    return qb;
  }

  private async buildFilteredQueryCount(query: SearchQueryDto, schema: JobSearchSchema): Promise<number> {
    const qb = this.dataSource.createQueryBuilder()
      .select("COUNT(j.id)", "count")
      .from("jobs", "j")
      .where("j.embedding IS NOT NULL")
      .andWhere(schema.hasDeletedAt ? "j.deleted_at IS NULL" : "1=1");
    if (query.location) qb.andWhere("j.location ILIKE :location", { location: `%${query.location}%` });
    if (query.industry) qb.andWhere("j.industry ILIKE :industry", { industry: `%${query.industry}%` });
    if (query.salaryMin) qb.andWhere("j.salary_min >= :salaryMin", { salaryMin: query.salaryMin });
    if (query.salaryMax) qb.andWhere("j.salary_max <= :salaryMax", { salaryMax: query.salaryMax });
    
    const result = await qb.getRawOne();
    return parseInt(result?.count || "0", 10);
  }

  private determineReason(sim: number, pop: number, rep: number, rec: number, urg: number, skill: number): string {
    if (sim >= 0.8) return "Excellent job match";
    if (skill >= 0.7) return "Strong skill alignment";
    if (rec >= 0.9) return "Recently posted match";
    return "Relevant job match";
  }

  async searchCandidates(query: any): Promise<any> {
     return { data: [], total: 0 }; // Placeholder
  }
}