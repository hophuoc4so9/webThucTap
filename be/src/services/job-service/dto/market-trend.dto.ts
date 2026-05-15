import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";

export class MarketTrendQueryDto {
  @IsOptional()
  @IsString()
  major?: string;

  @IsOptional()
  @IsString()
  majorGroup?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  days?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  horizon?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limitClusters?: number;

  @IsOptional()
  @IsBoolean()
  includeForecast?: boolean;
}
