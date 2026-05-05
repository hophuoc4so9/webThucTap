import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateJobDto {
  /** ID gốc từ crawl (bigint → string để tránh mất precision) */
  @IsOptional()
  @IsString()
  crawlId?: string;

  @IsOptional()
  @IsString()
  age?: string;

  @IsOptional()
  @IsString()
  benefit?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  deadline?: string;

  @IsOptional()
  @IsString()
  postedAt?: string;

  @IsOptional()
  @IsString()
  deadlineAt?: string;

  @IsOptional()
  @IsString()
  degree?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  experience?: string;

  @IsOptional()
  @IsString()
  field?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  otherInfo?: string;

  @IsOptional()
  @IsString()
  requirement?: string;

  @IsOptional()
  @IsString()
  salary?: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  src?: string;

  @IsOptional()
  @IsString()
  jobType?: string;

  @IsOptional()
  vacancies?: number;

  /** JSON string của mảng tags */
  @IsOptional()
  @IsString()
  tagsBenefit?: string;

  @IsOptional()
  @IsString()
  tagsRequirement?: string;

  /** JSON string của mảng province_ids */
  @IsOptional()
  @IsString()
  provinceIds?: string;

  @IsOptional()
  @IsString()
  salaryMax?: string;

  @IsOptional()
  @IsString()
  salaryMin?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  companyId?: number;
}
