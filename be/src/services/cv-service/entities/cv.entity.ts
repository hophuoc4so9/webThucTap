import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Application } from "./application.entity";

@Entity("cvs")
export class Cv {
  @PrimaryGeneratedColumn()
  id: number;

  /** ID người dùng từ auth-service */
  @Column()
  userId: number;

  /** Tiêu đề CV, vd: "CV Frontend Developer" */
  @Column({ nullable: true })
  title: string;

  /** Tóm tắt bản thân */
  @Column({ type: "text", nullable: true })
  summary: string;

  /** Danh sách kỹ năng (JSON string) */
  @Column({ type: "text", nullable: true })
  skills: string;

  /** Quá trình học vấn (JSON string) */
  @Column({ type: "text", nullable: true })
  education: string;

  /** Kinh nghiệm làm việc (JSON string) */
  @Column({ type: "text", nullable: true })
  experience: string;

  /** Đường dẫn file CV tải lên (nếu có) */
  @Column({ nullable: true })
  filePath: string;

  /** Tên file gốc */
  @Column({ nullable: true })
  fileOriginalName: string;

  /** MIME type của file */
  @Column({ nullable: true })
  fileMimeType: string;

  /** Đánh dấu CV mặc định */
  @Column({ default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Application, (app) => app.cv)
  applications: Application[];
}
