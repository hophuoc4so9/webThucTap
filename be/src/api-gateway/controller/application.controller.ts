import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Inject,
  HttpException,
  ParseIntPipe,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";

@Controller("applications")
export class ApplicationGatewayController {
  constructor(@Inject("CV_SERVICE") private readonly cvClient: ClientProxy) {}

  /**
   * POST /applications
   * Nộp đơn ứng tuyển
   * Body: { userId, jobId, jobTitle?, companyName?, cvId?, coverLetter? }
   */
  @Post()
  async create(@Body() dto: any) {
    try {
      return await firstValueFrom(
        this.cvClient.send("application_create", dto),
      );
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /**
   * GET /applications?userId=&jobId=&status=&page=&limit=
   * Lấy danh sách đơn ứng tuyển
   */
  @Get()
  async findAll(@Query() query: Record<string, any>) {
    try {
      return await firstValueFrom(
        this.cvClient.send("application_find_all", query),
      );
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** GET /applications/:id */
  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number) {
    try {
      return await firstValueFrom(
        this.cvClient.send("application_find_one", { id }),
      );
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /**
   * PATCH /applications/:id/status
   * Cập nhật trạng thái đơn (dành cho nhà tuyển dụng / admin)
   * Body: { status: 'pending'|'reviewing'|'accepted'|'rejected', note? }
   */
  @Patch(":id/status")
  async updateStatus(@Param("id", ParseIntPipe) id: number, @Body() dto: any) {
    try {
      return await firstValueFrom(
        this.cvClient.send("application_update_status", { id, dto }),
      );
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** DELETE /applications/:id — Rút đơn */
  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: number) {
    try {
      return await firstValueFrom(
        this.cvClient.send("application_remove", { id }),
      );
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** PUT /applications/:id/cv */
  @Put(":id/cv")
  async updateCv(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { cvId: number | null; userId?: number },
  ) {
    try {
      return await firstValueFrom(
        this.cvClient.send("application_update_cv", {
          id,
          cvId: body?.cvId ?? null,
          userId: body?.userId,
        }),
      );
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /**
   * GET /applications/check?userId=&jobId=
   * Kiểm tra user đã ứng tuyển job chưa
   */
  @Get("check")
  async checkApplied(
    @Query("userId", ParseIntPipe) userId: number,
    @Query("jobId", ParseIntPipe) jobId: number,
  ) {
    try {
      return await firstValueFrom(
        this.cvClient.send("application_check_applied", { userId, jobId }),
      );
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** POST /applications/:id/fit-check */
  @Post(":id/fit-check")
  async fitCheck(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { userId?: number },
  ) {
    try {
      return await firstValueFrom(
        this.cvClient.send("application_analyze_fit", {
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

  /** POST /applications/:id/fit-check-async */
  @Post(":id/fit-check-async")
  async fitCheckAsync(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { userId?: number },
  ) {
    try {
      return await firstValueFrom(
        this.cvClient.send("application_analyze_fit_async", {
          id,
          userId: body?.userId,
        }),
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }
}
