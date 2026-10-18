export function normalizeText(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function normalizeEmail(value?: string | null): string | undefined {
  return normalizeText(value)?.toLowerCase();
}

export function normalizeLower(value?: string | null): string | undefined {
  return normalizeText(value)?.toLowerCase();
}

export function digitsOnly(value?: string | null): string | undefined {
  const digits = value?.replace(/\D/g, '');
  return digits ? digits : undefined;
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeTag(value: string): string {
  return value.trim();
}
