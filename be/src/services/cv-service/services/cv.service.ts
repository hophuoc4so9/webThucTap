import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Application } from "../entities/application.entity";
import { Cv } from "../entities/cv.entity";
import { CreateCvDto } from "../dto/create-cv.dto";
import { UpdateCvDto } from "../dto/update-cv.dto";
import { GemmaService } from "./gemma.service";

/** Trả về CV dạng plain object với đủ tất cả trường (kể cả null) để FE luôn nhận đủ khi GET/PUT */
function toCvResponse(cv: Cv): Record<string, unknown> {
  return {
    id: cv.id,
    userId: cv.userId,
    fullName: cv.fullName ?? null,
    jobPosition: cv.jobPosition ?? null,
    phone: cv.phone ?? null,
    contactEmail: cv.contactEmail ?? null,
    address: cv.address ?? null,
    linkedIn: cv.linkedIn ?? null,
    title: cv.title ?? null,
    summary: cv.summary ?? null,
    skills: cv.skills ?? null,
    education: cv.education ?? null,
    experience: cv.experience ?? null,
    projects: cv.projects ?? null,
    filePath: cv.filePath ?? null,
    fileOriginalName: cv.fileOriginalName ?? null,
    fileMimeType: cv.fileMimeType ?? null,
    isDefault: cv.isDefault ?? false,
    source: cv.source ?? "form",
    createdAt: cv.createdAt,
    updatedAt: cv.updatedAt,
  };
}

function toDraftCv(payload: {
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
}): Cv {
  return {
    id: 0,
    userId: payload.userId,
    fullName: payload.fullName ?? null,
    jobPosition: payload.jobPosition ?? null,
    phone: payload.phone ?? null,
    contactEmail: payload.contactEmail ?? null,
    address: payload.address ?? null,
    linkedIn: payload.linkedIn ?? null,
    title: payload.title ?? null,
    summary: payload.summary ?? null,
    skills: payload.skills ?? null,
    education: payload.education ?? null,
    experience: payload.experience ?? null,
    projects: payload.projects ?? null,
    filePath: null,
    fileOriginalName: null,
    fileMimeType: null,
    isDefault: false,
    source: payload.source === "file" ? "file" : "form",
    createdAt: new Date(),
    updatedAt: new Date(),
    applications: [] as Application[],
  };
}

@Injectable()
export class CvService {
  constructor(
    @InjectRepository(Cv)
    private readonly cvRepo: Repository<Cv>,
    private readonly gemmaService: GemmaService,
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

    const suggestions = await this.gemmaService.suggestCvImprovements(cv);
    return {
      cvId: cv.id,
      userId: cv.userId,
      ...suggestions,
    };
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
    const suggestions = await this.gemmaService.suggestCvImprovements(draftCv);
    return {
      cvId: draftCv.id,
      userId: draftCv.userId,
      ...suggestions,
    };
  }
}
