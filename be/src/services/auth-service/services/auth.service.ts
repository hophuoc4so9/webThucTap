import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User, UserRole, RecruiterStatus } from "../entities/user.entity";
import { RegisterDto } from "../dto/register.dto";
import { LoginDto } from "../dto/login.dto";
import { RecruiterRequestDto } from "../dto/recruiter-request.dto";
import { MailService } from "./mail.service";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const JWT_EXPIRES_IN = "7d";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing)
      throw new RpcException({ statusCode: 400, message: "Email đã tồn tại" });
    const hashed = await bcrypt.hash(dto.password, 10);
    const validRoles = Object.values(UserRole) as string[];
    const role =
      dto.role && validRoles.includes(dto.role)
        ? (dto.role as UserRole)
        : UserRole.STUDENT;
    const user = this.userRepo.create({
      email: dto.email,
      password: hashed,
      role,
    });
    await this.userRepo.save(user);
    return { message: "Đăng ký thành công!" };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user)
      throw new RpcException({
        statusCode: 401,
        message: "Email hoặc mật khẩu không đúng",
      });
    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch)
      throw new RpcException({
        statusCode: 401,
        message: "Email hoặc mật khẩu không đúng",
      });
    const token = this.generateToken(user);
    return {
      accessToken: token,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async listUsers(page = 1, limit = 20, role?: string, email?: string) {
    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (email) {
      const { ILike } = await import("typeorm");
      where.email = ILike(`%${email}%`);
    }
    const [data, total] = await this.userRepo.findAndCount({
      where: Object.keys(where).length ? (where as any) : undefined,
      select: ["id", "email", "role", "name", "recruiterStatus", "companyName", "companyWebsite"],
      order: { id: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async updateUserRole(id: number, role: string) {
    const validRoles = Object.values(UserRole) as string[];
    if (!validRoles.includes(role))
      throw new RpcException({
        statusCode: 400,
        message: "Vai trò không hợp lệ",
      });
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user)
      throw new RpcException({
        statusCode: 404,
        message: "Không tìm thấy người dùng",
      });
    user.role = role as UserRole;
    await this.userRepo.save(user);
    return { id: user.id, email: user.email, role: user.role };
  }

  async deleteUser(id: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user)
      throw new RpcException({
        statusCode: 404,
        message: "Không tìm thấy người dùng",
      });
    await this.userRepo.remove(user);
    return { message: "Đã xóa người dùng" };
  }

  async getStats() {
    const total = await this.userRepo.count();
    const students = await this.userRepo.count({
      where: { role: UserRole.STUDENT },
    });
    const companies = await this.userRepo.count({
      where: { role: UserRole.COMPANY },
    });
    const admins = await this.userRepo.count({
      where: { role: UserRole.ADMIN },
    });
    return { total, students, companies, admins };
  }

  async getUserById(id: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user)
      throw new RpcException({
        statusCode: 404,
        message: "Không tìm thấy người dùng",
      });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name ?? null,
      recruiterStatus: user.recruiterStatus,
      companyName: user.companyName ?? null,
      companyWebsite: user.companyWebsite ?? null,
    };
  }

  async updateUserProfile(id: number, dto: { name?: string }) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user)
      throw new RpcException({
        statusCode: 404,
        message: "Không tìm thấy người dùng",
      });

    if (dto.name !== undefined) user.name = dto.name?.trim() || null;
    await this.userRepo.save(user);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name ?? null,
      recruiterStatus: user.recruiterStatus,
      companyName: user.companyName ?? null,
      companyWebsite: user.companyWebsite ?? null,
    };
  }

  private isAutoApprovedRecruiter(email: string, companyWebsite?: string) {
    if (!companyWebsite) return false;
    try {
      const emailDomain = email.split("@")[1]?.toLowerCase() ?? "";
      const websiteHost = new URL(companyWebsite).hostname.toLowerCase().replace(/^www\./, "");
      if (!emailDomain || !websiteHost) return false;
      const freeMailDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"];
      if (freeMailDomains.includes(emailDomain)) return false;
      return websiteHost === emailDomain || websiteHost.endsWith(`.${emailDomain}`) || emailDomain.endsWith(`.${websiteHost}`);
    } catch {
      return false;
    }
  }

  async requestRecruiter(id: number, dto: RecruiterRequestDto) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user)
      throw new RpcException({ statusCode: 404, message: "Không tìm thấy người dùng" });

    const autoApproved = this.isAutoApprovedRecruiter(user.email, dto.companyWebsite);
    user.companyName = dto.companyName.trim();
    user.companyWebsite = dto.companyWebsite?.trim() || null;
    user.recruiterNote = dto.note?.trim() || null;
    user.recruiterRequestedAt = new Date();
    user.recruiterReviewedAt = autoApproved ? new Date() : null;
    user.recruiterStatus = autoApproved ? RecruiterStatus.APPROVED : RecruiterStatus.PENDING;
    if (autoApproved) user.role = UserRole.COMPANY;
    await this.userRepo.save(user);

    await this.mailService.sendRecruiterRequestSubmitted({
      to: user.email,
      name: user.name,
      companyName: user.companyName,
      status: autoApproved ? "approved" : "pending",
    });
    if (!autoApproved) {
      await this.mailService.sendRecruiterRequestForAdmin({
        userEmail: user.email,
        name: user.name,
        companyName: user.companyName,
        website: user.companyWebsite ?? undefined,
      });
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name ?? null,
      recruiterStatus: user.recruiterStatus,
      companyName: user.companyName,
      companyWebsite: user.companyWebsite,
    };
  }

  async approveRecruiter(id: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user)
      throw new RpcException({ statusCode: 404, message: "Không tìm thấy người dùng" });

    user.role = UserRole.COMPANY;
    user.recruiterStatus = RecruiterStatus.APPROVED;
    user.recruiterReviewedAt = new Date();
    await this.userRepo.save(user);
    await this.mailService.sendRecruiterApproved({
      to: user.email,
      name: user.name,
      companyName: user.companyName ?? user.email,
    });
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name ?? null,
      recruiterStatus: user.recruiterStatus,
      companyName: user.companyName ?? null,
      companyWebsite: user.companyWebsite ?? null,
    };
  }

  async rejectRecruiter(id: number, reason?: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user)
      throw new RpcException({ statusCode: 404, message: "Không tìm thấy người dùng" });

    user.recruiterStatus = RecruiterStatus.REJECTED;
    user.recruiterReviewedAt = new Date();
    user.recruiterNote = reason?.trim() || user.recruiterNote || null;
    await this.userRepo.save(user);
    await this.mailService.sendRecruiterRejected({
      to: user.email,
      name: user.name,
      companyName: user.companyName ?? user.email,
      reason,
    });
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name ?? null,
      recruiterStatus: user.recruiterStatus,
      companyName: user.companyName ?? null,
      companyWebsite: user.companyWebsite ?? null,
    };
  }

  generateToken(user: User) {
    return jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );
  }

  async googleLogin(token: string) {
    let payload: { sub?: string; email?: string; name?: string };
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload() as typeof payload;
    } catch {
      throw new RpcException({ statusCode: 401, message: "Google token không hợp lệ" });
    }

    if (!payload?.email) {
      throw new RpcException({ statusCode: 401, message: "Không lấy được email từ Google" });
    }

    let user = await this.userRepo.findOne({ where: { email: payload.email } });
    if (!user) {
      user = this.userRepo.create({
        email: payload.email,
        name: payload.name ?? null,
        googleId: payload.sub ?? null,
        role: UserRole.STUDENT,
      });
      await this.userRepo.save(user);
    } else if (!user.googleId && payload.sub) {
      user.googleId = payload.sub;
      if (!user.name && payload.name) user.name = payload.name;
      await this.userRepo.save(user);
    }

    const accessToken = this.generateToken(user);
    return {
      accessToken,
      user: { id: user.id, email: user.email, role: user.role, name: user.name },
    };
  }
}
