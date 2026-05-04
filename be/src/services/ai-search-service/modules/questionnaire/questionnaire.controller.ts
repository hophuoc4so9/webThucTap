import { Body, Controller, Get, Logger, Param, Post } from "@nestjs/common";
import {
  QuestionnaireService,
  SubmitAnswerDto,
  QuestionnaireResponseDto,
  AnswerResultDto,
} from "./questionnaire.service";
import {
  QuestionnaireGeneratorService,
  CVProfile,
} from "./questionnaire-generator.service";
import { QuestionnaireType } from "./questionnaire.entity";

@Controller("questionnaires")
export class QuestionnaireController {
  private readonly logger = new Logger(
    QuestionnaireController.name,
  );

  constructor(
    private readonly questionnaireService: QuestionnaireService,
    private readonly generatorService: QuestionnaireGeneratorService,
  ) {}

  /**
   * Get a questionnaire by ID
   * GET /questionnaires/:id
   */
  @Get(":id")
  async getQuestionnaire(
    @Param("id") id: number,
  ): Promise<QuestionnaireResponseDto> {
    try {
      return await this.questionnaireService.getQuestionnaire(id);
    } catch (error: any) {
      this.logger.error(`Failed to get questionnaire: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get questionnaire by type
   * GET /questionnaires/type/:type
   */
  @Get("type/:type")
  async getByType(
    @Param("type") type: string,
  ): Promise<QuestionnaireResponseDto> {
    try {
      const questionnaireType = type as QuestionnaireType;
      return await this.questionnaireService.getQuestionnaireByType(
        questionnaireType,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to get questionnaire by type: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Submit questionnaire answers
   * POST /questionnaires/submit
   */
  @Post("submit")
  async submitAnswers(
    @Body() data: SubmitAnswerDto,
  ): Promise<AnswerResultDto> {
    try {
      return await this.questionnaireService.submitAnswers(data);
    } catch (error: any) {
      this.logger.error(`Failed to submit answers: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get answer result
   * GET /questionnaires/answer/:answerId
   */
  @Get("answer/:answerId")
  async getAnswer(
    @Param("answerId") answerId: number,
  ): Promise<AnswerResultDto> {
    try {
      return await this.questionnaireService.getAnswerResult(answerId);
    } catch (error: any) {
      this.logger.error(`Failed to get answer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user's latest answer for a type
   * GET /questionnaires/user/:userId/latest/:type
   */
  @Get("user/:userId/latest/:type")
  async getUserLatest(
    @Param("userId") userId: number,
    @Param("type") type: string,
  ): Promise<AnswerResultDto | null> {
    try {
      const questionnaireType = type as QuestionnaireType;
      return await this.questionnaireService.getUserLatestAnswer(
        userId,
        questionnaireType,
      );
    } catch (error: any) {
      this.logger.error(`Failed to get user's latest answer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate custom questionnaire from CV
   * POST /questionnaires/generate-from-cv
   */
  @Post("generate-from-cv")
  async generateFromCV(
    @Body() cvProfile: CVProfile,
  ): Promise<{ id: number; title: string; questionsToShow: number }> {
    try {
      const questionnaire =
        await this.generatorService.generateCustomQuestionnaire(cvProfile);

      return {
        id: questionnaire.id,
        title: questionnaire.title,
        questionsToShow: questionnaire.questionsToShow,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to generate questionnaire from CV: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Recommend questionnaire type based on CV
   * POST /questionnaires/recommend
   */
  @Post("recommend")
  async recommendQuestionnaire(
    @Body() cvProfile: CVProfile,
  ): Promise<{ recommended_type: QuestionnaireType }> {
    try {
      const type =
        await this.generatorService.recommendQuestionnaire(cvProfile);

      return { recommended_type: type };
    } catch (error: any) {
      this.logger.error(
        `Failed to recommend questionnaire: ${error.message}`,
      );
      throw error;
    }
  }
}
