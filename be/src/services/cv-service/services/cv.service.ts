import { Injectable, Logger, Inject } from "@nestjs/common";
import { RpcException, ClientProxy } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { createHash } from "crypto";
import { firstValueFrom } from "rxjs";
import { Application } from "../entities/application.entity";
import { Cv } from "../entities/cv.entity";
import { CreateCvDto } from "../dto/create-cv.dto";
import { UpdateCvDto } from "../dto/update-cv.dto";
import { GemmaService } from "./gemma.service";
import { ResumeParseService } from "./resume-parse.service";
import type { CvParseResponse } from "../dto/parse-resume.dto";

/** Trả về CV dạng plain object với đủ tất cả trường (kể cả null) để FE luôn nhận đủ khi GET/PUT */
function toCvResponse(cv: Cv): Record<string, unknown> {
  return {
    id: cv.id,
    userId: cv.userId,
    studentId: cv.studentId ?? null,
    class: cv.class ?? null,
    academicYear: cv.academicYear ?? null,
    birthday: cv.birthday ?? null,
    gender: cv.gender ?? null,
    fullName: cv.fullName ?? null,
    jobPosition: cv.jobPosition ?? null,
    phone: cv.phone ?? null,
    contactEmail: cv.contactEmail ?? null,
    address: cv.address ?? null,
    linkedIn: cv.linkedIn ?? null,
    title: cv.title ?? null,
    summary: cv.summary ?? null,
    careerObjective: cv.careerObjective ?? null,
    skills: cv.skills ?? null,
    education: cv.education ?? null,
    gpa: cv.gpa ?? null,
    activities: cv.activities ?? null,
    awards: cv.awards ?? null,
    experience: cv.experience ?? null,
    projects: cv.projects ?? null,
    certifications: cv.certifications ?? null,
    languages: cv.languages ?? null,
    aiAnalysis: cv.aiAnalysis ? JSON.parse(cv.aiAnalysis) : null,
    aiScore: cv.aiScore ?? null,
    lastAiAnalyzedAt: cv.lastAiAnalyzedAt ?? null,
    major: cv.major ?? null,
    majorGroup: cv.majorGroup ?? null,
    majorCode: cv.majorCode ?? null,
    socialLinks: cv.socialLinks ?? null,
    filePath: cv.filePath ?? null,
    fileOriginalName: cv.fileOriginalName ?? null,
    fileMimeType: cv.fileMimeType ?? null,
    isPublic: cv.isPublic ?? false,
    isTdmuVerified: cv.isTdmuVerified ?? false,
    isDefault: cv.isDefault ?? false,
    source: cv.source ?? "form",
    createdAt: cv.createdAt,
    updatedAt: cv.updatedAt,
  };
}

function toDraftCv(payload: {
  userId: number;
  studentId?: string;
  class?: string;
  academicYear?: string;
  birthday?: string;
  gender?: string;
  fullName?: string;
  jobPosition?: string;
  phone?: string;
  contactEmail?: string;
  address?: string;
  linkedIn?: string;
  title?: string;
  summary?: string;
  careerObjective?: string;
  skills?: string;
  education?: string;
  gpa?: string;
  activities?: string;
  awards?: string;
  experience?: string;
  projects?: string;
  certifications?: string;
  languages?: string;
  major?: string;
  majorGroup?: string;
  majorCode?: string;
  socialLinks?: string;
  source?: "form" | "file";
}): Cv {
  return {
    id: 0,
    userId: payload.userId,
    studentId: payload.studentId ?? null,
    class: payload.class ?? null,
    academicYear: payload.academicYear ?? null,
    birthday: payload.birthday ? new Date(payload.birthday) : null,
    gender: payload.gender ?? null,
    fullName: payload.fullName ?? null,
    jobPosition: payload.jobPosition ?? null,
    phone: payload.phone ?? null,
    contactEmail: payload.contactEmail ?? null,
    address: payload.address ?? null,
    linkedIn: payload.linkedIn ?? null,
    title: payload.title ?? null,
    summary: payload.summary ?? null,
    careerObjective: payload.careerObjective ?? null,
    skills: payload.skills ?? null,
    education: payload.education ?? null,
    gpa: payload.gpa ?? null,
    activities: payload.activities ?? null,
    awards: payload.awards ?? null,
    experience: payload.experience ?? null,
    projects: payload.projects ?? null,
    certifications: payload.certifications ?? null,
    languages: payload.languages ?? null,
    aiAnalysis: null,
    aiScore: null,
    lastAiAnalyzedAt: null,
    cvHash: null,
    major: payload.major ?? null,
    majorGroup: payload.majorGroup ?? null,
    majorCode: payload.majorCode ?? null,
    socialLinks: payload.socialLinks ?? null,
    filePath: null,
    fileOriginalName: null,
    fileMimeType: null,
    isDefault: false,
    isPublic: false,
    isTdmuVerified: false,
    source: payload.source === "file" ? "file" : "form",
    createdAt: new Date(),
    updatedAt: new Date(),
    applications: [] as Application[],
  };
}

