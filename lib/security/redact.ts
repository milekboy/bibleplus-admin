const SENSITIVE_KEY = /password|passcode|token|authorization|cookie|secret|otp|pin|credential|api[-_]?key|private[-_]?key|headers?/i;
const INLINE_SECRET = /(bearer\s+)[a-z0-9._~+/=-]+|((?:password|passcode|token|authorization|cookie|secret|otp|credential|api[-_]?key)\s*[:=]\s*)[^,;\s]+/gi;

export function redactSensitive(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[TRUNCATED]";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if ((trimmed.startsWith("{") || trimmed.startsWith("[")) && trimmed.length < 100_000) {
      try { return redactSensitive(JSON.parse(trimmed), depth + 1); } catch { /* keep sanitized text */ }
    }
    return value.replace(INLINE_SECRET, (match, bearer, prefix) => bearer ? `${bearer}[REDACTED]` : `${prefix}[REDACTED]`);
  }
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => redactSensitive(item, depth + 1));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, SENSITIVE_KEY.test(key) ? "[REDACTED]" : redactSensitive(child, depth + 1)]));
  return value;
}

export function safeJson(value: unknown) {
  try { return JSON.stringify(redactSensitive(value), null, 2); } catch { return "Metadata could not be displayed safely."; }
}