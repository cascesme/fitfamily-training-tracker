-- CreateEnum
CREATE TYPE "Role" AS ENUM ('trainer', 'trainee');

-- AlterTable
ALTER TABLE "Trainee" ADD COLUMN     "email" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "clerkUserId" TEXT;

-- CreateTable
CREATE TABLE "AllowedUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllowedUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AllowedUser_email_key" ON "AllowedUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Trainee_email_key" ON "Trainee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Trainee_clerkUserId_key" ON "Trainee"("clerkUserId");

-- Remove default on email after adding NOT NULL with default
ALTER TABLE "Trainee" ALTER COLUMN "email" DROP DEFAULT;
