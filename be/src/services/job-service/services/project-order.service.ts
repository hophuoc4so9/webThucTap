import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  ProjectOrder,
  ProjectOrderStatus,
} from "../entities/project-order.entity";
import { ProjectApplication } from "../entities/project-application.entity";
import { CreateProjectOrderDto } from "../dto/create-project-order.dto";
import { UpdateProjectOrderDto } from "../dto/update-project-order.dto";
import {
  ApplyProjectDto,
  UpdateApplicationStatusDto,
} from "../dto/project-application.dto";

@Injectable()
export class ProjectOrderService {
  constructor(
    @InjectRepository(ProjectOrder)
    private readonly projectRepo: Repository<ProjectOrder>,
    @InjectRepository(ProjectApplication)
    private readonly applicationRepo: Repository<ProjectApplication>
  ) {}

  // ─── Project Orders ───────────────────────────────────────────────

  async create(dto: CreateProjectOrderDto): Promise<ProjectOrder> {
    const project = this.projectRepo.create(dto);
    return this.projectRepo.save(project);
  }

  async findAll(params: {
    status?: ProjectOrderStatus;
    companyId?: number;
    page?: number;
    limit?: number;
  }): Promise<{ data: ProjectOrder[]; total: number; page: number; limit: number }> {
    const { status, companyId, page = 1, limit = 10 } = params;
    const qb = this.projectRepo
      .createQueryBuilder("po")
      .leftJoinAndSelect("po.applications", "apps")
      .orderBy("po.createdAt", "DESC");

    if (status) qb.andWhere("po.status = :status", { status });
    if (companyId) qb.andWhere("po.companyId = :companyId", { companyId });

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<ProjectOrder> {
    const project = await this.projectRepo.findOne({
      where: { id },
      relations: ["applications"],
    });
    if (!project) throw new NotFoundException(`ProjectOrder #${id} not found`);
    return project;
  }

  async update(id: number, dto: UpdateProjectOrderDto): Promise<ProjectOrder> {
    await this.findOne(id);
    await this.projectRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.projectRepo.delete(id);
  }

  // ─── Applications ─────────────────────────────────────────────────

  async apply(
    projectId: number,
    userId: number,
    dto: ApplyProjectDto
  ): Promise<ProjectApplication> {
    // prevent duplicate applications
    const existing = await this.applicationRepo.findOne({
      where: { projectId, userId },
    });
    if (existing) return existing;

    const app = this.applicationRepo.create({ projectId, userId, ...dto });
    return this.applicationRepo.save(app);
  }

  async getApplications(projectId: number): Promise<ProjectApplication[]> {
    return this.applicationRepo.find({
      where: { projectId },
      order: { appliedAt: "DESC" },
    });
  }

  async updateApplicationStatus(
    appId: number,
    dto: UpdateApplicationStatusDto
  ): Promise<ProjectApplication> {
    await this.applicationRepo.update(appId, { status: dto.status });
    return this.applicationRepo.findOneBy({ id: appId });
  }

  async getStudentApplications(
    userId: number
  ): Promise<ProjectApplication[]> {
    return this.applicationRepo.find({
      where: { userId },
      relations: ["project"],
      order: { appliedAt: "DESC" },
    });
  }
}
