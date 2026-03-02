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
}
