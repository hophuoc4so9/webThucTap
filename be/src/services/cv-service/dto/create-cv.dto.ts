import { IsOptional, IsString, IsBoolean, IsNumber } from "class-validator";

export class CreateCvDto {
  @IsNumber()
  userId: number;

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
  projects?: string;

  @IsOptional()
  @IsString()
  certifications?: string;

  @IsOptional()
  @IsString()
  languages?: string;

  @IsOptional()
  @IsString()
  major?: string;

  @IsOptional()
  @IsString()
  majorGroup?: string;

  @IsOptional()
  @IsString()
  majorCode?: string;

  @IsOptional()
  @IsString()
  socialLinks?: string;

  /** Đường dẫn file (điền bởi API Gateway sau khi upload) */
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

  /** 'form' | 'file' — mặc định 'form' nếu không gửi */
  @IsOptional()
  @IsString()
  source?: "form" | "file";
}
