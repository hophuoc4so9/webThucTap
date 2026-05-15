import { Controller, Get, Patch, Post, Param, Body, Query, Inject, HttpException, ParseIntPipe } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";

@Controller("admin")
export class AdminSkillGatewayController {
  constructor(
    @Inject("JOB_SERVICE") private readonly jobClient: ClientProxy,
  ) {}

  // ─── Skill Candidates ────────────────────────────────────────────────

  @Get("skill-candidates")
  async getCandidates(@Query() query: any) {
    try {
      return await firstValueFrom(this.jobClient.send("skill_admin_get_candidates", query));
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } = err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  @Get("skill-candidates/clusters")
  async getClusters(@Query() query: any) {
    try {
      return await firstValueFrom(this.jobClient.send("skill_admin_get_clusters", {
        majorGroup: query.majorGroup,
        major: query.major,
        minFrequency: query.minFrequency ? parseInt(query.minFrequency, 10) : undefined,
      }));
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } = err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  // ─── Skill Terms Actions ─────────────────────────────────────────────

  @Patch("skill-terms/:id/approve")
  async approveSkill(@Param("id", ParseIntPipe) id: number, @Body() dto: any) {
    try {
      return await firstValueFrom(this.jobClient.send("skill_admin_approve", { id, dto }));
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } = err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  @Patch("skill-terms/:id/mark-stopword")
  async markStopword(@Param("id", ParseIntPipe) id: number, @Body() dto?: any) {
    try {
      return await firstValueFrom(this.jobClient.send("skill_admin_stopword", { id, dto }));
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } = err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  @Patch("skill-terms/:id/reject")
  async rejectSkill(@Param("id", ParseIntPipe) id: number) {
    try {
      return await firstValueFrom(this.jobClient.send("skill_admin_reject", { id }));
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } = err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  @Patch("skill-terms/:id/merge-alias")
  async mergeAlias(@Param("id", ParseIntPipe) id: number, @Body() dto: any) {
    try {
      return await firstValueFrom(this.jobClient.send("skill_admin_merge_alias", { id, dto }));
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } = err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  @Patch("skill-terms/:id/rename")
  async renameSkillTerm(@Param("id", ParseIntPipe) id: number, @Body() dto: any) {
    try {
      return await firstValueFrom(this.jobClient.send("skill_admin_rename_term", { id, dto }));
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } = err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  @Post("skill-terms/bulk-action")
  async bulkAction(@Body() dto: any) {
    try {
      return await firstValueFrom(this.jobClient.send("skill_admin_bulk_action", { dto }));
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } = err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  // ─── Skill Clusters ──────────────────────────────────────────────────

  @Post("skill-clusters")
  async createCluster(@Body() dto: any) {
    try {
      return await firstValueFrom(this.jobClient.send("skill_admin_create_cluster", { dto }));
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } = err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  @Get("skill-clusters")
  async getClusterssByScope(@Query() query: any) {
    try {
      return await firstValueFrom(this.jobClient.send("skill_admin_get_clusters_by_scope", {
        scope: query.scope,
        scopeContext: query.scopeContext,
        majorGroup: query.majorGroup,
        major: query.major,
      }));
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } = err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  @Patch("skill-clusters/:id/rename")
  async renameCluster(@Param("id", ParseIntPipe) id: number, @Body() dto: any) {
    try {
      return await firstValueFrom(this.jobClient.send("skill_admin_rename_cluster", { id, dto }));
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } = err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  @Patch("skill-clusters/:id/merge/:targetId")
  async mergeCluster(
    @Param("id", ParseIntPipe) id: number,
    @Param("targetId", ParseIntPipe) targetId: number,
  ) {
    try {
      return await firstValueFrom(
        this.jobClient.send("skill_admin_merge_cluster", { sourceCluserId: id, targetCluserId: targetId }),
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } = err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  @Patch("skill-terms/:id/move-to-stopword")
  async moveSkillToStopword(@Param("id", ParseIntPipe) id: number, @Body() dto: any) {
    try {
      return await firstValueFrom(this.jobClient.send("skill_admin_move_to_stopword", { skillTermId: id, dto }));
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } = err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  // ─── Migration ───────────────────────────────────────────────────────

  @Post("skill-migration/re-extract")
  async reExtract(@Body() body: any) {
    try {
      return await firstValueFrom(this.jobClient.send("skill_admin_re_extract", body));
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } = err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }
}
