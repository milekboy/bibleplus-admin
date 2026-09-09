import { apiRequest } from "@/lib/api/client";
import type { ApiResult } from "@/types/api";
import type { BlogCategory, BlogCounts, BlogPayload, BlogRecord, BlogStatus } from "@/types/blogs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function arrayFrom<T>(value: unknown, keys: string[]): T[] {
  if (Array.isArray(value)) return value as T[];
  if (isRecord(value)) {
    for (const key of keys) if (Array.isArray(value[key])) return value[key] as T[];
  }
  return [];
}

function recordFrom<T>(value: unknown, keys: string[]): T {
  if (isRecord(value)) {
    for (const key of keys) if (isRecord(value[key])) return value[key] as T;
  }
  return value as T;
}

function finiteNumber(value: unknown) {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : undefined;
}

function countsFrom(value: unknown): BlogCounts | undefined {
  if (!isRecord(value)) return undefined;
  const source = isRecord(value.stats) ? value.stats : isRecord(value.counts) ? value.counts : value;
  const total = finiteNumber(source.total ?? source.totalBlogs ?? source.count);
  const draft = finiteNumber(source.draft ?? source.drafts ?? source.draftCount);
  const published = finiteNumber(source.published ?? source.publishedCount);
  return total !== undefined || draft !== undefined || published !== undefined ? { total, draft, published } : undefined;
}

export type BlogListResult = ApiResult<BlogRecord[]> & { counts?: BlogCounts };

export const blogsApi = {
  async list({ status, page, limit, signal }: { status: BlogStatus; page: number; limit: number; signal?: AbortSignal }): Promise<BlogListResult> {
    const params = new URLSearchParams({ status, page: String(page), limit: String(limit) });
    const result = await apiRequest<unknown>(`/admin/blogs?${params}`, { signal });
    return { ...result, data: arrayFrom<BlogRecord>(result.data, ["blogs", "posts", "results"]), counts: countsFrom(result.data) };
  },
  async get(id: string) {
    const result = await apiRequest<unknown>(`/admin/blogs/${encodeURIComponent(id)}`);
    return { ...result, data: recordFrom<BlogRecord>(result.data, ["blog", "post"]) };
  },
  async create(payload: BlogPayload) {
    const result = await apiRequest<unknown>("/admin/blogs", { method: "POST", data: payload });
    return { ...result, data: recordFrom<BlogRecord>(result.data, ["blog", "post"]) };
  },
  async update(id: string, payload: BlogPayload) {
    const result = await apiRequest<unknown>(`/admin/blogs/${encodeURIComponent(id)}`, { method: "PUT", data: payload });
    return { ...result, data: recordFrom<BlogRecord>(result.data, ["blog", "post"]) };
  },
  publish: (id: string) => apiRequest<unknown>(`/admin/blogs/${encodeURIComponent(id)}/publish`, { method: "PUT" }),
  remove: (id: string) => apiRequest<void>(`/admin/blogs/${encodeURIComponent(id)}`, { method: "DELETE" }),
  uploadImage: (data: FormData, onUploadProgress?: (event: { loaded: number; total?: number }) => void) => apiRequest<unknown>("/admin/blogs/upload-image", { method: "POST", data, onUploadProgress }),
  refresh: () => apiRequest<unknown>("/admin/blogs/refresh", { method: "POST" }),
  async createCategory(payload: { name: string; description?: string }) {
    const result = await apiRequest<unknown>("/admin/blog-categories", { method: "POST", data: payload });
    return { ...result, data: recordFrom<BlogCategory>(result.data, ["category"]) };
  },
  async updateCategory(id: string, payload: { name: string; description?: string }) {
    const result = await apiRequest<unknown>(`/admin/blog-categories/${encodeURIComponent(id)}`, { method: "PUT", data: payload });
    return { ...result, data: recordFrom<BlogCategory>(result.data, ["category"]) };
  },
  deleteCategory: (id: string) => apiRequest<void>(`/admin/blog-categories/${encodeURIComponent(id)}`, { method: "DELETE" }),
  deleteComment: (commentId: string) => apiRequest<void>(`/admin/blogs/comments/${encodeURIComponent(commentId)}`, { method: "DELETE" }),
};