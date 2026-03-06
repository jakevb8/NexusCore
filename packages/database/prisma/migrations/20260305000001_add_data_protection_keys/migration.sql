-- CreateTable: DataProtectionKeys for ASP.NET Core Data Protection (NexusCoreDotNet)
CREATE TABLE "DataProtectionKeys" (
    "Id"           SERIAL      NOT NULL,
    "FriendlyName" TEXT,
    "Xml"          TEXT,

    CONSTRAINT "DataProtectionKeys_pkey" PRIMARY KEY ("Id")
);
