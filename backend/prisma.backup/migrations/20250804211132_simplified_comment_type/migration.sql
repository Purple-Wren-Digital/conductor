/*
  Warnings:

  - The values [ESCALATION,EXTERNAL,SYSTEM] on the enum `CommentType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."CommentType_new" AS ENUM ('CANCEL', 'FEEDBACK', 'FOLLOW_UP', 'ISSUE', 'NOTE', 'REMINDER', 'QUESTION');
ALTER TABLE "public"."Comments" ALTER COLUMN "type" TYPE "public"."CommentType_new" USING ("type"::text::"public"."CommentType_new");
ALTER TYPE "public"."CommentType" RENAME TO "CommentType_old";
ALTER TYPE "public"."CommentType_new" RENAME TO "CommentType";
DROP TYPE "public"."CommentType_old";
COMMIT;
