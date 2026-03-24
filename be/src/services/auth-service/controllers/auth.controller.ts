import { Controller, Post, Body, Get } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AuthService } from "../services/auth.service";
import { LoginDto } from "../dto/login.dto";
import { RegisterDto } from "../dto/register.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern("auth_ping")
  ping() {
    return {
      status: "ok",
      service: "auth-service",
      timestamp: new Date().toISOString(),
    };
  }

  @Post("login")
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @MessagePattern("auth_login")
  async loginMessage(@Payload() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post("register")
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @MessagePattern("auth_register")
  async registerMessage(@Payload() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @MessagePattern("user_list")
  listUsers(
    @Payload()
    payload: {
      page?: number;
      limit?: number;
      role?: string;
      email?: string;
    },
  ) {
    return this.authService.listUsers(
      payload?.page,
      payload?.limit,
      payload?.role,
      payload?.email,
    );
  }

  @MessagePattern("user_update_role")
  updateRole(@Payload() payload: { id: number; role: string }) {
    return this.authService.updateUserRole(payload.id, payload.role);
  }

  @MessagePattern("user_delete")
  deleteUser(@Payload() payload: { id: number }) {
    return this.authService.deleteUser(payload.id);
  }

  @MessagePattern("user_stats")
  getStats() {
    return this.authService.getStats();
  }

  @MessagePattern("auth_google_login")
  async googleLogin(@Payload() payload: { token: string }) {
    return this.authService.googleLogin(payload.token);
  }
}
