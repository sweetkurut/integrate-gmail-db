import { Module } from '@nestjs/common';
import { SessionModule } from 'nestjs-session';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GmailModule } from './gmail/gmail.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './gmail/entities/gmail.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { config } from 'dotenv';
import { AuthModule } from './auth/auth.module';
import { AuthController } from './auth/auth.controller';

config();

@Module({
  imports: [
    GmailModule,
    AuthModule,
    SessionModule.forRoot({
      session: { secret: 'secret' },
    }),

    ConfigModule.forRoot({
      envFilePath: `.${process.env.NODE_ENV}.env`,
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        password: configService.get('DB_PASSWORD'),
        username: configService.get('DB_USERNAME'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Message]),
    AuthModule,
  ],
  controllers: [AppController, AuthController],
  providers: [AppService],
})
export class AppModule {}
