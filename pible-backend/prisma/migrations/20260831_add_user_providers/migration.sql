-- CreateTable
CREATE TABLE "user_providers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_providers_provider_provider_account_id_key" ON "user_providers"("provider", "provider_account_id");

-- CreateIndex
CREATE INDEX "user_providers_user_id_idx" ON "user_providers"("user_id");

-- AddForeignKey
ALTER TABLE "user_providers" ADD CONSTRAINT "user_providers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: make password_hash nullable for OAuth-only users
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
