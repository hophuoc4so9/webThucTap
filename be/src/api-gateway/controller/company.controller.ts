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

@Controller("companies")
export class CompanyController {
  constructor(@Inject("JOB_SERVICE") private readonly jobClient: ClientProxy) {}

  /** GET /companies?page=&limit=&name= */
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
    } catch (err) {
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
    } catch (err) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** POST /companies */
  @Post()
  async create(@Body() dto: any) {
    try {
      return await firstValueFrom(this.jobClient.send("company_create", dto));
    } catch (err) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** PUT /companies/:id */
  @Put(":id")
  async update(@Param("id", ParseIntPipe) id: number, @Body() dto: any) {
    try {
      return await firstValueFrom(
        this.jobClient.send("company_update", { id, dto }),
      );
    } catch (err) {
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
    } catch (err) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }
}
