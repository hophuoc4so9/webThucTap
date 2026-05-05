import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CvService } from "../services/cv.service";
import { CreateCvDto } from "../dto/create-cv.dto";
import { UpdateCvDto } from "../dto/update-cv.dto";

@Controller()
export class CvController {
  constructor(private readonly cvService: CvService) {}

  @MessagePattern("cv_ping")
  ping() {
    return {
      status: "ok",
      service: "cv-service",
      timestamp: new Date().toISOString(),
    };
  }

  /** Tạo CV mới (text) */
  @MessagePattern("cv_create")
  create(@Payload() dto: CreateCvDto) {
    return this.cvService.create(dto);
  }

  /** Lấy danh sách CV của user */
  @MessagePattern("cv_find_by_user")
  findByUser(@Payload() payload: { userId: number; page?: number; limit?: number }) {
    return this.cvService.findAllByUser(
      payload.userId,
      payload.page,
      payload.limit,
    );
  }

  /** Lấy chi tiết CV */
  @MessagePattern("cv_find_one")
  findOne(@Payload() payload: { id: number }) {
    return this.cvService.findOne(payload.id);
  }

  /** Cập nhật CV */
  @MessagePattern("cv_update")
  update(@Payload() payload: { id: number; dto: UpdateCvDto }) {
    return this.cvService.update(payload.id, payload.dto);
  }

  /** Cập nhật thông tin file sau upload */
  @MessagePattern("cv_update_file")
  updateFile(
    @Payload()
    payload: {
      id: number;
      filePath: string;
      fileOriginalName: string;
      fileMimeType: string;
    },
  ) {
    const { id, ...file } = payload;
    return this.cvService.updateFile(id, file);
  }

  /** Xoá CV */
  @MessagePattern("cv_remove")
  remove(@Payload() payload: { id: number }) {
    return this.cvService.remove(payload.id);
  }

  @MessagePattern("cv_suggest_improvements")
  suggestImprovements(@Payload() payload: { id: number; userId?: number }) {
    return this.cvService.suggestImprovements(payload.id, payload.userId);
  }

  @MessagePattern("cv_suggest_improvements_async")
  suggestImprovementsAsync(@Payload() payload: { id: number; userId?: number }) {
    return this.cvService.suggestImprovementsAsync(payload.id, payload.userId);
  }

  @MessagePattern("ai_task_status")
  getTaskStatus(@Payload() payload: { taskId: string }) {
    return this.cvService.getTaskStatus(payload.taskId);
  }

  @MessagePattern("cv_suggest_draft_improvements")
  suggestDraftImprovements(
    @Payload()
    payload: {
      userId: number;
      fullName?: string;
      jobPosition?: string;
      phone?: string;
      contactEmail?: string;
      address?: string;
      linkedIn?: string;
      title?: string;
      summary?: string;
      skills?: string;
      education?: string;
      experience?: string;
      projects?: string;
      source?: "form" | "file";
    },
  ) {
    return this.cvService.suggestDraftImprovements(payload);
  }

  @MessagePattern("cv_parse_resume")
  parseResume(
    @Payload() payload: { id: number; userId?: number },
  ) {
    return this.cvService.parseResumeFromFile(payload.id, payload.userId);
  }
}
