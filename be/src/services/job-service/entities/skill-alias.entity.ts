import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from "typeorm";
import { SkillTerm } from "./skill-term.entity";

/**
 * SkillAlias — bảng ánh xạ alias → canonical skill.
 *
 * VD: "js" → "JavaScript", "node" → "Node.js", "reactjs" → "React"
 * Khi extraction gặp aliasText → tự động map về canonicalSkill.
 */
@Entity("skill_aliases")
@Index(["normalizedAlias"], { unique: true })
export class SkillAlias {
  @PrimaryGeneratedColumn("increment")
  id: number;

  /** Văn bản alias gốc (VD: "js", "reactjs") */
  @Column({ name: "alias_text", type: "text" })
  aliasText: string;

  /** Văn bản alias đã normalize */
  @Column({ name: "normalized_alias", type: "text" })
  normalizedAlias: string;

  /** Skill chính mà alias này trỏ tới */
  @Column({ name: "canonical_skill_id", type: "int" })
  canonicalSkillId: number;

  @ManyToOne(() => SkillTerm, (skill) => skill.aliases, { onDelete: "CASCADE" })
  @JoinColumn({ name: "canonical_skill_id" })
  canonicalSkill: SkillTerm;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
