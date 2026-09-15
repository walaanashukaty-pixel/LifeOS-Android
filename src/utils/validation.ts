export function textValidation(value: unknown, label: string, maxLength: number, required = true): string | null {
  const text = String(value ?? '').trim();
  if (required && !text) return `أدخل ${label}`;
  if (text.length > maxLength) return `${label} طويل جدًا. الحد الأقصى ${maxLength} حرفًا.`;
  return null;
}

export function numberValidation(
  value: unknown,
  label: string,
  options: { min?: number; max?: number; integer?: boolean } = {},
): string | null {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return `أدخل ${label} بشكل صحيح`;
  if (options.integer && !Number.isInteger(number)) return `${label} يجب أن يكون رقمًا صحيحًا`;
  if (options.min !== undefined && number < options.min) return `${label} يجب ألا يقل عن ${options.min}`;
  if (options.max !== undefined && number > options.max) return `${label} يجب ألا يزيد عن ${options.max}`;
  return null;
}

export function dateOrderValidation(start: string | undefined, end: string | undefined, message: string): string | null {
  if (!start || !end) return null;
  return end < start ? message : null;
}

export function firstValidation(...errors: Array<string | null | undefined>): string | null {
  return errors.find(Boolean) || null;
}
