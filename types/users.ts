export type UserRecord = {
  _id: string;
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  role?: string;
  verified?: boolean;
  isDeleted?: boolean;
  isActive?: boolean;
  status?: string;
  deactivatedAt?: string | null;
  avatar?: string;
  avatarUrl?: string;
  profilePicture?: string;
  bio?: string;
  location?: string;
  notificationSettings?: { push?: boolean; email?: boolean };
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  prayerCount?: number;
  commentCount?: number;
  eventsAttended?: number;
};

export type UserStats = {
  total?: number;
  verified?: number;
  unverified?: number;
  active?: number;
  inactive?: number;
  deleted?: number;
  [key: string]: unknown;
};

export type AdminAccount = {
  _id: string;
  id?: string;
  username: string;
  email?: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminAccountPayload = {
  username: string;
  email: string;
  password: string;
  role: string;
};