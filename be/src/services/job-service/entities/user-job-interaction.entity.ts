import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { Job } from "./job.entity";

export enum InteractionType {
  CLICK = "click",
  VIEW = "view",
  APPLY = "apply",
  SAVE = "save",
}

@Entity("user_job_interactions")
export class UserJobInteraction {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ name: "user_id", type: "int" })
  userId: number;

  @Column({ name: "job_id", type: "int" })
  jobId: number;

  @ManyToOne(() => Job, { onDelete: "CASCADE" })
  @JoinColumn({ name: "job_id" })
  job: Job;

  @Column({ type: "enum", enum: InteractionType })
  type: InteractionType;

  /**
   * Weight of interaction for collaborative filtering
   * apply (3) > save (2) > view (1) > click (0.5)
   */
  @Column({ name: "weight", type: "float", default: 1 })
  weight: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @Column({ name: "metadata", type: "jsonb", nullable: true })
  metadata?: Record<string, any>;
}
