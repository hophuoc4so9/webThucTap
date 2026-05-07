import { Injectable, Logger } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { createHash } from "crypto";
import { Cv } from "../entities/cv.entity";
import {
  ApplicationFitResponse,
  AiRecommendation,
  CvImprovementItem,
  CvSuggestionResponse,
} from "../dto/ai-analysis.dto";
import type { ParsedResumeData } from "../dto/parse-resume.dto";
import { CacheService } from "./cache.service";

const DEFAULT_CV_AI_CACHE_TTL_SECONDS = 60 * 60 * 24;

@Injectable()
export class GemmaService {
  private readonly logger = new Logger(GemmaService.name);
  private readonly fastApiUrl = process.env.FASTAPI_LLM_URL?.trim();
  private readonly fastApiKey = process.env.FASTAPI_LLM_API_KEY?.trim();
  private readonly fastApiTimeoutMs = this.parseTimeoutMs(process.env.FASTAPI_LLM_TIMEOUT_MS);
  private readonly apiUrl = process.env.GEMMA_API_URL?.trim();
  private readonly apiKey = process.env.GEMMA_API_KEY?.trim();
  private readonly modelId = process.env.GEMMA_MODEL_ID?.trim() || "gemma-4-26b-a4b-it";
  private readonly maxOutputTokens = this.parseMaxOutputTokens(process.env.GEMMA_MAX_OUTPUT_TOKENS);
  private readonly thinkingLevel = process.env.GEMMA_THINKING_LEVEL?.trim() || "low";
  private readonly thinkingMode = (process.env.GEMMA_THINKING_MODE?.trim().toLowerCase() || "off") as
    | "off"
    | "high"
    | "low";
  private readonly cacheTtlSeconds = this.parseTtlSeconds(
    process.env.CV_AI_CACHE_TTL_SECONDS,
    DEFAULT_CV_AI_CACHE_TTL_SECONDS,
  );

  constructor(private readonly cacheService: CacheService) {}

  async suggestCvImprovements(
    cv: Cv,
    context?: { userId?: number; role?: string },
  ): Promise<CvSuggestionResponse> {
    const cacheKey = this.cacheKey("suggest", {
      cv: this.buildCvPayload(cv),
      role: context?.role ?? "",
    });

    const cached = await this.cacheService.get<CvSuggestionResponse>(cacheKey);
    if (cached) return cached;

    let response: CvSuggestionResponse;
    if (!this.apiKey && this.fastApiUrl) {
      const result = await this.callFastApiJson("/v1/cv/suggest", {
        cv: this.buildCvPayload(cv),
        userId: context?.userId,
        role: context?.role,
      });
      response = this.normalizeCvSuggestion(result);
      await this.cacheService.set(cacheKey, response, this.cacheTtlSeconds);
      return response;
    }

    const systemPrompt = "Strict CV reviewer. Return ONLY valid JSON. No markdown.";
    const userPrompt = JSON.stringify(
      {
        task: "cv_improvement",
        locale: "vi-VN",
        rules: ["Concise Vietnamese", "Specific improvements"],
        outputSchema: {
          score: "0-100",
          summary: "string",
          strengths: ["string"],
          improvements: [{ section: "string", issue: "string", suggestion: "string", priority: "string" }],
          keywordsToAdd: ["string"],
          recommendation: "string",
        },
        cv: this.buildCvPayload(cv),
      },
    );

    const aiResult = await this.callGemmaJson(systemPrompt, userPrompt);
    response = this.normalizeCvSuggestion(aiResult);
    await this.cacheService.set(cacheKey, response, this.cacheTtlSeconds);
    return response;
  }

