import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly from = process.env.MAIL_FROM || process.env.SMTP_USER || "noreply@localhost";
  private readonly adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_USER || "admin@localhost";

  private readonly transporter =
    process.env.SMTP_HOST && process.env.SMTP_PORT
      ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER
          ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
          : undefined,
      })
      : null;

  // ================= TEMPLATE =================
  private buildTemplate(content: string) {
    return `
    <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:20px;">
      <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,0.1)">
        
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;padding:20px;text-align:center">
          <h2 style="margin:0;font-size:22px;">🚀 TDMU Jobs</h2>
          <p style="margin:5px 0 0;font-size:13px;opacity:0.9;">Nền tảng tuyển dụng cho sinh viên</p>
        </div>

        <!-- Body -->
        <div style="padding:25px;color:#333;line-height:1.6;">
          ${content}
        </div>

        <!-- Footer -->
        <div style="background:#f9fafb;padding:15px;text-align:center;font-size:12px;color:#777;">
          © 2026 TDMU Jobs · All rights reserved
        </div>

      </div>
    </div>
    `;
  }

  // ================= MAIL FUNCTIONS =================

  async sendRecruiterRequestSubmitted(params: {
    to: string;
    name?: string | null;
    companyName: string;
    status: "pending" | "approved";
  }) {
    const subject = params.status === "approved"
      ? "Tài khoản nhà tuyển dụng đã được xác nhận"
      : "Yêu cầu nhà tuyển dụng đã được tiếp nhận";

    const content = params.status === "approved"
      ? `
        <h3 style="color:#16a34a;">✅ Đã xác nhận</h3>
        <p>Xin chào <b>${params.name ?? "bạn"}</b>,</p>
        <p>Yêu cầu cho công ty <b>${params.companyName}</b> đã được hệ thống xác nhận.</p>

        <div style="text-align:center;margin:25px 0;">
          <a href="http://localhost:3000/login"
             style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:500;">
             Đăng nhập ngay
          </a>
        </div>
      `
      : `
        <h3 style="color:#f59e0b;">⏳ Đang xử lý</h3>
        <p>Xin chào <b>${params.name ?? "bạn"}</b>,</p>
        <p>Yêu cầu cho công ty <b>${params.companyName}</b> đã được tiếp nhận và đang chờ admin duyệt.</p>
      `;

    await this.sendMail(params.to, subject, "Thông báo", this.buildTemplate(content));
  }

  async sendRecruiterRequestForAdmin(params: {
    userEmail: string;
    name?: string | null;
    companyName: string;
    website?: string;
  }) {
    const content = `
      <h3 style="color:#2563eb;">📩 Yêu cầu nhà tuyển dụng mới</h3>
      <ul style="padding-left:20px;">
        <li><b>Email:</b> ${params.userEmail}</li>
        <li><b>Tên:</b> ${params.name ?? "(chưa có)"}</li>
        <li><b>Công ty:</b> ${params.companyName}</li>
        <li><b>Website:</b> ${params.website ?? "(chưa có)"}</li>
      </ul>
    `;

    await this.sendMail(
      this.adminEmail,
      "[TDMU Jobs] Yêu cầu nhà tuyển dụng mới",
      "Có yêu cầu mới",
      this.buildTemplate(content),
    );
  }

  async sendRecruiterApproved(params: { to: string; name?: string | null; companyName: string }) {
    const content = `
      <h3 style="color:#16a34a;">🎉 Chúc mừng!</h3>
      <p>Xin chào <b>${params.name ?? "bạn"}</b>,</p>
      <p>Tài khoản nhà tuyển dụng cho <b>${params.companyName}</b> đã được phê duyệt.</p>

      <div style="text-align:center;margin:25px 0;">
        <a href="http://localhost:3000/login"
           style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">
           Đăng nhập ngay
        </a>
      </div>
    `;

    await this.sendMail(params.to, "Đã được phê duyệt", "Approved", this.buildTemplate(content));
  }

  async sendRecruiterRejected(params: { to: string; name?: string | null; companyName: string; reason?: string | null }) {
    const content = `
      <h3 style="color:#dc2626;">❌ Bị từ chối</h3>
      <p>Xin chào <b>${params.name ?? "bạn"}</b>,</p>
      <p>Yêu cầu cho công ty <b>${params.companyName}</b> chưa được phê duyệt.</p>
      ${params.reason ? `<p><b>Lý do:</b> ${params.reason}</p>` : ""}
    `;

    await this.sendMail(params.to, "Bị từ chối", "Rejected", this.buildTemplate(content));
  }

  // ================= CORE SEND =================
  private async sendMail(to: string, subject: string, text: string, html?: string) {
    if (!this.transporter) {
      this.logger.warn(`Transporter not initialized. Simulation [MAIL:${to}] ${subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        text,
        html,
      });
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`, err.stack);
      throw err;
    }
  }
}
