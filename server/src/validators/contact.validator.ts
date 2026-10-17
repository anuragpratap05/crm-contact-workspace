import { z } from 'zod';

const toArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return value.split(',');
  return [];
};

export const listContactsQuerySchema = z
  .object({
    search: z.string().trim().min(1).max(100).optional(),
    tags: z
      .unknown()
      .optional()
      .transform((value) =>
        value === undefined
          ? undefined
          : toArray(value)
              .map((tag) => tag.trim())
              .filter(Boolean),
      ),
    tagMatch: z.enum(['any', 'all']).default('any'),
    company: z.string().trim().min(1).max(120).optional(),
    createdFrom: z.coerce.date().optional(),
    createdTo: z.coerce.date().optional(),
    sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine(
    (value) =>
      !value.createdFrom || !value.createdTo || value.createdFrom <= value.createdTo,
    { message: 'createdFrom must be before createdTo', path: ['createdFrom'] },
  );

export type ListContactsQuery = z.infer<typeof listContactsQuerySchema>;

const optionalText = (max: number) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => {
      const trimmed = typeof value === 'string' ? value.trim() : '';
      return trimmed ? trimmed : null;
    })
    .refine((value) => value === null || value.length <= max, {
      message: `Must be at most ${max} characters`,
    });

export const updateContactBodySchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  email: optionalText(254).refine(
    (value) => value === null || z.string().email().safeParse(value).success,
    { message: 'Must be a valid email address' },
  ),
  phone: optionalText(40),
  company: optionalText(120),
  version: z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') return undefined;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    },
    z
      .number({
        required_error: 'Version is required to detect conflicting updates',
        invalid_type_error: 'Version must be a number',
      })
      .int()
      .min(0),
  ),
});

export type UpdateContactBody = z.infer<typeof updateContactBodySchema>;

export const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ActivityQuery = z.infer<typeof activityQuerySchema>;

export const contactIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid contact id'),
});
