import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Cv } from "../entities/cv.entity";
import { CreateCvDto } from "../dto/create-cv.dto";
import { UpdateCvDto } from "../dto/update-cv.dto";

@Injectable()
export class CvService {
  constructor(
    @InjectRepository(Cv)
    private readonly cvRepo: Repository<Cv>,
  ) {}

  async create(dto: CreateCvDto): Promise<Cv> {
    // Nếu isDefault=true, bỏ cờ của các CV cũ
    if (dto.isDefault) {
      await this.cvRepo.update(
        { userId: dto.userId, isDefault: true },
        { isDefault: false },
      );
    }
    const cv = this.cvRepo.create(dto);
    return this.cvRepo.save(cv);
  }

  async findAllByUser(userId: number): Promise<Cv[]> {
    return this.cvRepo.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

  async findOne(id: number): Promise<Cv> {
    const cv = await this.cvRepo.findOne({ where: { id } });
    if (!cv)
      throw new RpcException({
        statusCode: 404,
        message: `CV #${id} không tồn tại`,
      });
    return cv;
  }

  async update(id: number, dto: UpdateCvDto): Promise<Cv> {
    const cv = await this.findOne(id);

    if (dto.isDefault) {
      await this.cvRepo.update(
        { userId: cv.userId, isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(cv, dto);
    return this.cvRepo.save(cv);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    const cv = await this.findOne(id);
    await this.cvRepo.remove(cv);
    return { success: true };
  }

  /** Cập nhật thông tin file sau khi upload */
  async updateFile(
    id: number,
    file: { filePath: string; fileOriginalName: string; fileMimeType: string },
  ): Promise<Cv> {
    const cv = await this.findOne(id);
    Object.assign(cv, file);
    return this.cvRepo.save(cv);
  }
}
