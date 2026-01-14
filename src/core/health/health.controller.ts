import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      environments: process.env.NODE_ENV,
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
