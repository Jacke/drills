-- CreateTable
CREATE TABLE "NotionPage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "notionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT
);

-- CreateTable
CREATE TABLE "NotionDatabase" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "notionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "NotionPage_notionId_key" ON "NotionPage"("notionId");

-- CreateIndex
CREATE UNIQUE INDEX "NotionDatabase_notionId_key" ON "NotionDatabase"("notionId");
