import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { JobModule } from "./modules/job.module";

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    JobModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: ["amqp://rabbitmq:5672"],
        queue: "job_queue",
        queueOptions: { durable: false },
      },
    },
  );
  await app.listen();
  console.log("Job-service is running on RabbitMQ queue: job_queue");
}
bootstrap();
