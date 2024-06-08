import { Module } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { GmailController } from './gmail.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/gmail.entity';
import { ConfigModule } from '@nestjs/config';
import { WebhookController } from 'src/webhook/webhook.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Message]), ConfigModule],
  controllers: [GmailController, WebhookController],
  providers: [GmailService],
})
export class GmailModule {}
