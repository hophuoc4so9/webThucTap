import { Injectable } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { ClientProxy, RpcException } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import { firstValueFrom } from "rxjs";
import { Repository } from "typeorm";
import { Application } from "../entities/application.entity";
import { Cv } from "../entities/cv.entity";
import { CreateApplicationDto } from "../dto/create-application.dto";
import { UpdateApplicationStatusDto } from "../dto/update-application-status.dto";
import { QueryApplicationDto } from "../dto/query-application.dto";
import { GemmaService } from "./gemma.service";

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    @InjectRepository(Cv)
    private readonly cvRepo: Repository<Cv>,
    @Inject("JOB_SERVICE") private readonly jobClient: ClientProxy,
    private readonly gemmaService: GemmaService,
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
  ): Promise<{ data: Application[]; total: number; page: number; limit: number }> {
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
    return { data, total, page, limit };
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

  async updateCvForApplication(
    id: number,
    cvId: number | null,
    userId?: number,
  ): Promise<Application> {
    const app = await this.appRepo.findOne({
      where: { id },
      relations: ["cv"],
    });
    if (!app) {
      throw new RpcException({
        statusCode: 404,
        message: `Đơn ứng tuyển #${id} không tồn tại`,
      });
    }
    if (userId && app.userId !== userId) {
      throw new RpcException({
        statusCode: 403,
        message: "Bạn không có quyền sửa CV của đơn ứng tuyển này",
      });
    }

    if (cvId === null) {
      app.cv = null as any;
      app.cvId = null as any;
      return this.appRepo.save(app);
    }

    const cv = await this.cvRepo.findOne({ where: { id: cvId } });
    if (!cv) {
      throw new RpcException({
        statusCode: 404,
        message: `CV #${cvId} không tồn tại`,
      });
    }
    if (cv.userId !== app.userId) {
      throw new RpcException({
        statusCode: 403,
        message: "CV được chọn không thuộc về người dùng hiện tại",
      });
    }

    app.cv = cv;
    app.cvId = cv.id;
    return this.appRepo.save(app);
  }

  /** Kiểm tra user đã ứng tuyển job chưa */
  async checkApplied(
    userId: number,
    jobId: number,
  ): Promise<{ applied: boolean }> {
    const count = await this.appRepo.count({ where: { userId, jobId } });
    return { applied: count > 0 };
  }

  async analyzeFitForApplication(applicationId: number, userId?: number) {
    const app = await this.appRepo.findOne({
      where: { id: applicationId },
      relations: ["cv"],
    });
    if (!app) {
      throw new RpcException({
        statusCode: 404,
        message: `Đơn ứng tuyển #${applicationId} không tồn tại`,
      });
    }
    if (userId && app.userId !== userId) {
      throw new RpcException({
        statusCode: 403,
        message: "Bạn không có quyền phân tích đơn ứng tuyển này",
      });
    }
    if (!app.cv) {
      throw new RpcException({
        statusCode: 400,
        message: "Đơn ứng tuyển này chưa gắn CV dạng form để phân tích",
      });
    }

    const job = await firstValueFrom(
      this.jobClient.send("job_find_one", { id: app.jobId }),
    );

    const analysis = await this.gemmaService.analyzeCvJobFit(app.cv, job as Record<string, unknown>);
    return {
      applicationId: app.id,
      jobId: app.jobId,
      cvId: app.cvId,
      ...analysis,
    };
  }

  async analyzeFitForJobAndCv(
    jobId: number,
    cvId: number,
    userId?: number,
  ) {
    if (!cvId) {
      throw new RpcException({
        statusCode: 400,
        message: "Vui lòng chọn CV để phân tích",
      });
    }

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

    const job = await firstValueFrom(
      this.jobClient.send("job_find_one", { id: jobId }),
    );

    const analysis = await this.gemmaService.analyzeCvJobFit(
      cv,
      job as Record<string, unknown>,
    );
    return {
      jobId,
      cvId: cv.id,
      ...analysis,
    };
  }
}
