import { Controller, Get, Param, Res, NotFoundException } from "@nestjs/common";
import { Response } from "express";
import { join } from "path";
import { existsSync } from "fs";

const UPLOADS_DIR = "/uploads";

@Controller("uploads")
export class UploadsController {
  /**
   * GET /uploads/:filename
   * Phục vụ file CV đã tải lên (chỉ tên file, tránh path traversal).
   */
  @Get(":filename")
  serveFile(@Param("filename") filename: string, @Res() res: Response) {
    if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      throw new NotFoundException("File không hợp lệ");
    }
    const filePath = join(UPLOADS_DIR, filename);
    if (!existsSync(filePath)) {
      throw new NotFoundException("Không tìm thấy file");
    }
    res.sendFile(filePath, { root: "/" });
  }
}
