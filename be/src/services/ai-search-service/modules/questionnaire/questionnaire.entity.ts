import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export interface QuestionItem {
  id: string;
  question: string;
  type: "multiple_choice" | "rating" | "text";
  options?: string[];
  correctAnswers?: string[];
  weight?: number; // Importance in scoring (default 1)
}

export enum QuestionnaireType {
  TECHNICAL_SKILLS = "technical_skills",
  SOFT_SKILLS = "soft_skills",
  WORK_ENVIRONMENT = "work_environment",
  CAREER_GOALS = "career_goals",
  CUSTOM = "custom",
}

@Entity("questionnaires")
@Index(["type", "isActive"])
@Index(["createdAt"])
export class QuestionnaireEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({
    type: "enum",
    enum: QuestionnaireType,
    default: QuestionnaireType.CUSTOM,
  })
  type: QuestionnaireType;

  @Column({
    type: "jsonb",
    comment: "Array of QuestionItem",
  })
  questions: QuestionItem[];

  @Column({
    type: "jsonb",
    nullable: true,
    comment: "Job categories this questionnaire targets",
  })
  targetCategories?: string[];

  @Column({
    type: "jsonb",
    nullable: true,
    comment: "Skills this questionnaire targets",
  })
  targetSkills?: string[];

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({
    type: "int",
    default: 10,
    comment: "Number of questions to present",
  })
  questionsToShow: number;

  @Column({
    type: "json",
    nullable: true,
    comment: "Scoring configuration (weights, thresholds)",
  })
  scoringConfig?: {
    minScore?: number;
    maxScore?: number;
    weights?: Record<string, number>;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