import { CvNotification } from "../entities/notification.entity";

@Injectable()
export class CvService {
  private readonly logger = new Logger(CvService.name);
  constructor(
    @InjectRepository(Cv)
    private readonly cvRepo: Repository<Cv>,
    @InjectRepository(CvNotification)
    private readonly notificationRepo: Repository<CvNotification>,
    private readonly gemmaService: GemmaService,
    private readonly resumeParseService: ResumeParseService,
    @Inject("AI_SEARCH_SERVICE") private readonly aiSearchClient: ClientProxy,
  ) {}

  async create(dto: CreateCvDto): Promise<Record<string, unknown>> {
    // Nếu isDefault=true, bỏ cờ của các CV cũ
    if (dto.isDefault) {
      await this.cvRepo.update(
        { userId: dto.userId, isDefault: true },
        { isDefault: false },
      );
    }
    const source = dto.source === "file" ? "file" : "form";
    const cv = this.cvRepo.create({ ...dto, source });
    const saved = await this.cvRepo.save(cv);
    return toCvResponse(saved);
  }

  async findAllByUser(
    userId: number,
    page = 1,
    limit = 10,
  ): Promise<{ data: Record<string, unknown>[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.cvRepo.findAndCount({
      where: { userId },
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: data.map((cv) => toCvResponse(cv)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<Record<string, unknown>> {
    const cv = await this.cvRepo.findOne({ where: { id } });
    if (!cv)
      throw new RpcException({
        statusCode: 404,
        message: `CV #${id} không tồn tại`,
      });
    return toCvResponse(cv);
  }

  async findOnePublic(id: number): Promise<Record<string, unknown>> {
    const cv = await this.cvRepo.findOne({ where: { id, isPublic: true } });
    if (!cv)
      throw new RpcException({
        statusCode: 404,
        message: `CV #${id} không tồn tại hoặc không ở chế độ công khai`,
      });
    return toCvResponse(cv);
  }

  async findDefaultByUser(userId: number): Promise<Record<string, unknown> | null> {
    const cv = await this.cvRepo.findOne({
      where: { userId, isDefault: true },
      order: { updatedAt: "DESC" },
    });
    if (!cv) return null;
    return toCvResponse(cv);
  }

  async update(id: number, dto: UpdateCvDto): Promise<Record<string, unknown>> {
    const cv = await this.cvRepo.findOne({ where: { id } });
    if (!cv)
      throw new RpcException({
        statusCode: 404,
        message: `CV #${id} không tồn tại`,
      });

    if (dto.isDefault) {
      await this.cvRepo.update(
        { userId: cv.userId, isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(cv, dto);
    const saved = await this.cvRepo.save(cv);
    return toCvResponse(saved);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    const cv = await this.cvRepo.findOne({ where: { id } });
    if (cv) await this.cvRepo.remove(cv);
    return { success: true };
  }

  /** Cập nhật thông tin file sau khi upload */
  async updateFile(
    id: number,
    file: { filePath: string; fileOriginalName: string; fileMimeType: string },
  ): Promise<Record<string, unknown>> {
    const cv = await this.cvRepo.findOne({ where: { id } });
    if (!cv)
      throw new RpcException({
        statusCode: 404,
        message: `CV #${id} không tồn tại`,
      });
    Object.assign(cv, file);
    const saved = await this.cvRepo.save(cv);
    return toCvResponse(saved);
  }

  async suggestImprovements(cvId: number, userId?: number) {
    const cv = await this.cvRepo.findOne({ where: { id: cvId } });
    if (!cv) {
      throw new RpcException({
        statusCode: 404,
        message: `CV #${cvId} không tồn tại`,
      });
    }
    if (userId && cv.userId !== userId) {
      throw new RpcException({
        statusCode: 403,
        message: "Bạn không có quyền phân tích CV này",
      });
    }

    const parsedCv = await this.resumeParseService.ensureCvParsed(cv, userId);
    const suggestions = await this.gemmaService.suggestCvImprovements(parsedCv, { userId });
    return {
      cvId: parsedCv.id,
      userId: parsedCv.userId,
      ...suggestions,
    };
  }

  async suggestImprovementsAsync(cvId: number, userId?: number) {
    const cv = await this.cvRepo.findOne({ where: { id: cvId } });
    if (!cv) {
      throw new RpcException({
        statusCode: 404,
        message: `CV #${cvId} không tồn tại`,
      });
    }
    if (userId && cv.userId !== userId) {
      throw new RpcException({
        statusCode: 403,
        message: "Bạn không có quyền phân tích CV này",
      });
    }

    const currentHash = this.calculateCvHash(cv);
    // Nếu đã có kết quả và nội dung chưa thay đổi (và chưa quá 3 ngày)
    if (cv.aiAnalysis && cv.cvHash === currentHash) {
      const lastAnalyzed = cv.lastAiAnalyzedAt ? new Date(cv.lastAiAnalyzedAt).getTime() : 0;
      const now = Date.now();
      if (now - lastAnalyzed < 1000 * 60 * 60 * 24 * 3) {
        return {
          status: "succeeded",
          taskId: "cached",
          result: JSON.parse(cv.aiAnalysis),
        };
      }
    }

    const parsedCv = await this.resumeParseService.ensureCvParsed(cv, userId);
    const taskResponse = await this.gemmaService.enqueueCvImprovements(parsedCv, { userId });

    if (taskResponse.taskId) {
      this.watchAiTask(cv.id, taskResponse.taskId as string, currentHash);
    }

    return taskResponse;
  }

  private calculateCvHash(cv: Cv): string {
    const data = JSON.stringify({
      fullName: cv.fullName,
      summary: cv.summary,
      careerObjective: cv.careerObjective,
      skills: cv.skills,
      education: cv.education,
      experience: cv.experience,
      projects: cv.projects,
      certifications: cv.certifications,
      languages: cv.languages,
      gpa: cv.gpa,
      activities: cv.activities,
      awards: cv.awards,
    });
    return createHash("sha256").update(data).digest("hex");
  }

  private watchAiTask(cvId: number, taskId: string, hash: string) {
    let attempts = 0;
    const maxAttempts = 30; // 5 phút (10s * 30)
    const intervalMs = 10000;

    const interval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        this.logger.warn(`Watch AI task ${taskId} timed out for CV ${cvId}`);
        clearInterval(interval);
        return;
      }

      try {
        const status = await this.gemmaService.getTaskStatus(taskId);
        if (status.status === "succeeded") {
          clearInterval(interval);
          const result = status.result as any;
          
          const cv = await this.cvRepo.findOne({ where: { id: cvId } });
          if (!cv) return;

          const updatePayload: Partial<Cv> = {
            aiAnalysis: JSON.stringify(result),
            aiScore: result.score || 0,
            lastAiAnalyzedAt: new Date(),
            cvHash: hash,
          };

          // Explicitly update skills if AI extracted them
          if (Array.isArray(result.extractedSkills) && result.extractedSkills.length > 0) {
            updatePayload.skills = JSON.stringify(result.extractedSkills);
          }
          
          updatePayload.cvHash = this.calculateCvHash({ ...cv, ...updatePayload } as Cv);

          await this.cvRepo.update(cvId, updatePayload);

          await this.notificationRepo.save({
            userId: cv.userId,
            title: "Phân tích CV & Trích xuất kỹ năng hoàn tất",
            message: `CV "${cv.title || "Không tiêu đề"}" của bạn đã được AI phân tích xong và tự động trích xuất các kỹ năng quan trọng.`,
            type: "cv_analysis_completed",
            metadata: { 
              cvId, 
              score: result.score,
              skillsCount: Array.isArray(result.extractedSkills) ? result.extractedSkills.length : 0
            },
          });

          this.logger.log(`AI Analysis for CV ${cvId} completed and notification sent.`);
        } else if (status.status === "failed") {
          this.logger.error(`AI Analysis for CV ${cvId} failed: ${status.error}`);
          
          const cv = await this.cvRepo.findOne({ where: { id: cvId } });
          if (cv) {
            await this.notificationRepo.save({
              userId: cv.userId,
              title: "Phân tích CV thất bại",
              message: `Đã có lỗi xảy ra khi AI phân tích CV "${cv.title || "Không tiêu đề"}". Vui lòng thử lại sau.`,
              type: "system",
              metadata: { cvId, error: status.error },
            });
          }
          
          clearInterval(interval);
        }
      } catch (err) {
        this.logger.error(`Error watching AI task ${taskId}: ${err}`);
        // Keep polling unless it's a critical error
      }
    }, intervalMs);
  }

  async suggestDraftImprovements(payload: {
    userId: number;
    fullName?: string;
    jobPosition?: string;
    phone?: string;
    contactEmail?: string;
    address?: string;
    linkedIn?: string;
    title?: string;
    summary?: string;
    skills?: string;
    education?: string;
    experience?: string;
    projects?: string;
    source?: "form" | "file";
  }) {
    const draftCv = toDraftCv(payload);
    const suggestions = await this.gemmaService.suggestCvImprovements(draftCv, { userId: payload.userId });
    return {
      cvId: draftCv.id,
      userId: draftCv.userId,
      ...suggestions,
    };
  }

  async getTaskStatus(taskId: string) {
    return this.gemmaService.getTaskStatus(taskId);
  }

  async parseResumeFromFile(cvId: number, userId?: number): Promise<CvParseResponse & { cv: Record<string, unknown> }> {
    const { cv, parsed } = await this.resumeParseService.parseCvById(cvId, userId);

    return {
      cvId: cv.id,
      userId: cv.userId,
      parsed,
      cv: toCvResponse(cv),
    };
  }

  async getNotifications(userId: number) {
    return this.notificationRepo.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: 20,
    });
  }

  async markNotificationRead(id: number) {
    await this.notificationRepo.update(id, { isRead: true });
    return { success: true };
  }

  async searchCandidates(query: {
    jobId?: number;
    query?: string;
    major?: string;
    skills?: string[];
    page?: number;
    limit?: number;
  }) {
    const { jobId, query: searchQuery, major, skills, page = 1, limit = 10 } = query;

    // Use AI Search Service for semantic matching if criteria are provided
    if (jobId || searchQuery || (skills && skills.length > 0)) {
      try {
        return await firstValueFrom(
          this.aiSearchClient.send("ai_search_search_candidates", {
            jobId,
            query: searchQuery,
            major,
            skills,
            page,
            limit,
          }),
        );
      } catch (err) {
        this.logger.error(`AI Search for candidates failed, falling back to basic search: ${err}`);
      }
    }

    const qb = this.cvRepo.createQueryBuilder("cv");
    qb.where("cv.isPublic = :isPublic", { isPublic: true });

    if (major) {
      qb.andWhere("cv.major = :major", { major });
    }

    // Keyword matching for skills with ranking (Fallback)
    let skillScoreQuery = "0";
    if (skills && skills.length > 0) {
      skillScoreQuery = "(";
      skills.forEach((skill, index) => {
        const paramName = `skill${index}`;
        qb.setParameter(paramName, `%${skill}%`);
        skillScoreQuery += `(CASE WHEN cv.skills ILIKE :${paramName} THEN 1 ELSE 0 END) + `;
      });
      skillScoreQuery = skillScoreQuery.slice(0, -3) + ")";
    }
    qb.addSelect(skillScoreQuery, "skill_match_score");

    // Prioritize TDMU verified students, then skill match, then AI score
    qb.orderBy("cv.isTdmuVerified", "DESC")
      .addOrderBy("skill_match_score", "DESC")
      .addOrderBy("cv.aiScore", "DESC")
      .addOrderBy("cv.updatedAt", "DESC");

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: data.map((cv) => toCvResponse(cv)),
      total,
      page,
      limit,
    };
  }
}
