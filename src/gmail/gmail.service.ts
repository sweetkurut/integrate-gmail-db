import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/gmail.entity';
import { ConfigService } from '@nestjs/config';
import { MessageStatus } from './enum/messageStatus';

@Injectable()
export class GmailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GmailService.name);
  private oauth2Client: OAuth2Client;
  private intervalId: NodeJS.Timeout;

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly configService: ConfigService,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_REDIRECT_URI'),
    );

    const accessToken = this.configService.get<string>('GOOGLE_ACCESS_TOKEN');
    const refreshToken = this.configService.get<string>('GOOGLE_REFRESH_TOKEN');

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  onModuleInit() {
    // Устанавливаем интервал для периодического вызова getMessages
    const interval = 1 * 60 * 1000; // 5 минут
    this.intervalId = setInterval(() => this.getMessages(), interval);
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  async setupWatch() {
    try {
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      await gmail.users.watch({
        userId: 'me',
        requestBody: {
          labelIds: ['INBOX'],
          topicName: 'projects/nest-db-message/topics/massage',
        },
      });
      this.logger.log('Watch setup complete.');
    } catch (error) {
      this.logger.error(`Error setting up watch: ${error.message}`);
      throw error;
    }
  }

  async processHistory(historyId: string) {
    try {
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      const historyResponse = await gmail.users.history.list({
        userId: 'me',
        startHistoryId: historyId,
      });

      const histories = historyResponse.data.history || [];

      for (const history of histories) {
        if (history.messagesAdded) {
          for (const message of history.messagesAdded) {
            const msg = await gmail.users.messages.get({
              userId: 'me',
              id: message.message.id,
            });

            const newMessage = new Message();
            newMessage.messageId = message.message.id;
            newMessage.snippet = msg.data.snippet;
            newMessage.status = msg.data.labelIds?.includes('UNREAD')
              ? MessageStatus.UNREAD
              : MessageStatus.READ;
            await this.messageRepository.save(newMessage);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error processing history: ${error.message}`);
      throw error;
    }
  }

  async getMessages() {
    try {
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      // Получаем все сообщения из базы данных
      const allDbMessages = await this.messageRepository.find();
      const dbMessageMap = new Map(
        allDbMessages.map((msg) => [msg.messageId, msg]),
      );

      // Получаем непрочитанные сообщения из Gmail
      const unreadRes = await gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
      });

      const unreadMessages = unreadRes.data.messages || [];

      // Обновляем или добавляем непрочитанные сообщения
      for (const message of unreadMessages) {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
        });
        this.logger.log(`Message snippet: ${msg.data.snippet}`);

        if (dbMessageMap.has(message.id)) {
          const existingMessage = dbMessageMap.get(message.id);
          existingMessage.status = MessageStatus.UNREAD;
          existingMessage.snippet = msg.data.snippet;
          await this.messageRepository.save(existingMessage);
          dbMessageMap.delete(message.id);
        } else {
          const newMessage = new Message();
          newMessage.messageId = message.id;
          newMessage.snippet = msg.data.snippet;
          newMessage.status = MessageStatus.UNREAD;
          await this.messageRepository.save(newMessage);
        }
      }

      // Проверяем оставшиеся сообщения в базе данных, которые не были обновлены
      for (const [messageId, dbMessage] of dbMessageMap) {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: messageId,
        });

        const isUnread = msg.data.labelIds?.includes('UNREAD');
        // Проверка на статус, если статус READ, то удаляется из базы данных
        if (!isUnread) {
          await this.messageRepository.remove(dbMessage);
        }
      }
    } catch (error) {
      this.logger.error(`Error fetching messages: ${error.message}`);
      throw error;
    }
  }
}
