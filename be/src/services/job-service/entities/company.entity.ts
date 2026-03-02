import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Job } from "./job.entity";

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

  @OneToMany(() => Job, (job) => job.companyRef, { cascade: true })
  jobs: Job[];
}
