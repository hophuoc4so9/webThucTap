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

  /** Họ và tên đầy đủ */
  @Column({ nullable: true })
  fullName: string;

  /** Vị trí / chức danh mong muốn */
  @Column({ nullable: true })
  jobPosition: string;

  /** Số điện thoại liên hệ */
  @Column({ nullable: true })
  phone: string;

  /** Email liên hệ */
  @Column({ nullable: true })
  contactEmail: string;

  /** Địa chỉ / thành phố */
  @Column({ nullable: true })
  address: string;

  /** LinkedIn URL */
  @Column({ nullable: true })
  linkedIn: string;

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

  /** Kinh nghiệm làm việc — tags (JSON string) */
  @Column({ type: "text", nullable: true })
  experience: string;

  /** Danh sách dự án (JSON string) */
  @Column({ type: "text", nullable: true })
  projects: string;

  /** Chứng chỉ (JSON string) */
  @Column({ type: "text", nullable: true })
  certifications: string;

  /** Ngoại ngữ (JSON string) */
  @Column({ type: "text", nullable: true })
  languages: string;

  /** Ngành học do sinh viên chọn */
  @Column({ type: "text", nullable: true })
  major: string;

  /** Nhóm ngành (vd: KINH TẾ) */
  @Column({ name: "major_group", type: "text", nullable: true })
  majorGroup: string;

  /** Mã ngành (id_news) từ danh mục trường */
  @Column({ name: "major_code", type: "text", nullable: true })
  majorCode: string;

  /** Liên kết mạng xã hội (JSON string) */
  @Column({ type: "text", nullable: true })
  socialLinks: string;

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

  /** Nguồn: 'form' = tạo từ form hệ thống (được sửa đầy đủ), 'file' = chỉ tải file (không sửa nội dung) */
  @Column({ type: "varchar", length: 10, default: "form" })
  source: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Application, (app) => app.cv)
  applications: Application[];
}
