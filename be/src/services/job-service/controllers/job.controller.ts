import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { JobService } from "../services/job.service";
import { CreateJobDto } from "../dto/create-job.dto";
import { UpdateJobDto } from "../dto/update-job.dto";
import { QueryJobDto } from "../dto/query-job.dto";
import { SeedJobsDto } from "../dto/seed-jobs.dto";

@Controller()
export class JobController {
  constructor(private readonly jobService: JobService) {}

  /** Kiểm tra kết nối */
  @MessagePattern("job_ping")
  ping() {
    return {
      status: "ok",
      service: "job-service",
      timestamp: new Date().toISOString(),
    };
  }

  /** Tạo mới một tin tuyển dụng */
  @MessagePattern("job_create")
  create(@Payload() dto: CreateJobDto) {
    return this.jobService.create(dto);
  }

  /**
   * Lấy danh sách công việc có filter & phân trang
   * Payload: QueryJobDto
   */
  @MessagePattern("job_find_all")
  findAll(@Payload() query: QueryJobDto) {
    return this.jobService.findAll(query);
  }

  /** Lấy chi tiết một công việc theo id */
  @MessagePattern("job_find_one")
  findOne(@Payload() payload: { id: number }) {
    return this.jobService.findOne(payload.id);
  }

  /** Cập nhật công việc */
  @MessagePattern("job_update")
  update(@Payload() payload: { id: number; dto: UpdateJobDto }) {
    return this.jobService.update(payload.id, payload.dto);
  }

  /** Xoá công việc */
  @MessagePattern("job_remove")
  remove(@Payload() payload: { id: number }) {
    return this.jobService.remove(payload.id);
  }

  /**
   * Seed hàng loạt dữ liệu crawl
   * Payload: SeedJobsDto { jobs: SeedJobItemDto[] }
   */
  @MessagePattern("job_seed")
  seed(@Payload() dto: SeedJobsDto) {
    return this.jobService.seedBatch(dto.jobs);
  }
  @MessagePattern("job_clear_all")
  clearAll() {
    return this.jobService.clearAllData();
  }
  @MessagePattern("job_sync_embeddings")
  syncEmbeddings() {
    return this.jobService.syncUnindexedJobs();
  }
}
