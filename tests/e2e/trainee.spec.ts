import { test, expect } from '@playwright/test'
import { seedTrainee, seedExercise, seedPlan } from './helpers/setup'

test.describe('Trainee — Full plan session', () => {
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
})
