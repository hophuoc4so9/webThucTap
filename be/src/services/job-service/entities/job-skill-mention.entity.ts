import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from "typeorm";
import { Job } from "./job.entity";
import { SkillTerm } from "./skill-term.entity";
import type { SkillTermType } from "./skill-term.entity";

/**
 * JobSkillMention — mỗi mention (đề cập) của 1 skill trong 1 job.
 *
 * Thay thế field extractedSkills string[] bằng normalized data:
 *  - Liên kết trực tiếp tới SkillTerm (nếu đã duyệt).
 *  - Giữ metadata: source, confidence, type, category, major context.
 *  - Hỗ trợ query nhanh: "top skills cho ngành CNTT", "skill trends by category".
 */
export type MentionSource = "title" | "tag" | "requirement" | "description";

@Entity("job_skill_mentions")
@Index(["jobId"])
@Index(["skillTermId"])
@Index(["canonicalName"])
@Index(["major"])
@Index(["category"])
@Index(["jobId", "canonicalName"], { unique: true })
export class JobSkillMention {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ name: "job_id", type: "int" })
  jobId: number;

  @ManyToOne(() => Job, { onDelete: "CASCADE" })
  @JoinColumn({ name: "job_id" })
  job: Job;

  /** Null nếu skill chưa được duyệt (pending candidate) */
  @Column({ name: "skill_term_id", type: "int", nullable: true })
  skillTermId: number | null;

  @ManyToOne(() => SkillTerm, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "skill_term_id" })
  skillTerm: SkillTerm | null;

  /** Tên chuẩn — có thể là canonical từ SkillTerm hoặc raw nếu chưa duyệt */
  @Column({ name: "canonical_name", type: "text" })
  canonicalName: string;

  /** Văn bản gốc trong job posting */
  @Column({ name: "raw_text", type: "text" })
  rawText: string;

  @Column({ type: "varchar", length: 20, default: "unknown" })
  type: SkillTermType;

  @Column({ type: "varchar", length: 100, nullable: true })
  category: string | null;

  @Column({ type: "float", default: 0.5 })
  confidence: number;

  @Column({ type: "varchar", length: 20, default: "description" })
  source: MentionSource;

  @Column({ type: "varchar", length: 200, nullable: true })
  major: string | null;

  @Column({ name: "major_group", type: "varchar", length: 200, nullable: true })
  majorGroup: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
