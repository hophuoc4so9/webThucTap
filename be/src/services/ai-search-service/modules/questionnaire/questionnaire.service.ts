import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { QuestionnaireEntity, QuestionnaireType } from "./questionnaire.entity";
import { QuestionnaireAnswerEntity } from "./questionnaire-answer.entity";

export interface SubmitAnswerDto {
  userId: number;
  questionnaireId: number;
  answers: Record<string, string | string[] | number>;
}

export interface QuestionnaireResponseDto {
  id: number;
  title: string;
  description?: string;
  type: QuestionnaireType;
  questions: any[];
  questionsToShow: number;
}

export interface AnswerResultDto {
  id: number;
  userId: number;
  questionnaireId: number;
  score: number;
  scoreBreakdown?: Record<string, number>;
  recommendedCategories?: string[];
  recommendedSkills?: string[];
  profileSummary?: string;
}

@Injectable()
export class QuestionnaireService {
  private readonly logger = new Logger(QuestionnaireService.name);

  constructor(
    @InjectRepository(QuestionnaireEntity)
    private questionnaireRepo: Repository<QuestionnaireEntity>,
    @InjectRepository(QuestionnaireAnswerEntity)
    private answerRepo: Repository<QuestionnaireAnswerEntity>,
  ) {}

  /**
   * Get a questionnaire for user to fill out
   */
  async getQuestionnaire(
    questionnaireId: number,
  ): Promise<QuestionnaireResponseDto> {
    const questionnaire = await this.questionnaireRepo.findOneBy({
      id: questionnaireId,
      isActive: true,
    });

    if (!questionnaire) {
      throw new Error(`Questionnaire ${questionnaireId} not found or inactive`);
    }

    // Return subset of questions if configured
    const questionsToShow =
      questionnaire.questionsToShow || questionnaire.questions.length;
    const selectedQuestions = this.selectRandomQuestions(
      questionnaire.questions,
      questionsToShow,
    );

    return {
      id: questionnaire.id,
      title: questionnaire.title,
      description: questionnaire.description,
      type: questionnaire.type,
      questions: selectedQuestions,
      questionsToShow,
    };
  }

  /**
   * Get questionnaire by type (returns first active one)
   */
  async getQuestionnaireByType(
    type: QuestionnaireType,
  ): Promise<QuestionnaireResponseDto> {
    const questionnaire = await this.questionnaireRepo.findOneBy({
      type,
      isActive: true,
    });

    if (!questionnaire) {
      throw new Error(`Questionnaire of type ${type} not found`);
    }

    return this.getQuestionnaire(questionnaire.id);
  }

  /**
   * Submit answers and calculate score
   */
  async submitAnswers(
    data: SubmitAnswerDto,
  ): Promise<AnswerResultDto> {
    const questionnaire = await this.questionnaireRepo.findOneBy({
      id: data.questionnaireId,
    });

    if (!questionnaire) {
      throw new Error(
        `Questionnaire ${data.questionnaireId} not found`,
      );
    }

    // Calculate score
    const scoreResult = this.calculateScore(
      data.answers,
      questionnaire.questions,
      questionnaire.scoringConfig,
    );

    // Extract recommended skills and categories
    const profile = this.extractProfile(
      data.answers,
      questionnaire.questions,
      questionnaire.type,
    );

    // Save answer record
    const answerRecord = new QuestionnaireAnswerEntity();
    answerRecord.userId = data.userId;
    answerRecord.questionnaireId = data.questionnaireId;
    answerRecord.answers = data.answers;
    answerRecord.score = scoreResult.score;
    answerRecord.scoreBreakdown = scoreResult.breakdown;
    answerRecord.recommendedCategories = profile.categories;
    answerRecord.recommendedSkills = profile.skills;
    answerRecord.profileSummary = profile.summary;
    answerRecord.recommendationsProcessed = false;

    const saved = await this.answerRepo.save(answerRecord);

    return {
      id: saved.id,
      userId: saved.userId,
      questionnaireId: saved.questionnaireId,
      score: saved.score,
      scoreBreakdown: saved.scoreBreakdown,
      recommendedCategories: saved.recommendedCategories,
      recommendedSkills: saved.recommendedSkills,
      profileSummary: saved.profileSummary,
    };
  }

  /**
   * Get answer result for user
   */
  async getAnswerResult(
    answerId: number,
  ): Promise<AnswerResultDto> {
    const answer = await this.answerRepo.findOneBy({ id: answerId });

    if (!answer) {
      throw new Error(`Answer ${answerId} not found`);
    }

    return {
      id: answer.id,
      userId: answer.userId,
      questionnaireId: answer.questionnaireId,
      score: answer.score,
      scoreBreakdown: answer.scoreBreakdown,
      recommendedCategories: answer.recommendedCategories,
      recommendedSkills: answer.recommendedSkills,
      profileSummary: answer.profileSummary,
    };
  }

