export type AuditLog = {
  _id: string;
  id?: string;
  adminId?: string;
  adminUsername?: string;
  admin?: { _id?: string; username?: string; name?: string; firstName?: string; lastName?: string };
  action?: string;
  resource?: string;
  resourceType?: string;
  resourceId?: string;
  outcome?: string;
  status?: string;
  success?: boolean;
  details?: unknown;
  metadata?: unknown;
  createdAt?: string;
  timestamp?: string;
  [key: string]: unknown;
};

export type AuditFilterOption = { value: string; label: string };
export type AuditFilters = { actions: AuditFilterOption[]; resources: AuditFilterOption[]; admins: AuditFilterOption[] };
export type AuditQuery = { page: number; limit: number; action?: string; resource?: string; admin?: string; search?: string };
export type ExportFormat = "csv" | "excel";