import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export enum MemberRole {
  OWNER = "owner",
  ADMIN = "admin",
  MEMBER = "member",
}

export enum MemberStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

@Entity("company_members")
export class CompanyMember {
  @PrimaryGeneratedColumn()
  id: number;

  /** auth-service user id */
  @Column({ name: "user_id", type: "int" })
  userId: number;

  @Column({ name: "company_id", type: "int" })
  companyId: number;

  @Column({ type: "enum", enum: MemberRole, default: MemberRole.MEMBER })
  role: MemberRole;

  @Column({ type: "enum", enum: MemberStatus, default: MemberStatus.PENDING })
  status: MemberStatus;

  /** Lý do từ chối (nếu có) */
  @Column({ name: "reject_reason", type: "text", nullable: true })
  rejectReason: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
