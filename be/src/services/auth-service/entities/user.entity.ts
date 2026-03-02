import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

export enum UserRole {
  STUDENT = "student",
  COMPANY = "company",
  ADMIN = "admin",
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;
}
