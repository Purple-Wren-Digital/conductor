-- DropForeignKey
ALTER TABLE "public"."todos" DROP CONSTRAINT "todos_created_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."todos" DROP CONSTRAINT "todos_updated_by_user_id_fkey";

-- AddForeignKey
ALTER TABLE "public"."todos" ADD CONSTRAINT "todos_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."todos" ADD CONSTRAINT "todos_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
