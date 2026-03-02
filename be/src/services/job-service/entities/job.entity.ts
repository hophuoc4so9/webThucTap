import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Company } from "./company.entity";

@Entity("jobs")
export class Job {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ name: "crawl_id", type: "bigint", nullable: true, unique: true })
  crawlId: string;

  @Column({ type: "text", nullable: true })
  age: string;

  @Column({ type: "text", nullable: true })
  benefit: string;

  @Column({ type: "text", nullable: true })
  company: string;

  @Column({ type: "text", nullable: true })
  deadline: string;

  @Column({ type: "text", nullable: true })
  degree: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "text", nullable: true })
  experience: string;

  @Column({ type: "text", nullable: true })
  field: string;

  @Column({ type: "text", nullable: true })
  industry: string;

  @Column({ type: "text", nullable: true })
  location: string;

  @Column({ name: "other_info", type: "text", nullable: true })
  otherInfo: string;

  @Column({ type: "text", nullable: true })
  requirement: string;

  @Column({ type: "text", nullable: true })
  salary: string;

  @Column({ type: "text", nullable: false })
  title: string;

  @Column({ type: "text", nullable: true })
  url: string;

  @Column({ type: "text", nullable: true })
  src: string;

  @Column({ name: "job_type", type: "text", nullable: true })
  jobType: string;

  @Column({ type: "int", nullable: true })
  vacancies: number;

  @Column({ name: "tags_benefit", type: "text", nullable: true })
  tagsBenefit: string;

  @Column({ name: "tags_requirement", type: "text", nullable: true })
  tagsRequirement: string;

  @Column({ name: "province_ids", type: "text", nullable: true })
  provinceIds: string;

  @Column({ name: "salary_max", type: "bigint", nullable: true })
  salaryMax: string;

  @Column({ name: "salary_min", type: "bigint", nullable: true })
  salaryMin: string;

  @ManyToOne(() => Company, (company) => company.jobs, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "company_id" })
  companyRef: Company;
}
