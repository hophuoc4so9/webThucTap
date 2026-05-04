import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { AiSearchModule } from "./modules/ai-search.module";

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AiSearchModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: ["amqp://rabbitmq:5672"],
        queue: "ai_search_queue",
        queueOptions: { durable: false },
      },
    },
  );
  await app.listen();
  console.log("AI-Search-Service is running on RabbitMQ queue: ai_search_queue");
}
bootstrap();
