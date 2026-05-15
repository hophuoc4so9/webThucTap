import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { ProjectOrderStatus } from "../entities/project-order.entity";

export class UpdateProjectOrderDto {
  @IsOptional()
  @IsString()
  title?: string;

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

  @IsOptional()
  @IsString()
  techStack?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxStudents?: number;

  @IsOptional()
  @IsEnum(ProjectOrderStatus)
  status?: ProjectOrderStatus;
}
