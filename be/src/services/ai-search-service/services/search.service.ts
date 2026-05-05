import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { EmbeddingService } from "./embedding.service";
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

  constructor(
    private readonly dataSource: DataSource,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async search(
    query: SearchQueryDto,
  ): Promise<AdvancedSearchResponseDto> {
    const startTime = Date.now();

    try {
      const schema = await this.getJobSearchSchema();
      const page = query.page || 1;
      const limit = query.limit || 20;
      const searchTerms = this.extractSearchTerms(query.query);

      // Generate embedding for user query
      const queryEmbedding =
        await this.embeddingService.generateQueryEmbedding(query.query);

      // Convert to pgvector format: [0.1,0.2,0.3]
      const vectorLiteral = `[${queryEmbedding.join(",")}]`;

      // Default weights for scoring factors
      const weights = {
        contentSim: query.weights?.contentSim ?? 0.35,
        popularity: query.weights?.popularity ?? 0.15,
        companyBoost: query.weights?.companyBoost ?? 0.15,
        recency: 0.15, // Prefer recently posted jobs
        urgency: 0.1, // Prefer jobs expiring soon
        skillMatch: 0.1, // Bonus for matching keywords
      };

      // Normalize weights so they sum to 1
      const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
      const normalizedWeights: Record<string, number> = Object.entries(weights).reduce(
        (acc, [key, val]) => ({
          ...acc,
          [key]: val / totalWeight,
        }),
        {},
      );

      // Build SQL query using pgvector
      const qb = this.buildFilteredQuery(query, schema);
      const recencyCalc = this.buildRecencyScore(schema);
      const urgencyCalc = this.buildUrgencyScore(schema);
      const skillMatchCalc = this.buildSkillMatchScore(schema, searchTerms);
      const popularityExpr = this.buildPopularityExpr(schema);
      const companyReputationExpr = this.buildCompanyReputationExpr(schema);

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

      qb.addSelect(
        `1.0 - (j.embedding <=> :queryVector::vector)`,
        "similarity_score",
      )
        .addSelect(recencyCalc, "recency_score")
        .addSelect(urgencyCalc, "urgency_score")
        .addSelect(skillMatchCalc, "skill_match_score")
        .addSelect(
          `
          (
            COALESCE(1.0 - (j.embedding <=> :queryVector::vector), 0.0) * :contentWeight
            +
            (${popularityExpr}) * :popularityWeight
            +
            (${companyReputationExpr}) * :companyWeight
            +
            (${recencyCalc}) * :recencyWeight
            +
            (${urgencyCalc}) * :urgencyWeight
            +
            (${skillMatchCalc}) * :skillMatchWeight
          )
          `,
          "combined_score",
        )
        .setParameters(selectParameters)
        .orderBy("combined_score", "DESC")
        .limit(limit)
        .offset((page - 1) * limit);

      const [rows, total] = await Promise.all([
        qb.getRawMany(),
        this.buildFilteredQueryCount(query, schema),
      ]);

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

      return {
        data,
        total,
        page,
        limit,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error: any) {
      this.logger.error(
        `Semantic search failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async getJobSearchSchema(): Promise<JobSearchSchema> {
    if (!this.jobSchemaPromise) {
      this.jobSchemaPromise = this.loadJobSearchSchema();
    }

    return this.jobSchemaPromise;
  }

  private async loadJobSearchSchema(): Promise<JobSearchSchema> {
    try {
      const [jobColumns, companyColumns] = await Promise.all([
        this.dataSource.query(
          `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'jobs'
          `,
        ),
        this.dataSource.query(
          `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'companies'
          `,
        ),
      ]);

      const jobColumnSet = new Set<string>(
        jobColumns.map((row: { column_name: string }) => row.column_name),
      );
      const companyColumnSet = new Set<string>(
        companyColumns.map((row: { column_name: string }) => row.column_name),
      );

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
    } catch (error: any) {
      this.logger.warn(
        `Could not inspect database schema, using safe defaults: ${error.message}`,
      );

      return {
        hasSkills: false,
        hasCreatedAt: false,
        hasDeletedAt: false,
        hasApplyDeadline: false,
        hasApplyCount: true,
        hasPopularityScore: true,
        hasIndexedAt: true,
        hasCompanyReputation: true,
      };
    }
  }

  private extractSearchTerms(query: string): string[] {
    return Array.from(
      new Set(
        query
          .toLowerCase()
          .split(/[\s,.;:!?()\-_/\\|]+/)
          .map((term) => term.trim())
          .filter((term) => term.length >= 3),
      ),
    ).slice(0, 6);
  }

  private buildPopularityExpr(schema: JobSearchSchema): string {
    return schema.hasPopularityScore ? "COALESCE(j.popularity_score, 0.0)" : "0.0";
  }

  private buildCompanyReputationExpr(schema: JobSearchSchema): string {
    return schema.hasCompanyReputation ? "COALESCE(c.reputation_score, 0.0)" : "0.0";
  }

  private buildRecencyScore(schema: JobSearchSchema): string {
    if (schema.hasCreatedAt) {
      return `
        CASE 
          WHEN EXTRACT(DAY FROM NOW() - j.created_at) <= 7 THEN 1.0
          WHEN EXTRACT(DAY FROM NOW() - j.created_at) <= 30 THEN 0.7
          WHEN EXTRACT(DAY FROM NOW() - j.created_at) <= 90 THEN 0.4
          ELSE 0.1
        END
      `;
    }

    if (schema.hasIndexedAt) {
      return `
        CASE 
          WHEN EXTRACT(DAY FROM NOW() - j.indexed_at) <= 7 THEN 1.0
          WHEN EXTRACT(DAY FROM NOW() - j.indexed_at) <= 30 THEN 0.7
          WHEN EXTRACT(DAY FROM NOW() - j.indexed_at) <= 90 THEN 0.4
          ELSE 0.1
        END
      `;
    }

    return `0.5`;
  }

  private buildUrgencyScore(schema: JobSearchSchema): string {
    if (schema.hasApplyDeadline && schema.hasApplyCount) {
      return `
        CASE
          WHEN j.apply_deadline IS NOT NULL AND EXTRACT(DAY FROM j.apply_deadline - NOW()) < 7 THEN 1.0
          WHEN COALESCE(j.apply_count, 0) > 100 THEN 0.8
          WHEN COALESCE(j.apply_count, 0) > 50 THEN 0.6
          ELSE 0.5
        END
      `;
    }

    if (schema.hasApplyDeadline) {
      return `
        CASE
          WHEN j.apply_deadline IS NOT NULL AND EXTRACT(DAY FROM j.apply_deadline - NOW()) < 7 THEN 1.0
          WHEN j.apply_deadline IS NOT NULL AND EXTRACT(DAY FROM j.apply_deadline - NOW()) < 30 THEN 0.7
          ELSE 0.5
        END
      `;
    }

    if (schema.hasApplyCount) {
      return `
        CASE
          WHEN COALESCE(j.apply_count, 0) > 100 THEN 0.8
          WHEN COALESCE(j.apply_count, 0) > 50 THEN 0.6
          ELSE 0.5
        END
      `;
    }

    return `0.5`;
  }

  private buildSkillMatchScore(
    schema: JobSearchSchema,
    searchTerms: string[],
  ): string {
    if (searchTerms.length === 0) {
      return `0.0`;
    }

    const fields = [
      "j.title",
      "j.description",
      "j.requirement",
      "j.field",
      "j.industry",
      "j.location",
      "j.tags_requirement",
      "j.tags_benefit",
      "j.job_type",
    ];

    if (schema.hasSkills) {
      fields.push("j.skills");
    }

    const terms = searchTerms.slice(0, 6);
    const fieldWeight = 1 / fields.length;
    const termExpressions = terms.map((_, termIndex) => {
      const keywordParam = `:skillKeyword${termIndex + 1}`;
      const fieldExpressions = fields.map(
        (field) =>
          `CASE WHEN ${field} ILIKE ${keywordParam} THEN ${fieldWeight} ELSE 0.0 END`,
      );

      return `(${fieldExpressions.join(" + ")})`;
    });

    return `(${termExpressions.join(" + ")}) / ${terms.length}`;
  }

  private buildFilteredQuery(query: SearchQueryDto, schema: JobSearchSchema) {
    const qb = this.dataSource
      .createQueryBuilder()
      .select("j.id", "id")
      .addSelect("j.title", "title")
      .addSelect("j.company", "company")
      .addSelect("j.location", "location")
      .addSelect("j.salary", "salary")
      .addSelect("j.salary_min", "salary_min")
      .addSelect("j.salary_max", "salary_max")
      .addSelect("j.description", "description")
      .addSelect("j.industry", "industry")
      .addSelect(this.buildPopularityExpr(schema), "popularity_score")
      .addSelect(schema.hasApplyCount ? "COALESCE(j.apply_count, 0)" : "0", "apply_count")
      .addSelect(schema.hasApplyDeadline ? "j.apply_deadline" : "NULL", "apply_deadline")
      .addSelect(
        schema.hasCreatedAt
          ? "j.created_at"
          : schema.hasIndexedAt
            ? "j.indexed_at"
            : "NULL",
        "created_at",
      )
      .addSelect(this.buildCompanyReputationExpr(schema), "company_reputation")
      .from("jobs", "j")
      .leftJoin("companies", "c", "j.company_id = c.id")
      .where("j.embedding IS NOT NULL")
      .andWhere(schema.hasDeletedAt ? "j.deleted_at IS NULL" : "1=1");

    // Location filter
    if (query.location) {
      qb.andWhere("j.location ILIKE :location", {
        location: `%${query.location}%`,
      });
    }

    // Industry filter
    if (query.industry) {
      qb.andWhere("j.industry ILIKE :industry", {
        industry: `%${query.industry}%`,
      });
    }

    // Source filter (e.g., LinkedIn, Indeed)
    if (query.src) {
      qb.andWhere("j.src = :src", {
        src: query.src,
      });
    }

    // Salary range filter
    if (query.salaryMin !== undefined) {
      qb.andWhere(
        "(j.salary_min >= :salaryMin OR j.salary_max >= :salaryMin OR j.salary_min IS NULL)",
        {
          salaryMin: query.salaryMin,
        },
      );
    }

    if (query.salaryMax !== undefined) {
      qb.andWhere(
        "(j.salary_max <= :salaryMax OR j.salary_min <= :salaryMax OR j.salary_max IS NULL)",
        {
          salaryMax: query.salaryMax,
        },
      );
    }

    // Filter out expired job postings
    if (schema.hasApplyDeadline) {
      qb.andWhere("(j.apply_deadline IS NULL OR j.apply_deadline > NOW())");
    }

    return qb;
  }

  /**
   * Build count query for filtered results (without using .getCount() which requires entity metadata)
   */
  private async buildFilteredQueryCount(
    query: SearchQueryDto,
    schema: JobSearchSchema,
  ): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM jobs j 
               LEFT JOIN companies c ON j.company_id = c.id
               WHERE j.embedding IS NOT NULL`;

    if (schema.hasDeletedAt) {
      sql += ` AND j.deleted_at IS NULL`;
    }

    const params: any[] = [];
    let paramIndex = 1;

    // Location filter
    if (query.location) {
      sql += ` AND j.location ILIKE $${paramIndex}`;
      params.push(`%${query.location}%`);
      paramIndex++;
    }

    // Industry filter
    if (query.industry) {
      sql += ` AND j.industry ILIKE $${paramIndex}`;
      params.push(`%${query.industry}%`);
      paramIndex++;
    }

    // Source filter
    if (query.src) {
      sql += ` AND j.src = $${paramIndex}`;
      params.push(query.src);
      paramIndex++;
    }

    // Salary range filter
    if (query.salaryMin !== undefined) {
      sql += ` AND (j.salary_min >= $${paramIndex} OR j.salary_max >= $${paramIndex} OR j.salary_min IS NULL)`;
      params.push(query.salaryMin);
      paramIndex++;
    }

    if (query.salaryMax !== undefined) {
      sql += ` AND (j.salary_max <= $${paramIndex} OR j.salary_min <= $${paramIndex} OR j.salary_max IS NULL)`;
      params.push(query.salaryMax);
      paramIndex++;
    }

    // Filter out expired job postings when deadline column exists
    if (schema.hasApplyDeadline) {
      sql += ` AND (j.apply_deadline IS NULL OR j.apply_deadline > NOW())`;
    }

    try {
      const result = await this.dataSource.query(sql, params);
      return parseInt(result[0]?.count || "0", 10);
    } catch (error: any) {
      this.logger.warn(
        `Failed to get count query, returning 0: ${error.message}`,
      );
      return 0;
    }
  }

  private determineReason(
    similarity: number,
    popularity: number,
    companyReputation: number,
    recency: number = 0,
    urgency: number = 0,
    skillMatch: number = 0,
  ): string {
    // Priority ranking: excellent match > content match > recency > urgency > popularity > company > other
    
    if (similarity >= 0.8) {
      return "Excellent job match - High semantic relevance";
    }

    if (similarity >= 0.65 && skillMatch >= 0.7) {
      return "Strong match - Skills and content aligned";
    }

    if (similarity >= 0.65) {
      return "Strong match - Content relevance";
    }

    if (recency >= 0.9 && similarity >= 0.5) {
      return "Recently posted - High match";
    }

    if (urgency >= 0.8) {
      return "Urgent hiring - Expiring deadline or many applicants";
    }

    if (popularity >= 0.7) {
      return "Popular position - High application rate";
    }

    if (companyReputation >= 0.8) {
      return "Top company - Strong reputation";
    }

    if (recency >= 0.7) {
      return "Recently posted - Good opportunity";
    }

    return "Relevant job - Matches your criteria";
  }
}