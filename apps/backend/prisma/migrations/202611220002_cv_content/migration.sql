CREATE TABLE "cv_content" (
  "key" VARCHAR(20) PRIMARY KEY CHECK ("key" = 'main'),
  "draft" JSONB NOT NULL,
  "publishedVi" JSONB NOT NULL,
  "publishedEn" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1
);
