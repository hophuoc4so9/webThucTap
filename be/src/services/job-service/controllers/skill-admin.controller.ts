import { Controller, Get, Patch, Post, Param, Body, Query, ParseIntPipe } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { SkillAdminService } from "../services/skill-admin.service";
import { SkillMigrationService } from "../services/skill-migration.service";
import {
  SkillCandidateQueryDto,
  ApproveSkillDto,
  MergeAliasDto,
  SetCategoryDto,
  BulkActionDto,
  MarkStopwordDto,
  CreateSkillClusterDto,
  RenameSkillClusterDto,
  MoveSkillToStopwordDto,
  RenameSkillTermDto,
} from "../dto/skill-admin.dto";

/**
 * SkillAdminController — API quản trị kỹ năng (human-in-the-loop).
 *
 * Endpoints:
 *  GET  /admin/skill-candidates                           — danh sách candidates (filter, paginate)
 *  GET  /admin/skill-candidates/clusters                  — gom cụm pending candidates
 *  PATCH /admin/skill-terms/:id/approve                   — duyệt skill
 *  PATCH /admin/skill-terms/:id/mark-stopword             — đánh dấu noise (với scope optional)
 *  PATCH /admin/skill-terms/:id/reject                    — từ chối
 *  PATCH /admin/skill-terms/:id/merge-alias               — gộp vào skill khác
 *  PATCH /admin/skill-terms/:id/category                  — đổi category
 *  PATCH /admin/skill-terms/:id/move-to-stopword          — di chuyển sang stopword với scope
 *  PATCH /admin/skill-terms/:id/rename                    — đổi tên skill term
 *  POST  /admin/skill-clusters                            — tạo named cluster
 *  GET   /admin/skill-clusters                            — lấy clusters by scope
 *  PATCH /admin/skill-clusters/:id/rename                 — đặt tên cluster
 *  PATCH /admin/skill-clusters/:id/merge/:targetId        — gộp clusters
 *  POST  /admin/skill-terms/bulk-action                   — thao tác hàng loạt
 *  POST  /admin/skill-migration/re-extract                — re-extract toàn bộ jobs
 *
 * Đồng thời expose qua RabbitMQ MessagePattern cho API Gateway.
 */
@Controller("admin")
export class SkillAdminController {
  constructor(
    private readonly adminService: SkillAdminService,
    private readonly migrationService: SkillMigrationService,
  ) {}

  // ─── REST Endpoints ─────────────────────────────────────────────────

  @Get("skill-candidates")
  getCandidates(@Query() query: SkillCandidateQueryDto) {
    return this.adminService.getSkillCandidates(query);
  }

  @Get("skill-candidates/clusters")
  getClusters(
    @Query("majorGroup") majorGroup?: string,
    @Query("major") major?: string,
    @Query("minFrequency") minFrequency?: string,
  ) {
    return this.adminService.getSkillClusters({
      majorGroup,
      major,
      minFrequency: minFrequency ? parseInt(minFrequency, 10) : undefined,
    });
  }

  @Patch("skill-terms/:id/approve")
  approveSkill(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ApproveSkillDto,
  ) {
    return this.adminService.approveSkill(id, dto);
  }

  @Patch("skill-terms/:id/mark-stopword")
  markStopword(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto?: MarkStopwordDto,
  ) {
    return this.adminService.markStopword(id, undefined, dto);
  }

  @Patch("skill-terms/:id/reject")
  rejectSkill(@Param("id", ParseIntPipe) id: number) {
    return this.adminService.rejectSkill(id);
  }

  @Patch("skill-terms/:id/merge-alias")
  mergeAlias(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: MergeAliasDto,
  ) {
    return this.adminService.mergeAlias(id, dto);
  }

  @Patch("skill-terms/:id/move-to-stopword")
  moveSkillToStopword(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: MoveSkillToStopwordDto,
  ) {
    return this.adminService.moveSkillToStopword(id, dto);
  }

  @Patch("skill-terms/:id/rename")
  renameSkillTerm(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: RenameSkillTermDto,
  ) {
    return this.adminService.renameSkillTerm(id, dto);
  }

  @Patch("skill-terms/:id/category")
  setCategory(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: SetCategoryDto,
  ) {
    return this.adminService.setCategory(id, dto);
  }

  @Post("skill-terms/bulk-action")
  bulkAction(@Body() dto: BulkActionDto) {
    return this.adminService.bulkAction(dto);
  }

  // ─── Skill Cluster Management ──────────────────────────────────────

  @Post("skill-clusters")
  createCluster(@Body() dto: CreateSkillClusterDto) {
    return this.adminService.createCluster(dto);
  }

