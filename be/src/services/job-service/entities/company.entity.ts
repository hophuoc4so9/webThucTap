import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Job } from "./job.entity";

export enum CompanyStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

@Entity("companies")
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "text", nullable: true })
  logo: string;

  @Column({ type: "text" })
  name: string;

  @Column({ name: "shortdescription", type: "text", nullable: true })
  shortDescription: string;

  @Column({ name: "current_job_opening", type: "int", default: 0 })
  currentJobOpening: number;

  @Column({ type: "text", nullable: true })
  industry: string;

  @Column({ type: "text", nullable: true })
  size: string;

  @Column({ type: "text", nullable: true })
  nationality: string;

  @Column({ type: "text", nullable: true })
  website: string;

  /** Lưu JSON string chứa các đường dẫn mạng xã hội */
  @Column({ name: "social_media", type: "text", nullable: true })
  socialMedia: string;

  @Column({ type: "text", nullable: true })
  address: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "text", nullable: true })
  banner: string;

  @Column({ name: "short_address", type: "text", nullable: true })
  shortAddress: string;

  @Column({ type: "int", default: 0 })
  followers: number;

  /** Lưu JSON string chứa mảng đường dẫn ảnh */
  @Column({ name: "about_images", type: "text", nullable: true })
  aboutImages: string;

  // Reputation & Metrics for Recommendations
  @Column({ name: "rating_avg", type: "float", nullable: true })
  ratingAvg: number | null;

  @Column({ name: "rating_count", type: "int", default: 0 })
  ratingCount: number;

  @Column({ name: "interns_accepted_count", type: "int", default: 0 })
  internsAcceptedCount: number;

  @Column({
    name: "reputation_score",
    type: "float",
    default: 0,
    comment: "Aggregated reputation score (0-1) based on followers, interns accepted, rating",
  })
  reputationScore: number;

  @OneToMany(() => Job, (job) => job.companyRef, { cascade: true })
  jobs: Job[];

  /** Trạng thái xác thực công ty (admin duyệt) */
  @Column({
    type: "enum",
    enum: CompanyStatus,
    default: CompanyStatus.PENDING,
  })
  status: CompanyStatus;

  /** Lý do từ chối (nếu có) */
  @Column({ name: "reject_reason", type: "text", nullable: true })
  rejectReason: string | null;

  /** Số điện thoại công ty */
  @Column({ type: "text", nullable: true })
  phone: string | null;

  /** Email liên hệ công ty */
  @Column({ name: "company_email", type: "text", nullable: true })
  companyEmail: string | null;

  /** ID người tạo công ty (auth-service user id) */
  @Column({ name: "owner_id", type: "int", nullable: true })
  ownerId: number | null;

  /** Đường dẫn file giấy phép kinh doanh (admin xét duyệt) */
  @Column({ name: "business_license", type: "text", nullable: true })
  businessLicense: string | null;
}
