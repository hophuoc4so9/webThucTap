import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like, FindOptionsWhere } from "typeorm";
import { Job } from "../entities/job.entity";
import { CreateJobDto } from "../dto/create-job.dto";
import { UpdateJobDto } from "../dto/update-job.dto";
import { QueryJobDto } from "../dto/query-job.dto";
import { SeedJobItemDto } from "../dto/seed-jobs.dto";

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
  ) {}

  async create(dto: CreateJobDto): Promise<Job> {
    const job = this.jobRepo.create({ src: "manual", ...dto } as Partial<Job>);
    return this.jobRepo.save(job);
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
    if (salaryMin !== undefined) {
      qb.andWhere("CAST(job.salary_min AS BIGINT) >= :smin", {
        smin: salaryMin,
      });
    }
    if (salaryMax !== undefined) {
      qb.andWhere("CAST(job.salary_max AS BIGINT) <= :smax", {
        smax: salaryMax,
      });
    }

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy("job.id", "DESC")
      .getMany();

    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<Job> {
    const job = await this.jobRepo.findOne({
      where: { id },
      relations: ["companyRef"],
    });
    if (!job)
      throw new RpcException({
        statusCode: 404,
        message: `Không tìm thấy job #${id}`,
      });
    return job;
  }

  async update(id: number, dto: UpdateJobDto): Promise<Job> {
    const job = await this.findOne(id);
    Object.assign(job, dto);
    return this.jobRepo.save(job);
  }

  async remove(id: number): Promise<{ message: string }> {
    const job = await this.findOne(id);
    await this.jobRepo.remove(job);
    return { message: `Đã xoá job #${id}` };
  }

  /** Seed hàng loạt từ dữ liệu crawl, bỏ qua bản ghi đã tồn tại (upsert theo crawlId) */
  async seedBatch(
    items: SeedJobItemDto[],
  ): Promise<{ inserted: number; skipped: number }> {
    let inserted = 0;
    let skipped = 0;

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
        const job = this.jobRepo.create(item as Partial<Job>);
        await this.jobRepo.save(job);
        inserted++;
      } catch {
        skipped++;
      }
    }

    return { inserted, skipped };
  }
}
