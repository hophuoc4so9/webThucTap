import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Company, CompanyStatus } from "../entities/company.entity";
import { CompanyMember, MemberRole, MemberStatus } from "../entities/company-member.entity";
import { CreateCompanyDto } from "../dto/create-company.dto";
import { UpdateCompanyDto } from "../dto/update-company.dto";

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(CompanyMember)
    private readonly memberRepo: Repository<CompanyMember>,
  ) {}

  async create(dto: CreateCompanyDto): Promise<Company> {
    const company = this.companyRepo.create(dto as Partial<Company>);
    return this.companyRepo.save(company);
  }

  /** Tạo công ty mới (HR tạo từ onboarding) – status=PENDING, thêm owner vào members */
  async createWithOwner(
    ownerId: number,
    dto: CreateCompanyDto,
  ): Promise<Company> {
    const company = this.companyRepo.create({
      ...(dto as Partial<Company>),
      ownerId,
      status: CompanyStatus.PENDING,
    });
    const saved = await this.companyRepo.save(company);

    // Tạo record member với role OWNER
    const member = this.memberRepo.create({
      userId: ownerId,
      companyId: saved.id,
      role: MemberRole.OWNER,
      status: MemberStatus.APPROVED,
    });
    await this.memberRepo.save(member);

    return saved;
  }

  /** Tìm công ty có lọc theo status (dành cho admin) */
  async findAllAdmin(
    page = 1,
    limit = 20,
    status?: string,
    name?: string,
  ) {
    const qb = this.companyRepo.createQueryBuilder("c");
    if (status) qb.andWhere("c.status = :status", { status });
    if (name) qb.andWhere("c.name ILIKE :name", { name: `%${name}%` });
    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy("c.id", "DESC")
      .getManyAndCount();
    return { data, total, page, limit };
  }

  async findAll(page = 1, limit = 20, name?: string) {
    const qb = this.companyRepo.createQueryBuilder("c")
      .where("c.status = :status", { status: CompanyStatus.APPROVED });
    if (name) {
      qb.andWhere("c.name ILIKE :name", { name: `%${name}%` });
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

  /** Admin duyệt công ty */
  async approveCompany(id: number): Promise<Company> {
    const company = await this.findOne(id);
    company.status = CompanyStatus.APPROVED;
    company.rejectReason = null;
    return this.companyRepo.save(company);
  }

  /** Admin từ chối công ty */
  async rejectCompany(id: number, reason?: string): Promise<Company> {
    const company = await this.findOne(id);
    company.status = CompanyStatus.REJECTED;
    company.rejectReason = reason?.trim() || null;
    return this.companyRepo.save(company);
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

  /** HR gửi yêu cầu join công ty */
  async joinRequest(userId: number, companyId: number): Promise<CompanyMember> {
    const company = await this.findOne(companyId);
    if (company.status !== CompanyStatus.APPROVED) {
      throw new RpcException({
        statusCode: 400,
        message: "Công ty chưa được xác thực, không thể gửi yêu cầu join",
      });
    }

    const existing = await this.memberRepo.findOne({
      where: { userId, companyId },
    });
    if (existing) {
      throw new RpcException({
        statusCode: 400,
        message: "Bạn đã gửi yêu cầu hoặc đã là thành viên của công ty này",
      });
    }

    const member = this.memberRepo.create({
      userId,
      companyId,
      role: MemberRole.MEMBER,
      status: MemberStatus.PENDING,
    });
    return this.memberRepo.save(member);
  }

  /** Lấy danh sách join requests của một công ty (cho owner/admin công ty) */
  async getJoinRequests(companyId: number) {
    return this.memberRepo.find({
      where: { companyId, status: MemberStatus.PENDING },
      order: { createdAt: "DESC" },
    });
  }

  /** Lấy thông tin công ty mà một user đang là thành viên */
  async getMemberCompany(userId: number) {
    const member = await this.memberRepo.findOne({
      where: { userId, status: MemberStatus.APPROVED },
    });
    if (!member) return null;
    return this.companyRepo.findOne({ where: { id: member.companyId } });
  }

  /** Owner/Admin công ty duyệt join request */
  async approveJoin(memberId: number): Promise<CompanyMember> {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member)
      throw new RpcException({ statusCode: 404, message: "Không tìm thấy yêu cầu" });
    member.status = MemberStatus.APPROVED;
    return this.memberRepo.save(member);
  }

  /** Owner/Admin công ty từ chối join request */
  async rejectJoin(memberId: number, reason?: string): Promise<CompanyMember> {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member)
      throw new RpcException({ statusCode: 404, message: "Không tìm thấy yêu cầu" });
    member.status = MemberStatus.REJECTED;
    member.rejectReason = reason?.trim() || null;
    return this.memberRepo.save(member);
  }

  /** Lấy danh sách thành viên đã được duyệt của công ty */
  async getCompanyMembers(companyId: number) {
    return this.memberRepo.find({
      where: { companyId, status: MemberStatus.APPROVED },
      order: { createdAt: "ASC" },
    });
  }
}

