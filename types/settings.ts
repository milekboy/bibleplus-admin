export type SettingValue = string | number | boolean | null | Record<string, unknown> | unknown[];
export type SystemSetting = {
  _id?: string;
  id?: string;
  key: string;
  value: SettingValue;
  description?: string;
  type?: string;
  label?: string;
  category?: string;
  options?: Array<string | number | { value: string | number; label?: string }>;
  enum?: Array<string | number>;
  isSecret?: boolean;
  sensitive?: boolean;
  updatedAt?: string;
  [key: string]: unknown;
};
export type CreateSettingPayload = { key: string; value: SettingValue; description?: string };
export type PasswordChangePayload = { oldPassword: string; newPassword: string; otp: string };