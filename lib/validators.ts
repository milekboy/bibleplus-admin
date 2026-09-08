export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export const isStrongPassword = (value: string) => value.length >= 8;
export const isRequiredText = (value: string) => Boolean(value.trim());
export const isValidDate = (value: string | Date) => !Number.isNaN(new Date(value).valueOf());
export function isValidUrl(value: string) { try { const url = new URL(value); return url.protocol === "http:" || url.protocol === "https:"; } catch { return false; } }
export const isAllowedFileType = (file: File, allowed: readonly string[]) => allowed.includes(file.type);
export const isAllowedFileSize = (file: File, maximumBytes: number) => file.size <= maximumBytes;
