import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Inject,
  HttpException,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { v4 as uuidv4 } from "uuid";

/** /uploads */
const multerOptions = {
  storage: diskStorage({
    destination: "/uploads",
    filename: (_req, file, cb) => {
      const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx"];
    const ext = extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(
        new BadRequestException("Chỉ chấp nhận file PDF, DOC, DOCX"),
        false,
      );
    }
    cb(null, true);
  },
};

@Controller("cvs")
export class CvGatewayController {
  constructor(@Inject("CV_SERVICE") private readonly cvClient: ClientProxy) {}

  /** GET /cvs/ping */
  @Get("ping")
  ping() {
    return firstValueFrom(this.cvClient.send("cv_ping", {}));
  }

  /**
   * POST /cvs
   
   * Body: { userId, title, summary, skills, education, experience, isDefault }
   */
  @Post()
  async create(@Body() dto: any) {
    try {
      return await firstValueFrom(this.cvClient.send("cv_create", dto));
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /**
   * POST /cvs/upload
   
   * Form-data fields: file (binary), userId, title?, isDefault?
   */
  @Post("upload")
  @UseInterceptors(FileInterceptor("file", multerOptions))
  async createWithFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    if (!file) throw new BadRequestException("Vui lòng chọn file CV");
    if (!body.userId) throw new BadRequestException("userId là bắt buộc");

    try {
      const dto = {
        userId: +body.userId,
        title: body.title,
        isDefault: body.isDefault === "true",
        filePath: file.filename,
        fileOriginalName: file.originalname,
        fileMimeType: file.mimetype,
        source: "file",
      };
      return await firstValueFrom(this.cvClient.send("cv_create", dto));
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /**
   * PUT /cvs/:id/upload
   
   */
  @Put(":id/upload")
  @UseInterceptors(FileInterceptor("file", multerOptions))
  async updateFile(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("Vui lòng chọn file CV");
    try {
      const payload = {
        id,
        filePath: file.filename,
        fileOriginalName: file.originalname,
        fileMimeType: file.mimetype,
      };
      return await firstValueFrom(
        this.cvClient.send("cv_update_file", payload),
      );
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** GET /cvs?userId=xxx&page=&limit= — Lấy danh sách CV của user */
  @Get()
  async findByUser(
    @Query("userId", ParseIntPipe) userId: number,
    @Query("page") page = 1,
    @Query("limit") limit = 10,
  ) {
    try {
      return await firstValueFrom(
        this.cvClient.send("cv_find_by_user", {
          userId,
          page: +page,
          limit: +limit,
        }),
      );
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** GET /cvs/:id */
  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number) {
    try {
      return await firstValueFrom(this.cvClient.send("cv_find_one", { id }));
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** POST /cvs/preview-suggestions */
  @Post("preview-suggestions")
  async previewSuggestions(@Body() body: any) {
    try {
      return await firstValueFrom(
        this.cvClient.send("cv_suggest_draft_improvements", body),
      );
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /**
   * PUT /cvs/:id — Cập nhật thông tin CV (text).
  * Body: fullName, jobPosition, phone, contactEmail, address, linkedIn, title, summary, skills, education, experience, projects, isDefault
   */
  @Put(":id")
  async update(@Param("id", ParseIntPipe) id: number, @Body() dto: any) {
    try {
      const updated = await firstValueFrom(this.cvClient.send("cv_update", { id, dto }));
      return updated;
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** DELETE /cvs/:id */
  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: number) {
    try {
      return await firstValueFrom(this.cvClient.send("cv_remove", { id }));
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** POST /cvs/:id/suggestions */
  @Post(":id/suggestions")
  async suggestImprovements(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { userId?: number },
  ) {
    try {
      return await firstValueFrom(
        this.cvClient.send("cv_suggest_improvements", {
          id,
          userId: body?.userId,
        }),
      );
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }
}