  /**
   * Get user's latest answer for a questionnaire type
   */
  async getUserLatestAnswer(
    userId: number,
    type: QuestionnaireType,
  ): Promise<AnswerResultDto | null> {
    const answer = await this.answerRepo
      .createQueryBuilder("qa")
      .innerJoinAndSelect(
        QuestionnaireEntity,
        "q",
        "q.id = qa.questionnaireId AND q.type = :type",
        { type },
      )
      .where("qa.userId = :userId", { userId })
      .orderBy("qa.createdAt", "DESC")
      .limit(1)
      .getOne();

    if (!answer) {
      return null;
    }

    return {
      id: answer.id,
      userId: answer.userId,
      questionnaireId: answer.questionnaireId,
      score: answer.score,
      scoreBreakdown: answer.scoreBreakdown,
      recommendedCategories: answer.recommendedCategories,
      recommendedSkills: answer.recommendedSkills,
      profileSummary: answer.profileSummary,
    };
  }

  /**
   * Calculate score based on answers
   */
  private calculateScore(
    answers: Record<string, string | string[] | number>,
    questions: any[],
    scoringConfig?: any,
  ): { score: number; breakdown: Record<string, number> } {
    const breakdown: Record<string, number> = {};
    let totalScore = 0;
    let totalWeight = 0;

    for (const question of questions) {
      const questionId = question.id;
      const userAnswer = answers[questionId];
      const weight = question.weight || 1;

      if (userAnswer === undefined || userAnswer === null) {
        breakdown[questionId] = 0;
        continue;
      }

      // Score calculation depends on question type
      let questionScore = 0;

      if (question.type === "multiple_choice") {
        if (question.correctAnswers) {
          const userAnswers = Array.isArray(userAnswer)
            ? userAnswer
            : [userAnswer];
          const matchCount = userAnswers.filter((a) =>
            question.correctAnswers.includes(a),
          ).length;
          questionScore = (matchCount / question.correctAnswers.length) * 100;
        }
      } else if (question.type === "rating") {
        // Rating from 1-5, convert to score
        questionScore = (Number(userAnswer) / 5) * 100;
      } else if (question.type === "text") {
        // Text answers scored as presence (100 if not empty)
        questionScore = userAnswer && String(userAnswer).trim().length > 0 ? 100 : 0;
      }

      breakdown[questionId] = questionScore;
      totalScore += questionScore * weight;
      totalWeight += weight;
    }

    const normalizedScore =
      totalWeight > 0 ? totalScore / totalWeight : 0;

    return {
      score: Math.round(normalizedScore * 100) / 100,
      breakdown,
    };
  }

  /**
   * Extract profile information from answers
   */
  private extractProfile(
    answers: Record<string, string | string[] | number>,
    questions: any[],
    questionnaireType: QuestionnaireType,
  ): {
    categories: string[];
    skills: string[];
    summary: string;
  } {
    const categories: string[] = [];
    const skills: string[] = [];
    let summary = "";

    switch (questionnaireType) {
      case QuestionnaireType.TECHNICAL_SKILLS:
        // Extract technical skills from answers
        for (const question of questions) {
          const answer = answers[question.id];
          if (answer && Array.isArray(answer)) {
            skills.push(...answer);
          } else if (answer) {
            skills.push(String(answer));
          }
        }
        summary = `Technical skills: ${skills.join(", ")}`;
        categories.push("IT", "Engineering");
        break;

      case QuestionnaireType.SOFT_SKILLS:
        // Extract soft skills
        summary = "Strong in soft skills and interpersonal abilities";
        categories.push("Management", "Business", "HR");
        break;

      case QuestionnaireType.WORK_ENVIRONMENT:
        // Prefer remote, startup, corporate, etc
        const workEnv =
          answers[questions[0]?.id] || "corporate";
        summary = `Prefers ${workEnv} work environment`;
        break;

      case QuestionnaireType.CAREER_GOALS:
        // Extract career aspirations
        summary = "Career growth oriented - seeking advancement opportunities";
        categories.push("Leadership", "Management");
        break;

      default:
        summary = "Profile based on questionnaire responses";
    }

    return {
      categories,
      skills: [...new Set(skills)], // Remove duplicates
      summary,
    };
  }

  /**
   * Select random subset of questions
   */
  private selectRandomQuestions(
    questions: any[],
    count: number,
  ): any[] {
    if (questions.length <= count) {
      return questions;
    }

    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Create a new questionnaire (admin function)
   */
  async createQuestionnaire(
    data: Partial<QuestionnaireEntity>,
  ): Promise<QuestionnaireEntity> {
    const questionnaire = this.questionnaireRepo.create(data);
    return this.questionnaireRepo.save(questionnaire);
  }

  /**
   * Update questionnaire
   */
  async updateQuestionnaire(
    id: number,
    data: Partial<QuestionnaireEntity>,
  ): Promise<QuestionnaireEntity> {
    await this.questionnaireRepo.update(id, data);
    return this.questionnaireRepo.findOneByOrFail({ id });
  }

  /**
   * List active questionnaires
   */
  async listActive(skip: number = 0, take: number = 10): Promise<QuestionnaireEntity[]> {
    return this.questionnaireRepo.find({
      where: { isActive: true },
      skip,
      take,
      order: { createdAt: "DESC" },
    });
  }
}
