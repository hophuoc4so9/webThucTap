import {
  ClientProxyFactory,
  Transport,
  ClientProxy,
} from "@nestjs/microservices";

export const authServiceClient: ClientProxy = ClientProxyFactory.create({
  transport: Transport.RMQ,
  options: {
    urls: ["amqp://rabbitmq:5672"], // Dùng 'rabbitmq' khi chạy trong Docker Compose
    queue: "auth_queue",
    queueOptions: { durable: false },
  },
});
