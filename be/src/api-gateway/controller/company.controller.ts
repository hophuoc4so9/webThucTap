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
  UploadedFiles,
  Req,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { existsSync, mkdirSync } from "fs";
import { Request } from "express";

const UPLOADS_DIR = "/uploads";

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function multerStorage() {
  return diskStorage({
    destination: (_req, _file, cb) => {
      ensureDir(UPLOADS_DIR);
      cb(null, UPLOADS_DIR);
    },
    filename: (_req, file, cb) => {
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, `company-${unique}${extname(file.originalname)}`);
    },
  });
}

@Controller("companies")
export class CompanyController {
  constructor(@Inject("JOB_SERVICE") private readonly jobClient: ClientProxy) {}

  /** GET /companies?page=&limit=&name= (chỉ công ty đã APPROVED) */
  @Get()
  async findAll(
    @Query("page") page = 1,
    @Query("limit") limit = 20,
    @Query("name") name?: string,
  ) {
    try {
      return await firstValueFrom(
        this.jobClient.send("company_find_all", {
          page: +page,
          limit: +limit,
          name,
        }),
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** GET /companies/admin?page=&limit=&status=&name= (admin – filter theo status) */
  @Get("admin")
  async findAllAdmin(
    @Query("page") page = 1,
    @Query("limit") limit = 20,
    @Query("status") status?: string,
    @Query("name") name?: string,
  ) {
    try {
      return await firstValueFrom(
        this.jobClient.send("company_find_all_admin", {
          page: +page,
          limit: +limit,
          status,
          name,
        }),
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** GET /companies/:id */
  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number) {
    try {
      return await firstValueFrom(
        this.jobClient.send("company_find_one", { id }),
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** POST /companies (tạo công ty thông thường – seed/admin) */
  @Post()
  async create(@Body() dto: any) {
    try {
      return await firstValueFrom(this.jobClient.send("company_create", dto));
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /**
   * POST /companies/onboarding
   * HR tạo công ty mới từ trang onboarding (multipart form):
   *   - logo (file, tuỳ chọn)
   *   - businessLicense (file, bắt buộc để admin xét duyệt)
   *   - các field text khác (name, companyEmail, website, industry, size, address, description, phone, ownerId)
   */
  @Post("onboarding")
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "logo", maxCount: 1 },
        { name: "businessLicense", maxCount: 1 },
      ],
      { storage: multerStorage() },
    ),
  )
  async createOnboarding(
    @UploadedFiles()
    files: {
      logo?: Express.Multer.File[];
      businessLicense?: Express.Multer.File[];
    },
    @Body() body: any,
    @Req() req: Request,
  ) {
    try {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const logoUrl = files?.logo?.[0]
        ? `${baseUrl}/uploads/${files.logo[0].filename}`
        : undefined;
      const licenseUrl = files?.businessLicense?.[0]
        ? `${baseUrl}/uploads/${files.businessLicense[0].filename}`
        : undefined;

      const ownerId = body.ownerId ? +body.ownerId : undefined;
      const dto = {
        name: body.name,
        companyEmail: body.companyEmail,
        website: body.website,
        industry: body.industry,
        size: body.size,
        address: body.address,
        description: body.description,
        phone: body.phone,
        shortDescription: body.shortDescription,
        logo: logoUrl,
        businessLicense: licenseUrl,
      };

      return await firstValueFrom(
        this.jobClient.send("company_create_onboarding", { ownerId, dto }),
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** PUT /companies/:id (cập nhật thông tin công ty) */
  @Put(":id")
  async update(@Param("id", ParseIntPipe) id: number, @Body() dto: any) {
    try {
      return await firstValueFrom(
        this.jobClient.send("company_update", { id, dto }),
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** DELETE /companies/:id */
  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: number) {
    try {
      return await firstValueFrom(
        this.jobClient.send("company_remove", { id }),
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** PUT /companies/:id/approve (admin duyệt công ty) */
  @Put(":id/approve")
  async approveCompany(@Param("id", ParseIntPipe) id: number) {
    try {
      return await firstValueFrom(
        this.jobClient.send("company_approve", { id }),
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** PUT /companies/:id/reject (admin từ chối công ty) */
  @Put(":id/reject")
  async rejectCompany(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { reason?: string },
  ) {
    try {
      return await firstValueFrom(
        this.jobClient.send("company_reject", { id, reason: body.reason }),
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** POST /companies/:id/join (HR gửi yêu cầu join công ty) */
  @Post(":id/join")
  async joinRequest(
    @Param("id", ParseIntPipe) companyId: number,
    @Body() body: { userId: number },
  ) {
    try {
      return await firstValueFrom(
        this.jobClient.send("company_join_request", {
          userId: body.userId,
          companyId,
        }),
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** GET /companies/:id/join-requests (lấy danh sách join requests) */
  @Get(":id/join-requests")
  async getJoinRequests(@Param("id", ParseIntPipe) companyId: number) {
    try {
      return await firstValueFrom(
        this.jobClient.send("company_get_join_requests", { companyId }),
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** GET /companies/member/:userId (lấy công ty của user) */
  @Get("member/:userId")
  async getMemberCompany(@Param("userId", ParseIntPipe) userId: number) {
    try {
      return await firstValueFrom(
        this.jobClient.send("company_get_member_company", { userId }),
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** PUT /companies/join/:memberId/approve */
  @Put("join/:memberId/approve")
  async approveJoin(@Param("memberId", ParseIntPipe) memberId: number) {
    try {
      return await firstValueFrom(
        this.jobClient.send("company_approve_join", { memberId }),
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** PUT /companies/join/:memberId/reject */
  @Put("join/:memberId/reject")
  async rejectJoin(
    @Param("memberId", ParseIntPipe) memberId: number,
    @Body() body: { reason?: string },
  ) {
    try {
      return await firstValueFrom(
        this.jobClient.send("company_reject_join", {
          memberId,
          reason: body.reason,
        }),
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }
}
