import { IsString, IsNumber, IsOptional, IsArray, IsEnum } from "class-validator";
import { Type } from "class-transformer";

export class SearchQueryDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsNumber()
  salaryMin?: number;

  @IsOptional()
  @IsNumber()
  salaryMax?: number;

  @IsOptional()
  @IsString()
  src?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  topK?: number;

  @IsOptional()
  @IsNumber()
  similarityThreshold?: number;

  @IsOptional()
  @Type(() => Object)
  weights?: {
    contentSim?: number;
    collaborative?: number;
    popularity?: number;
    companyBoost?: number;
  };
}

export class AdvancedSearchResultDto {
  id: number;
  title: string;
  company: string;
  location: string;
  salary: string;
  salaryMin?: number;
  salaryMax?: number;
  description?: string;
  industry?: string;
  // Recommendation metadata
  similarityScore?: number;
  combinedScore?: number;
  reason?: string; // "content_match", "collaborative", "trending", etc.
}

export class AdvancedSearchResponseDto {
  data: AdvancedSearchResultDto[];
  total: number;
  page: number;
  limit: number;
  executionTimeMs?: number;
}
