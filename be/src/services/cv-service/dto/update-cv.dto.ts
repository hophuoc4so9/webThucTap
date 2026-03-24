import { IsOptional, IsString, IsBoolean } from "class-validator";

export class UpdateCvDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  jobPosition?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  linkedIn?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  skills?: string;

  @IsOptional()
  @IsString()
  education?: string;

  @IsOptional()
  @IsString()
  experience?: string;

  @IsOptional()
  @IsString()
  projectExperience?: string;

  @IsOptional()
  @IsString()
  filePath?: string;

  @IsOptional()
  @IsString()
  fileOriginalName?: string;

  @IsOptional()
  @IsString()
  fileMimeType?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
