import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("questionnaire_answers")
@Index(["userId", "createdAt"])
@Index(["userId"])
@Index(["questionnaireId"])
export class QuestionnaireAnswerEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  userId: number;

  @Column({ type: "int" })
  questionnaireId: number;

  @Column({
    type: "jsonb",
    comment: "User answers: { questionId: answer }",
  })
  answers: Record<string, string | string[] | number>;

  @Column({
    type: "float",
    nullable: true,
    comment: "Score out of 100",
  })
  score: number;

  @Column({
    type: "jsonb",
    nullable: true,
    comment: "Score breakdown by question",
  })
  scoreBreakdown?: Record<string, number>;

  @Column({
    type: "jsonb",
    nullable: true,
    comment: "Recommended job categories based on answers",
  })
  recommendedCategories?: string[];

  @Column({
    type: "jsonb",
    nullable: true,
    comment: "Recommended skills based on answers",
  })
  recommendedSkills?: string[];

  @Column({
    type: "text",
    nullable: true,
    comment: "Short summary of candidate profile",
  })
  profileSummary?: string;

  @Column({
    type: "boolean",
    default: false,
    comment: "Whether recommendations have been processed",
  })
  recommendationsProcessed: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
