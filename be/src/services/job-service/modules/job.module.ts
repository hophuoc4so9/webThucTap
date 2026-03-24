import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Company } from "../entities/company.entity";
import { Job } from "../entities/job.entity";
import { ProjectOrder } from "../entities/project-order.entity";
import { ProjectApplication } from "../entities/project-application.entity";
import { JobController } from "../controllers/job.controller";
import { CompanyController } from "../controllers/company.controller";
import { ProjectOrderController } from "../controllers/project-order.controller";
import { JobService } from "../services/job.service";
import { CompanyService } from "../services/company.service";
import { ProjectOrderService } from "../services/project-order.service";

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
      extra: { max: 5, idleTimeoutMillis: 30000 },
    }),
    TypeOrmModule.forFeature([Company, Job, ProjectOrder, ProjectApplication]),
  ],
  controllers: [JobController, CompanyController, ProjectOrderController],
  providers: [JobService, CompanyService, ProjectOrderService],
})
export class JobModule {}
