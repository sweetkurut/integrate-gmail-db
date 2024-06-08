import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { GmailService } from 'src/gmail/gmail.service';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly gmailService: GmailService) {}

  @Post('gmail')
  async handleGmailWebhook(@Req() request: Request, @Res() response: Response) {
    const historyId = request.body.historyId;
    if (historyId) {
      await this.gmailService.processHistory(historyId);
    }
    response.status(200).send();
  }
}
