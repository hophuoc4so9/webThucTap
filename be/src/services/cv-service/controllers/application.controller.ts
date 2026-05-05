import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { ApplicationService } from "../services/application.service";
import { CreateApplicationDto } from "../dto/create-application.dto";
import { UpdateApplicationStatusDto } from "../dto/update-application-status.dto";
import { QueryApplicationDto } from "../dto/query-application.dto";

@Controller()
export class ApplicationController {
  constructor(private readonly appService: ApplicationService) {}

  /** Nộp đơn ứng tuyển */
  @MessagePattern("application_create")
  create(@Payload() dto: CreateApplicationDto) {
    return this.appService.create(dto);
  }

  /** Lấy danh sách đơn ứng tuyển có filter */
  @MessagePattern("application_find_all")
  findAll(@Payload() query: QueryApplicationDto) {
    return this.appService.findAll(query);
  }

  /** Lấy chi tiết đơn ứng tuyển */
  @MessagePattern("application_find_one")
  findOne(@Payload() payload: { id: number }) {
    return this.appService.findOne(payload.id);
  }

  /** Cập nhật trạng thái (dành cho nhà tuyển dụng/admin) */
  @MessagePattern("application_update_status")
  updateStatus(
    @Payload() payload: { id: number; dto: UpdateApplicationStatusDto },
  ) {
    return this.appService.updateStatus(payload.id, payload.dto);
  }

  /** Rút đơn / xoá */
  @MessagePattern("application_remove")
  remove(@Payload() payload: { id: number }) {
    return this.appService.remove(payload.id);
  }

  /** Cập nhật CV cho đơn ứng tuyển */
  @MessagePattern("application_update_cv")
  updateCv(
    @Payload() payload: { id: number; cvId: number | null; userId?: number },
  ) {
    return this.appService.updateCvForApplication(
      payload.id,
      payload.cvId,
      payload.userId,
    );
  }

  /** Kiểm tra đã ứng tuyển chưa */
  @MessagePattern("application_check_applied")
  checkApplied(@Payload() payload: { userId: number; jobId: number }) {
    return this.appService.checkApplied(payload.userId, payload.jobId);
  }

  @MessagePattern("application_analyze_fit")
  analyzeFit(@Payload() payload: { id: number; userId?: number }) {
    return this.appService.analyzeFitForApplication(payload.id, payload.userId);
  }

  @MessagePattern("application_analyze_fit_async")
  analyzeFitAsync(@Payload() payload: { id: number; userId?: number }) {
    return this.appService.analyzeFitForApplicationAsync(payload.id, payload.userId);
  }

  @MessagePattern("application_analyze_job_cv_fit")
  analyzeJobCvFit(
    @Payload() payload: { jobId: number; cvId: number; userId?: number },
  ) {
    return this.appService.analyzeFitForJobAndCv(
      payload.jobId,
      payload.cvId,
      payload.userId,
    );
  }
}
