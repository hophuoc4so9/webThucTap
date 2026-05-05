import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { ApiGatewayController } from "./api-gateway.controller";
import { AuthController } from "./controller/auth.controller";
import { JobController } from "./controller/job.controller";
import { CompanyController } from "./controller/company.controller";
import { CvGatewayController } from "./controller/cv.controller";
import { ApplicationGatewayController } from "./controller/application.controller";
import { UserController } from "./controller/user.controller";
import { ProjectOrderGatewayController } from "./controller/project-order.controller";
import { UploadsController } from "./controller/uploads.controller";
import { AiTaskController } from "./controller/ai-task.controller";
import { MarketTrendGatewayController } from "./controller/market-trend.controller";
import { ClientsModule, Transport } from "@nestjs/microservices";

@Module({
  imports: [
    
    MulterModule.register({ dest: "/uploads" }),
    ClientsModule.register([
      {
        name: "AUTH_SERVICE",
        transport: Transport.RMQ,
        options: {
          urls: ["amqp://rabbitmq:5672"],
          queue: "auth_queue",
          queueOptions: { durable: false },
        },
      },
      {
        name: "JOB_SERVICE",
        transport: Transport.RMQ,
        options: {
          urls: ["amqp://rabbitmq:5672"],
          queue: "job_queue",
          queueOptions: { durable: false },
        },
      },
      {
        name: "CV_SERVICE",
        transport: Transport.RMQ,
        options: {
          urls: ["amqp://rabbitmq:5672"],
          queue: "cv_queue",
          queueOptions: { durable: false },
        },
      },
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
  controllers: [
    ApiGatewayController,
    AuthController,
    JobController,
    CompanyController,
    CvGatewayController,
    ApplicationGatewayController,
    UserController,
    ProjectOrderGatewayController,
    UploadsController,
    AiTaskController,
    MarketTrendGatewayController,
  ],
})
export class ApiGatewayModule {}
