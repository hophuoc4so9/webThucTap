import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Inject,
  HttpException,
  ParseIntPipe,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";

@Controller("users")
export class UserController {
  constructor(
    @Inject("AUTH_SERVICE") private readonly authClient: ClientProxy,
  ) {}

  /** GET /users?page=&limit=&role=&email= */
  @Get()
  async list(
    @Query("page") page = 1,
    @Query("limit") limit = 20,
    @Query("role") role?: string,
    @Query("email") email?: string,
  ) {
    try {
      return await firstValueFrom(
        this.authClient.send("user_list", {
          page: +page,
          limit: +limit,
          role,
          email,
        }),
      );
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** GET /users/stats */
  @Get("stats")
  async stats() {
    try {
      return await firstValueFrom(this.authClient.send("user_stats", {}));
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** GET /users/:id */
  @Get(":id")
  async getById(@Param("id", ParseIntPipe) id: number) {
    try {
      return await firstValueFrom(this.authClient.send("user_get_by_id", { id }));
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** PUT /users/:id/profile */
  @Put(":id/profile")
  async updateProfile(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { name?: string },
  ) {
    try {
      return await firstValueFrom(
        this.authClient.send("user_update_profile", { id, dto: body }),
      );
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** POST /users/:id/recruiter-request */
  @Post(":id/recruiter-request")
  async requestRecruiter(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { companyName: string; companyWebsite?: string; note?: string },
  ) {
    try {
      return await firstValueFrom(
        this.authClient.send("user_request_recruiter", { id, dto: body }),
      );
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** PUT /users/:id/recruiter-approve */
  @Put(":id/recruiter-approve")
  async approveRecruiter(@Param("id", ParseIntPipe) id: number) {
    try {
      return await firstValueFrom(
        this.authClient.send("user_approve_recruiter", { id }),
      );
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** PUT /users/:id/recruiter-reject */
  @Put(":id/recruiter-reject")
  async rejectRecruiter(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { reason?: string },
  ) {
    try {
      return await firstValueFrom(
        this.authClient.send("user_reject_recruiter", { id, reason: body.reason }),
      );
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** PUT /users/:id/role */
  @Put(":id/role")
  async updateRole(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { role: string },
  ) {
    try {
      return await firstValueFrom(
        this.authClient.send("user_update_role", { id, role: body.role }),
      );
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** DELETE /users/:id */
  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: number) {
    try {
      return await firstValueFrom(this.authClient.send("user_delete", { id }));
    } catch (err : any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }
}
