import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  role?: string;

  /** Vị trí công tác (cho nhà tuyển dụng) */
  @IsOptional()
  @IsString()
  position?: string;

  /** Địa điểm làm việc (cho nhà tuyển dụng) */
  @IsOptional()
  @IsString()
  location?: string;
}
