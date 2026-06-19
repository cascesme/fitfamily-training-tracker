-- AlterTable
ALTER TABLE "TrainingPlanItemExercise" ADD COLUMN     "alternativeExerciseId" TEXT,
ADD COLUMN     "alternativeReps" INTEGER,
ADD COLUMN     "alternativeSets" INTEGER;

-- AddForeignKey
ALTER TABLE "TrainingPlanItemExercise" ADD CONSTRAINT "TrainingPlanItemExercise_alternativeExerciseId_fkey" FOREIGN KEY ("alternativeExerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
