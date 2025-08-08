-- CreateEnum
CREATE TYPE "public"."Category" AS ENUM ('DOCUMENT', 'GENERAL_INQUIRY', 'MAINTENANCE', 'OFFER_SUBMISSION', 'TOUR_REQUEST');

-- CreateEnum
CREATE TYPE "public"."TicketStatus" AS ENUM ('CREATED', 'ASSIGNED', 'IN_PROGRESS', 'PENDING', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."Urgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."CommentType" AS ENUM ('CANCEL', 'FEEDBACK', 'FOLLOW_UP', 'ISSUE', 'NOTE', 'REMINDER', 'QUESTION');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'AGENT', 'STAFF');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "auth0Id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "role" "public"."UserRole"[] DEFAULT ARRAY['AGENT']::"public"."UserRole"[],
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "marketCenterId" TEXT NOT NULL,
    "createdTickets" TEXT[],
    "assignedToTickets" TEXT[],
    "comments" TEXT[],

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ticket" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "creatorId" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "marketCenterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "public"."Category" NOT NULL,
    "urgency" "public"."Urgency" NOT NULL,
    "status" "public"."TicketStatus" NOT NULL DEFAULT 'CREATED',
    "internal" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Comments" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "type" "public"."CommentType" NOT NULL,
    "content" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TicketStatusHistory" (
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ticketId" TEXT NOT NULL,
    "status" "public"."TicketStatus" NOT NULL,

    CONSTRAINT "TicketStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_auth0Id_key" ON "public"."User"("auth0Id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "public"."User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Comments_userId_ticketId_key" ON "public"."Comments"("userId", "ticketId");

-- AddForeignKey
ALTER TABLE "public"."Comments" ADD CONSTRAINT "Comments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TicketStatusHistory" ADD CONSTRAINT "TicketStatusHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
