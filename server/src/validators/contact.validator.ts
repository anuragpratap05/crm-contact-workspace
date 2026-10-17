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

export const contactIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid contact id'),
});
