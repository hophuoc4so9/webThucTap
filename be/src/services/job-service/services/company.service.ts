import { Injectable, Inject } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Company, CompanyStatus } from "../entities/company.entity";
import { CompanyMember, MemberRole, MemberStatus } from "../entities/company-member.entity";
import { CreateCompanyDto } from "../dto/create-company.dto";
import { UpdateCompanyDto } from "../dto/update-company.dto";

import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(CompanyMember)
    private readonly memberRepo: Repository<CompanyMember>,
    @Inject("AUTH_SERVICE") private readonly authClient: ClientProxy,
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
    sortByJobs?: "ASC" | "DESC",
  ) {
    const qb = this.companyRepo.createQueryBuilder("c")
      .leftJoin("c.jobs", "job")
      .select("c")
      .addSelect("COUNT(job.id)", "jobCount")
      .groupBy("c.id");

    if (status) qb.andWhere("c.status = :status", { status });
    if (name) qb.andWhere("c.name ILIKE :name", { name: `%${name}%` });

    if (sortByJobs) {
      qb.orderBy("COUNT(job.id)", sortByJobs);
    } else {
      qb.orderBy("c.id", "DESC");
    }

    const total = await this.companyRepo.createQueryBuilder("c")
      .where(status ? "c.status = :status" : "1=1", { status })
      .andWhere(name ? "c.name ILIKE :name" : "1=1", { name: `%${name}%` })
      .getCount();

    const rawAndEntities = await qb
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawAndEntities();

    const data = rawAndEntities.entities.map((entity, index) => ({
      ...entity,
      jobCount: parseInt(rawAndEntities.raw[index].jobCount, 10),
    }));

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

  async findFeatured(limit = 8) {
    const limitNum = Number(limit) > 0 ? Math.min(Number(limit), 16) : 8;
    const rawAndEntities = await this.companyRepo.createQueryBuilder("c")
      .leftJoin("c.jobs", "job")
      .where("c.status = :status", { status: CompanyStatus.APPROVED })
      .select("c")
      .addSelect("COUNT(job.id)", "jobCount")
      .groupBy("c.id")
      .orderBy("c.reputationScore", "DESC")
      .addOrderBy("COUNT(job.id)", "DESC")
      .addOrderBy("c.followers", "DESC")
      .addOrderBy("c.id", "DESC")
      .limit(limitNum)
      .getRawAndEntities();

    const data = rawAndEntities.entities.map((entity, index) => ({
      ...entity,
      jobCount: parseInt(rawAndEntities.raw[index].jobCount, 10),
      currentJobOpening:
        entity.currentJobOpening || parseInt(rawAndEntities.raw[index].jobCount, 10),
    }));

    return { data, total: data.length, page: 1, limit: limitNum };
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
    const saved = await this.companyRepo.save(company);

    // Gửi email thông báo và cập nhật role user
    if (saved.ownerId) {
      try {
        // Cập nhật role sang "company"
        await firstValueFrom(
          this.authClient.send("user_update_role", {
            id: saved.ownerId,
            role: "company",
          }),
        );

        // Gửi email
        await firstValueFrom(
          this.authClient.send("auth_send_company_approved_email", {
            userId: saved.ownerId,
            companyName: saved.name,
          }),
        );
      } catch (err) {
        console.error("Lỗi khi cập nhật role/gửi email duyệt công ty:", err);
      }
    }

    return saved;
  }

  /** Admin từ chối công ty */
  async rejectCompany(id: number, reason?: string): Promise<Company> {
    const company = await this.findOne(id);
    company.status = CompanyStatus.REJECTED;
    company.rejectReason = reason?.trim() || null;
    const saved = await this.companyRepo.save(company);

    // Gửi email thông báo
    if (saved.ownerId) {
      try {
        await firstValueFrom(
          this.authClient.send("auth_send_company_rejected_email", {
            userId: saved.ownerId,
            companyName: saved.name,
            reason: saved.rejectReason,
          }),
        );
      } catch (err) {
        console.error("Lỗi khi gửi email từ chối công ty:", err);
      }
    }

    return saved;
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

  /** Lấy trạng thái onboarding của user (đã tạo/đã join chưa) */
  async getOnboardingStatus(userId: number) {
    // 1. Ưu tiên kiểm tra xem user đã là thành viên APPROVED của công ty nào chưa
    const approvedMember = await this.memberRepo.findOne({
      where: { userId, status: MemberStatus.APPROVED },
      relations: ["company"],
    });

    if (approvedMember) {
      return {
        type: approvedMember.role === MemberRole.OWNER ? "create" : "join",
        status: "approved",
        company: {
          id: approvedMember.companyId,
          name: approvedMember.company?.name,
          logo: approvedMember.company?.logo,
        },
      };
    }

    // 2. Kiểm tra xem user có đang sở hữu công ty nào PENDING/REJECTED không
    const company = await this.companyRepo.findOne({
      where: [
        { ownerId: userId, status: CompanyStatus.PENDING },
        { ownerId: userId, status: CompanyStatus.REJECTED },
      ],
      order: { id: "DESC" },
    });

    if (company) {
      return {
        type: "create",
        status: company.status,
        company: { id: company.id, name: company.name, logo: company.logo },
        reason: company.rejectReason,
      };
    }

    // 3. Kiểm tra xem user có đang yêu cầu tham gia công ty nào không
    const member = await this.memberRepo.findOne({
      where: [
        { userId, status: MemberStatus.PENDING },
        { userId, status: MemberStatus.REJECTED },
      ],
      order: { id: "DESC" },
    });

    if (member) {
      const target = await this.companyRepo.findOne({
        where: { id: member.companyId },
      });
      return {
        type: member.role === MemberRole.OWNER ? "create" : "join",
        status: member.status,
        company: target
          ? { id: target.id, name: target.name, logo: target.logo }
          : null,
        reason: member.rejectReason,
      };
    }

    return null;
  }
}

