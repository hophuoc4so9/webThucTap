import { NestFactory } from "@nestjs/core";
import { ApiGatewayModule } from "./api-gateway.module";
import * as express from "express";

async function bootstrap() {
  // Tắt built-in body parser để tuỳ chỉnh giới hạn kích thước
  const app = await NestFactory.create(ApiGatewayModule, { bodyParser: false });
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));
  app.use((_req, res, next) => {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });
    next();
  });
  // File CV được phục vụ qua UploadsController GET /uploads/:filename
  await app.listen(8082);
  console.log("API Gateway running on port 8082");
}
bootstrap();
