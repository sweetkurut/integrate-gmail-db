import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { MessageStatus } from '../enum/messageStatus';

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  messageId: string;

  @Column()
  snippet: string;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.UNREAD,
  })
  status: MessageStatus;
}
