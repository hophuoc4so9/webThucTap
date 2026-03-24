import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { ProjectOrder } from "./project-order.entity";

export enum ApplicationStatus {
  PENDING = "pending",
  REVIEWING = "reviewing",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

@Entity("project_applications")
export class ProjectApplication {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "int" })
  projectId: number;

  @Column({ type: "int" })
  userId: number;

  @Column({ type: "text", nullable: true })
  studentName: string;

  @Column({ type: "text", nullable: true })
  studentEmail: string;

  @Column({ type: "text", nullable: true })
  note: string;

  @Column({
    type: "enum",
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;

  @CreateDateColumn()
  appliedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => ProjectOrder, (project) => project.applications, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "projectId" })
  project: ProjectOrder;
}
