import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Cv } from "../entities/cv.entity";
import { CreateCvDto } from "../dto/create-cv.dto";
import { UpdateCvDto } from "../dto/update-cv.dto";

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
    projectExperience: cv.projectExperience ?? null,
    filePath: cv.filePath ?? null,
    fileOriginalName: cv.fileOriginalName ?? null,
    fileMimeType: cv.fileMimeType ?? null,
    isDefault: cv.isDefault ?? false,
    source: cv.source ?? "form",
    createdAt: cv.createdAt,
    updatedAt: cv.updatedAt,
  };
}

@Injectable()
export class CvService {
  constructor(
    @InjectRepository(Cv)
    private readonly cvRepo: Repository<Cv>,
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

  async findAllByUser(userId: number): Promise<Cv[]> {
    return this.cvRepo.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
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
}
