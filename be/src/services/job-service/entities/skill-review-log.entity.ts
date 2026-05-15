import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from "typeorm";
import { SkillTerm } from "./skill-term.entity";

/**
 * SkillReviewLog — lịch sử mọi thay đổi admin thực hiện trên SkillTerm.
 *
 * Audit trail cho hệ thống human-in-the-loop:
 *  - approve, reject, mark-stopword, merge-alias, change-category...
 *  - Có thể rollback nếu admin duyệt nhầm.
 */
export type SkillReviewAction =
  | "approve"
  | "reject"
  | "mark_stopword"
  | "merge_alias"
  | "change_category"
  | "change_type"
  | "change_canonical"
  | "rename"
  | "bulk_action"
  | "restore";

@Entity("skill_review_logs")
@Index(["skillTermId"])
@Index(["adminId"])
@Index(["createdAt"])
export class SkillReviewLog {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ name: "skill_term_id", type: "int" })
  skillTermId: number;

  @ManyToOne(() => SkillTerm, (skill) => skill.reviewLogs, { onDelete: "CASCADE" })
  @JoinColumn({ name: "skill_term_id" })
  skillTerm: SkillTerm;

  /** Hành động đã thực hiện */
  @Column({ type: "varchar", length: 30 })
  action: SkillReviewAction;

  /** Giá trị cũ (JSON string nếu phức tạp) */
  @Column({ name: "old_value", type: "text", nullable: true })
  oldValue: string | null;

  /** Giá trị mới */
  @Column({ name: "new_value", type: "text", nullable: true })
  newValue: string | null;

  /** Admin user ID thực hiện */
  @Column({ name: "admin_id", type: "int", nullable: true })
  adminId: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
