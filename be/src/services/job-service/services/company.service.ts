import { Injectable, Inject } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Company, CompanyStatus, VerificationMethod } from "../entities/company.entity";
import { CompanyMember, MemberRole, MemberStatus } from "../entities/company-member.entity";
import { Notification, NotificationType } from "../entities/notification.entity";
import { CreateCompanyDto } from "../dto/create-company.dto";
import { UpdateCompanyDto } from "../dto/update-company.dto";

import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { normalizeString } from "./utils";

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(CompanyMember)
    private readonly memberRepo: Repository<CompanyMember>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @Inject("AUTH_SERVICE") private readonly authClient: ClientProxy,
    @Inject("OCR_SERVICE") private readonly ocrClient: ClientProxy,
  ) {}

  async create(dto: CreateCompanyDto): Promise<Company> {
    const company = this.companyRepo.create(dto as Partial<Company>);
    const saved = await this.companyRepo.save(company);
    await this.createAdminNotification(
      NotificationType.COMPANY_REGISTERED,
      `Yêu cầu đăng ký công ty mới: ${saved.name}`,
      `Công ty ${saved.name} vừa đăng ký trên hệ thống.`,
      { companyId: saved.id }
    );
    return saved;
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

    // Trigger OCR process automatically
    if (saved.businessLicense) {
      this.ocrClient.emit("company_ocr_request", {
        companyId: saved.id,
        licensePath: saved.businessLicense,
      });
      console.log(`[OCR] Emitted ocr request for company #${saved.id}`);
    }

    await this.createAdminNotification(
      NotificationType.COMPANY_REGISTERED,
      `Yêu cầu đăng ký công ty mới: ${saved.name}`,
      `Công ty ${saved.name} vừa đăng ký từ onboarding. Đang chờ OCR xử lý.`,
      { companyId: saved.id }
    );

    return saved;
  }

  /** Xử lý kết quả trả về từ OCR worker */
  async handleOcrResult(payload: {
    companyId: number;
    taxCode: string;
    ocrData: string;
    success: boolean;
  }) {
    console.log(`[OCR] Received result for company #${payload.companyId}:`, payload);
    const company = await this.companyRepo.findOne({ where: { id: payload.companyId } });
    if (!company) return;

    company.taxCode = payload.taxCode;
    company.ocrData = payload.ocrData;
    company.verificationMethod = VerificationMethod.AUTO;

    // Trích xuất thêm các trường structured
    try {
      const ocr = JSON.parse(payload.ocrData);
      const info = ocr.info || ocr;
      company.charterCapital = info.charter_capital;
      company.representativeName = info.representative;
      company.licenseAddress = info.address;
    } catch (e) {}

    if (payload.success && payload.taxCode) {
      // Tiếp tục xác thực qua API VietQR
      await this.verifyWithVietQR(company, payload.taxCode);
    } else {
      await this.companyRepo.save(company);
      await this.createAdminNotification(
        NotificationType.SYSTEM,
        `OCR thất bại: ${company.name}`,
        `Không thể trích xuất mã số thuế cho công ty ${company.name}.`,
        { companyId: company.id }
      );
    }
  }

  private async verifyWithVietQR(company: Company, taxCode: string) {
    try {
      console.log(`[VietQR] Verifying tax code ${taxCode} for company #${company.id}`);
      const response = await fetch(`https://api.vietqr.io/v2/business/${taxCode}`);
      const result = await response.json();

      company.apiData = JSON.stringify(result);

      if (result.code === "00" && result.data) {
        // Thành công - Tự động duyệt nếu khớp thông tin
        company.isAutoVerified = true;
        
        // Kiểm tra khớp tên (Fuzzy Match)
        const apiName = normalizeString(result.data.name);
        const companyName = normalizeString(company.name);
        
        let ocrName = "";
        try {
          const ocr = JSON.parse(company.ocrData);
          ocrName = normalizeString(ocr.info?.name_vn || ocr.name_vn || "");
        } catch (e) {}

        // Nếu tên nhập vào HOẶC tên OCR khớp với API (chứa nhau)
        const isNameMatch = 
          (apiName.includes(companyName) || companyName.includes(apiName)) ||
          (ocrName && (apiName.includes(ocrName) || ocrName.includes(apiName)));

        if (isNameMatch) {
          console.log(`[Auto-Verify] Name matched! Auto-approving company #${company.id}`);
          company.status = CompanyStatus.APPROVED;
          
          await this.createAdminNotification(
            NotificationType.COMPANY_AUTO_APPROVED,
            `Công ty tự động phê duyệt: ${company.name}`,
            `Hệ thống đã khớp mã số thuế ${taxCode} và tên doanh nghiệp. Công ty hiện đã ở trạng thái Đã duyệt.`,
            { companyId: company.id, autoApproved: true }
          );

          // Nếu auto approve, thực hiện các bước như approve manual
          if (company.ownerId) {
            await this.handlePostApproval(company);
          }
        } else {
          console.log(`[Auto-Verify] Name mismatch for company #${company.id}. API: ${apiName}, Company: ${companyName}, OCR: ${ocrName}`);
          await this.createAdminNotification(
            NotificationType.SYSTEM,
            `Xác thực khớp mã số thuế nhưng sai lệch tên: ${company.name}`,
            `Mã số thuế ${taxCode} hợp lệ nhưng tên đăng ký không hoàn toàn trùng khớp với API.`,
            { companyId: company.id, apiData: result.data }
          );
        }
      } else {
        console.warn(`[VietQR] Verification failed for company #${company.id}:`, result.desc);
      }
    } catch (err) {
      console.error(`[VietQR] Error calling API:`, err);
    } finally {
      await this.companyRepo.save(company);
    }
  }

  private async handlePostApproval(saved: Company) {
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
      console.error("Lỗi khi hậu phê duyệt công ty:", err);
    }
  }

  private async createAdminNotification(
    type: NotificationType,
    title: string,
    content: string,
    metadata?: any
  ) {
    const notification = this.notificationRepo.create({
      type,
      title,
      content,
      metadata,
      userId: null, // Broadcast to admins
    });
    await this.notificationRepo.save(notification);
    // TODO: Emit socket event for real-time chuông thông báo
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
    const requests = await this.memberRepo.find({
      where: { companyId, status: MemberStatus.PENDING },
      order: { createdAt: "DESC" },
    });

    // Lấy thêm thông tin user từ auth-service
    const userIds = requests.map((r) => r.userId);
    if (userIds.length === 0) return [];

    try {
      const users = await firstValueFrom(
        this.authClient.send("users_get_by_ids", { ids: userIds })
      );
      const userMap = new Map(users.map((u: any) => [u.id, u]));

      return requests.map((r) => ({
        ...r,
        user: userMap.get(r.userId),
      }));
    } catch (err) {
      console.error("Lỗi khi lấy thông tin user cho join requests:", err);
      return requests;
    }
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
    const members = await this.memberRepo.find({
      where: { companyId, status: MemberStatus.APPROVED },
      order: { createdAt: "ASC" },
    });

    // Lấy thêm thông tin user từ auth-service
    const userIds = members.map((m) => m.userId);
    if (userIds.length === 0) return [];

    try {
      const users = await firstValueFrom(
        this.authClient.send("users_get_by_ids", { ids: userIds })
      );
      const userMap = new Map(users.map((u: any) => [u.id, u]));

      return members.map((m) => ({
        ...m,
        user: userMap.get(m.userId),
      }));
    } catch (err) {
      console.error("Lỗi khi lấy thông tin user cho company members:", err);
      return members;
    }
  }

  /** Cập nhật role cho thành viên */
  async updateMemberRole(memberId: number, role: MemberRole): Promise<CompanyMember> {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member)
      throw new RpcException({ statusCode: 404, message: "Không tìm thấy thành viên" });
    
    if (member.role === MemberRole.OWNER) {
      throw new RpcException({ statusCode: 400, message: "Không thể thay đổi quyền của chủ sở hữu theo cách này. Hãy dùng chức năng chuyển quyền sở hữu." });
    }

    member.role = role;
    return this.memberRepo.save(member);
  }

  /** Xoá thành viên khỏi công ty (đuổi việc) */
  async removeMember(memberId: number): Promise<{ message: string }> {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member)
      throw new RpcException({ statusCode: 404, message: "Không tìm thấy thành viên" });
    
    if (member.role === MemberRole.OWNER) {
      throw new RpcException({ statusCode: 400, message: "Không thể xoá chủ sở hữu khỏi công ty." });
    }

    await this.memberRepo.remove(member);
    return { message: "Đã xoá thành viên khỏi công ty" };
  }

  /** Chuyển quyền sở hữu công ty */
  async transferOwnership(companyId: number, newOwnerMemberId: number): Promise<{ message: string }> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company)
      throw new RpcException({ statusCode: 404, message: "Không tìm thấy công ty" });

    const newOwnerMember = await this.memberRepo.findOne({ 
      where: { id: newOwnerMemberId, companyId, status: MemberStatus.APPROVED } 
    });
    if (!newOwnerMember)
      throw new RpcException({ statusCode: 404, message: "Không tìm thấy thành viên mới trong công ty này" });

    // Tìm owner hiện tại
    const currentOwnerMember = await this.memberRepo.findOne({
      where: { companyId, role: MemberRole.OWNER }
    });

    if (currentOwnerMember) {
      currentOwnerMember.role = MemberRole.ADMIN; // Hạ xuống làm Admin
      await this.memberRepo.save(currentOwnerMember);
    }

    // Cập nhật member mới thành Owner
    newOwnerMember.role = MemberRole.OWNER;
    await this.memberRepo.save(newOwnerMember);

    // Cập nhật ownerId trong bảng Company
    company.ownerId = newOwnerMember.userId;
    await this.companyRepo.save(company);

    return { message: "Đã chuyển quyền sở hữu thành công" };
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

  async getNotifications(userId?: number) {
    return this.notificationRepo.find({
      where: userId ? { userId } : { userId: null },
      order: { createdAt: "DESC" },
      take: 20,
    });
  }

  async markNotificationRead(id: number) {
    await this.notificationRepo.update(id, { isRead: true });
    return { success: true };
  }

  async markAllNotificationsRead(userId?: number) {
    await this.notificationRepo.update(
      userId ? { userId, isRead: false } : { userId: null, isRead: false },
      { isRead: true }
    );
    return { success: true };
  }
}
