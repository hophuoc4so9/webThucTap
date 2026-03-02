import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Cv } from "./cv.entity";

export type ApplicationStatus =
  | "pending"
  | "reviewing"
  | "accepted"
  | "rejected";

@Entity("applications")
export class Application {
  @PrimaryGeneratedColumn()
  id: number;

  /** ID người dùng ứng tuyển */
  @Column()
  userId: number;

  /** ID tin tuyển dụng (từ job-service) */
  @Column()
  jobId: number;

  /** Tiêu đề công việc (lưu nhanh, không cần join) */
  @Column({ nullable: true })
  jobTitle: string;

  /** Tên công ty (lưu nhanh) */
  @Column({ nullable: true })
  companyName: string;

  /** Thư giới thiệu */
  @Column({ type: "text", nullable: true })
  coverLetter: string;

  /**
   * Trạng thái đơn ứng tuyển
   * pending | reviewing | accepted | rejected
   */
  @Column({ default: "pending" })
  status: ApplicationStatus;

  /** Ghi chú của nhà tuyển dụng */
  @Column({ type: "text", nullable: true })
  note: string;

  @CreateDateColumn()
  appliedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /** CV được dùng để ứng tuyển (nullable nếu nộp CV file ngoài) */
  @Column({ nullable: true, name: "cv_id" })
  cvId: number;

  @ManyToOne(() => Cv, (cv) => cv.applications, {
    nullable: true,
    onDelete: "SET NULL",
    eager: false,
  })
  @JoinColumn({ name: "cv_id" })
  cv: Cv;
}
