CREATE TYPE "user_role" AS ENUM ('user', 'moderator', 'admin');

ALTER TABLE "users"
ADD COLUMN "role" "user_role" NOT NULL DEFAULT 'user',
ADD COLUMN "banned_at" TIMESTAMP(3),
ADD COLUMN "ban_reason" TEXT;

CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_created_at_id_idx" ON "audit_logs"("created_at" DESC, "id" DESC);
CREATE INDEX "audit_logs_entity_created_at_idx" ON "audit_logs"("entity", "created_at" DESC);
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at" DESC);

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey"
FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
