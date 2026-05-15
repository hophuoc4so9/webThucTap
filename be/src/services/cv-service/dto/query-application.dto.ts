import { IsOptional, IsString, IsNumber, IsIn } from "class-validator";
import { Type } from "class-transformer";

export class QueryApplicationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  jobId?: number;

  @IsOptional()
  @IsIn(["pending", "reviewing", "accepted", "rejected"])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
