# API Gateway

- main.ts: Entry point for API Gateway
- api-gateway.module.ts: Main module, configures microservice clients (RabbitMQ, gRPC)
- api-gateway.controller.ts: Example controller

Bạn có thể mở rộng thêm các route, forward request đến các service qua RabbitMQ/gRPC tại đây.