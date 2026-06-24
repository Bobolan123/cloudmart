-- Remove email-feature fields (no email handling: dropped SES, password reset, email verification)
-- AlterTable
ALTER TABLE "User" DROP COLUMN "isVerified",
DROP COLUMN "verifyToken",
DROP COLUMN "resetToken",
DROP COLUMN "resetTokenExp";
