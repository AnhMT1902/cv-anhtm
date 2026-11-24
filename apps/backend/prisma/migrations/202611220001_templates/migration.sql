CREATE TABLE "templates" (
  "id" UUID PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL,
  "markup" TEXT NOT NULL,
  "css" TEXT NOT NULL,
  "archive" BYTEA NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "template_selection" (
  "key" VARCHAR(20) PRIMARY KEY,
  "templateId" UUID,
  CONSTRAINT "template_selection_singleton" CHECK ("key" = 'public'),
  CONSTRAINT "template_selection_templateId_fkey" FOREIGN KEY ("templateId")
    REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "template_selection_templateId_idx" ON "template_selection"("templateId");

CREATE TABLE "admin_sessions" (
  "tokenHash" CHAR(64) PRIMARY KEY,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL
);

CREATE INDEX "admin_sessions_expiresAt_idx" ON "admin_sessions"("expiresAt");
