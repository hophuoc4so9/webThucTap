import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Job } from "./job.entity";

export enum EmbeddingStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  SUCCESS = "success",
  FAILED = "failed",
}

@Entity("job_embedding_queue")
export class JobEmbeddingQueue {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ name: "job_id", type: "int", unique: true })
  jobId: number;

  @ManyToOne(() => Job, { onDelete: "CASCADE" })
  @JoinColumn({ name: "job_id" })
  job: Job;

  @Column({
    type: "enum",
    enum: EmbeddingStatus,
    default: EmbeddingStatus.PENDING,
  })
  status: EmbeddingStatus;

  @Column({ name: "attempts", type: "int", default: 0 })
  attempts: number;

  @Column({ name: "last_attempt_at", type: "timestamp", nullable: true })
  lastAttemptAt: Date | null;

  @Column({ name: "error_message", type: "text", nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
