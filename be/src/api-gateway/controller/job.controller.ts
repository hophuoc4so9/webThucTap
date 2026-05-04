import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Inject,
  HttpException,
  ParseIntPipe,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";

@Controller("jobs")
export class JobController {
  constructor(
    @Inject("JOB_SERVICE") private readonly jobClient: ClientProxy,
    @Inject("CV_SERVICE") private readonly cvClient: ClientProxy,
    @Inject("AI_SEARCH_SERVICE") private readonly aiSearchClient: ClientProxy,
  ) {}

  /** GET /jobs/ping */
  @Get("ping")
  ping() {
    return firstValueFrom(this.jobClient.send("job_ping", {}));
  }

  /** GET /jobs?keyword=&location=&industry=&src=&salaryMin=&salaryMax=&page=&limit= */
  @Get()
  async findAll(@Query() query: Record<string, any>) {
    try {
      return await firstValueFrom(this.jobClient.send("job_find_all", query));
    } catch (err: any){
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** GET /jobs/:id */
  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number) {
    try {
      return await firstValueFrom(this.jobClient.send("job_find_one", { id }));
    } catch (err: any){
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** POST /jobs/:id/fit-check */
  @Post(":id/fit-check")
  async fitCheck(
    @Param("id", ParseIntPipe) jobId: number,
    @Body() body: { cvId: number; userId?: number },
  ) {
    try {
      return await firstValueFrom(
        this.cvClient.send("application_analyze_job_cv_fit", {
          jobId,
          cvId: body?.cvId,
          userId: body?.userId,
        }),
      );
    } catch (err: any){
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** POST /jobs */
  @Post()
  async create(@Body() dto: any) {
    try {
      return await firstValueFrom(this.jobClient.send("job_create", dto));
    } catch (err: any){
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** PUT /jobs/:id */
  @Put(":id")
  async update(@Param("id", ParseIntPipe) id: number, @Body() dto: any) {
    try {
      return await firstValueFrom(
        this.jobClient.send("job_update", { id, dto }),
      );
    } catch (err: any){
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /** DELETE /jobs/:id */
  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: number) {
    try {
      return await firstValueFrom(this.jobClient.send("job_remove", { id }));
    } catch (err: any){
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /**
   * POST /jobs/seed
   */
  @Post("seed")
  async seed(@Body() dto: { jobs: any[] }) {
    try {
      return await firstValueFrom(this.jobClient.send("job_seed", dto));
    } catch (err: any){
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /**
   * POST /jobs/search-advanced
   * Advanced semantic search with traditional filters and ranking
   * Request:
   * {
   *   "query": "Java backend developer",
   *   "location": "Ho Chi Minh",
   *   "salaryMin": 20000000,
   *   "industry": "Technology",
   *   "page": 1,
   *   "limit": 20,
   *   "weights": { "contentSim": 0.4, "collaborative": 0.2, "popularity": 0.2, "companyBoost": 0.2 }
   * }
   */
  @Post("search-advanced")
  async searchAdvanced(@Body() query: Record<string, any>) {
    try {
      return await firstValueFrom(
        this.aiSearchClient.send("ai_search_advanced_search", query),
      );
    } catch (err: any){
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /**
   * POST /jobs/:id/recommend
   * Get hybrid recommendations when viewing a specific job
   * Request:
   * {
   *   "userId": 1,
   *   "topK": 5,
   *   "weights": { "contentSim": 0.4, "collaborative": 0.3, "popularity": 0.2, "companyBoost": 0.1 }
   * }
   */
  @Post(":id/recommend")
  async getRecommendations(
    @Param("id", ParseIntPipe) currentJobId: number,
    @Body() query: Record<string, any>,
  ) {
    try {
      const payload = {
        currentJobId,
        ...query,
      };
      return await firstValueFrom(
        this.aiSearchClient.send("ai_search_recommend_for_user", payload),
      );
    } catch (err: any){
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }
  @Post("sync-embeddings")
  async syncEmbeddings() {
    try {
      // Bắn message "job_sync_embeddings" sang Job Service
      return await firstValueFrom(
        this.jobClient.send("job_sync_embeddings", {})
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  // ─── Questionnaire Endpoints (via AI Search Service) ─────────────────────────────

  /**
   * GET /jobs/questionnaire/:id
   * Get a questionnaire for user to fill out
   */
  @Get("questionnaire/:id")
  async getQuestionnaire(@Param("id", ParseIntPipe) questionnaireId: number) {
    try {
      return await firstValueFrom(
        this.aiSearchClient.send("ai_search_get_questionnaire", { questionnaireId }),
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /**
   * GET /jobs/questionnaire/type/:type
   * Get questionnaire by type (technical_skills, soft_skills, work_environment, career_goals)
   */
  @Get("questionnaire/type/:type")
  async getQuestionnaireByType(@Param("type") type: string) {
    try {
      return await firstValueFrom(
        this.aiSearchClient.send("ai_search_get_questionnaire_by_type", { type }),
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /**
   * POST /jobs/questionnaire/submit
   * Submit questionnaire answers and get score
   * Request: { userId, questionnaireId, answers: { questionId: answer } }
   */
  @Post("questionnaire/submit")
  async submitQuestionnaire(@Body() data: any) {
    try {
      return await firstValueFrom(
        this.aiSearchClient.send("ai_search_submit_questionnaire", data),
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /**
   * GET /jobs/questionnaire/answer/:answerId
   * Get scoring results for a quiz answer
   */
  @Get("questionnaire/answer/:answerId")
  async getAnswerResult(@Param("answerId", ParseIntPipe) answerId: number) {
    try {
      return await firstValueFrom(
        this.aiSearchClient.send("ai_search_get_answer_result", { answerId }),
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /**
   * GET /jobs/questionnaire/user/:userId/latest/:type
   * Get user's latest answer for a questionnaire type
   */
  @Get("questionnaire/user/:userId/latest/:type")
  async getUserLatestAnswer(
    @Param("userId", ParseIntPipe) userId: number,
    @Param("type") type: string,
  ) {
    try {
      return await firstValueFrom(
        this.aiSearchClient.send("ai_search_get_user_latest_answer", { userId, type }),
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /**
   * POST /jobs/questionnaire/generate-from-cv
   * Generate custom questionnaire from CV profile
   * Request: { skills: string[], experience: number, jobTitles: string[], industries: string[] }
   */
  @Post("questionnaire/generate-from-cv")
  async generateQuestionnaireFromCV(@Body() data: any) {
    try {
      return await firstValueFrom(
        this.aiSearchClient.send("ai_search_generate_questionnaire_from_cv", data),
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /**
   * POST /jobs/questionnaire/recommend
   * Recommend questionnaire type based on CV profile
   * Request: { skills: string[], experience: number, jobTitles: string[], industries: string[] }
   */
  @Post("questionnaire/recommend")
  async recommendQuestionnaire(@Body() data: any) {
    try {
      return await firstValueFrom(
        this.aiSearchClient.send("ai_search_recommend_questionnaire", data),
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  /**
   * POST /jobs/recommend/by-quiz-score
   * Get job recommendations based on quiz score
   * Request: { quizAnswerId: number, topK?: number }
   */
  @Post("recommend/by-quiz-score")
  async recommendByQuizScore(@Body() data: any) {
    try {
      return await firstValueFrom(
        this.aiSearchClient.send("ai_search_recommend_by_quiz_score", data),
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }
}
