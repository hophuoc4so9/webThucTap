import { NestFactory } from "@nestjs/core";
import { ApiGatewayModule } from "./api-gateway/api-gateway.module";

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule);
  app.enableCors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  });
  await app.listen(8080);
  console.log("API Gateway running on http://localhost:8080");
}
bootstrap();
