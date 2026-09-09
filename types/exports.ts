export type ExportDataset = "users" | "prayers";
export type ExportPreview = { dataset: ExportDataset; rows: Record<string, unknown>[]; total?: number; columns?: string[]; scope?: string };