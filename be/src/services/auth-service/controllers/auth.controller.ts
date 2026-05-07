import { Controller, Post, Body, Get } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AuthService } from "../services/auth.service";
import { LoginDto } from "../dto/login.dto";
import { RegisterDto } from "../dto/register.dto";
import { RecruiterRequestDto } from "../dto/recruiter-request.dto";

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

  @MessagePattern("user_get_by_id")
  getById(@Payload() payload: { id: number }) {
    return this.authService.getUserById(payload.id);
  }

  @MessagePattern("user_update_profile")
  updateProfile(@Payload() payload: { id: number; dto: { name?: string } }) {
    return this.authService.updateUserProfile(payload.id, payload.dto);
  }

  @MessagePattern("user_request_recruiter")
  requestRecruiter(@Payload() payload: { id: number; dto: RecruiterRequestDto }) {
    return this.authService.requestRecruiter(payload.id, payload.dto);
  }

  @MessagePattern("user_approve_recruiter")
  approveRecruiter(@Payload() payload: { id: number }) {
    return this.authService.approveRecruiter(payload.id);
  }

  @MessagePattern("user_reject_recruiter")
  rejectRecruiter(@Payload() payload: { id: number; reason?: string }) {
    return this.authService.rejectRecruiter(payload.id, payload.reason);
  }

  @MessagePattern("auth_send_company_approved_email")
  async sendCompanyApprovedEmail(@Payload() payload: { userId: number; companyName: string }) {
    const user = await this.authService.getUserById(payload.userId);
    return this.authService.sendCompanyApprovedEmail(user.email, user.name, payload.companyName);
  }

  @MessagePattern("auth_send_company_rejected_email")
  async sendCompanyRejectedEmail(@Payload() payload: { userId: number; companyName: string; reason?: string }) {
    const user = await this.authService.getUserById(payload.userId);
    return this.authService.sendCompanyRejectedEmail(user.email, user.name, payload.companyName, payload.reason);
  }

  @MessagePattern("auth_google_login")
  async googleLogin(@Payload() payload: { token: string }) {
    return this.authService.googleLogin(payload.token);
  }
}
