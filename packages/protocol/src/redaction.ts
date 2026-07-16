const secretPatterns: Array<[RegExp, string]> = [
  [/\b(?:gh[opusr]|github_pat)_[A-Za-z0-9_]{20,}\b/g, "[REDACTED_GITHUB_TOKEN]"],
  [/\b(?:sk|rk)-[A-Za-z0-9_-]{20,}\b/g, "[REDACTED_API_KEY]"],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/gi, "Bearer [REDACTED_TOKEN]"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[REDACTED_PRIVATE_KEY]"],
  [/(["']?(?:token|secret|api[_-]?key|password)["']?\s*[:=]\s*["']?)[^\s,"'}]+/gi, "$1[REDACTED_SECRET]"]
];

const absolutePathPatterns: Array<[RegExp, string]> = [
  [/\b[A-Za-z]:\\(?:[^\s"'<>|]+\\)*[^\s"'<>|]*/g, "[REDACTED_WINDOWS_PATH]"],
  [/(^|[\s"'=])\/(?!\/)[A-Za-z0-9._~/-]+/g, "$1[REDACTED_UNIX_PATH]"]
];

export function redactForExport(input: string): string {
  let result = input;
  for (const [pattern, replacement] of secretPatterns) result = result.replace(pattern, replacement);
  for (const [pattern, replacement] of absolutePathPatterns) result = result.replace(pattern, replacement);
  return result;
}

export function redactArtifactForExport<T>(input: T): T {
  if (typeof input === "string") return redactForExport(input) as T;
  if (Array.isArray(input)) return input.map((item) => redactArtifactForExport(item)) as T;
  if (input && typeof input === "object") {
    return Object.fromEntries(
      Object.entries(input as Record<string, unknown>)
        .map(([key, value]) => [key, redactArtifactForExport(value)])
    ) as T;
  }
  return input;
}
