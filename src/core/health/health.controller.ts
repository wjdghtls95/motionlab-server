import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
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
