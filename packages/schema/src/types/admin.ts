import type { PlaceCategory, PlaceStatus } from "./place";
import type { PlaceReportReason } from "./place-report";
import type { UserRole } from "./profile";

export type AdminReportStatus = "pending" | "reviewed" | "dismissed";

export interface AdminOverview {
  uptimeMs: number;
  totalQueries: number;
  avgLatencyMs: number;
  cacheHitRatio: number;
  byEndpoint: { route: string; count: number }[];
  venues: {
    total: number;
    published: number;
    unpublished: number;
    closed: number;
    withImages: number;
    withTags: number;
    withHours: number;
  };
  reports: {
    pending: number;
    reviewed: number;
    dismissed: number;
    total: number;
  };
  users: {
    total: number;
    active: number;
    banned: number;
    admins: number;
    moderators: number;
  };
  activity: {
    auditLogs24h: number;
    interactionEvents24h: number;
  };
}

export interface AdminReport {
  id: string;
  placeId: string;
  placeName: string;
  placePublished: boolean;
  placeStatus: PlaceStatus;
  reporterName: string;
  reporterHandle: string;
  reason: PlaceReportReason;
  detail: string | null;
  status: AdminReportStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPlace {
  id: string;
  name: string;
  address: string;
  district: string | null;
  category: PlaceCategory;
  priceLevel: 1 | 2 | 3;
  status: PlaceStatus;
  lat: number | null;
  lng: number | null;
  publishedAt: string | null;
  moderationStatus: string | null;
  moderationNote: string | null;
  moderatedAt: string | null;
  reviewCount: number;
  reportCount: number;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  handle: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  bannedAt: string | null;
  banReason: string | null;
  postCount: number;
  reviewCount: number;
  createdAt: string;
}

export interface AuditLogActor {
  id: string;
  name: string;
  handle: string;
  role: UserRole;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  meta: Record<string, unknown>;
  ip: string | null;
  createdAt: string;
  actor: AuditLogActor | null;
}
