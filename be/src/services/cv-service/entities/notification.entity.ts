import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("cv_notifications")
export class CvNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  title: string;

  @Column({ type: "text" })
  message: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  type: string; // e.g., 'cv_analysis_completed'

  @Column({ type: "jsonb", nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;
}
