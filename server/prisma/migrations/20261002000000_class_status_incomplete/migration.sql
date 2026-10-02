-- AlterEnum
-- Adds the third class-ending status. Kept in its own migration: Postgres
-- cannot use a freshly added enum value in the same transaction that adds it,
-- so the backfill that uses 'INCOMPLETE' lives in the next migration.
ALTER TYPE "LessonStatus" ADD VALUE 'INCOMPLETE';
