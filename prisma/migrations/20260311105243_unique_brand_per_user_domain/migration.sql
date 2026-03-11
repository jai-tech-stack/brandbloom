/*
  Warnings:

  - A unique constraint covering the columns `[userId,domain]` on the table `Brand` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Brand_userId_domain_key" ON "Brand"("userId", "domain");
