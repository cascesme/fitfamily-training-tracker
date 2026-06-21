import { test, expect } from '@playwright/test'
import { seedTrainee, seedExercise, seedPlan, seedPlanWithAlternative, cleanDatabase } from './helpers/setup'

test.describe('Alternative exercise — Trainer config', () => {
  test.beforeEach(async () => {
    await cleanDatabase()
  })

  test('trainer can configure alternative exercise via AddItemModal', async ({ page }) => {
    await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT' })
    await seedExercise({ name: 'Push Ups', trackingType: 'NONE' })
    const plan = await seedPlan({ name: 'Chest Day', items: [] })

    await page.goto(`/trainer/plans/${plan.id}`)
    await page.click('text=Add Item')

    await page.fill('[placeholder="Exercise 1"]', 'Bench Press')
    await page.click('text=Bench Press')

    await page.click('text=Alternative ▼')

    await page.fill('[placeholder="Alternative exercise"]', 'Push Ups')
    await page.click('text=Push Ups')
    await page.fill('[name=altSets1]', '3')
    await page.fill('[name=altReps1]', '12')

    await page.click('button[type=submit]:has-text("Add Item")')

    await expect(page.locator('text=Bench Press')).toBeVisible()
  })
})

test.describe('Alternative exercise — Trainee session', () => {
  test.beforeEach(async () => {
    await cleanDatabase()
  })

  test('switch to alternative button visible when alternative is configured', async ({ page }) => {
    await seedTrainee({ name: 'Alt User' })
    const primary = await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT' })
    const alt = await seedExercise({ name: 'Push Ups', trackingType: 'NONE' })
    await seedPlanWithAlternative({
      name: 'Alt Plan',
      exerciseId: primary.id,
      altExerciseId: alt.id,
      sets: 3,
      reps: 8,
      altSets: 3,
      altReps: 12,
    })

    await page.goto('/')
    await page.click('text=Alt User')
    await page.click('text=Alt Plan')
    await page.click("text=LET'S GO")

    await expect(page.locator('text=Bench Press')).toBeVisible()
    await expect(page.locator('text=Switch to alternative')).toBeVisible()
  })

  test('trainee can switch to alternative and session uses alternative details', async ({ page }) => {
    await seedTrainee({ name: 'Switch User' })
    const primary = await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT' })
    const alt = await seedExercise({ name: 'Push Ups', trackingType: 'NONE' })
    await seedPlanWithAlternative({
      name: 'Switch Plan',
      exerciseId: primary.id,
      altExerciseId: alt.id,
      sets: 3,
      reps: 8,
      altSets: 2,
      altReps: 15,
    })

    await page.goto('/')
    await page.click('text=Switch User')
    await page.click('text=Switch Plan')
    await page.click("text=LET'S GO")

    await expect(page.locator('text=Bench Press')).toBeVisible()
    await page.click('text=Switch to alternative')

    await expect(page.locator('text=Push Ups')).toBeVisible()
    await expect(page.locator('text=Set 1 of 2')).toBeVisible()
  })

  test('no switch button shown when no alternative configured', async ({ page }) => {
    await seedTrainee({ name: 'No Alt User' })
    const exercise = await seedExercise({ name: 'Squat', trackingType: 'WEIGHT' })
    await seedPlan({
      name: 'Leg Day',
      items: [{ exerciseId: exercise.id, sets: 3, reps: 10 }],
    })

    await page.goto('/')
    await page.click('text=No Alt User')
    await page.click('text=Leg Day')
    await page.click("text=LET'S GO")

    await expect(page.locator('text=Squat')).toBeVisible()
    await expect(page.locator('text=Switch to alternative')).not.toBeVisible()
  })
})
