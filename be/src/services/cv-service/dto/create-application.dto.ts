import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateApplicationDto {
  @IsNumber()
  userId: number;

  @IsNumber()
  jobId: number;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsNumber()
  cvId?: number;

  @IsOptional()
  @IsString()
  coverLetter?: string;
}
