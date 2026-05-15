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

  /** Mã số sinh viên (Dành cho sinh viên TDMU) */
  @Column({ name: "student_id", nullable: true })
  studentId: string;

  /** Lớp (Dành cho sinh viên TDMU) */
  @Column({ nullable: true })
  class: string;

  /** Niên khóa (Dành cho sinh viên TDMU) */
  @Column({ name: "academic_year", nullable: true })
  academicYear: string;

  /** Ngày sinh */
  @Column({ type: "date", nullable: true })
  birthday: Date;

  /** Giới tính */
  @Column({ nullable: true })
  gender: string;

  /** Họ và tên đầy đủ */
  @Column({ nullable: true })
  fullName: string;

  /** Vị trí / chức danh mong muốn (Có thể là JSON string cho nhiều vị trí) */
  @Column({ type: "text", nullable: true })
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

  /** Mục tiêu nghề nghiệp */
  @Column({ name: "career_objective", type: "text", nullable: true })
  careerObjective: string;

  /** Danh sách kỹ năng (JSON string) */
  @Column({ type: "text", nullable: true })
  skills: string;

  /** Quá trình học vấn (JSON string) */
  @Column({ type: "text", nullable: true })
  education: string;

  /** Điểm trung bình học tập */
  @Column({ nullable: true })
  gpa: string;

  /** Hoạt động ngoại khóa (JSON string) */
  @Column({ type: "text", nullable: true })
  activities: string;

  /** Giải thưởng, học bổng (JSON string) */
  @Column({ type: "text", nullable: true })
  awards: string;

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

  /** Kết quả phân tích AI (JSON string) */
  @Column({ name: "ai_analysis", type: "text", nullable: true })
  aiAnalysis: string;

  /** Điểm đánh giá từ AI */
  @Column({ name: "ai_score", type: "int", nullable: true })
  aiScore: number;

  /** Thời điểm cuối cùng AI phân tích */
  @Column({ name: "last_ai_analyzed_at", type: "timestamp", nullable: true })
  lastAiAnalyzedAt: Date;

  /** Mã hash nội dung CV để phát hiện thay đổi */
  @Column({ name: "cv_hash", nullable: true })
  cvHash: string;

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

  /** Đánh dấu CV công khai để nhà tuyển dụng có thể tìm thấy */
  @Column({ name: "is_public", default: false })
  isPublic: boolean;

  /** Đánh dấu CV đã được xác thực chính chủ sinh viên TDMU */
  @Column({ name: "is_tdmu_verified", default: false })
  isTdmuVerified: boolean;

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
