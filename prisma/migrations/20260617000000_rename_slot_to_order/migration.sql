-- AlterTable: rename slot column to order in TrainingPlanItemExercise
ALTER TABLE "TrainingPlanItemExercise" RENAME COLUMN "slot" TO "order";

-- RenameIndex
ALTER INDEX "TrainingPlanItemExercise_itemId_slot_key" RENAME TO "TrainingPlanItemExercise_itemId_order_key";
