import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Application } from "../entities/application.entity";
import { CreateApplicationDto } from "../dto/create-application.dto";
import { UpdateApplicationStatusDto } from "../dto/update-application-status.dto";
import { QueryApplicationDto } from "../dto/query-application.dto";

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
  ) {}

  async create(dto: CreateApplicationDto): Promise<Application> {
    // Ngăn ứng tuyển trùng
    const existing = await this.appRepo.findOne({
      where: { userId: dto.userId, jobId: dto.jobId },
    });
    if (existing) {
      throw new RpcException({
        statusCode: 409,
        message: "Bạn đã ứng tuyển công việc này rồi",
      });
    }
    const app = this.appRepo.create(dto);
    return this.appRepo.save(app);
  }

  async findAll(
    query: QueryApplicationDto,
  ): Promise<{ data: Application[]; total: number }> {
    const { userId, jobId, status, page = 1, limit = 10 } = query;
    const qb = this.appRepo
      .createQueryBuilder("app")
      .leftJoinAndSelect("app.cv", "cv");

    if (userId) qb.andWhere("app.userId = :userId", { userId });
    if (jobId) qb.andWhere("app.jobId = :jobId", { jobId });
    if (status) qb.andWhere("app.status = :status", { status });

    qb.orderBy("app.appliedAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findOne(id: number): Promise<Application> {
    const app = await this.appRepo.findOne({
      where: { id },
      relations: ["cv"],
    });
    if (!app)
      throw new RpcException({
        statusCode: 404,
        message: `Đơn ứng tuyển #${id} không tồn tại`,
      });
    return app;
  }

  async updateStatus(
    id: number,
    dto: UpdateApplicationStatusDto,
  ): Promise<Application> {
    const app = await this.findOne(id);
    app.status = dto.status as any;
    if (dto.note !== undefined) app.note = dto.note;
    return this.appRepo.save(app);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    const app = await this.findOne(id);
    await this.appRepo.remove(app);
    return { success: true };
  }

  /** Kiểm tra user đã ứng tuyển job chưa */
  async checkApplied(
    userId: number,
    jobId: number,
  ): Promise<{ applied: boolean }> {
    const count = await this.appRepo.count({ where: { userId, jobId } });
    return { applied: count > 0 };
  }
}
