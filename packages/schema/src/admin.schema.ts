import { z } from "zod";
import { PLACE_REPORT_REASONS } from "./types/place-report";
import { userRoleSchema } from "./profile.schema";
import type {
  AdminOverview,
  AdminPlace,
  AdminReport,
  AdminReportStatus,
  AdminUser,
  AuditLogEntry,
} from "./types/admin";

const adminReportStatusSchema = z.enum([
  "pending",
  "reviewed",
  "dismissed",
]) satisfies z.ZodType<AdminReportStatus>;

const placeCategorySchema = z.enum([
  "cafe",
  "restaurant",
  "street-food",
  "bakery",
  "dessert",
  "bar",
]);

const placeStatusSchema = z.enum(["open", "closed", "unknown"]);

const adminRuntimeEnvSchema = z.enum([
  "development",
  "staging",
  "production",
]);

export const adminOverviewSchema = z.object({
  uptimeMs: z.number(),
  totalQueries: z.number(),
  avgLatencyMs: z.number(),
  cacheHitRatio: z.number(),
  byEndpoint: z.array(z.object({ route: z.string(), count: z.number() })),
  runtime: z.object({
    env: adminRuntimeEnvSchema,
    piiMasked: z.boolean(),
    redisConnected: z.boolean(),
    mailConfigured: z.boolean(),
    mediaStorage: z.enum(["r2", "local"]),
    demoAutoVerifyEmail: z.boolean(),
  }),
  venues: z.object({
    total: z.number(),
    published: z.number(),
    unpublished: z.number(),
    closed: z.number(),
    withImages: z.number(),
    withTags: z.number(),
    withHours: z.number(),
  }),
  reports: z.object({
    pending: z.number(),
    reviewed: z.number(),
    dismissed: z.number(),
    total: z.number(),
  }),
  users: z.object({
    total: z.number(),
    active: z.number(),
    banned: z.number(),
    admins: z.number(),
    moderators: z.number(),
  }),
  activity: z.object({
    auditLogs24h: z.number(),
    interactionEvents24h: z.number(),
  }),
  trends14d: z.array(
    z.object({
      date: z.string(),
      interactions: z.number(),
      reviews: z.number(),
      reports: z.number(),
      auditLogs: z.number(),
    }),
  ),
  venuesByCategory: z.array(
    z.object({
      category: placeCategorySchema,
      total: z.number(),
      published: z.number(),
    }),
  ),
  venuesByDistrict: z.array(
    z.object({
      district: z.string(),
      published: z.number(),
      unpublished: z.number(),
      closed: z.number(),
    }),
  ),
  reportsByReason: z.array(
    z.object({
      reason: z.enum(PLACE_REPORT_REASONS),
      pending: z.number(),
      total: z.number(),
    }),
  ),
}) satisfies z.ZodType<AdminOverview>;

export const adminReportSchema = z.object({
  id: z.string(),
  placeId: z.string(),
  placeName: z.string(),
  placePublished: z.boolean(),
  placeStatus: placeStatusSchema,
  reporterName: z.string(),
  reporterHandle: z.string(),
  reason: z.enum(PLACE_REPORT_REASONS),
  detail: z.string().nullable(),
  status: adminReportStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
}) satisfies z.ZodType<AdminReport>;

export const adminPlaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  district: z.string().nullable(),
  category: placeCategorySchema,
  priceLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  status: placeStatusSchema,
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  publishedAt: z.string().nullable(),
  moderationStatus: z.string().nullable(),
  moderationNote: z.string().nullable(),
  moderatedAt: z.string().nullable(),
  reviewCount: z.number(),
  reportCount: z.number(),
  createdAt: z.string(),
}) satisfies z.ZodType<AdminPlace>;

export const adminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  role: userRoleSchema,
  bannedAt: z.string().nullable(),
  banReason: z.string().nullable(),
  postCount: z.number(),
  reviewCount: z.number(),
  createdAt: z.string(),
}) satisfies z.ZodType<AdminUser>;

export const auditLogSchema = z.object({
  id: z.string(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string().nullable(),
  meta: z.record(z.string(), z.unknown()),
  ip: z.string().nullable(),
  createdAt: z.string(),
  actor: z
    .object({
      id: z.string(),
      name: z.string(),
      handle: z.string(),
      role: userRoleSchema,
    })
    .nullable(),
}) satisfies z.ZodType<AuditLogEntry>;

export const updateAdminReportInputSchema = z.object({
  status: z.enum(["reviewed", "dismissed"]),
  placeAction: z.enum(["none", "unpublish", "close"]).default("none"),
  moderationNote: z.string().trim().max(300).optional(),
});

export const updateAdminPlaceInputSchema = z
  .object({
    published: z.boolean().optional(),
    status: placeStatusSchema.optional(),
    name: z
      .string()
      .trim()
      .min(2, "Tên quán cần ít nhất 2 ký tự")
      .max(120)
      .optional(),
    address: z
      .string()
      .trim()
      .min(2, "Địa chỉ cần ít nhất 2 ký tự")
      .max(200)
      .optional(),
    district: z.string().trim().max(60).nullable().optional(),
    category: placeCategorySchema.optional(),
    priceLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),
    moderationNote: z.string().trim().max(300).nullable().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Cần ít nhất một trường cần cập nhật",
  });

export const updateAdminUserInputSchema = z
  .object({
    role: userRoleSchema.optional(),
    banned: z.boolean().optional(),
    banReason: z.string().trim().max(300).nullable().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Cần ít nhất một trường cần cập nhật",
  });

export type UpdateAdminReportInput = z.infer<
  typeof updateAdminReportInputSchema
>;
export type UpdateAdminPlaceInput = z.infer<typeof updateAdminPlaceInputSchema>;
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserInputSchema>;