  async analyzeCvJobFit(
    cv: Cv,
    job: Record<string, unknown>,
    context?: { userId?: number; role?: string },
  ): Promise<ApplicationFitResponse> {
    const cacheKey = this.cacheKey("fit", {
      cv: this.buildCvPayload(cv),
      job,
      role: context?.role ?? "",
    });

    const cached = await this.cacheService.get<ApplicationFitResponse>(cacheKey);
    if (cached) return cached;

    let response: ApplicationFitResponse;
    if (!this.apiKey && this.fastApiUrl) {
      const result = await this.callFastApiJson("/v1/applications/fit", {
        cv: this.buildCvPayload(cv),
        job,
        userId: context?.userId,
        role: context?.role,
      });
      response = this.normalizeFitResponse(result);
      await this.cacheService.set(cacheKey, response, this.cacheTtlSeconds);
      return response;
    }

    const systemPrompt = "Recruitment AI. Compare CV and job. Return ONLY valid JSON.";
    const userPrompt = JSON.stringify(
      {
        task: "cv_job_fit",
        locale: "vi-VN",
        outputSchema: {
          fitScore: "0-100",
          matchedSkills: ["string"],
          missingSkills: ["string"],
          missingKeywords: ["string"],
          recommendation: "string",
          explanation: "string",
          actionPlan: ["string"],
        },
        cv: this.buildCvPayload(cv),
        job,
      },
    );

    const aiResult = await this.callGemmaJson(systemPrompt, userPrompt);
    response = this.normalizeFitResponse(aiResult);
    await this.cacheService.set(cacheKey, response, this.cacheTtlSeconds);
    return response;
  }

  async enqueueCvImprovements(
    cv: Cv,
    context?: { userId?: number; role?: string },
  ): Promise<Record<string, unknown>> {
    if (!this.fastApiUrl) {
      this.raiseGemmaError(503, "FastAPI LLM service is not configured.");
    }

    return this.callFastApiJson("/v1/cv/suggest/async", {
      cv: this.buildCvPayload(cv),
      userId: context?.userId,
      role: context?.role,
    });
  }

  async enqueueCvJobFit(
    cv: Cv,
    job: Record<string, unknown>,
    context?: { userId?: number; role?: string },
  ): Promise<Record<string, unknown>> {
    if (!this.fastApiUrl) {
      this.raiseGemmaError(503, "FastAPI LLM service is not configured.");
    }

    return this.callFastApiJson("/v1/applications/fit/async", {
      cv: this.buildCvPayload(cv),
      job,
      userId: context?.userId,
      role: context?.role,
    });
  }

  async getTaskStatus(taskId: string): Promise<Record<string, unknown>> {
    if (!this.fastApiUrl) {
      this.raiseGemmaError(503, "FastAPI LLM service is not configured.");
    }

    return this.callFastApiJson(`/v1/tasks/${encodeURIComponent(taskId)}`, null, "GET");
  }

  async parseResumeText(
    resumeText: string,
    context?: { userId?: number; cvId?: number },
  ): Promise<ParsedResumeData> {
    const cacheKey = this.cacheKey("parse", {
      resumeText,
      cvId: context?.cvId ?? "",
    });
    const cached = await this.cacheService.get<ParsedResumeData>(cacheKey);
    if (cached) return cached;

    const systemPrompt =
      "You are a resume parsing engine. Return ONLY one valid JSON object that matches the schema. No markdown, no extra text.";
    const userPrompt = JSON.stringify(
      {
        task: "resume_parse",
        locale: "vi-VN",
        rules: [
          "Extract data from the resume text only.",
          "Return empty strings or empty arrays when data is missing.",
          "Keep original language and casing when possible.",
        ],
        outputSchema: {
          fullName: "string",
          email: "string",
          phone: "string",
          address: "string",
          skills: ["string"],
          experience: ["string"],
          education: ["string"],
          certifications: ["string"],
          languages: ["string"],
          socialLinks: ["string"],
        },
        resumeText,
        context,
      },
      null,
      2,
    );

    const aiResult = await this.callGemmaJson(systemPrompt, userPrompt);
    const response = this.normalizeResumeParse(aiResult);
    await this.cacheService.set(cacheKey, response, this.cacheTtlSeconds);
    return response;
  }

  private buildCvPayload(cv: Cv): Record<string, unknown> {
    return {
      fullName: cv.fullName || "",
      title: cv.title || "",
      jobPosition: cv.jobPosition || "",
      summary: cv.summary || "",
      skills: this.parseStringArray(cv.skills),
      education: cv.education || "",
      experience: this.parseStringArray(cv.experience),
      projects: this.parseProjectList(cv.projects),
    };
  }

