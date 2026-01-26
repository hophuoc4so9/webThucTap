import { NestFactory } from '@nestjs/core';
import { AuthModule } from './modules/auth.module';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);
  await app.listen(3002);
}
bootstrap();
