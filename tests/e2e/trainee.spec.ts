import { test, expect } from '@playwright/test'
import { seedTrainee, seedExercise, seedPlan, seedSeriesPlan, cleanDatabase } from './helpers/setup'

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

  test('runs series plan — interleaved sets with rest timer', async ({ page }) => {
    await seedTrainee({ name: 'Super User' })
    const exerciseA = await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT' })
    const exerciseB = await seedExercise({ name: 'Barbell Row', trackingType: 'WEIGHT' })
    const exerciseC = await seedExercise({ name: 'Lat Pulldown', trackingType: 'WEIGHT' })
    await seedSeriesPlan({
      name: 'Superset Day',
      exercises: [
        { exerciseId: exerciseA.id, reps: 10 },
        { exerciseId: exerciseB.id, reps: 10 },
        { exerciseId: exerciseC.id, reps: 12 },
      ],
      sets: 2,
    })

    await page.goto('/')
    await expect(page.locator('text=Super User')).toBeVisible()
    await page.click('text=Super User')
    await page.click('text=Superset Day')
    await page.click("text=LET'S GO")

    await expect(page.locator('text=SERIES')).toBeVisible()
    await expect(page.locator('text=Bench Press')).toBeVisible()
    await expect(page.locator('text=Barbell Row')).toBeVisible()
    await expect(page.locator('text=Lat Pulldown')).toBeVisible()
    await expect(page.locator('text=Set 1 of 2')).toBeVisible()

    await page.fill('[aria-label="Bench Press weight kg"]', '80')
    await page.fill('[aria-label="Bench Press reps done"]', '10')
    await page.fill('[aria-label="Barbell Row weight kg"]', '60')
    await page.fill('[aria-label="Barbell Row reps done"]', '10')
    await page.fill('[aria-label="Lat Pulldown weight kg"]', '40')
    await page.fill('[aria-label="Lat Pulldown reps done"]', '12')
    await page.click('text=Mark Set Done')

    await expect(page.getByRole('heading', { name: 'REST' })).toBeVisible()
    await page.click('text=Skip → Next Set')

    await expect(page.locator('text=Set 2 of 2')).toBeVisible()
    await page.fill('[aria-label="Bench Press weight kg"]', '80')
    await page.fill('[aria-label="Bench Press reps done"]', '10')
    await page.fill('[aria-label="Barbell Row weight kg"]', '60')
    await page.fill('[aria-label="Barbell Row reps done"]', '10')
    await page.fill('[aria-label="Lat Pulldown weight kg"]', '40')
    await page.fill('[aria-label="Lat Pulldown reps done"]', '12')
    await page.click('text=Mark Set Done')

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
    await expect(page.getByRole('heading', { name: 'Bench Press' }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.locator('text=Set 2 of 2')).toBeVisible()
  })

  test('opens plan review mid-series session without losing progress', async ({ page }) => {
    await seedTrainee({ name: 'Series Review User' })
    const exerciseA = await seedExercise({ name: 'Squat', trackingType: 'WEIGHT' })
    const exerciseB = await seedExercise({ name: 'Deadlift', trackingType: 'WEIGHT' })
    await seedSeriesPlan({
      name: 'Series Review Day',
      exercises: [
        { exerciseId: exerciseA.id, reps: 8 },
        { exerciseId: exerciseB.id, reps: 6 },
      ],
      sets: 3,
    })

    await page.goto('/')
    await page.click('text=Series Review User')
    await page.click('text=Series Review Day')

    // Start session
    await page.click("text=LET'S GO")

    // Verify series UI is active
    await expect(page.locator('text=SERIES')).toBeVisible()
    await expect(page.locator('text=Set 1 of 3')).toBeVisible()

    // Fill in and complete first set for all exercises
    await page.fill('[aria-label="Squat weight kg"]', '100')
    await page.fill('[aria-label="Squat reps done"]', '8')
    await page.fill('[aria-label="Deadlift weight kg"]', '120')
    await page.fill('[aria-label="Deadlift reps done"]', '6')
    await page.click('text=Mark Set Done')

    // Rest timer appears — skip it to move to set 2
    await expect(page.getByRole('heading', { name: 'REST' })).toBeVisible()
    await page.click('text=Skip → Next Set')

    // Now on set 2, open Review plan button (restored in series branch)
    await expect(page.locator('text=Set 2 of 3')).toBeVisible()
    await page.getByRole('button', { name: 'Review plan' }).click()

    // Overlay must be visible
    await expect(page.getByRole('heading', { name: 'Series Review Day' }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Close' }).click()

    // Session state is preserved after closing overlay
    await expect(page.locator('text=Set 2 of 3')).toBeVisible()
  })
})
