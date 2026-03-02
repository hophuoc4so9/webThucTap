import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Company } from "../entities/company.entity";
import { CreateCompanyDto } from "../dto/create-company.dto";
import { UpdateCompanyDto } from "../dto/update-company.dto";

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async create(dto: CreateCompanyDto): Promise<Company> {
    const company = this.companyRepo.create(dto as Partial<Company>);
    return this.companyRepo.save(company);
  }

  async findAll(page = 1, limit = 20, name?: string) {
    const qb = this.companyRepo.createQueryBuilder("c");
    if (name) {
      qb.where("c.name ILIKE :name", { name: `%${name}%` });
    }
    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy("c.id", "DESC")
      .getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<Company> {
    const company = await this.companyRepo.findOne({
      where: { id },
      relations: ["jobs"],
    });
    if (!company)
      throw new RpcException({
        statusCode: 404,
        message: `Không tìm thấy công ty #${id}`,
      });
    return company;
  }

  async findByName(name: string): Promise<Company | null> {
    return this.companyRepo.findOne({ where: { name } });
  }

  async update(id: number, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findOne(id);
    Object.assign(company, dto);
    return this.companyRepo.save(company);
  }

  async remove(id: number): Promise<{ message: string }> {
    const company = await this.findOne(id);
    await this.companyRepo.remove(company);
    return { message: `Đã xoá công ty #${id}` };
  }
}
