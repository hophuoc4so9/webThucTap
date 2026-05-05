import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { EmbeddingService } from "../services/embedding.service";
import { SearchService } from "../services/search.service";
import { RecommendationService } from "../services/recommendation.service";
import { SearchQueryDto, AdvancedSearchResponseDto } from "../dto/search-query.dto";
import { DataSource } from "typeorm";
import {
  RecommendationQueryDto,
  RecommendationResponseDto,
} from "../dto/recommend-query.dto";
import { QuestionnaireService } from "../modules/questionnaire/questionnaire.service";
import { QuestionnaireGeneratorService } from "../modules/questionnaire/questionnaire-generator.service";
import { QuestionnaireType } from "../modules/questionnaire/questionnaire.entity";

@Controller()
export class AiSearchController {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly dataSource: DataSource,
    private readonly searchService: SearchService,
    private readonly recommendationService: RecommendationService,
    private readonly questionnaireService: QuestionnaireService,
    private readonly generatorService: QuestionnaireGeneratorService,
  ) { }

  /**
   * RMQ pattern: ai_search_ping
   * Simple health check
   */
  @MessagePattern("ai_search_ping")
  handlePing() {
    return { status: "pong", service: "ai-search-service" };
  }

  /**
   * RMQ pattern: ai_search_index_job
   * Generate and store embedding for a single job
   */

  @MessagePattern("ai_search_index_job")
  async handleIndexJob(@Payload() data: any) {
    try {
      const result = await this.embeddingService.generateJobEmbedding(data);

      // Kiểm tra kỹ trước khi dùng
      if (!result || !result.embedding || result.embedding.length === 0) {
        throw new Error("Embedding result is null or empty");
      }

      // FIX: Lưu dưới dạng text pgvector '[0.1,0.2,...]::vector' thay vì Buffer binary
      const vectorLiteral = `[${result.embedding.join(",")}]`;
      await this.dataSource.query(
        `UPDATE jobs SET embedding = $1::vector, indexed_at = NOW() WHERE id = $2`,
        [vectorLiteral, result.jobId]
      );

      return {
        success: true,
        jobId: data.id,
        embeddingDim: result.embedding.length,
        model: result.model,
      };
    } catch (error: any) {
      console.error(`Internal Controller Error: ${error.message}`);
      return { success: false, jobId: data.id, error: error.message };
    }
  }
  /**
   * RMQ pattern: ai_search_index_batch
   */
  @MessagePattern("ai_search_index_batch")
  async handleIndexBatch(
    @Payload()
    data: { jobs: any[] },
  ) {
    try {
      const results = await this.embeddingService.generateBatchEmbeddings(data.jobs);

      let successCount = 0;

      // LẶP QUA KẾT QUẢ VÀ LƯU XUỐNG DATABASE
      for (const res of results) {
        // Bỏ qua những job sinh ra embedding rỗng (bị lỗi model)
        if (!res || !res.embedding || res.embedding.length === 0) {
          continue;
        }

        // FIX: Lưu dưới dạng text pgvector '[0.1,0.2,...]::vector' thay vì Buffer binary
        const vectorLiteral = `[${res.embedding.join(",")}]`;
        await this.dataSource.query(
          `UPDATE jobs SET embedding = $1::vector, indexed_at = NOW() WHERE id = $2`,
          [vectorLiteral, res.jobId]
        );
        successCount++;
      }

      return {
        success: true,
        indexed: successCount,
        failed: results.length - successCount,
        total: data.jobs.length,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  /**
   * RMQ pattern: ai_search_advanced_search
   * Perform advanced semantic search with traditional filters
   */
  @MessagePattern("ai_search_advanced_search")
  async handleAdvancedSearch(
    @Payload() query: SearchQueryDto,
  ): Promise<AdvancedSearchResponseDto> {
    return this.searchService.search(query);
  }

  /**
   * RMQ pattern: ai_search_recommend_for_user
   * Get hybrid recommendations for a user
   */
  @MessagePattern("ai_search_recommend_for_user")
  async handleRecommendForUser(
    @Payload() query: RecommendationQueryDto,
  ): Promise<RecommendationResponseDto> {
    return this.recommendationService.recommendForUser(query);
  }

  /**
   * RMQ pattern: ai_search_embedding_exists
   * Check if a job has an embedding
   */
  @MessagePattern("ai_search_embedding_exists")
  async handleEmbeddingExists(@Payload() data: { jobId: number }) {
    // This would query the job-service database
    // For now, return a placeholder
    return { exists: false, jobId: data.jobId };
  }

  /**
   * RMQ pattern: ai_search_recalc_company_reputation
   * Recalculate company reputation based on recent metrics
   */
  @MessagePattern("ai_search_recalc_company_reputation")
  async handleRecalcCompanyReputation(
    @Payload() data: { companyId: number },
  ) {
    // This would be implemented to read job metrics and update company reputation
    return {
      success: true,
      companyId: data.companyId,
      message: "Reputation recalculation queued",
    };
  }

  // ─── Questionnaire Message Patterns ─────────────────────────────

  /**
   * RMQ pattern: ai_search_get_questionnaire
   * Get a questionnaire for user to fill out
   */
  @MessagePattern("ai_search_get_questionnaire")
  async handleGetQuestionnaire(@Payload() data: { questionnaireId: number }) {
    try {
      return await this.questionnaireService.getQuestionnaire(data.questionnaireId);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * RMQ pattern: ai_search_get_questionnaire_by_type
   * Get questionnaire by type
   */
  @MessagePattern("ai_search_get_questionnaire_by_type")
  async handleGetQuestionnaireByType(@Payload() data: { type: QuestionnaireType }) {
    try {
      return await this.questionnaireService.getQuestionnaireByType(data.type);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * RMQ pattern: ai_search_submit_questionnaire
   * Submit questionnaire answers and get score
   */
  @MessagePattern("ai_search_submit_questionnaire")
  async handleSubmitQuestionnaire(
    @Payload() data: { userId: number; questionnaireId: number; answers: Record<string, any> },
  ) {
    try {
      return await this.questionnaireService.submitAnswers(data);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * RMQ pattern: ai_search_get_answer_result
   * Get scoring results for a quiz answer
   */
  @MessagePattern("ai_search_get_answer_result")
  async handleGetAnswerResult(@Payload() data: { answerId: number }) {
    try {
      return await this.questionnaireService.getAnswerResult(data.answerId);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * RMQ pattern: ai_search_get_user_latest_answer
   * Get user's latest answer for a questionnaire type
   */
  @MessagePattern("ai_search_get_user_latest_answer")
  async handleGetUserLatestAnswer(
    @Payload() data: { userId: number; type: QuestionnaireType },
  ) {
    try {
      return await this.questionnaireService.getUserLatestAnswer(data.userId, data.type);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * RMQ pattern: ai_search_generate_questionnaire_from_cv
   * Generate custom questionnaire from CV profile
   */
  @MessagePattern("ai_search_generate_questionnaire_from_cv")
  async handleGenerateFromCV(
    @Payload() data: { skills: string[]; experience: number; jobTitles: string[]; industries: string[] },
  ) {
    try {
      const questionnaire = await this.generatorService.generateCustomQuestionnaire(data);
      return {
        id: questionnaire.id,
        title: questionnaire.title,
        questionsToShow: questionnaire.questionsToShow,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * RMQ pattern: ai_search_recommend_questionnaire
   * Recommend questionnaire type based on CV profile
   */
  @MessagePattern("ai_search_recommend_questionnaire")
  async handleRecommendQuestionnaire(
    @Payload() data: { skills: string[]; experience: number; jobTitles: string[]; industries: string[] },
  ) {
    try {
      const type = await this.generatorService.recommendQuestionnaire(data);
      return { recommended_type: type };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * RMQ pattern: ai_search_recommend_by_quiz_score
   * Get job recommendations based on quiz score
   */
  @MessagePattern("ai_search_recommend_by_quiz_score")
  async handleRecommendByQuizScore(
    @Payload() data: { quizAnswerId: number; topK?: number },
  ) {
    try {
      const topK = data.topK || 10;
      return await this.recommendationService.recommendByQuizScore(data.quizAnswerId, topK);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * RMQ pattern: ai_search_personalized_recommendations
   * Get personalized recommendations for a user based on interaction history
   */
  @MessagePattern("ai_search_personalized_recommendations")
  async handlePersonalizedRecommendations(
    @Payload() data: { userId: number; topK?: number },
  ) {
    try {
      const query = {
        userId: data.userId,
        topK: data.topK || 6,
      };
      return await this.recommendationService.recommendForUser(query);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
