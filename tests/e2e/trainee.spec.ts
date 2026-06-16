import { test, expect } from '@playwright/test'
import { seedTrainee, seedExercise, seedPlan, seedBiseriePlan, cleanDatabase } from './helpers/setup'

test.describe('Trainee — Full plan session', () => {
  test.beforeEach(async () => {
    await cleanDatabase()
  })

  test('runs full training plan and logs sets', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Test User' })
    const exercise = await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT' })
    await seedPlan({
      name: 'Push Day',
      items: [{ exerciseId: exercise.id, sets: 2, reps: 8 }],
    })

    await page.goto('/')
    await expect(page.locator('text=Test User')).toBeVisible()
    await page.click('text=Test User')
    await page.click('text=Push Day')
    await page.click("text=LET'S GO")

    await expect(page.locator('text=Bench Press')).toBeVisible()
    await expect(page.locator('text=Set 1 of 2')).toBeVisible()
    await page.fill('[name=weightKg]', '60')
    await page.fill('[name=repsDone]', '8')
    await page.click('text=Mark Done')

    await expect(page.locator('text=Set 2 of 2')).toBeVisible()
    await page.fill('[name=weightKg]', '60')
    await page.click('text=Mark Done')

    await expect(page.locator('text=Session Complete')).toBeVisible()
    await page.fill('[name=calories]', '320')
    await page.click('text=Save & Finish')

    await expect(page).toHaveURL(`/trainee/${trainee.id}`)
  })

  test('trains single exercise outside a plan', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Solo User' })
    await seedExercise({ name: 'Pull-up', trackingType: 'NONE' })

    await page.goto('/')
    await page.click('text=Solo User')
    await page.click('text=Train Single Exercise')
    await page.click('text=Pull-up')

    await page.fill('[name=sets]', '3')
    await page.fill('[name=reps]', '8')
    await page.click('text=Start')

    for (let i = 1; i <= 3; i++) {
      await expect(page.locator(`text=Set ${i} of 3`)).toBeVisible()
      await page.click('text=Mark Done')
    }

    await page.click('text=Save & Finish')
    await expect(page).toHaveURL(`/trainee/${trainee.id}`)
  })

  test('runs biseries plan — interleaved sets with rest timer', async ({ page }) => {
    await seedTrainee({ name: 'Super User' })
    const exerciseA = await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT' })
    const exerciseB = await seedExercise({ name: 'Barbell Row', trackingType: 'WEIGHT' })
    await seedBiseriePlan({
      name: 'Superset Day',
      exerciseAId: exerciseA.id,
      exerciseBId: exerciseB.id,
      sets: 2,
      repsA: 10,
      repsB: 10,
    })

    await page.goto('/')
    await expect(page.locator('text=Super User')).toBeVisible()
    await page.click('text=Super User')
    await page.click('text=Superset Day')
    await page.click("text=LET'S GO")

    // Both exercises visible on one biseries screen
    await expect(page.locator('text=BISERIES')).toBeVisible()
    await expect(page.locator('text=Bench Press')).toBeVisible()
    await expect(page.locator('text=Barbell Row')).toBeVisible()
    await expect(page.locator('text=Set 1 of 2')).toBeVisible()

    // Fill both exercises and mark set 1 done
    await page.fill('[aria-label="Bench Press weight kg"]', '80')
    await page.fill('[aria-label="Bench Press reps done"]', '10')
    await page.fill('[aria-label="Barbell Row weight kg"]', '60')
    await page.fill('[aria-label="Barbell Row reps done"]', '10')
    await page.click('text=Mark Set Done')

    // Rest timer appears after set 1
    await expect(page.getByRole('heading', { name: 'REST' })).toBeVisible()
    await page.click('text=Skip → Next Set')

    // Set 2 shown
    await expect(page.locator('text=Set 2 of 2')).toBeVisible()
    await page.fill('[aria-label="Bench Press weight kg"]', '80')
    await page.fill('[aria-label="Bench Press reps done"]', '10')
    await page.fill('[aria-label="Barbell Row weight kg"]', '60')
    await page.fill('[aria-label="Barbell Row reps done"]', '10')
    await page.click('text=Mark Set Done')

    // No rest timer after final set — goes directly to finish
    await expect(page.getByRole('heading', { name: 'REST' })).not.toBeVisible()
    await expect(page.locator('text=Session Complete')).toBeVisible()
  })

  test('opens plan review before and during a session without losing progress', async ({ page }) => {
    await seedTrainee({ name: 'Review User' })
    const exercise = await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT', mediaCount: 1 })
    await seedPlan({
      name: 'Push Day',
      items: [{ exerciseId: exercise.id, sets: 2, reps: 8 }],
    })

    await page.goto('/')
    await page.click('text=Review User')
    await page.click('text=Push Day')

    // Review accessible before starting — shows exercise and its media
    await page.getByRole('button', { name: 'Review plan' }).click()
    await expect(page.getByRole('heading', { name: 'Bench Press' })).toBeVisible()
    await expect(page.locator('img').first()).toBeVisible()
    await page.getByRole('button', { name: 'Close' }).click()

    // Start session, log the first set
    await page.click("text=LET'S GO")
    await page.fill('[name=weightKg]', '60')
    await page.fill('[name=repsDone]', '8')
    await page.click('text=Mark Done')
    await expect(page.locator('text=Set 2 of 2')).toBeVisible()

    // Review mid-session does not disturb in-progress state
    await page.getByRole('button', { name: 'Review plan' }).click()
    await expect(page.getByRole('heading', { name: 'Bench Press' })).toBeVisible()
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.locator('text=Set 2 of 2')).toBeVisible()
  })
})
