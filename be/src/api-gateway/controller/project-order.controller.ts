import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Inject,
  HttpException,
  ParseIntPipe,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";

@Controller("project-orders")
export class ProjectOrderGatewayController {
  constructor(
    @Inject("JOB_SERVICE") private readonly jobClient: ClientProxy
  ) {}

  private throw(err: any): never {
    const { statusCode = 500, message = "Lỗi máy chủ" } =
      err?.error ?? err ?? {};
    throw new HttpException({ success: false, message }, statusCode);
  }

  /** GET /project-orders?status=&companyId=&page=&limit= */
  @Get()
  async findAll(
    @Query("status") status?: string,
    @Query("companyId") companyId?: string,
    @Query("page") page = 1,
    @Query("limit") limit = 10
  ) {
    try {
      return await firstValueFrom(
        this.jobClient.send("project_order_find_all", {
          status,
          companyId: companyId ? +companyId : undefined,
          page: +page,
          limit: +limit,
        })
      );
    } catch (err) {
      this.throw(err);
    }
  }

  /** GET /project-orders/student/my-applications?userId= — phải khai báo trước :id */
  @Get("student/my-applications")
  async getStudentApplications(@Query("userId") userId: string) {
    try {
      return await firstValueFrom(
        this.jobClient.send("project_order_get_student_applications", {
          userId: +userId,
        })
      );
    } catch (err) {
      this.throw(err);
    }
  }

  /** GET /project-orders/:id/applications — phải khai báo trước :id */
  @Get(":id/applications")
  async getApplications(@Param("id", ParseIntPipe) projectId: number) {
    try {
      return await firstValueFrom(
        this.jobClient.send("project_order_get_applications", { projectId })
      );
    } catch (err) {
      this.throw(err);
    }
  }

  /** GET /project-orders/:id */
  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number) {
    try {
      return await firstValueFrom(
        this.jobClient.send("project_order_find_one", { id })
      );
    } catch (err) {
      this.throw(err);
    }
  }

  /** POST /project-orders */
  @Post()
  async create(@Body() body: any) {
    try {
      return await firstValueFrom(
        this.jobClient.send("project_order_create", body)
      );
    } catch (err) {
      this.throw(err);
    }
  }

  /** PUT /project-orders/:id */
  @Put(":id")
  async update(@Param("id", ParseIntPipe) id: number, @Body() dto: any) {
    try {
      return await firstValueFrom(
        this.jobClient.send("project_order_update", { id, dto })
      );
    } catch (err) {
      this.throw(err);
    }
  }

  /** DELETE /project-orders/:id */
  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: number) {
    try {
      return await firstValueFrom(
        this.jobClient.send("project_order_remove", { id })
      );
    } catch (err) {
      this.throw(err);
    }
  }

  /** POST /project-orders/:id/apply */
  @Post(":id/apply")
  async apply(
    @Param("id", ParseIntPipe) projectId: number,
    @Body() body: { userId: number; note?: string; studentName: string; studentEmail: string }
  ) {
    const { userId, ...dto } = body;
    try {
      return await firstValueFrom(
        this.jobClient.send("project_order_apply", { projectId, userId, dto })
      );
    } catch (err) {
      this.throw(err);
    }
  }

  /** PATCH /project-orders/applications/:appId/status */
  @Patch("applications/:appId/status")
  async updateApplicationStatus(
    @Param("appId", ParseIntPipe) appId: number,
    @Body() dto: { status: string }
  ) {
    try {
      return await firstValueFrom(
        this.jobClient.send("project_order_update_application_status", {
          appId,
          dto,
        })
      );
    } catch (err) {
      this.throw(err);
    }
  }
}
