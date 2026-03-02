import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { CvModule } from "./modules/cv.module";

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    CvModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: ["amqp://rabbitmq:5672"],
        queue: "cv_queue",
        queueOptions: { durable: false },
      },
    },
  );
  await app.listen();
  console.log("CV-service is running on RabbitMQ queue: cv_queue");
}
bootstrap();
