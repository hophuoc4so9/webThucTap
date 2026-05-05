import { IsNumber, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

export class RecommendationQueryDto {
  /**
   * User ID to get recommendations for
   * At least one of userId or cvId must be provided
   */
  @IsOptional()
  @IsNumber()
  userId?: number;

  /**
   * CV ID to get recommendations for (alternative to userId)
   */
  @IsOptional()
  @IsNumber()
  cvId?: number;

  /**
   * Current job ID to get similar recommendations
   * If provided, system will find similar jobs
   */
  @IsOptional()
  @IsNumber()
  currentJobId?: number;

  @IsOptional()
  @IsNumber()
  topK?: number;

  @IsOptional()
  @IsNumber()
  minSimilarity?: number;

  @IsOptional()
  @Type(() => Object)
  weights?: {
    contentSim?: number;
    collaborative?: number;
    popularity?: number;
    companyBoost?: number;
  };
}

export class RecommendationResultDto {
  id: number;
  title: string;
  company: string;
  location: string;
  salary: string;
  salaryMin?: number;
  salaryMax?: number;
  description?: string;
  industry?: string;
  companyRating?: number;
  // Recommendation metadata
  score: number; // 0-1
  reason: string; // "similar_role", "trending", "matches_skills", etc.
  matchDetails?: {
    contentMatch?: number;
    collaborativeMatch?: number;
    popularityBoost?: number;
    companyReputation?: number;
  };
}

export class RecommendationResponseDto {
  data: RecommendationResultDto[];
  executionTimeMs?: number;
  explanation?: string;
}
