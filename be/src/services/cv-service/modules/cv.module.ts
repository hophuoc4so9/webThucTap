import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Cv } from "../entities/cv.entity";
import { Application } from "../entities/application.entity";
import { CvController } from "../controllers/cv.controller";
import { ApplicationController } from "../controllers/application.controller";
import { CvService } from "../services/cv.service";
import { ApplicationService } from "../services/application.service";
import { GemmaService } from "../services/gemma.service";
import { ResumeParseService } from "../services/resume-parse.service";
import { CacheService } from "../services/cache.service";

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
      synchronize: true, // chỉ dùng cho dev
      extra: { max: 5, idleTimeoutMillis: 30000 },
    }),
    TypeOrmModule.forFeature([Cv, Application]),
    ClientsModule.register([
      {
        name: "JOB_SERVICE",
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || "amqp://rabbitmq:5672"],
          queue: "job_queue",
          queueOptions: { durable: false },
        },
      },
    ]),
  ],
  controllers: [CvController, ApplicationController],
  providers: [CvService, ApplicationService, GemmaService, ResumeParseService, CacheService],
})
export class CvModule {}
