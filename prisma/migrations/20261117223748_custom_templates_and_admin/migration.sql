-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CustomTemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AdminAuditAction" AS ENUM ('TEMPLATE_CREATE', 'TEMPLATE_UPDATE', 'TEMPLATE_ACTIVATE', 'TEMPLATE_ARCHIVE', 'TEMPLATE_DUPLICATE', 'ASSIGNMENT_GRANT', 'ASSIGNMENT_REVOKE', 'ADMIN_ROLE_GRANT', 'ADMIN_ROLE_REVOKE');

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "customFieldValues" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "customTemplateVersionId" UUID;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "custom_templates" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "CustomTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "rendererKey" TEXT NOT NULL DEFAULT 'custom',
    "style" JSONB NOT NULL DEFAULT '{}',
    "fields" JSONB NOT NULL DEFAULT '[]',
    "sections" JSONB NOT NULL DEFAULT '[]',
    "showBrand" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "custom_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_template_versions" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "style" JSONB NOT NULL,
    "fields" JSONB NOT NULL,
    "sections" JSONB NOT NULL,
    "showBrand" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_template_assignments" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "assignedById" UUID NOT NULL,
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(3),
    "revokeReason" TEXT,
    "revokedById" UUID,

    CONSTRAINT "custom_template_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "action" "AdminAuditAction" NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "custom_templates_slug_key" ON "custom_templates"("slug");

-- CreateIndex
CREATE INDEX "custom_templates_status_updatedAt_idx" ON "custom_templates"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "custom_template_versions_templateId_version_key" ON "custom_template_versions"("templateId", "version");

-- CreateIndex
CREATE INDEX "custom_template_assignments_userId_revokedAt_idx" ON "custom_template_assignments"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "custom_template_assignments_templateId_revokedAt_idx" ON "custom_template_assignments"("templateId", "revokedAt");

-- CreateIndex
CREATE INDEX "admin_audit_logs_createdAt_idx" ON "admin_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_logs_actorId_createdAt_idx" ON "admin_audit_logs"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "quotes_customTemplateVersionId_idx" ON "quotes"("customTemplateVersionId");

-- AddForeignKey
ALTER TABLE "custom_template_versions" ADD CONSTRAINT "custom_template_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "custom_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_template_assignments" ADD CONSTRAINT "custom_template_assignments_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "custom_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_template_assignments" ADD CONSTRAINT "custom_template_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_template_assignments" ADD CONSTRAINT "custom_template_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_template_assignments" ADD CONSTRAINT "custom_template_assignments_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customTemplateVersionId_fkey" FOREIGN KEY ("customTemplateVersionId") REFERENCES "custom_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
