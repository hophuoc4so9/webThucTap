import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from "typeorm";
import { SkillAlias } from "./skill-alias.entity";
import { SkillReviewLog } from "./skill-review-log.entity";

/**
 * SkillTerm — bảng từ điển kỹ năng chính.
 *
 * Human-in-the-loop:
 *  - Khi extraction phát hiện term mới → status = "pending"
 *  - Admin duyệt → "approved" | "stopword" | "alias" | "rejected"
 *  - Approved skills được ưu tiên cao khi extract lần sau (confidence boost).
 *  - Stopword skills bị loại ngay (không cần regex thủ công).
 *  - Alias skills được map về canonicalName.
 *
 * Lợi ích:
 *  - Không cần update code khi bổ sung skill mới.
 *  - Admin có thể fix noise mà dev không cần deploy lại.
 *  - Theo dõi được lịch sử thay đổi qua SkillReviewLog.
 */
export type SkillTermStatus = "pending" | "approved" | "stopword" | "alias" | "rejected";
export type SkillTermType = "hard" | "soft" | "language" | "certificate" | "noise" | "unknown";

@Entity("skill_terms")
@Index(["normalizedText"], { unique: true })
@Index(["status"])
@Index(["category"])
@Index(["major"])
@Index(["majorGroup"])
@Index(["frequency"])
export class SkillTerm {
  @PrimaryGeneratedColumn("increment")
  id: number;

  /** Văn bản gốc đầu tiên được phát hiện */
  @Column({ name: "raw_text", type: "text" })
  rawText: string;

  /** Văn bản đã normalize (bỏ dấu, lowercase) — dùng làm key tra cứu */
  @Column({ name: "normalized_text", type: "text" })
  normalizedText: string;

  /** Tên chuẩn (canonical) — hiển thị cho user */
  @Column({ name: "canonical_name", type: "text" })
  canonicalName: string;

  /** Trạng thái duyệt */
  @Column({
    type: "varchar",
    length: 20,
    default: "pending",
  })
  status: SkillTermStatus;

  /** Loại kỹ năng: hard/soft/language/certificate/noise/unknown */
  @Column({
    type: "varchar",
    length: 20,
    default: "unknown",
  })
  type: SkillTermType;

  /**
   * Category chuyên môn, VD:
   * - CNTT: Backend, Frontend, DevOps, Data/AI, Mobile, Testing
   * - Kế toán: Accounting, Tax, Audit
   * - Marketing: SEO, Content, Ads
   * - Chung: Soft, Language, Certificate
   */
  @Column({ type: "varchar", length: 100, nullable: true })
  category: string | null;

  /** Ngành học liên quan (VD: "Công nghệ thông tin") */
  @Column({ type: "varchar", length: 200, nullable: true })
  major: string | null;

  /** Nhóm ngành (VD: "Công nghệ - Kỹ thuật") */
  @Column({ name: "major_group", type: "varchar", length: 200, nullable: true })
  majorGroup: string | null;

  /** Số lần xuất hiện trong các job đã extract */
  @Column({ type: "int", default: 0 })
  frequency: number;

  /** Confidence trung bình từ các lần extraction */
  @Column({ name: "confidence_avg", type: "float", default: 0 })
  confidenceAvg: number;

  /** Một vài job ID mẫu (để admin xem context) */
  @Column({ name: "example_job_ids", type: "jsonb", nullable: true })
  exampleJobIds: number[] | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @OneToMany(() => SkillAlias, (alias) => alias.canonicalSkill)
  aliases: SkillAlias[];

  @OneToMany(() => SkillReviewLog, (log) => log.skillTerm)
  reviewLogs: SkillReviewLog[];
}
