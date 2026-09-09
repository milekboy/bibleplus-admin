export type ModerationKind = "prayers" | "comments";
export type ModerationStatus = "pending" | "flagged";

export type ModerationAuthor = {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  username?: string;
};

export type ModerationItem = {
  _id: string;
  id?: string;
  userId?: string | ModerationAuthor;
  user?: ModerationAuthor;
  author?: ModerationAuthor;
  title?: string;
  description?: string;
  content?: string;
  text?: string;
  message?: string;
  body?: string;
  status?: string;
  visibility?: string;
  resourceType?: string;
  type?: string;
  reason?: string;
  flagReason?: string;
  moderationReason?: string;
  flags?: unknown[];
  reports?: unknown[];
  createdAt?: string;
  submittedAt?: string;
  updatedAt?: string;
  prayCount?: number;
  isAnswered?: boolean;
  [key: string]: unknown;
};

export type ModerationQueueCounts = {
  pendingPrayers?: number;
  flaggedPrayers?: number;
  pendingComments?: number;
  flaggedComments?: number;
  total?: number;
};