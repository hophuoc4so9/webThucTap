import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      message: 'Recruitment API is running',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('api/health')
  getApiHealth() {
    return {
      status: 'ok',
      service: 'recruitment-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
