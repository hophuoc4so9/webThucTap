import { Injectable, Logger } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { Job } from "../entities/job.entity";
import { createHash } from "crypto";

@Injectable()
export class JobAiService {
  private readonly logger = new Logger(JobAiService.name);
  private readonly fastApiUrl = process.env.FASTAPI_LLM_URL?.trim();
  private readonly fastApiKey = process.env.FASTAPI_LLM_API_KEY?.trim();
  private readonly fastApiTimeoutMs = 120000;

  private readonly geminiApiUrl = process.env.GEMMA_API_URL?.trim() || "https://generativelanguage.googleapis.com/v1beta";
  private readonly geminiApiKey = process.env.GEMMA_API_KEY?.trim();
  private readonly geminiModelId = process.env.GEMMA_MODEL_ID?.trim() || "gemini-2.0-flash";

  constructor() { }

  async extractJobDetails(job: Job): Promise<{
    tags: string[];
    skills: string[];
    isInternship?: boolean;
    isFresher?: boolean;
    internshipDuration?: string;
    internshipAllowance?: string;
    hasMentor?: boolean;
    trainingProgram?: string;
    flexibleHours?: boolean;
  }> {
    // 1. Try Gemini API directly if key is available
    if (this.geminiApiKey) {
      try {
        const result = await this.callGeminiDirect(job);
        return {
          tags: result.tags || [],
          skills: result.skills || [],
          isInternship: result.isInternship,
          isFresher: result.isFresher,
          internshipDuration: result.internshipDuration,
          internshipAllowance: result.internshipAllowance,
          hasMentor: result.hasMentor,
          trainingProgram: result.trainingProgram,
          flexibleHours: result.flexibleHours,
        };
      } catch (err) {
        this.logger.warn(`Direct Gemini call failed: ${err.message}. Falling back to FastAPI...`);
      }
    }

    // 2. Fallback to FastAPI sync call
    if (this.fastApiUrl) {
      try {
        const result = await this.callFastApiJson("/v1/jobs/extract", {
          job: {
            id: job.id,
            title: job.title,
            description: job.description,
            requirement: job.requirement,
            industry: job.industry,
          }
        });
        return {
          tags: result.tags || [],
          skills: result.skills || [],
          isInternship: result.isInternship,
          isFresher: result.isFresher,
          internshipDuration: result.internshipDuration,
          internshipAllowance: result.internshipAllowance,
          hasMentor: result.hasMentor,
          trainingProgram: result.trainingProgram,
          flexibleHours: result.flexibleHours,
        };
      } catch (err) {
        this.logger.error(`FastAPI sync extraction failed: ${err.message}`);
      }
    }

    throw new Error("No AI provider available for extraction");
  }

  async enqueueJobExtraction(
    job: Job,
    context?: { userId?: number; role?: string },
  ): Promise<{ taskId: string; status: string }> {
    if (!this.fastApiUrl) {
      throw new RpcException({
        statusCode: 503,
        message: "FastAPI LLM service is not configured.",
      });
    }

    const result = await this.callFastApiJson("/v1/jobs/extract/async", {
      job: {
        id: job.id,
        title: job.title,
        description: job.description,
        requirement: job.requirement,
        industry: job.industry,
      },
      userId: context?.userId,
      role: context?.role,
    });

    return {
      taskId: result.taskId as string,
      status: result.status as string,
    };
  }

  async getTaskStatus(taskId: string): Promise<any> {
    if (!this.fastApiUrl) {
      throw new RpcException({
        statusCode: 503,
        message: "FastAPI LLM service is not configured.",
      });
    }

    return this.callFastApiJson(`/v1/tasks/${encodeURIComponent(taskId)}`, null, "GET");
  }

  private async callGeminiDirect(job: Job): Promise<any> {
    const systemPrompt = 
      "You are a recruitment AI specialist focusing on internships and entry-level jobs. " +
      "Extract information from the job posting and return ONLY valid JSON. " +
      "Use Vietnamese for text values. " +
      "Schema: {" +
      "  tags: string[]," +
      "  skills: string[]," +
      "  isInternship: boolean," +
      "  isFresher: boolean," +
      "  internshipDuration: string (e.g., '3 tháng')," +
      "  internshipAllowance: string (e.g., '2-5 triệu')," +
      "  hasMentor: boolean," +
      "  trainingProgram: string (short summary of what the intern will learn)," +
      "  flexibleHours: boolean" +
      "}";
    const userPrompt = JSON.stringify({
      title: job.title,
      description: job.description,
      requirement: job.requirement,
      industry: job.industry
    });

    const endpoint = `${this.geminiApiUrl}/models/${this.geminiModelId}:generateContent?key=${this.geminiApiKey}`;
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty response from Gemini");

    return JSON.parse(text);
  }

  private async callFastApiJson(
    path: string,
    payload: Record<string, any> | null,
    method: "POST" | "GET" = "POST",
  ): Promise<any> {
    const endpoint = `${this.fastApiUrl.replace(/\/$/, "")}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.fastApiTimeoutMs);

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(this.fastApiKey ? { "X-API-Key": this.fastApiKey } : {}),
        },
        body: method === "POST" ? JSON.stringify(payload ?? {}) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.warn(`FastAPI LLM error ${response.status}: ${body.slice(0, 400)}`);
        throw new RpcException({
          statusCode: response.status >= 500 ? 502 : response.status,
          message: `FastAPI LLM returned HTTP ${response.status}.`,
        });
      }

      return await response.json();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.warn(`FastAPI LLM unavailable: ${error instanceof Error ? error.message : "unknown error"}`);
      throw new RpcException({
        statusCode: 503,
        message: "FastAPI LLM service is unavailable.",
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
