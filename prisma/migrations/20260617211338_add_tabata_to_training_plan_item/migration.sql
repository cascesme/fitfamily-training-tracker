-- AlterTable
ALTER TABLE "TrainingPlanItem" ADD COLUMN     "isTabata" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "restTimeSecs" INTEGER,
ADD COLUMN     "workTimeSecs" INTEGER;
