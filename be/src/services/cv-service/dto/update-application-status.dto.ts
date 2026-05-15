import { IsIn, IsOptional, IsString } from "class-validator";

export class UpdateApplicationStatusDto {
  @IsIn(["pending", "reviewing", "accepted", "rejected"])
  status: string;

  @IsOptional()
  @IsString()
  note?: string;
}
