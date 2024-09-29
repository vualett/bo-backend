import { NotifyChannel } from './notifyChannel';

export interface Notify {
  body: string;
  service: string;
  userId: string;
  channel: NotifyChannel;
  to?: string;
}
