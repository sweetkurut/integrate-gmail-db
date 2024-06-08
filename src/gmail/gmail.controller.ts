import { Controller, Get } from '@nestjs/common';
import { GmailService } from './gmail.service';

@Controller('gmail')
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  @Get('messages')
  async getMessages() {
    return this.gmailService.getMessages();
  }
}
