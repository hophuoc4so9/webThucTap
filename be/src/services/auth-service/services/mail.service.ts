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

  async sendRecruiterRequestSubmitted(params: {
    to: string;
    name?: string | null;
    companyName: string;
    status: "pending" | "approved";
  }) {
    const subject = params.status === "approved"
      ? "Tài khoản nhà tuyển dụng đã được xác nhận"
      : "Yêu cầu nhà tuyển dụng đã được tiếp nhận";
    const text = params.status === "approved"
      ? `Xin chào ${params.name ?? "bạn"}, yêu cầu nhà tuyển dụng cho ${params.companyName} đã được hệ thống xác nhận. Bạn có thể đăng nhập với vai trò nhà tuyển dụng.`
      : `Xin chào ${params.name ?? "bạn"}, yêu cầu nhà tuyển dụng cho ${params.companyName} đã được tiếp nhận và đang chờ admin xác nhận.`;
    await this.sendMail(params.to, subject, text);
  }

  async sendRecruiterRequestForAdmin(params: {
    userEmail: string;
    name?: string | null;
    companyName: string;
    website?: string;
  }) {
    const text = [
      `Có yêu cầu nhà tuyển dụng mới:`,
      `- Email: ${params.userEmail}`,
      `- Tên: ${params.name ?? "(chưa có)"}`,
      `- Công ty: ${params.companyName}`,
      `- Website: ${params.website ?? "(chưa có)"}`,
    ].join("\n");
    await this.sendMail(this.adminEmail, "[TDMU Jobs] Yêu cầu nhà tuyển dụng mới", text);
  }

  async sendRecruiterApproved(params: { to: string; name?: string | null; companyName: string }) {
    await this.sendMail(
      params.to,
      "Yêu cầu nhà tuyển dụng đã được phê duyệt",
      `Xin chào ${params.name ?? "bạn"}, tài khoản nhà tuyển dụng cho ${params.companyName} đã được phê duyệt.`,
    );
  }

  async sendRecruiterRejected(params: { to: string; name?: string | null; companyName: string; reason?: string | null }) {
    await this.sendMail(
      params.to,
      "Yêu cầu nhà tuyển dụng chưa được phê duyệt",
      `Xin chào ${params.name ?? "bạn"}, yêu cầu nhà tuyển dụng cho ${params.companyName} chưa được phê duyệt.${params.reason ? ` Lý do: ${params.reason}` : ""}`,
    );
  }

  private async sendMail(to: string, subject: string, text: string) {
    if (!this.transporter) {
      this.logger.log(`[MAIL:${to}] ${subject}\n${text}`);
      return;
    }

    await this.transporter.sendMail({
      from: this.from,
      to,
      subject,
      text,
    });
  }
}