  private parseStringArray(value?: string | null): string[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item)).filter(Boolean);
    } catch {
      // Fallthrough to delimiter-based parsing.
    }
    return value
      .split(/[\n,;|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private parseProjectList(value?: string | null): Array<Record<string, unknown>> {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => {
          if (item && typeof item === "object") return item as Record<string, unknown>;
          return { name: String(item) };
        });
      }
    } catch {
      return [{ name: value }];
    }
    return [];
  }

  private async callGemmaJson(systemPrompt: string, userPrompt: string): Promise<Record<string, unknown>> {
    if (!this.apiKey) {
      this.raiseGemmaError(503, "Gemma API key is missing; analysis cannot run.");
    }

    const useGeminiApi = !this.apiUrl || this.apiUrl.includes("generativelanguage.googleapis.com");
    const endpoint = useGeminiApi
      ? this.buildGeminiEndpoint()
      : this.apiUrl;

    if (!endpoint) {
      this.raiseGemmaError(503, "Gemma API endpoint is not configured.");
    }

    try {
      const requestBody = useGeminiApi
        ? this.buildGeminiPayload(systemPrompt, userPrompt, true)
        : {
          model: this.modelId,
          temperature: 1.0,
          top_p: 0.95,
          top_k: 64,
          max_tokens: this.maxOutputTokens,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        };

      let response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(useGeminiApi ? {} : { Authorization: `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok && useGeminiApi) {
        const firstBody = await response.text();
        if (this.shouldRetryGeminiWithoutJsonMode(response.status, firstBody)) {
          this.logger.warn(
            `Gemini rejected JSON mode (HTTP ${response.status}); retrying without responseMimeType. Body: ${firstBody.slice(0, 240)}`,
          );
          response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(this.buildGeminiPayload(systemPrompt, userPrompt, false)),
          });
        } else {
          this.logger.warn(`Gemma API error ${response.status}: ${firstBody.slice(0, 400)}`);
          this.raiseGemmaError(response.status >= 500 ? 502 : response.status, `Gemma API returned HTTP ${response.status}.`);
        }
      }

      if (!response.ok) {
        const body = await response.text();
        this.logger.warn(`Gemma API error ${response.status}: ${body.slice(0, 400)}`);
        this.raiseGemmaError(response.status >= 500 ? 502 : response.status, `Gemma API returned HTTP ${response.status}.`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      const rawText = this.extractModelText(data);
      const text = this.sanitizeGemmaText(rawText);
      if (!text) {
        this.logger.warn(`Gemma model text is empty. ${this.describePayloadShape(data)}`);
        this.raiseGemmaError(502, "Gemma API returned an empty response payload.");
      }

      const parsed = this.extractJsonObject(text);
      if (parsed) {
        return parsed;
      }

      const repaired = await this.repairModelOutputToJson(endpoint, useGeminiApi, text);
      if (repaired) {
        return repaired;
      }

      {
        this.logger.warn(
          `Gemma JSON parse failed. ${this.describePayloadShape(data)} textLength=${text.length}, rawTextLength=${rawText.length}, preview=${text.slice(0, 300).replace(/\s+/g, " ")}`,
        );
        this.raiseGemmaError(502, "Gemma API response is not valid JSON.");
      }
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.warn(`Gemma API unavailable: ${error instanceof Error ? error.message : "unknown error"}`);
      this.raiseGemmaError(503, "Gemma API is unavailable.");
    }
  }

  private async callFastApiJson(
    path: string,
    payload: Record<string, unknown> | null,
    method: "POST" | "GET" = "POST",
  ): Promise<Record<string, unknown>> {
    if (!this.fastApiUrl) {
      this.raiseGemmaError(503, "FastAPI LLM service is not configured.");
    }

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
        this.raiseGemmaError(response.status >= 500 ? 502 : response.status, `FastAPI LLM returned HTTP ${response.status}.`);
      }

      return (await response.json()) as Record<string, unknown>;
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.warn(`FastAPI LLM unavailable: ${error instanceof Error ? error.message : "unknown error"}`);
      this.raiseGemmaError(503, "FastAPI LLM service is unavailable.");
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildGeminiPayload(
    systemPrompt: string,
    userPrompt: string,
    enforceJsonOutput: boolean,
  ): Record<string, unknown> {
    return {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: this.maxOutputTokens,
        ...(enforceJsonOutput ? { responseMimeType: "application/json" } : {}),
      },
      ...(this.shouldEnableThinking()
        ? {
          thinkingConfig: {
            thinkingLevel: this.thinkingLevel,
          },
        }
        : {}),
    };
  }

  private shouldRetryGeminiWithoutJsonMode(status: number, body: string): boolean {
    if (status !== 400 && status !== 422) return false;
    return /responsemimetype|schema|json|generationconfig/i.test(body);
  }

  private describePayloadShape(payload: Record<string, unknown>): string {
    const candidates = Array.isArray(payload.candidates) ? payload.candidates.length : 0;
    const choices = Array.isArray(payload.choices) ? payload.choices.length : 0;
    const keys = Object.keys(payload).slice(0, 10).join(",");
    return `payloadKeys=${keys || "none"}, candidates=${candidates}, choices=${choices}`;
  }

  private async repairModelOutputToJson(
    endpoint: string,
    useGeminiApi: boolean,
    invalidText: string,
  ): Promise<Record<string, unknown> | null> {
    if (!invalidText.trim()) return null;

    try {
      const repairSystemPrompt =
        "You are a JSON normalizer. Convert the provided content into ONE valid JSON object. Return ONLY JSON with double quotes and no markdown.";
      const repairUserPrompt = JSON.stringify(
        {
          task: "repair_to_valid_json",
          rules: [
            "Return exactly one JSON object.",
            "No explanation, no markdown fences, no extra text.",
            "Preserve original meaning whenever possible.",
          ],
          content: invalidText,
        },
        null,
        2,
      );

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(useGeminiApi ? {} : { Authorization: `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify(
          useGeminiApi
            ? this.buildGeminiPayload(repairSystemPrompt, repairUserPrompt, true)
            : {
              model: this.modelId,
              temperature: 0,
              top_p: 0.9,
              top_k: 40,
              max_tokens: Math.min(this.maxOutputTokens, 320),
              messages: [
                { role: "system", content: repairSystemPrompt },
                { role: "user", content: repairUserPrompt },
              ],
            },
        ),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.warn(`Gemma JSON repair request failed HTTP ${response.status}: ${body.slice(0, 240)}`);
        return null;
      }

      const data = (await response.json()) as Record<string, unknown>;
      const repairedText = this.sanitizeGemmaText(this.extractModelText(data));
      const repairedJson = this.extractJsonObject(repairedText);
      if (repairedJson) {
        this.logger.warn("Gemma JSON repair succeeded after initial parse failure.");
      }
      return repairedJson;
    } catch (error) {
      this.logger.warn(`Gemma JSON repair failed: ${error instanceof Error ? error.message : "unknown error"}`);
      return null;
    }
  }

  private raiseGemmaError(statusCode: number, message: string): never {
    throw new RpcException({
      statusCode,
      message,
    });
  }

  private shouldEnableThinking(): boolean {
    return this.thinkingMode === "high" || this.thinkingMode === "low";
  }

  private sanitizeGemmaText(text: string): string {
    if (!text) return "";
    return text
      .replace(/<\|channel>thought[\s\S]*?<channel\|>/g, "")
      .replace(/<\|turn>model/g, "")
      .replace(/<turn\|>/g, "")
      .trim();
  }

  private buildGeminiEndpoint(): string | null {
    if (!this.apiKey) return null;
    const base = this.apiUrl || "https://generativelanguage.googleapis.com/v1beta";
    const normalized = base.replace(/\/$/, "");
    if (normalized.includes(":generateContent")) {
      return `${normalized}${normalized.includes("?") ? "&" : "?"}key=${encodeURIComponent(this.apiKey)}`;
    }
    return `${normalized}/models/${this.modelId}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
  }

  private extractModelText(payload: Record<string, unknown>): string {
    const candidate = payload.candidates as Array<Record<string, unknown>> | undefined;
    const choices = payload.choices as Array<Record<string, unknown>> | undefined;

    if (choices?.[0]) {
      const message = choices[0].message as Record<string, unknown> | undefined;
      if (typeof message?.content === "string") return message.content;
      if (Array.isArray(message?.content)) {
        const text = this.joinTextParts(message.content);
        if (text) return text;
      }
    }

    if (candidate?.[0]) {
      const content = candidate[0].content as Record<string, unknown> | undefined;
      const parts = content?.parts as Array<Record<string, unknown>> | undefined;
      const text = this.joinTextParts(parts);
      if (text) return text;
    }

    if (typeof payload.output_text === "string") return payload.output_text;
    if (typeof payload.text === "string") return payload.text;
    return "";
  }

  private joinTextParts(parts: Array<Record<string, unknown>> | undefined): string {
    if (!parts?.length) return "";
    return parts
      .map((part) => (typeof part.text === "string" ? part.text : ""))
      .filter(Boolean)
      .join("\n");
  }

  private extractJsonObject(text: string): Record<string, unknown> | null {
    const trimmed = text.trim();
    const candidates = [trimmed];

    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fencedMatch?.[1]) {
      candidates.push(fencedMatch[1].trim());
    }

    const objectSnippet = this.extractBalancedJsonSnippet(trimmed, "{");
    if (objectSnippet) {
      candidates.push(objectSnippet);
    }

    const arraySnippet = this.extractBalancedJsonSnippet(trimmed, "[");
    if (arraySnippet) {
      candidates.push(arraySnippet);
    }

    for (const candidate of candidates) {
      const parsed = this.tryParseJsonValue(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0];
        if (first && typeof first === "object" && !Array.isArray(first)) {
          return first as Record<string, unknown>;
        }
      }
    }

    return null;
  }

  private extractBalancedJsonSnippet(text: string, opening: "{" | "["): string | null {
    const closing = opening === "{" ? "}" : "]";
    const start = text.indexOf(opening);
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < text.length; index += 1) {
      const char = text[index];

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === "\\") {
          escaped = true;
          continue;
        }
        if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === opening) {
        depth += 1;
        continue;
      }

      if (char === closing) {
        depth -= 1;
        if (depth === 0) {
          return text.slice(start, index + 1).trim();
        }
      }
    }

    return null;
  }

  private tryParseJsonValue(text: string): unknown {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (typeof parsed === "string") {
        return this.tryParseJsonValue(parsed);
      }
      return parsed;
    } catch {
      const relaxed = this.normalizeJsonCandidate(text);
      if (!relaxed || relaxed === text) {
        return null;
      }
      try {
        const parsed = JSON.parse(relaxed) as unknown;
        if (typeof parsed === "string") {
          return this.tryParseJsonValue(parsed);
        }
        return parsed;
      } catch {
        return null;
      }
    }
  }

  private normalizeJsonCandidate(text: string): string {
    return text
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/(^|[{,\[]\s*)'([^'\\]*(?:\\.[^'\\]*)*)'\s*:/g, '$1"$2":')
      .replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'(\s*[,}\]])/g, ': "$1"$2')
      .replace(/,\s*([}\]])/g, "$1")
      .trim();
  }

  private normalizeCvSuggestion(data: Record<string, unknown>): CvSuggestionResponse {
    const score = this.numberOr(data.score, 0, 0, 100);
    const improvementsInput = Array.isArray(data.improvements) ? data.improvements : [];
    const improvements: CvImprovementItem[] = improvementsInput
      .map((item) => this.normalizeImprovementItem(item))
      .filter((item): item is CvImprovementItem => item !== null);

    return {
      score,
      summary: this.stringOr(data.summary, ""),
      strengths: this.stringArrayOr(data.strengths, []),
      improvements,
      keywordsToAdd: this.stringArrayOr(data.keywordsToAdd, []),
      recommendation: this.recommendationOr(
        data.recommendation,
        "revise-current-cv",
        ["revise-current-cv", "create-new-cv"],
      ) as CvSuggestionResponse["recommendation"],
    };
  }

  private normalizeFitResponse(data: Record<string, unknown>): ApplicationFitResponse {
    return {
      fitScore: this.numberOr(data.fitScore, 0, 0, 100),
      matchedSkills: this.stringArrayOr(data.matchedSkills, []),
      missingSkills: this.stringArrayOr(data.missingSkills, []),
      missingKeywords: this.stringArrayOr(data.missingKeywords, []),
      recommendation: this.recommendationOr(
        data.recommendation,
        "revise-current-cv",
        ["use-current-cv", "revise-current-cv", "create-new-cv"],
      ) as AiRecommendation,
      explanation: this.stringOr(data.explanation, ""),
      actionPlan: this.stringArrayOr(data.actionPlan, []),
    };
  }

  private normalizeImprovementItem(item: unknown): CvImprovementItem | null {
    if (!item || typeof item !== "object") return null;
    const value = item as Record<string, unknown>;
    const section = this.recommendationOr(value.section, "general", [
      "summary",
      "skills",
      "experience",
      "projects",
      "general",
    ]) as CvImprovementItem["section"];
    const issue = this.stringOr(value.issue, "Nội dung chưa rõ ràng");
    const suggestion = this.stringOr(value.suggestion, "Bổ sung thông tin cụ thể hơn");
    const priority = this.recommendationOr(value.priority, "medium", ["high", "medium", "low"]) as
      | "high"
      | "medium"
      | "low";
    return { section, issue, suggestion, priority };
  }

  private normalizeResumeParse(data: Record<string, unknown>): ParsedResumeData {
    return {
      fullName: this.stringOr(data.fullName, ""),
      email: this.stringOr(data.email, ""),
      phone: this.stringOr(data.phone, ""),
      address: this.stringOr(data.address, ""),
      skills: this.stringArrayOr(data.skills, []),
      experience: this.stringArrayOr(data.experience, []),
      education: this.stringArrayOr(data.education, []),
      certifications: this.stringArrayOr(data.certifications, []),
      languages: this.stringArrayOr(data.languages, []),
      socialLinks: this.stringArrayOr(data.socialLinks, []),
    };
  }
  private stringOr(value: unknown, fallback: string): string {
    return typeof value === "string" && value.trim() ? value : fallback;
  }

  private stringArrayOr(value: unknown, fallback: string[]): string[] {
    if (!Array.isArray(value)) return fallback;
    const parsed = value.map((item) => String(item).trim()).filter(Boolean);
    return parsed.length > 0 ? parsed : fallback;
  }

  private numberOr(value: unknown, fallback: number, min: number, max: number): number {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.round(n)));
  }

  private recommendationOr(
    value: unknown,
    fallback: string,
    allowed: string[],
  ): string {
    const next = typeof value === "string" ? value : fallback;
    return allowed.includes(next) ? next : fallback;
  }

  private parseMaxOutputTokens(value: string | undefined): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 300;
    return Math.max(128, Math.min(2048, Math.round(parsed)));
  }

  private parseTimeoutMs(value: string | undefined): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 120000;
    return Math.max(1000, Math.min(300000, Math.round(parsed)));
  }

  private cacheKey(scope: string, value: unknown): string {
    const raw = this.stableStringify(value);
    const hash = createHash("sha256").update(raw).digest("hex");
    return `cv-ai:${scope}:${hash}`;
  }

  private stableStringify(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(",")}]`;
    }
    if (value && typeof value === "object") {
      return `{${Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${this.stableStringify((value as Record<string, unknown>)[key])}`)
        .join(",")}}`;
    }
    return JSON.stringify(value);
  }

  private parseTtlSeconds(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(60, Math.min(60 * 60 * 24 * 7, Math.round(parsed)));
  }
}
