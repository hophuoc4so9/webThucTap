import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CompanyService } from "../services/company.service";
import { CreateCompanyDto } from "../dto/create-company.dto";
import { UpdateCompanyDto } from "../dto/update-company.dto";

@Controller()
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @MessagePattern("company_ping")
  ping() {
    return {
      status: "ok",
      service: "job-service/company",
      timestamp: new Date().toISOString(),
    };
  }

  @MessagePattern("company_create")
  create(@Payload() dto: CreateCompanyDto) {
    return this.companyService.create(dto);
  }

  /** HR tạo công ty từ onboarding (có ownerId, status=PENDING) */
  @MessagePattern("company_create_onboarding")
  createOnboarding(
    @Payload() payload: { ownerId: number; dto: CreateCompanyDto },
  ) {
    return this.companyService.createWithOwner(payload.ownerId, payload.dto);
  }

  @MessagePattern("company_find_all")
  findAll(
    @Payload() payload: { page?: number; limit?: number; name?: string },
  ) {
    return this.companyService.findAll(
      payload?.page,
      payload?.limit,
      payload?.name,
    );
  }

  /** Admin: lấy danh sách công ty có filter theo status */
  @MessagePattern("company_find_all_admin")
  findAllAdmin(
    @Payload()
    payload: {
      page?: number;
      limit?: number;
      status?: string;
      name?: string;
    },
  ) {
    return this.companyService.findAllAdmin(
      payload?.page,
      payload?.limit,
      payload?.status,
      payload?.name,
    );
  }

  @MessagePattern("company_find_one")
  findOne(@Payload() payload: { id: number }) {
    return this.companyService.findOne(payload.id);
  }

  @MessagePattern("company_update")
  update(@Payload() payload: { id: number; dto: UpdateCompanyDto }) {
    return this.companyService.update(payload.id, payload.dto);
  }

  @MessagePattern("company_remove")
  remove(@Payload() payload: { id: number }) {
    return this.companyService.remove(payload.id);
  }

  /** Admin duyệt công ty */
  @MessagePattern("company_approve")
  approveCompany(@Payload() payload: { id: number }) {
    return this.companyService.approveCompany(payload.id);
  }

  /** Admin từ chối công ty */
  @MessagePattern("company_reject")
  rejectCompany(@Payload() payload: { id: number; reason?: string }) {
    return this.companyService.rejectCompany(payload.id, payload.reason);
  }

  /** HR gửi yêu cầu join công ty */
  @MessagePattern("company_join_request")
  joinRequest(@Payload() payload: { userId: number; companyId: number }) {
    return this.companyService.joinRequest(payload.userId, payload.companyId);
  }

  /** Lấy join requests của công ty */
  @MessagePattern("company_get_join_requests")
  getJoinRequests(@Payload() payload: { companyId: number }) {
    return this.companyService.getJoinRequests(payload.companyId);
  }

  /** Lấy công ty mà user đang là thành viên */
  @MessagePattern("company_get_member_company")
  getMemberCompany(@Payload() payload: { userId: number }) {
    return this.companyService.getMemberCompany(payload.userId);
  }

  /** Owner/Admin công ty duyệt join */
  @MessagePattern("company_approve_join")
  approveJoin(@Payload() payload: { memberId: number }) {
    return this.companyService.approveJoin(payload.memberId);
  }

  /** Owner/Admin công ty từ chối join */
  @MessagePattern("company_reject_join")
  rejectJoin(@Payload() payload: { memberId: number; reason?: string }) {
    return this.companyService.rejectJoin(payload.memberId, payload.reason);
  }

  /** Lấy thành viên của công ty */
  @MessagePattern("company_get_members")
  getMembers(@Payload() payload: { companyId: number }) {
    return this.companyService.getCompanyMembers(payload.companyId);
  }
}

