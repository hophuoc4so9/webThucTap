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

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @Optional()
    @Inject("AI_SEARCH_SERVICE")
    private readonly aiSearchClient?: ClientProxy,
  ) { }

  async create(dto: CreateJobDto): Promise<JobResponseDto> {
    const job = this.jobRepo.create({
      src: "manual",
      ...dto,
      postedAt: this.parseDate(dto.postedAt),
      deadlineAt: this.parseDate(dto.deadlineAt),
    } as Partial<Job>);
    const saved = await this.jobRepo.save(job);

    // Async: Enqueue for embedding (non-blocking)
    this.enqueueForIndexing(saved);

    return this.toJobResponse(saved);
  }

  async findAll(query: QueryJobDto) {
    const {
      keyword,
      location,
      industry,
      src,
      salaryMin,
      salaryMax,
      page = 1,
      limit = 20,
    } = query;

    const pageNum = Number(page) > 0 ? Number(page) : 1;
    const limitNum = Number(limit) > 0 ? Number(limit) : 20;
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

    const total = await qb.getCount();
    const data = await qb
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .orderBy("job.id", "DESC")
      .getMany();

    return {
      data: data.map((job) => this.toJobResponse(job)),
      total,
      page: pageNum,
      limit: limitNum,
    };
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

    await this.jobRepo.remove(job);
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
    const companyNames = new Set<string>();

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
        if (item.company) {
          companyNames.add(item.company);
        }
        const job = this.jobRepo.create({
          ...item,
          nhom: item.nhom || [],
          nganhHoc: item.nganh_hoc || [],
          postedAt: this.parseDate(item.postedAt),
          deadlineAt: this.parseDate(item.deadlineAt),
          startDate: this.parseDate(item.startDate),
        } as Partial<Job>);
        const saved = await this.jobRepo.save(job);
        jobsToIndex.push(saved);
        inserted++;
      } catch {
        skipped++;
      }
    }

    for (const companyName of companyNames) {
      try {
        const existing = await this.companyRepo.findOne({
          where: { name: companyName },
        });
        if (!existing) {
          const company = this.companyRepo.create({
            name: companyName,
            status: CompanyStatus.APPROVED,
          });
          await this.companyRepo.save(company);
        }
      } catch (error) {
        this.logger.warn(`Failed to create company: ${companyName}`);
      }
    }

    // Batch enqueue for indexing
    let indexed = 0;
    if (jobsToIndex.length > 0) {
      indexed = await this.batchEnqueueForIndexing(jobsToIndex);
    }

    return { inserted, skipped, indexed };
  }

  // ─── Private Helpers ───────────────────────────────

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
      vacancies: job.vacancies ?? null,
      tagsBenefit: job.tagsBenefit ?? null,
      tagsRequirement: job.tagsRequirement ?? null,
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
