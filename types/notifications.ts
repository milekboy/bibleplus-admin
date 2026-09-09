export type NotificationRecord = {
  _id: string;
  id?: string;
  target?: string;
  audience?: string;
  userId?: string | { _id?: string; username?: string; firstName?: string; lastName?: string };
  recipient?: string | { _id?: string; username?: string; firstName?: string; lastName?: string };
  title?: string;
  message?: string;
  type?: string;
  channel?: string;
  status?: string;
  deliveryStatus?: string;
  pushDelivered?: boolean;
  recipientCount?: number;
  sentCount?: number;
  deliveredCount?: number;
  failedCount?: number;
  resendCount?: number;
  createdAt?: string;
  sentAt?: string;
  resentAt?: string;
  [key: string]: unknown;
};

export type NotificationPayload = { title: string; message: string; type: string };
export type DirectNotificationPayload = NotificationPayload & { userId: string };