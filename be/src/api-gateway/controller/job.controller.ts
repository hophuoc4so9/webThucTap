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
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";

@Controller("jobs")
export class JobController {
  constructor(@Inject("JOB_SERVICE") private readonly jobClient: ClientProxy) {}

  /** GET /jobs/ping */
  @Get("ping")
  ping() {
    return firstValueFrom(this.jobClient.send("job_ping", {}));
  }

  /** GET /jobs?keyword=&location=&industry=&src=&salaryMin=&salaryMax=&page=&limit= */
  @Get()
  async findAll(@Query() query: Record<string, any>) {
    try {
      return await firstValueFrom(this.jobClient.send("job_find_all", query));
    } catch (err) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** GET /jobs/:id */
  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number) {
    try {
      return await firstValueFrom(this.jobClient.send("job_find_one", { id }));
    } catch (err) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** POST /jobs */
  @Post()
  async create(@Body() dto: any) {
    try {
      return await firstValueFrom(this.jobClient.send("job_create", dto));
    } catch (err) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** PUT /jobs/:id */
  @Put(":id")
  async update(@Param("id", ParseIntPipe) id: number, @Body() dto: any) {
    try {
      return await firstValueFrom(
        this.jobClient.send("job_update", { id, dto }),
      );
    } catch (err) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** DELETE /jobs/:id */
  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: number) {
    try {
      return await firstValueFrom(this.jobClient.send("job_remove", { id }));
    } catch (err) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /**
   * POST /jobs/seed
   */
  @Post("seed")
  async seed(@Body() dto: { jobs: any[] }) {
    try {
      return await firstValueFrom(this.jobClient.send("job_seed", dto));
    } catch (err) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }
}
