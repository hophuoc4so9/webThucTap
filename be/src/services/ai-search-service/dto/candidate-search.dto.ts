import { IsString, IsNumber, IsOptional, IsArray } from "class-validator";
import { Type } from "class-transformer";

export class CandidateSearchQueryDto {
  @IsOptional()
  @IsString()
  query?: string; // Search by keyword/requirement

  @IsOptional()
  @IsNumber()
  jobId?: number; // Search by correlation with a specific job

  @IsOptional()
  @IsString()
  major?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @Type(() => Object)
  weights?: {
    semanticSim?: number;
    skillMatch?: number;
    tdmuBonus?: number;
    aiScoreWeight?: number;
  };
}

export class CandidateSearchResultDto {
  id: number;
  fullName: string;
  title: string;
  major: string;
  skills: string;
  isTdmuVerified: boolean;
  aiScore: number;
  similarityScore?: number;
  combinedScore?: number;
  matchReason?: string;
}

export class CandidateSearchResponseDto {
  data: CandidateSearchResultDto[];
  total: number;
  page: number;
  limit: number;
  executionTimeMs?: number;
}
