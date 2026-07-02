import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('audit-entries')
  getAuditEntries() {
    return this.appService.getAuditEntries();
  }

  @Get('audit-entries/verify')
  verifyAuditEntries() {
    return this.appService.verifyAuditChain();
  }

  @Post('audit-entries')
  createAuditEntry(@Body() body: Record<string, unknown>) {
    return this.appService.recordAuditEntry({
      eventType: typeof body.eventType === 'string' ? body.eventType : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      hash: typeof body.hash === 'string' ? body.hash : undefined,
      timestamp: typeof body.timestamp === 'string' ? body.timestamp : undefined,
    });
  }
}
