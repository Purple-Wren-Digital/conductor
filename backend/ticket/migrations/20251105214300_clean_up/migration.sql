-- CreateTable
CREATE TABLE "public"."schema_migrations" (
    "version" TEXT NOT NULL,
    "dirty" BOOLEAN NOT NULL,

    CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version")
);
