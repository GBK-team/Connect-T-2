const UNSAFE_USER_MESSAGE = /(?:https?:\/\/|\/api\/|base url|request url|\bsql\b|\bstack\b|\bexception\b|failed with \d+|<!doctype|<html|api route not found|route not found|endpoint not found|cannot\s+(?:get|post|put|patch|delete)\b)/i;

export function safeUserMessage(value: unknown, fallback: string) {
  const message = String(value || "").trim();
  if (!message || message.length > 300 || UNSAFE_USER_MESSAGE.test(message)) return fallback;
  return message;
}
