-- AlterTable: replace single fileUrl/fileName with a multi-file "files" array
-- (jsonb list of {url, name}) plus a "links" array for URL-only submissions
-- (e.g. a Scratch project page or a GitHub repo).
ALTER TABLE "Submission" ADD COLUMN     "files" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "links" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill existing single-file submissions into the new "files" array.
UPDATE "Submission"
SET "files" = jsonb_build_array(
  jsonb_build_object('url', "fileUrl", 'name', "fileName")
)
WHERE "fileUrl" IS NOT NULL;

ALTER TABLE "Submission" DROP COLUMN "fileUrl",
DROP COLUMN "fileName";
