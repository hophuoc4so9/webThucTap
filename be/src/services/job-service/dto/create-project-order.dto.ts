import { IsString, IsOptional, IsInt, Min } from "class-validator";

export class CreateProjectOrderDto {
  @IsInt()
  companyId: number;

  @IsString()
  companyName: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsOptional()
  @IsString()
  budget?: string;

  @IsOptional()
  @IsString()
  deadline?: string;

  /** JSON-serialized string[] */
  @IsOptional()
  @IsString()
  techStack?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxStudents?: number;
}
