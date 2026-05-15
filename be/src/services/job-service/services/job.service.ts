import { Injectable, Logger } from "@nestjs/common";
import { Inject, Optional } from "@nestjs/common";
import { ClientProxy, RpcException } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like, FindOptionsWhere } from "typeorm";
import { Job } from "../entities/job.entity";
import { Company, CompanyStatus } from "../entities/company.entity";
import { CreateJobDto } from "../dto/create-job.dto";
import { UpdateJobDto } from "../dto/update-job.dto";
import { QueryJobDto } from "../dto/query-job.dto";
import { SeedJobItemDto } from "../dto/seed-jobs.dto";
import { JobResponseDto } from "../dto/job-response.dto";
import { lastValueFrom } from "rxjs";
import { InteractionTrackingService } from "./interaction-tracking.service";
import { SkillExtractionService } from "./skill-extraction.service";
import { JobAiService } from "./job-ai.service";
import { CacheService } from "./cache.service";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Notification, NotificationType } from "../entities/notification.entity";

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @Optional()
    @Inject("AI_SEARCH_SERVICE")
    private readonly aiSearchClient?: ClientProxy,
    private readonly skillExtraction?: SkillExtractionService,
    private readonly jobAiService?: JobAiService,
    private readonly cacheService?: CacheService,
  ) { }

  async create(dto: CreateJobDto & { createdBy?: number }): Promise<JobResponseDto> {
    const job = this.jobRepo.create({
      src: "manual",
      ...dto,
      postedAt: this.parseDate(dto.postedAt),
      deadlineAt: this.parseDate(dto.deadlineAt),
      aiAnalysisStatus: "pending",
    } as Partial<Job>);
    
    this.applyExtractedSkills(job);
    const saved = await this.jobRepo.save(job);

    // Trigger AI Analysis directly via API in background (NestJS level)
    if (this.jobAiService) {
      this.jobAiService.extractJobDetails(saved)
        .then(async (result) => {
          await this.jobRepo.update(saved.id, {
            aiAnalysisStatus: "succeeded",
            tagsRequirement: JSON.stringify(result.tags || []),
            extractedSkills: result.skills || [],
            isInternship: result.isInternship ?? false,
            isFresher: result.isFresher ?? false,
            internshipDuration: result.internshipDuration ?? null,
            internshipAllowance: result.internshipAllowance ?? null,
            hasMentor: result.hasMentor ?? false,
            trainingProgram: result.trainingProgram ?? null,
            flexibleHours: result.flexibleHours ?? false,
            skillsExtractedAt: new Date(),
          });

          // Send notification
          if (saved.companyId) {
            const company = await this.companyRepo.findOne({
              where: { id: saved.companyId },
              relations: ["members"]
            });

            if (company && company.members) {
              for (const member of company.members) {
                await this.notificationRepo.save({
                  userId: member.userId,
                  title: "Phân tích tin tuyển dụng hoàn tất ✨",
                  content: `Tin tuyển dụng "${saved.title}" đã được AI tối ưu hóa và trích xuất yêu cầu thành công.`,
                  type: NotificationType.JOB_ANALYSIS_COMPLETED,
                  metadata: { jobId: saved.id },
                });
              }
            }
          }
          this.logger.log(`Job #${saved.id} AI analysis completed directly via API.`);
        })
        .catch((err) => {
          this.logger.error(`AI extraction failed for job #${saved.id}: ${err.message}`);
          this.jobRepo.update(saved.id, { aiAnalysisStatus: "failed" });
        });
    }

    // Async: Enqueue for embedding (non-blocking)
    this.enqueueForIndexing(saved);

    return this.toJobResponse(saved);
  }

  // Cron polling logic removed as we now call API directly in background task above.
  // We can still keep handlePendingAiAnalysis for robustness if needed, but simplified.
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupPendingAnalysis() {
    // Just a fallback for jobs stuck in pending
    const stuckJobs = await this.jobRepo.find({
      where: { aiAnalysisStatus: "pending" },
    });
    for (const job of stuckJobs) {
      const diff = new Date().getTime() - job.createdAt.getTime();
      if (diff > 1000 * 60 * 10) { // Stuck for > 10 mins
        await this.jobRepo.update(job.id, { aiAnalysisStatus: "failed" });
      }
    }
  }

  async findAll(query: QueryJobDto) {
    const {
      keyword,
      location,
      industry,
      src,
      isInternship,
      isFresher,
      salaryMin,
      salaryMax,
      companyId,
      page = 1,
      limit = 20,
    } = query;

    const pageNum = Number(page) > 0 ? Number(page) : 1;
    const limitNum = Number(limit) > 0 ? Number(limit) : 20;

    // Cache key based on query parameters
    const cacheKey = `jobs_find_all_${JSON.stringify(query)}`;
    if (this.cacheService) {
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached) return cached;
    }

    const salaryMinNum =
      salaryMin === undefined || salaryMin === null ? undefined : Number(salaryMin);
    const salaryMaxNum =
      salaryMax === undefined || salaryMax === null ? undefined : Number(salaryMax);

    const qb = this.jobRepo.createQueryBuilder("job");

    if (keyword) {
      qb.andWhere("(job.title ILIKE :kw OR job.company ILIKE :kw)", {
        kw: `%${keyword}%`,
      });
    }
    if (location) {
      qb.andWhere("job.location ILIKE :loc", { loc: `%${location}%` });
    }
    if (industry) {
      qb.andWhere("job.industry ILIKE :ind", { ind: `%${industry}%` });
    }
    if (src) {
      qb.andWhere("job.src = :src", { src });
    }
    if (isInternship !== undefined) {
      qb.andWhere("job.isInternship = :isInternship", {
        isInternship: isInternship === "true",
      });
    }
    if (isFresher !== undefined) {
      qb.andWhere("job.isFresher = :isFresher", {
        isFresher: isFresher === "true",
      });
    }
    if (companyId !== undefined && companyId !== null) {
      qb.andWhere("job.companyId = :companyId", { companyId: Number(companyId) });
    }
    if (salaryMinNum !== undefined && Number.isFinite(salaryMinNum)) {
      qb.andWhere("CAST(job.salary_min AS BIGINT) >= :smin", {
        smin: salaryMinNum,
      });
    }
    if (salaryMaxNum !== undefined && Number.isFinite(salaryMaxNum)) {
      qb.andWhere("CAST(job.salary_max AS BIGINT) <= :smax", {
        smax: salaryMaxNum,
      });
    }

    const [data, total] = await qb
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .orderBy("job.id", "DESC")
      .getManyAndCount();

    const response = {
      data: data.map((job) => this.toJobResponse(job)),
      total,
      page: pageNum,
      limit: limitNum,
    };

    if (this.cacheService) {
      await this.cacheService.set(cacheKey, response, 60); // Cache for 60s
    }

    return response;
  }

  async findFeatured(limit = 6) {
    const limitNum = Number(limit) > 0 ? Math.min(Number(limit), 12) : 6;
    const cacheKey = `jobs_featured_${limitNum}`;
    
    if (this.cacheService) {
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached) return cached;
    }

    const data = await this.jobRepo
      .createQueryBuilder("job")
      .leftJoinAndSelect("job.companyRef", "companyRef")
      .orderBy("job.popularityScore", "DESC")
      .addOrderBy("job.applyCount", "DESC")
      .addOrderBy("job.viewsCount", "DESC")
      .addOrderBy("job.postedAt", "DESC", "NULLS LAST")
      .addOrderBy("job.id", "DESC")
      .take(limitNum)
      .getMany();

    const response = {
      data: data.map((job) => this.toJobResponse(job)),
      total: data.length,
      page: 1,
      limit: limitNum,
    };

    if (this.cacheService) {
      await this.cacheService.set(cacheKey, response, 300); // Cache for 5 mins
    }

    return response;
  }

  async getTopMajors(limit = 8) {
    const limitNum = Number(limit) > 0 ? Math.min(Number(limit), 16) : 8;
    const cacheKey = `jobs_top_majors_${limitNum}`;

    if (this.cacheService) {
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached) return cached;
    }

    const majors = await this.jobRepo.query(
      `
        SELECT major AS name, COUNT(*)::int AS "jobCount"
        FROM jobs job
        CROSS JOIN LATERAL unnest(job.nganh_hoc) AS major
        WHERE job.nganh_hoc IS NOT NULL
          AND array_length(job.nganh_hoc, 1) > 0
          AND NULLIF(TRIM(major), '') IS NOT NULL
        GROUP BY major
        ORDER BY COUNT(*) DESC, major ASC
        LIMIT $1
      `,
      [limitNum],
    );

    let result = majors;
    if (majors.length === 0) {
      result = await this.jobRepo.query(
        `
          SELECT job.industry AS name, COUNT(*)::int AS "jobCount"
          FROM jobs job
          WHERE NULLIF(TRIM(job.industry), '') IS NOT NULL
          GROUP BY job.industry
          ORDER BY COUNT(*) DESC, job.industry ASC
          LIMIT $1
        `,
        [limitNum],
      );
    }

    if (this.cacheService) {
      await this.cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
    }

    return result;
  }

  async findOne(id: number): Promise<JobResponseDto> {
    const job = await this.jobRepo.findOne({
      where: { id },
      relations: ["companyRef"],
    });
    if (!job)
      throw new RpcException({
        statusCode: 404,
        message: `Không tìm thấy job #${id}`,
      });
    return this.toJobResponse(job);
  }

  async update(id: number, dto: UpdateJobDto): Promise<JobResponseDto> {
    const job = await this.jobRepo.findOne({ where: { id }, relations: ["companyRef"] });
    if (!job)
      throw new RpcException({
        statusCode: 404,
        message: `Không tìm thấy job #${id}`,
      });

    Object.assign(job, {
      ...dto,
      postedAt: dto.postedAt !== undefined ? this.parseDate(dto.postedAt) : job.postedAt,
      deadlineAt: dto.deadlineAt !== undefined ? this.parseDate(dto.deadlineAt) : job.deadlineAt,
    });
    this.applyExtractedSkills(job);
    const updated = await this.jobRepo.save(job);

    // Async: Reindex on update
    this.enqueueForIndexing(updated);

    return this.toJobResponse(updated);
  }

  async remove(id: number): Promise<{ message: string }> {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (!job)
      throw new RpcException({
        statusCode: 404,
        message: `Không tìm thấy job #${id}`,
      });

    await this.jobRepo.softRemove(job);
    return { message: `Đã xoá job #${id}` };
  }

  /** Xoá toàn bộ dữ liệu Job và Company */
  async clearAllData(): Promise<{ message: string }> {
    this.logger.log("Clearing all job and company data...");
    // Phải xoá jobs trước vì có khóa ngoại tới companies
    await this.jobRepo.query("TRUNCATE TABLE jobs RESTART IDENTITY CASCADE");
    await this.companyRepo.query("TRUNCATE TABLE companies RESTART IDENTITY CASCADE");
    return { message: "Đã xoá toàn bộ dữ liệu job và company thành công." };
  }

  /** Seed hàng loạt từ dữ liệu crawl, bỏ qua bản ghi đã tồn tại (upsert theo crawlId) */
  async seedBatch(
    items: SeedJobItemDto[],
  ): Promise<{ inserted: number; skipped: number; indexed: number }> {
    let inserted = 0;
    let skipped = 0;
    const jobsToIndex: Job[] = [];

    // 1. Thu thập danh sách công ty duy nhất trong batch
    const companyNames = new Set<string>();
    for (const item of items) {
      if (item.company) companyNames.add(item.company);
    }

    // 2. Đảm bảo các công ty tồn tại và lấy ID map
    const companyMap = new Map<string, number>();
    for (const name of companyNames) {
      let company = await this.companyRepo.findOne({ where: { name } });
      if (!company) {
        company = this.companyRepo.create({
          name,
          status: CompanyStatus.APPROVED,
        });
        company = await this.companyRepo.save(company);
      }
      companyMap.set(name, company.id);
    }

    // 3. Lưu jobs kèm companyId
    for (const item of items) {
      try {
        if (item.crawlId) {
          const existing = await this.jobRepo.findOne({
            where: { crawlId: item.crawlId },
          });
          if (existing) {
            skipped++;
            continue;
          }
        }

        const companyId = item.company ? companyMap.get(item.company) : null;

        const job = this.jobRepo.create({
          ...item,
          companyId,
          nhom: item.nhom || [],
          nganhHoc: item.nganh_hoc || [],
          postedAt: this.parseDate(item.postedAt),
          deadlineAt: this.parseDate(item.deadlineAt),
          startDate: this.parseDate(item.startDate),
        } as Partial<Job>);
        this.applyExtractedSkills(job);
        const saved = await this.jobRepo.save(job);
        jobsToIndex.push(saved);
        inserted++;
      } catch (error) {
        skipped++;
      }
    }

    // Batch enqueue for indexing
    let indexed = 0;
    if (jobsToIndex.length > 0) {
      indexed = await this.batchEnqueueForIndexing(jobsToIndex);
    }

    return { inserted, skipped, indexed };
  }

  /** Đồng bộ các job cũ chưa có companyId sang công ty tương ứng theo tên */
  async syncUnlinkedJobs() {
    this.logger.log("Syncing unlinked jobs to companies...");
    const jobs = await this.jobRepo.createQueryBuilder("job")
      .select("DISTINCT job.company", "companyName")
      .where("job.company_id IS NULL")
      .andWhere("job.company IS NOT NULL")
      .getRawMany();

    let totalLinked = 0;
    for (const row of jobs) {
      const name = row.companyName;
      let company = await this.companyRepo.findOne({ where: { name } });
      if (!company) {
        company = this.companyRepo.create({
          name,
          status: CompanyStatus.APPROVED,
        });
        company = await this.companyRepo.save(company);
      }
      
      const res = await this.jobRepo.createQueryBuilder()
        .update(Job)
        .set({ companyId: company.id })
        .where("company = :name AND company_id IS NULL", { name })
        .execute();
      
      totalLinked += res.affected || 0;
    }
    
    return { message: "Successfully linked jobs", totalLinked };
  }

  // ─── Private Helpers ───────────────────────────────

  private applyExtractedSkills(job: Partial<Job>): void {
    if (!this.skillExtraction) return;

    job.extractedSkills = this.skillExtraction.extractSkillsFromJob({
      title: job.title,
      description: job.description,
      field: job.field,
      tagsRequirement: job.tagsRequirement,
      industry: job.industry,
      requirement: job.requirement,
    });
    job.skillsExtractedAt = new Date();
  }

  private enqueueForIndexing(job: Job): void {
    if (!this.aiSearchClient) {
      this.logger.warn("AI Search client not connected, skipping indexing");
      return;
    }

    // Fire and forget
    this.aiSearchClient
      .send("ai_search_index_job", {
        id: job.id,
        title: job.title,
        description: job.description,
        requirement: job.requirement,
        tags: job.tagsRequirement,
        industry: job.industry,
      })
      .subscribe({
        error: (err) => {
          this.logger.warn(
            `Failed to index job #${job.id}: ${err.message}`,
          );
        },
      });
  }

  private async batchEnqueueForIndexing(jobs: Job[]): Promise<number> {
    if (!this.aiSearchClient) {
      this.logger.warn("AI Search client not connected, skipping batch indexing");
      return 0;
    }

    try {
      const jobsForEmbedding = jobs
        .map((j) => ({
          id: j.id,
          title: j.title,
          description: j.description,
          requirement: j.requirement,
          tags: j.tagsRequirement,
          industry: j.industry,
        }))
        .filter((j) => this.hasIndexableContent(j));

      if (jobsForEmbedding.length === 0) {
        this.logger.warn("No indexable jobs found in batch, skipping");
        return 0;
      }

      const payload = {
        jobs: jobsForEmbedding,
      };

      const result = await lastValueFrom(
        this.aiSearchClient.send("ai_search_index_batch", payload),
      );
      this.logger.log(`Batch indexed ${result.indexed} jobs`);
      return result.indexed || 0;
    } catch (error: any) {
      this.logger.error(
        `Batch indexing failed: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  private hasIndexableContent(job: {
    title?: string;
    description?: string;
    requirement?: string;
    tags?: string;
    industry?: string;
  }): boolean {
    const fields = [
      job.title,
      job.description,
      job.requirement,
      job.tags,
      job.industry,
    ];

    return fields.some(
      (value) => typeof value === "string" && value.trim().length > 0,
    );
  }

  private toStringBigInt(value: unknown): string | null {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    return String(value);
  }

  private toJobResponse(job: Job): JobResponseDto {
    const companyId =
      job.companyId ??
      (job.companyRef && typeof job.companyRef.id === "number"
        ? job.companyRef.id
        : null);

    return {
      id: job.id,
      crawlId: this.toStringBigInt(job.crawlId),
      age: job.age ?? null,
      benefit: job.benefit ?? null,
      company: job.company ?? null,
      deadline: job.deadline ?? null,
      postedAt: job.postedAt ?? null,
      deadlineAt: job.deadlineAt ?? null,
      degree: job.degree ?? null,
      description: job.description ?? null,
      experience: job.experience ?? null,
      field: job.field ?? null,
      industry: job.industry ?? null,
      location: job.location ?? null,
      otherInfo: job.otherInfo ?? null,
      requirement: job.requirement ?? null,
      salary: job.salary ?? null,
      title: job.title,
      url: job.url ?? null,
      src: job.src ?? null,
      jobType: job.jobType ?? null,
      isInternship: job.isInternship ?? false,
      isFresher: job.isFresher ?? false,
      internshipDuration: job.internshipDuration ?? null,
      internshipAllowance: job.internshipAllowance ?? null,
      hasMentor: job.hasMentor ?? false,
      trainingProgram: job.trainingProgram ?? null,
      flexibleHours: job.flexibleHours ?? false,
      vacancies: job.vacancies ?? null,
      tagsBenefit: job.tagsBenefit ?? null,
      tagsRequirement: job.tagsRequirement ?? null,
      extractedSkills: job.extractedSkills ?? null,
      skillsExtractedAt: job.skillsExtractedAt ?? null,
      provinceIds: job.provinceIds ?? null,
      salaryMax: this.toStringBigInt(job.salaryMax),
      salaryMin: this.toStringBigInt(job.salaryMin),
      companyId,
      viewsCount: job.viewsCount ?? 0,
      applyCount: job.applyCount ?? 0,
      popularityScore: job.popularityScore ?? 0,
      indexedAt: job.indexedAt ?? null,
      createdAt: job.createdAt ?? null,
      updatedAt: job.updatedAt ?? null,
    };
  }

  private parseDate(value?: string | Date | null): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  /**
   * Backfill: Đồng bộ tạo embedding cho các job cũ chưa được cập nhật
   */
  async syncUnindexedJobs(): Promise<{ message: string; totalProcessed: number }> {
    const batchSize = 50; // Giới hạn 50 jobs mỗi batch để tránh nghẽn RabbitMQ / Model
    let skip = 0;
    let totalProcessed = 0;

    this.logger.log("Bắt đầu quá trình đồng bộ embedding cho job cũ...");

    while (true) {
      // Fetch từng cụm jobs
      const jobs = await this.jobRepo.find({
        // Nếu trong DB Job của bạn có trường kiểm tra đã nhúng chưa, hãy thêm where vào đây.
        // VD: where: { isIndexed: false } hoặc { embedding: IsNull() }
        skip: skip,
        take: batchSize,
        order: { id: "ASC" },
      });

      if (jobs.length === 0) {
        break; // Đã quét sạch database
      }

      // Gửi batch sang AI Search Service thông qua hàm bạn đã viết sẵn
      await this.batchEnqueueForIndexing(jobs);

      totalProcessed += jobs.length;
      skip += batchSize;

      this.logger.log(`Đã gửi ${totalProcessed} jobs sang AI service...`);
    }

    this.logger.log(`Hoàn tất đồng bộ! Tổng số jobs đã xử lý: ${totalProcessed}`);
    return {
      message: "Quá trình đồng bộ embeddings đã hoàn tất",
      totalProcessed
    };
  }
}
