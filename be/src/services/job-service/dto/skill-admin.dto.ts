import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";
import type { SkillTermStatus, SkillTermType } from "../entities/skill-term.entity";

// ─── Query DTOs ─────────────────────────────────────────────────────────────

export class SkillCandidateQueryDto {
  @IsOptional()
  @IsString()
  majorGroup?: string;

  @IsOptional()
  @IsString()
  major?: string;

  @IsOptional()
  @IsString()
  status?: SkillTermStatus;

  @IsOptional()
  @IsString()
  type?: SkillTermType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minFrequency?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: "frequency" | "confidenceAvg" | "createdAt" | "canonicalName";

  @IsOptional()
  @IsString()
  sortOrder?: "ASC" | "DESC";
}

// ─── Action DTOs ────────────────────────────────────────────────────────────

export class ApproveSkillDto {
  @IsOptional()
  @IsString()
  canonicalName?: string;

  @IsOptional()
  @IsString()
  type?: SkillTermType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  major?: string;

  @IsOptional()
  @IsString()
  majorGroup?: string;
}

export class MergeAliasDto {
  /** ID của SkillTerm chính (canonical) để merge vào */
  @IsInt()
  @Type(() => Number)
  targetSkillId: number;
}

export class SetCategoryDto {
  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  type?: SkillTermType;
}

export class BulkActionDto {
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  ids: number[];

  @IsString()
  action: "approve" | "reject" | "mark_stopword" | "merge_cluster";

  @IsOptional()
  @IsString()
  targetName?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  type?: SkillTermType;

  @IsOptional()
  @IsString()
  major?: string;

  @IsOptional()
  @IsString()
  majorGroup?: string;

  @IsOptional()
  @IsString()
  stopwordScope?: "global" | "majorGroup" | "major";

  @IsOptional()
  @IsString()
  stopwordContext?: string;
}

// ─── Mark Stopword DTO (with scope support) ────────────────────────────────

export class MarkStopwordDto {
  /** Phạm vi: "global" | "majorGroup" | "major" */
  @IsOptional()
  @IsString()
  scope?: "global" | "majorGroup" | "major";

  /**
   * Giá trị context tương ứng với scope:
   * - scope="global" → không cần
   * - scope="majorGroup" → tên nhóm (e.g., "Công nghệ - Kỹ thuật")
   * - scope="major" → tên ngành (e.g., "Công nghệ thông tin")
   */
  @IsOptional()
  @IsString()
  scopeContext?: string;
}

// ─── Skill Cluster DTOs ──────────────────────────────────────────────────────

export class CreateSkillClusterDto {
  @IsString()
  clusterName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  scope?: "global" | "majorGroup" | "major";

  @IsOptional()
  @IsString()
  scopeContext?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  skillTermIds?: number[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skillNames?: string[];
}

export class RenameSkillClusterDto {
  @IsString()
  clusterName: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class MoveSkillToStopwordDto {
  @IsString()
  scope: "global" | "majorGroup" | "major";

  @IsOptional()
  @IsString()
  scopeContext?: string;
}

export class RenameSkillTermDto {
  @IsString()
  canonicalName: string;

  @IsOptional()
  @IsString()
  type?: SkillTermType;

  @IsOptional()
  @IsString()
  category?: string;
}
