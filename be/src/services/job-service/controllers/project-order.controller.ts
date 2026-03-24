import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { ProjectOrderService } from "../services/project-order.service";
import { CreateProjectOrderDto } from "../dto/create-project-order.dto";
import { UpdateProjectOrderDto } from "../dto/update-project-order.dto";
import {
  ApplyProjectDto,
  UpdateApplicationStatusDto,
} from "../dto/project-application.dto";
import { ProjectOrderStatus } from "../entities/project-order.entity";

@Controller()
export class ProjectOrderController {
  constructor(private readonly service: ProjectOrderService) {}

  @MessagePattern("project_order_create")
  create(@Payload() dto: CreateProjectOrderDto) {
    return this.service.create(dto);
  }

  @MessagePattern("project_order_find_all")
  findAll(
    @Payload()
    query: {
      status?: ProjectOrderStatus;
      companyId?: number;
      page?: number;
      limit?: number;
    }
  ) {
    return this.service.findAll(query);
  }

  @MessagePattern("project_order_find_one")
  findOne(@Payload() payload: { id: number }) {
    return this.service.findOne(payload.id);
  }

  @MessagePattern("project_order_update")
  update(@Payload() payload: { id: number; dto: UpdateProjectOrderDto }) {
    return this.service.update(payload.id, payload.dto);
  }

  @MessagePattern("project_order_remove")
  remove(@Payload() payload: { id: number }) {
    return this.service.remove(payload.id);
  }

  @MessagePattern("project_order_apply")
  apply(
    @Payload()
    payload: { projectId: number; userId: number; dto: ApplyProjectDto }
  ) {
    return this.service.apply(payload.projectId, payload.userId, payload.dto);
  }

  @MessagePattern("project_order_get_applications")
  getApplications(@Payload() payload: { projectId: number }) {
    return this.service.getApplications(payload.projectId);
  }

  @MessagePattern("project_order_update_application_status")
  updateApplicationStatus(
    @Payload() payload: { appId: number; dto: UpdateApplicationStatusDto }
  ) {
    return this.service.updateApplicationStatus(payload.appId, payload.dto);
  }

  @MessagePattern("project_order_get_student_applications")
  getStudentApplications(@Payload() payload: { userId: number }) {
    return this.service.getStudentApplications(payload.userId);
  }
}
