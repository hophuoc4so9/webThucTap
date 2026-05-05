import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import { readFile } from "fs/promises";
import { extname, join } from "path";
import pdfParse = require("pdf-parse");
import mammoth from "mammoth";
import { Repository } from "typeorm";
import { Cv } from "../entities/cv.entity";
import { GemmaService } from "./gemma.service";
import type { ParsedResumeData } from "../dto/parse-resume.dto";

@Injectable()
export class ResumeParseService {
  private readonly uploadsDir = process.env.UPLOADS_DIR?.trim() || "/uploads";
  private readonly maxParseChars = this.parseMaxParseChars(process.env.CV_PARSE_MAX_CHARS);

  constructor(
    @InjectRepository(Cv)
    private readonly cvRepo: Repository<Cv>,
    private readonly gemmaService: GemmaService,
  ) {}

  async parseCvById(
    cvId: number,
    userId?: number,
  ): Promise<{ cv: Cv; parsed: ParsedResumeData }> {
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
    if (!cv.filePath) {
      throw new RpcException({
        statusCode: 400,
        message: "CV này chưa có file để trích xuất",
      });
    }

    const filePath = join(this.uploadsDir, cv.filePath);
    const rawText = await this.extractTextFromFile(filePath, cv.fileOriginalName ?? cv.filePath);
    const trimmedText = this.trimResumeText(rawText);
    if (!trimmedText) {
      throw new RpcException({
        statusCode: 422,
        message: "Không trích xuất được nội dung từ file CV",
      });
    }

    const parsed = await this.gemmaService.parseResumeText(trimmedText, { userId, cvId });
    const updatePayload = this.mapParsedResumeToCv(parsed);
    Object.assign(cv, updatePayload);
    const saved = await this.cvRepo.save(cv);

    return {
      cv: saved,
      parsed,
    };
  }

  async ensureCvParsed(cv: Cv, userId?: number): Promise<Cv> {
    if (!cv.filePath) return cv;
    if (!this.isCvContentEmpty(cv)) return cv;

    const result = await this.parseCvById(cv.id, userId);
    return result.cv;
  }

  private isCvContentEmpty(cv: Cv): boolean {
    return ![
      cv.fullName,
      cv.summary,
      cv.skills,
      cv.education,
      cv.experience,
      cv.projects,
      cv.certifications,
      cv.languages,
      cv.socialLinks,
      cv.contactEmail,
      cv.phone,
      cv.address,
      cv.linkedIn,
    ].some((value) => this.hasValue(value));
  }

  private hasValue(value?: string | null): boolean {
    if (!value) return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (trimmed === "[]" || trimmed === "{}" || trimmed === "null") return false;
    return true;
  }

  private async extractTextFromFile(filePath: string, nameForExt: string): Promise<string> {
    const ext = extname(nameForExt).toLowerCase();
    let buffer: Buffer;
    try {
      buffer = await readFile(filePath);
    } catch {
      throw new RpcException({
        statusCode: 404,
        message: "Không tìm thấy file CV để trích xuất",
      });
    }

    if (ext === ".pdf") {
      const parsed = await pdfParse(buffer);
      return parsed.text ?? "";
    }

    if (ext === ".docx") {
      const result = await mammoth.extractRawText({ buffer });
      return result.value ?? "";
    }

    throw new RpcException({
      statusCode: 415,
      message: "Định dạng file chưa được hỗ trợ để trích xuất (chỉ hỗ trợ PDF/DOCX)",
    });
  }

  private trimResumeText(text: string): string {
    const normalized = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
    if (!normalized) return "";
    if (normalized.length <= this.maxParseChars) return normalized;
    return normalized.slice(0, this.maxParseChars);
  }

  private mapParsedResumeToCv(parsed: ParsedResumeData): Partial<Cv> {
    return {
      fullName: parsed.fullName || null,
      contactEmail: parsed.email || null,
      phone: parsed.phone || null,
      address: parsed.address || null,
      skills: JSON.stringify(parsed.skills ?? []),
      experience: JSON.stringify(parsed.experience ?? []),
      education: (parsed.education ?? []).join("\n"),
      certifications: JSON.stringify(parsed.certifications ?? []),
      languages: JSON.stringify(parsed.languages ?? []),
      socialLinks: JSON.stringify(parsed.socialLinks ?? []),
    };
  }

  private parseMaxParseChars(value: string | undefined): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 16000;
    return Math.max(2000, Math.min(60000, Math.round(parsed)));
  }
}