  @Get("skill-clusters")
  getClustersByScope(
    @Query("scope") scope?: string,
    @Query("scopeContext") scopeContext?: string,
    @Query("majorGroup") majorGroup?: string,
    @Query("major") major?: string,
  ) {
    return this.adminService.getClustersByScope(scope as any, scopeContext, majorGroup, major);
  }

  @Patch("skill-clusters/:id/rename")
  renameCluster(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: RenameSkillClusterDto,
  ) {
    return this.adminService.renameCluster(id, dto);
  }

  @Patch("skill-clusters/:id/merge/:targetId")
  mergeCluster(
    @Param("id", ParseIntPipe) id: number,
    @Param("targetId", ParseIntPipe) targetId: number,
  ) {
    return this.adminService.mergeCluster(id, targetId);
  }

  @Post("skill-migration/re-extract")
  reExtract(
    @Body() body: { batchSize?: number; fromId?: number; majorGroup?: string; dryRun?: boolean },
  ) {
    return this.migrationService.reExtractAll(body);
  }

  // ─── RabbitMQ MessagePatterns (for API Gateway) ─────────────────────

  @MessagePattern("skill_admin_get_candidates")
  msgGetCandidates(@Payload() query: SkillCandidateQueryDto) {
    return this.adminService.getSkillCandidates(query);
  }

  @MessagePattern("skill_admin_get_clusters")
  msgGetClusters(@Payload() filters: { majorGroup?: string; major?: string; minFrequency?: number }) {
    return this.adminService.getSkillClusters(filters);
  }

  @MessagePattern("skill_admin_approve")
  msgApprove(@Payload() data: { id: number; dto: ApproveSkillDto; adminId?: number }) {
    return this.adminService.approveSkill(data.id, data.dto, data.adminId);
  }

  @MessagePattern("skill_admin_stopword")
  msgStopword(@Payload() data: { id: number; adminId?: number; dto?: MarkStopwordDto }) {
    return this.adminService.markStopword(data.id, data.adminId, data.dto);
  }

  @MessagePattern("skill_admin_reject")
  msgReject(@Payload() data: { id: number; adminId?: number }) {
    return this.adminService.rejectSkill(data.id, data.adminId);
  }

  @MessagePattern("skill_admin_merge_alias")
  msgMergeAlias(@Payload() data: { id: number; dto: MergeAliasDto; adminId?: number }) {
    return this.adminService.mergeAlias(data.id, data.dto, data.adminId);
  }

  @MessagePattern("skill_admin_bulk_action")
  msgBulkAction(@Payload() data: { dto: BulkActionDto; adminId?: number }) {
    return this.adminService.bulkAction(data.dto, data.adminId);
  }

  // ─── Skill Cluster MessagePatterns ─────────────────────────────────

  @MessagePattern("skill_admin_create_cluster")
  msgCreateCluster(@Payload() data: { dto: CreateSkillClusterDto; adminId?: number }) {
    return this.adminService.createCluster(data.dto, data.adminId);
  }

  @MessagePattern("skill_admin_get_clusters_by_scope")
  msgGetClustersByScope(@Payload() filters: { scope?: string; scopeContext?: string; majorGroup?: string; major?: string }) {
    return this.adminService.getClustersByScope(filters.scope as any, filters.scopeContext, filters.majorGroup, filters.major);
  }

  @MessagePattern("skill_admin_rename_cluster")
  msgRenameCluster(@Payload() data: { id: number; dto: RenameSkillClusterDto; adminId?: number }) {
    return this.adminService.renameCluster(data.id, data.dto, data.adminId);
  }

  @MessagePattern("skill_admin_merge_cluster")
  msgMergeCluster(@Payload() data: { sourceId: number; targetId: number; adminId?: number }) {
    return this.adminService.mergeCluster(data.sourceId, data.targetId, data.adminId);
  }

  @MessagePattern("skill_admin_move_to_stopword")
  msgMoveSkillToStopword(@Payload() data: { id: number; dto: MoveSkillToStopwordDto; adminId?: number }) {
    return this.adminService.moveSkillToStopword(data.id, data.dto, data.adminId);
  }

  @MessagePattern("skill_admin_rename_term")
  msgRenameSkillTerm(@Payload() data: { id: number; dto: RenameSkillTermDto; adminId?: number }) {
    return this.adminService.renameSkillTerm(data.id, data.dto, data.adminId);
  }

  @MessagePattern("skill_admin_re_extract")
  msgReExtract(@Payload() data: { batchSize?: number; fromId?: number; majorGroup?: string; dryRun?: boolean }) {
    return this.migrationService.reExtractAll(data);
  }
}
