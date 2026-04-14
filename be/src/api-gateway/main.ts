import { NestFactory } from "@nestjs/core";
import { ApiGatewayModule } from "./api-gateway.module";
import * as express from "express";

async function bootstrap() {
  // Tắt built-in body parser để tuỳ chỉnh giới hạn kích thước
  const app = await NestFactory.create(ApiGatewayModule, { bodyParser: false });
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // File CV được phục vụ qua UploadsController GET /uploads/:filename
  await app.listen(8082);
  console.log("API Gateway running on port 8082");
}
bootstrap();
