export type AdminRole = "admin" | "superadmin";
export type SafeAdmin = { id?: string; username?: string; email?: string; role: AdminRole };
export type AdminSession = { user: SafeAdmin; expiresAt?: number };
export type LoginRequest = { email: string; password: string };
