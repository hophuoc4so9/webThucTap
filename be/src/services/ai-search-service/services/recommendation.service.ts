import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { EmbeddingService } from "./embedding.service";
import {
  RecommendationQueryDto,
  RecommendationResponseDto,
  RecommendationResultDto,
} from "../dto/recommend-query.dto";

/**
 * RecommendationService: Hybrid recommendation engine combining:
 * - Content-based  : pgvector cosine similarity on job embeddings
 * - Collaborative  : user interaction patterns (other users who interacted with the same jobs)
 * - Popularity     : apply_count / popularity_score
 * - Company boost  : reputation_score
 *
 * Embedding is stored as pgvector text "[0.1,0.2,...]" — NOT binary Buffer.
 */
@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly embeddingService: EmbeddingService,
  ) {}

  // ─── Public API ──────────────────────────────────────────────────────────────

  async recommendForUser(
    query: RecommendationQueryDto,
  ): Promise<RecommendationResponseDto> {
    const startTime = Date.now();

    try {
      const { userId, currentJobId, topK = 6 } = query;

      if (!userId && !currentJobId) {
        throw new Error("At least one of userId or currentJobId must be provided");
      }

      const weights = {
        contentSim:    query.weights?.contentSim    ?? 0.50,
        collaborative: query.weights?.collaborative ?? 0.25,
        popularity:    query.weights?.popularity    ?? 0.15,
        companyBoost:  query.weights?.companyBoost  ?? 0.10,
      };

      // Determine the anchor embedding
      let anchorVector: string | null = null;
      let userInteractedIds: number[] = [];

      if (currentJobId) {
        // Use embedding of the current job as anchor (content-based pivot)
        anchorVector = await this.getJobVectorLiteral(currentJobId);
      }

      if (userId) {
        // Build user preference vector from interaction history
        userInteractedIds = await this.getUserInteractedJobIds(userId);

        if (!anchorVector && userInteractedIds.length > 0) {
          // Average vectors of last-5 interacted jobs via pgvector
          anchorVector = await this.buildAverageVector(userInteractedIds.slice(0, 5));
        }
      }

      if (!anchorVector) {
        // Fallback: return trending jobs (no vector to anchor on)
        const trending = await this.getTrendingJobs(topK, userInteractedIds);
        return {
          data: trending,
          executionTimeMs: Date.now() - startTime,
          explanation: "Trending jobs (no user history available)",
        };
      }

      // Content-based: pgvector similarity — fast, uses index
      const contentBased = await this.findByVector(
        anchorVector,
        topK * 3,
        currentJobId ? [currentJobId] : [],
        userInteractedIds,
      );

      // Collaborative: jobs popular among similar users
      const collaborative = userId
        ? await this.findCollaborativeMatches(userId, topK * 2, userInteractedIds)
        : [];

      // Hybrid merge & rank
      const merged = this.hybridMerge(
        contentBased,
        collaborative,
        weights,
        topK,
      );

      return {
        data: merged,
        executionTimeMs: Date.now() - startTime,
        explanation: this.buildExplanation(merged, !!userId, !!currentJobId),
      };
    } catch (error: any) {
      this.logger.error(`Recommendation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async recommendByQuizScore(
    quizAnswerId: number,
    topK: number = 10,
  ): Promise<RecommendationResponseDto> {
    const startTime = Date.now();

    try {
      const [quizAnswer] = await this.dataSource.query(
        `SELECT * FROM questionnaire_answers WHERE id = $1`,
        [quizAnswerId],
      );
      if (!quizAnswer) throw new Error(`Quiz answer ${quizAnswerId} not found`);

      const categories: string[] = quizAnswer.recommended_categories || [];
      const skills: string[]     = quizAnswer.recommended_skills     || [];
      const score: number        = quizAnswer.score || 0;

      let sql = `
        SELECT j.id, j.title, j.company, j.location, j.salary,
               j.salary_min, j.salary_max, j.description, j.industry,
               COALESCE(j.popularity_score, 0.0) as popularity_score,
               COALESCE(c.reputation_score, 0.0) as reputation_score
        FROM jobs j
        LEFT JOIN companies c ON j.company_id = c.id
        WHERE j.embedding IS NOT NULL
      `;
      const params: any[] = [];

      const filters: string[] = [];
      categories.forEach((cat) => {
        params.push(`%${cat}%`);
        filters.push(`j.industry ILIKE $${params.length}`);
      });
      skills.forEach((sk) => {
        params.push(`%${sk}%`);
        filters.push(`j.title ILIKE $${params.length}`);
      });
      if (filters.length > 0) {
        sql += ` AND (${filters.join(" OR ")})`;
      }

      params.push(topK * 2);
      sql += ` ORDER BY j.popularity_score DESC LIMIT $${params.length}`;

      const jobs = await this.dataSource.query(sql, params);

      const scored: RecommendationResultDto[] = jobs
        .map((job: any) => ({
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          salary: job.salary,
          salaryMin: job.salary_min,
          salaryMax: job.salary_max,
          description: job.description,
          industry: job.industry,
          score: score / 100,
          reason: "quiz_matched",
          matchDetails: { quizMatch: score / 100 },
        }))
        .slice(0, topK);

      return {
        data: scored,
        executionTimeMs: Date.now() - startTime,
        explanation: `${scored.length} jobs matched your quiz profile (score: ${score.toFixed(1)}/100)`,
      };
    } catch (error: any) {
      this.logger.error(`Quiz-based recommendation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  /** Get the pgvector literal string "[x,y,...]" from a job row */
  private async getJobVectorLiteral(jobId: number): Promise<string | null> {
    const rows = await this.dataSource.query(
      `SELECT embedding::text as emb FROM jobs WHERE id = $1 AND embedding IS NOT NULL LIMIT 1`,
      [jobId],
    );
    return rows[0]?.emb ?? null;
  }

  /** IDs of jobs the user previously interacted with */
  private async getUserInteractedJobIds(userId: number): Promise<number[]> {
    const rows = await this.dataSource.query(
      `SELECT DISTINCT job_id FROM user_job_interactions WHERE user_id = $1 ORDER BY job_id DESC LIMIT 50`,
      [userId],
    );
    return rows.map((r: any) => Number(r.job_id));
  }

  /**
   * Build an average embedding vector from a list of job IDs using pgvector.
   * Returns a "[x,y,...]" literal ready for use in queries.
   */
  private async buildAverageVector(jobIds: number[]): Promise<string | null> {
    if (jobIds.length === 0) return null;
    const placeholders = jobIds.map((_, i) => `$${i + 1}`).join(", ");
    const rows = await this.dataSource.query(
      `SELECT avg(embedding)::text as avg_emb
       FROM jobs
       WHERE id IN (${placeholders}) AND embedding IS NOT NULL`,
      jobIds,
    );
    return rows[0]?.avg_emb ?? null;
  }

  /**
   * Content-based: find similar jobs using pgvector cosine distance.
   * Excludes the pivot job and already-interacted jobs.
   */
  private async findByVector(
    vectorLiteral: string,
    limit: number,
    excludeIds: number[],
    alsoExclude: number[],
  ): Promise<RecommendationResultDto[]> {
    const allExclude = [...new Set([...excludeIds, ...alsoExclude])];

    let exclusionClause = "";
    const params: any[] = [vectorLiteral, limit];
    if (allExclude.length > 0) {
      const ph = allExclude.map((_, i) => `$${params.length + 1 + i}`).join(", ");
      exclusionClause = `AND j.id NOT IN (${ph})`;
      allExclude.forEach((id) => params.push(id));
    }

    const sql = `
      SELECT
        j.id,
        j.title,
        j.company,
        j.location,
        j.salary,
        j.salary_min,
        j.salary_max,
        j.description,
        j.industry,
        COALESCE(j.popularity_score, 0.0) AS popularity_score,
        COALESCE(c.reputation_score,   0.0) AS reputation_score,
        1.0 - (j.embedding <=> $1::vector) AS content_sim
      FROM jobs j
      LEFT JOIN companies c ON j.company_id = c.id
      WHERE j.embedding IS NOT NULL
        ${exclusionClause}
      ORDER BY j.embedding <=> $1::vector
      LIMIT $2
    `;

    const rows = await this.dataSource.query(sql, params);

    return rows.map((r: any) => ({
      id: Number(r.id),
      title: r.title,
      company: r.company,
      location: r.location,
      salary: r.salary,
      salaryMin: r.salary_min ? Number(r.salary_min) : null,
      salaryMax: r.salary_max ? Number(r.salary_max) : null,
      description: r.description,
      industry: r.industry,
      score: Number(r.content_sim ?? 0),
      reason: "similar_role",
      matchDetails: {
        contentMatch: Number(r.content_sim ?? 0),
        popularityBoost: Number(r.popularity_score ?? 0),
        companyReputation: Number(r.reputation_score ?? 0),
      },
    }));
  }

  /**
   * Collaborative filtering: jobs interacted with by users who share history
   * with the current user, weighted by overlap count and popularity.
   */
  private async findCollaborativeMatches(
    userId: number,
    limit: number,
    excludeIds: number[],
  ): Promise<RecommendationResultDto[]> {
    const allExclude = [...new Set([userId, ...excludeIds])]; // put userId in params cleanly
    const excPh = excludeIds.map((_, i) => `$${4 + i}`).join(", ");
    const excludeClause = excludeIds.length > 0 ? `AND j.id NOT IN (${excPh})` : "";

    const sql = `
      SELECT
        j.id, j.title, j.company, j.location, j.salary,
        j.salary_min, j.salary_max, j.description, j.industry,
        COALESCE(j.popularity_score, 0.0) AS popularity_score,
        COALESCE(c.reputation_score, 0.0) AS reputation_score,
        COUNT(DISTINCT similar_users.user_id)::float AS overlap_count
      FROM (
        SELECT DISTINCT uji2.user_id
        FROM user_job_interactions uji1
        JOIN user_job_interactions uji2
          ON uji1.job_id = uji2.job_id AND uji2.user_id != $1
        WHERE uji1.user_id = $1
      ) AS similar_users
      JOIN user_job_interactions uji3 ON uji3.user_id = similar_users.user_id
      JOIN jobs j ON j.id = uji3.job_id
      LEFT JOIN companies c ON j.company_id = c.id
      WHERE uji3.user_id != $1
        ${excludeClause}
      GROUP BY j.id, c.reputation_score
      ORDER BY overlap_count DESC, j.popularity_score DESC
      LIMIT $2
    `;

    const params: any[] = [userId, limit, userId, ...excludeIds];
    const rows = await this.dataSource.query(sql, params);

    return rows.map((r: any) => {
      const collab = Math.min(Number(r.overlap_count) / 10.0, 1.0);
      return {
        id: Number(r.id),
        title: r.title,
        company: r.company,
        location: r.location,
        salary: r.salary,
        salaryMin: r.salary_min ? Number(r.salary_min) : null,
        salaryMax: r.salary_max ? Number(r.salary_max) : null,
        description: r.description,
        industry: r.industry,
        score: collab,
        reason: "similar_users_applied",
        matchDetails: {
          collaborativeMatch: collab,
          popularityBoost: Number(r.popularity_score ?? 0),
          companyReputation: Number(r.reputation_score ?? 0),
        },
      };
    });
  }

  /** Fallback: return trending jobs when no vector anchor is available */
  private async getTrendingJobs(
    limit: number,
    excludeIds: number[],
  ): Promise<RecommendationResultDto[]> {
    const excPh = excludeIds.map((_, i) => `$${2 + i}`).join(", ");
    const excludeClause = excludeIds.length > 0 ? `AND j.id NOT IN (${excPh})` : "";

    const sql = `
      SELECT j.id, j.title, j.company, j.location, j.salary,
             j.salary_min, j.salary_max, j.description, j.industry,
             COALESCE(j.popularity_score, 0.0) AS popularity_score,
             COALESCE(c.reputation_score, 0.0) AS reputation_score
      FROM jobs j
      LEFT JOIN companies c ON j.company_id = c.id
      WHERE j.embedding IS NOT NULL
        ${excludeClause}
      ORDER BY j.popularity_score DESC, j.apply_count DESC
      LIMIT $1
    `;

    const params: any[] = [limit, ...excludeIds];
    const rows = await this.dataSource.query(sql, params);

    return rows.map((r: any) => ({
      id: Number(r.id),
      title: r.title,
      company: r.company,
      location: r.location,
      salary: r.salary,
      salaryMin: r.salary_min ? Number(r.salary_min) : null,
      salaryMax: r.salary_max ? Number(r.salary_max) : null,
      description: r.description,
      industry: r.industry,
      score: Number(r.popularity_score ?? 0),
      reason: "trending",
      matchDetails: { popularityBoost: Number(r.popularity_score ?? 0) },
    }));
  }

  /**
   * Hybrid merge: combine content-based and collaborative signals,
   * apply final weighted scoring, deduplicate, return top-K.
   */
  private hybridMerge(
    contentBased: RecommendationResultDto[],
    collaborative: RecommendationResultDto[],
    weights: { contentSim: number; collaborative: number; popularity: number; companyBoost: number },
    topK: number,
  ): RecommendationResultDto[] {
    const map = new Map<number, RecommendationResultDto & { _collab: number }>();

    // Index content-based results
    for (const job of contentBased) {
      map.set(job.id, { ...job, _collab: 0 });
    }

    // Merge collaborative signal
    for (const job of collaborative) {
      const existing = map.get(job.id);
      const collab = job.matchDetails?.collaborativeMatch ?? job.score;
      if (existing) {
        existing._collab = collab;
        existing.reason = "multi_signal_match";
        existing.matchDetails!.collaborativeMatch = collab;
      } else {
        map.set(job.id, { ...job, _collab: collab });
      }
    }

    // Final weighted score
    const final = Array.from(map.values())
      .map((job) => {
        const contentSim  = job.matchDetails?.contentMatch     ?? 0;
        const collab      = job._collab;
        const popularity  = Math.min(job.matchDetails?.popularityBoost  ?? 0, 1);
        const companyRep  = Math.min(job.matchDetails?.companyReputation  ?? 0, 1);

        job.score =
          weights.contentSim    * contentSim  +
          weights.collaborative * collab       +
          weights.popularity    * popularity   +
          weights.companyBoost  * companyRep;

        // Human-readable reason
        if (!job.reason || job.reason === "similar_role") {
          if (contentSim >= 0.8)        job.reason = "Rất phù hợp về nội dung";
          else if (contentSim >= 0.65)  job.reason = "Phù hợp về nội dung";
          else if (collab > 0)          job.reason = "Người dùng tương tự cũng xem";
          else if (popularity > 0.5)    job.reason = "Công việc nổi bật";
          else                          job.reason = "Có thể phù hợp";
        }

        return job;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return final;
  }

  private buildExplanation(
    recs: RecommendationResultDto[],
    hasUser: boolean,
    hasCurrentJob: boolean,
  ): string {
    if (recs.length === 0) return "Không có gợi ý phù hợp";

    const parts: string[] = [];
    if (hasCurrentJob)  parts.push("dựa trên công việc đang xem");
    if (hasUser)        parts.push("lịch sử tương tác của bạn");
    const basis = parts.length > 0 ? parts.join(" & ") : "hệ thống AI";

    return `${recs.length} công việc gợi ý ${basis} (Hybrid: nội dung + cộng tác)`;
  }
}
