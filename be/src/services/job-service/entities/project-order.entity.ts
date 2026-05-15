import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { ProjectApplication } from "./project-application.entity";

export enum ProjectOrderStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  CLOSED = "closed",
  CANCELLED = "cancelled",
}

@Entity("project_orders")
export class ProjectOrder {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "int" })
  companyId: number;

  @Column({ type: "text" })
  companyName: string;

  @Column({ type: "text" })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "text", nullable: true })
  requirements: string;

  @Column({ type: "text", nullable: true })
  budget: string;

  @Column({ type: "text", nullable: true })
  deadline: string;

  /** JSON array of tech stack tags */
  @Column({ type: "text", nullable: true })
  techStack: string;

  @Column({ type: "int", default: 1 })
  maxStudents: number;

  @Column({
    type: "enum",
    enum: ProjectOrderStatus,
    default: ProjectOrderStatus.OPEN,
  })
  status: ProjectOrderStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ProjectApplication, (app) => app.project, { cascade: true })
  applications: ProjectApplication[];
}
