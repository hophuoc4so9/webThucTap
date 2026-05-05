import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

export enum UserRole {
  STUDENT = "student",
  COMPANY = "company",
  ADMIN = "admin",
}

export enum RecruiterStatus {
  NONE = "none",
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  companyName: string | null;

  @Column({ nullable: true })
  companyWebsite: string | null;

  @Column({ type: "enum", enum: RecruiterStatus, default: RecruiterStatus.NONE })
  recruiterStatus: RecruiterStatus;

  @Column({ type: "timestamp", nullable: true })
  recruiterRequestedAt: Date | null;

  @Column({ type: "timestamp", nullable: true })
  recruiterReviewedAt: Date | null;

  @Column({ type: "text", nullable: true })
  recruiterNote: string | null;

  @Column({ nullable: true, unique: true })
  googleId: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  /** Vị trí công tác (nhà tuyển dụng) */
  @Column({ nullable: true })
  position: string | null;

  /** Địa điểm làm việc (nhà tuyển dụng) */
  @Column({ nullable: true })
  location: string | null;
}
