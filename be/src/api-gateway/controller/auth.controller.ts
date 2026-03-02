import {
  Controller,
  Post,
  Body,
  Get,
  Inject,
  HttpException,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";

@Controller("auth")
export class AuthController {
  constructor(
    @Inject("AUTH_SERVICE") private readonly authServiceClient: ClientProxy,
  ) {}

  /** GET /auth/health  */
  @Get("health")
  health() {
    return {
      status: "ok",
      service: "api-gateway",
      timestamp: new Date().toISOString(),
    };
  }

  /** GET /auth/ping-service */
  @Get("ping-service")
  pingService() {
    return firstValueFrom(this.authServiceClient.send("auth_ping", {}));
  }

  @Post("login")
  async login(@Body() dto: any) {
    try {
      return await firstValueFrom(
        this.authServiceClient.send("auth_login", dto),
      );
    } catch (err) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  @Post("register")
  async register(@Body() dto: any) {
    try {
      const result = await firstValueFrom(
        this.authServiceClient.send("auth_register", dto),
      );
      return { success: true, ...result };
    } catch (err) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }
}
