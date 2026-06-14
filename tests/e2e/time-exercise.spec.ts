import { test, expect } from '@playwright/test'
import { cleanDatabase, seedTrainee, seedExercise, seedPlan } from './helpers/setup'

test.beforeEach(async () => {
  await cleanDatabase()
})

test.describe('TIME exercise — Add Item modal', () => {
  test('shows Duration label for TIME exercise in Add Item modal', async ({ page }) => {
    await seedExercise({ name: 'Running', trackingType: 'TIME' })
    await page.goto('/trainer/plans')
    await page.click('text=New Plan')
    await page.fill('input[name="name"]', 'Test Plan')
    await page.click('text=Save')
    await page.click('text=Test Plan')
    await page.click('text=Add Item')
    await page.fill('input[placeholder*="Search"]', 'Running')
    await page.click('text=Running')
    await expect(page.locator('label', { hasText: 'Duration (s)' })).toBeVisible()
    await expect(page.locator('label', { hasText: 'Reps' })).not.toBeVisible()
  })

  test('shows Reps label for WEIGHT exercise in Add Item modal', async ({ page }) => {
    await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT' })
    await page.goto('/trainer/plans')
    await page.click('text=New Plan')
    await page.fill('input[name="name"]', 'Test Plan')
    await page.click('text=Save')
    await page.click('text=Test Plan')
    await page.click('text=Add Item')
    await page.fill('input[placeholder*="Search"]', 'Bench Press')
    await page.click('text=Bench Press')
    await expect(page.locator('label', { hasText: 'Reps' })).toBeVisible()
    await expect(page.locator('label', { hasText: 'Duration (s)' })).not.toBeVisible()
  })
})

test.describe('TIME exercise — single session runner', () => {
  test('setup form shows Duration label for TIME exercise', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Alex' })
    await seedExercise({ name: 'Running', trackingType: 'TIME' })
    await page.goto(`/trainee/${trainee.id}`)
    await page.fill('input[placeholder*="Search"]', 'Running')
    await page.click('text=Running')
    await expect(page.locator('label', { hasText: 'Duration (s)' })).toBeVisible()
    await expect(page.locator('label', { hasText: /^Reps$/ })).not.toBeVisible()
  })

  test('running phase shows Duration field in SetLogger for TIME exercise', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Alex' })
    await seedExercise({ name: 'Running', trackingType: 'TIME' })
    await page.goto(`/trainee/${trainee.id}`)
    await page.fill('input[placeholder*="Search"]', 'Running')
    await page.click('text=Running')
    await page.fill('input[name="sets"]', '2')
    await page.fill('input[name="reps"]', '30')
    await page.click('text=Start')
    await expect(page.locator('label', { hasText: 'Duration (s)' })).toBeVisible()
    await expect(page.locator('label', { hasText: 'Reps' })).not.toBeVisible()
  })

  test('logs duration and advances when marking done for TIME exercise', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Alex' })
    await seedExercise({ name: 'Running', trackingType: 'TIME' })
    await page.goto(`/trainee/${trainee.id}`)
    await page.fill('input[placeholder*="Search"]', 'Running')
    await page.click('text=Running')
    await page.fill('input[name="sets"]', '1')
    await page.fill('input[name="reps"]', '45')
    await page.click('text=Start')
    await page.locator('input[name="durationSecs"]').fill('45')
    await page.click('text=Mark Done')
    await page.waitForURL(/\/finish/)
  })
})

test.describe('TIME exercise — plan session runner', () => {
  test('plan session runner shows Duration field for TIME exercise', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Alex' })
    const ex = await seedExercise({ name: 'Running', trackingType: 'TIME' })
    await seedPlan({ name: 'Cardio Plan', items: [{ exerciseId: ex.id, sets: 2, reps: 30 }] })
    await page.goto(`/trainee/${trainee.id}`)
    await page.click('text=Cardio Plan')
    await page.click("text=LET'S GO")
    await expect(page.locator('label', { hasText: 'Duration (s)' })).toBeVisible()
    await expect(page.locator('label', { hasText: 'Reps' })).not.toBeVisible()
  })
})
