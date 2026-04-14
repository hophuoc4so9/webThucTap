import { IsOptional, IsString, IsUrl, MinLength } from "class-validator";

export class RecruiterRequestDto {
  @IsString()
  @MinLength(2)
  companyName: string;

  @IsOptional()
  @IsUrl()
  companyWebsite?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
