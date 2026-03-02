import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Company } from "../entities/company.entity";
import { Job } from "../entities/job.entity";
import { JobController } from "../controllers/job.controller";
import { CompanyController } from "../controllers/company.controller";
import { JobService } from "../services/job.service";
import { CompanyService } from "../services/company.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      autoLoadEntities: true,
      synchronize: true, // chỉ dùng cho dev!
    }),
    TypeOrmModule.forFeature([Company, Job]),
  ],
  controllers: [JobController, CompanyController],
  providers: [JobService, CompanyService],
})
export class JobModule {}
