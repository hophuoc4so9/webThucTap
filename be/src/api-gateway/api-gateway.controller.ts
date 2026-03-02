import { Controller, Get } from "@nestjs/common";

@Controller("gateway")
export class ApiGatewayController {
  @Get("ping")
  ping() {
    return {
      message: "API Gateway is running",
      timestamp: new Date().toISOString(),
    };
  }
}
