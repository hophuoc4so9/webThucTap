import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { Company } from "../entities/company.entity";
import { CompanyMember } from "../entities/company-member.entity";
import { Job } from "../entities/job.entity";
import { ProjectOrder } from "../entities/project-order.entity";
import { ProjectApplication } from "../entities/project-application.entity";
import { UserJobInteraction } from "../entities/user-job-interaction.entity";
import { JobEmbeddingQueue } from "../entities/job-embedding-queue.entity";
import { MarketTrendCache } from "../entities/market-trend-cache.entity";
import { JobController } from "../controllers/job.controller";
import { MarketTrendController } from "../controllers/market-trend.controller";
import { CompanyController } from "../controllers/company.controller";
import { ProjectOrderController } from "../controllers/project-order.controller";
import { JobService } from "../services/job.service";
import { MarketTrendService } from "../services/market-trend.service";
import { CompanyService } from "../services/company.service";
import { ProjectOrderService } from "../services/project-order.service";
import { InteractionTrackingService } from "../services/interaction-tracking.service";
import { SkillExtractionService } from "../services/skill-extraction.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
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
    TypeOrmModule.forFeature([
      Company,
      CompanyMember,
      Job,
      ProjectOrder,
      ProjectApplication,
      UserJobInteraction,
      JobEmbeddingQueue,
      MarketTrendCache,
    ]),
    ClientsModule.register([
      {
        name: "AI_SEARCH_SERVICE",
        transport: Transport.RMQ,
        options: {
          urls: ["amqp://rabbitmq:5672"],
          queue: "ai_search_queue",
          queueOptions: { durable: false },
        },
      },
    ]),
  ],
  controllers: [JobController, MarketTrendController, CompanyController, ProjectOrderController],
  providers: [
    JobService,
    MarketTrendService,
    CompanyService,
    ProjectOrderService,
    InteractionTrackingService,
    SkillExtractionService,
  ],
  exports: [InteractionTrackingService],
})
export class JobModule {}
