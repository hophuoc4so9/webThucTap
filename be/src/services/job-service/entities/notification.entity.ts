import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export enum NotificationType {
  COMPANY_REGISTERED = "company_registered",
  COMPANY_AUTO_APPROVED = "company_auto_approved",
  COMPANY_REJECTED = "company_rejected",
  SYSTEM = "system",
}

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id", nullable: true })
  userId: number | null; // null means for all admins or system-wide

  @Column()
  title: string;

  @Column({ type: "text" })
  content: string;

  @Column({
    type: "enum",
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  @Column({ name: "is_read", default: false })
  isRead: boolean;

  @Column({ type: "json", nullable: true })
  metadata: any;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
