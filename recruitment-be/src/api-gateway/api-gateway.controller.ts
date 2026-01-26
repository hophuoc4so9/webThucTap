import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Controller('gateway')
export class ApiGatewayController {
  constructor(
    @Inject('RABBITMQ_SERVICE') private readonly rabbitClient: ClientProxy,
    @Inject('GRPC_SERVICE') private readonly grpcClient: ClientProxy,
  ) {}

  @Get('ping')
  ping() {
    return { message: 'API Gateway is running' };
  }
}
