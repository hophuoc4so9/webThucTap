import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { SkillTerm } from "./skill-term.entity";

/**
 * SkillCluster — bảng lưu cụm kỹ năng đã được đặt tên bởi admin.
 *
 * Quy trình:
 *  1. System tự động phân cụm pending candidates (unsupervised clustering)
 *  2. Admin xem cụm → đặt tên (create record này)
 *  3. Mỗi skill trong cụm có thể:
 *     - Approve (vào dictionary)
 *     - Move to stopword (với scope: global/majorGroup/major)
 *     - Rename
 *     - Reject
 *
 * Scope:
 *  - "global": áp dụng cho toàn bộ hệ thống
 *  - "majorGroup": chỉ cho một nhóm ngành (VD: "Công nghệ - Kỹ thuật")
 *  - "major": chỉ cho một ngành cụ thể (VD: "Công nghệ thông tin")
 */

export type SkillClusterScope = "global" | "majorGroup" | "major";

@Entity("skill_clusters")
@Index(["scope", "scopeContext"])
@Index(["status"])
export class SkillCluster {
  @PrimaryGeneratedColumn("increment")
  id: number;

  /** Tên của cụm (do admin đặt). VD: "Frontend Frameworks", "Testing Tools" */
  @Column({ name: "cluster_name", type: "text" })
  clusterName: string;

  /** Mô tả cụm (optional) */
  @Column({ type: "text", nullable: true })
  description: string | null;

  /**
   * Phạm vi áp dụng cụm này:
   * - "global": toàn bộ hệ thống
   * - "majorGroup": nhóm ngành (e.g., "Công nghệ - Kỹ thuật")
   * - "major": ngành cụ thể (e.g., "Công nghệ thông tin")
   */
  @Column({
    name: "scope",
    type: "varchar",
    length: 20,
    default: "global",
  })
  scope: SkillClusterScope;

  /**
   * Giá trị context tương ứng với scope:
   * - Nếu scope="global" → scopeContext = null
   * - Nếu scope="majorGroup" → scopeContext = tên nhóm
   * - Nếu scope="major" → scopeContext = tên ngành
   */
  @Column({ type: "varchar", length: 200, nullable: true })
  scopeContext: string | null;

  /** Trạng thái cụm: "active" | "archived" | "merged" */
  @Column({
    type: "varchar",
    length: 20,
    default: "active",
  })
  status: "active" | "archived" | "merged";

  /** Các SkillTerm thuộc cụm này */
  @ManyToMany(() => SkillTerm)
  @JoinTable({
    name: "skill_cluster_terms",
    joinColumn: { name: "cluster_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "skill_term_id", referencedColumnName: "id" },
  })
  skillTerms: SkillTerm[];

  /** Nếu cụm bị merge vào cụm khác, lưu ID cụm đích */
  @Column({ name: "merged_into_cluster_id", type: "int", nullable: true })
  mergedIntoClusterId: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
