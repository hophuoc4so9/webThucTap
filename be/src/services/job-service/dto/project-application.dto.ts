import { IsEnum, IsOptional, IsString } from "class-validator";
import { ApplicationStatus } from "../entities/project-application.entity";

export class ApplyProjectDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsString()
  studentName: string;

  @IsString()
  studentEmail: string;
}

export class UpdateApplicationStatusDto {
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}
