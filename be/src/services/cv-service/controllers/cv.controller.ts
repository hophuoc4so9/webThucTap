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
  findByUser(@Payload() payload: { userId: number }) {
    return this.cvService.findAllByUser(payload.userId);
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
}
