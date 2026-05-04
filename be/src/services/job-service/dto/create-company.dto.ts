import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateCompanyDto {
  @IsOptional()
  @IsString()
  logo?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  currentJobOpening?: number;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  website?: string;

  /** JSON string hoặc plain text */
  @IsOptional()
  @IsString()
  socialMedia?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  banner?: string;

  @IsOptional()
  @IsString()
  shortAddress?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  followers?: number;

  /** JSON string chứa mảng URL ảnh */
  @IsOptional()
  @IsString()
  aboutImages?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  companyEmail?: string;

  @IsOptional()
  @IsInt()
  ownerId?: number;

  /** URL file giấy phép kinh doanh (upload trước, lưu URL) */
  @IsOptional()
  @IsString()
  businessLicense?: string;
}
