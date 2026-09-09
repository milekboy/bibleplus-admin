import { apiRequest } from "@/lib/api/client";
import type { ApiResult } from "@/types/api";
import type { DailyPoolInfo, QuizCounts, QuizMeta, QuizQuestion, QuizQuestionPayload } from "@/types/quiz";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function arrayFrom<T>(value: unknown, keys: string[]): T[] {
  if (Array.isArray(value)) return value as T[];
  if (isRecord(value)) for (const key of keys) if (Array.isArray(value[key])) return value[key] as T[];
  return [];
}

function recordFrom<T>(value: unknown, keys: string[]): T {
  if (isRecord(value)) for (const key of keys) if (isRecord(value[key])) return value[key] as T;
  return value as T;
}

function numberValue(value: unknown) {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : undefined;
}

function countsFrom(value: unknown): QuizCounts | undefined {
  if (!isRecord(value)) return undefined;
  const active = numberValue(value.active);
  const inactive = numberValue(value.inactive);
  const total = numberValue(value.total ?? value.count);
  return active !== undefined || inactive !== undefined || total !== undefined ? { active, inactive, total } : undefined;
}

export type QuizListResult = ApiResult<QuizQuestion[]> & { counts?: QuizCounts };

export const quizApi = {
  async list({ page, limit }: { page: number; limit: number }): Promise<QuizListResult> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    const result = await apiRequest<unknown>("/admin/quiz?" + params);
    return { ...result, data: arrayFrom<QuizQuestion>(result.data, ["questions", "items", "results"]), counts: countsFrom(result.metadata?.counts) };
  },
  async meta(): Promise<QuizMeta> {
    const result = await apiRequest<unknown>("/admin/quiz/meta");
    const data = recordFrom<Partial<QuizMeta>>(result.data, ["meta"]);
    return {
      levels: Array.isArray(data?.levels) ? data.levels.map(Number).filter(Number.isFinite) : [],
      difficulties: Array.isArray(data?.difficulties) ? data.difficulties.filter((item): item is string => typeof item === "string") : [],
    };
  },
  async get(id: string) {
    const result = await apiRequest<unknown>("/admin/quiz/" + encodeURIComponent(id));
    return { ...result, data: recordFrom<QuizQuestion>(result.data, ["question", "quiz"]) };
  },
  create: (payload: QuizQuestionPayload) => apiRequest<QuizQuestion>("/admin/quiz/add", { method: "POST", data: payload }),
  createBulk: (payload: QuizQuestionPayload[]) => apiRequest<unknown>("/admin/quiz/bulk", { method: "POST", data: payload }),
  update: (id: string, payload: QuizQuestionPayload) => apiRequest<QuizQuestion>("/admin/quiz/" + encodeURIComponent(id), { method: "PUT", data: payload }),
  activate: (id: string) => apiRequest<QuizQuestion>("/admin/quiz/activate/" + encodeURIComponent(id), { method: "PUT" }),
  deactivate: (id: string) => apiRequest<QuizQuestion>("/admin/quiz/deactivate/" + encodeURIComponent(id), { method: "PUT" }),
  remove: (id: string) => apiRequest<void>("/admin/quiz/" + encodeURIComponent(id), { method: "DELETE" }),
  removeBulk: (ids: string[]) => apiRequest<unknown>("/admin/quiz/bulk", { method: "DELETE", data: { ids } }),
  async poolInfo() {
    const result = await apiRequest<unknown>("/admin/quiz/daily/pool/info");
    return { ...result, data: recordFrom<DailyPoolInfo>(result.data, ["pool", "info"]) };
  },
  addToPool: (questionIds: string[]) => apiRequest<unknown>("/admin/quiz/daily/pool/add", { method: "POST", data: { questionIds } }),
  setDaily: (date: string, questionIds: string[]) => apiRequest<unknown>("/admin/quiz/daily/set", { method: "POST", data: { date, questionIds } }),
};