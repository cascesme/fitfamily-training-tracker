import { test, expect } from '@playwright/test'
import { cleanDatabase, seedTrainee, seedExercise, seedPlan } from './helpers/setup'

test.beforeEach(async () => {
  await cleanDatabase()
})

test.describe('Media viewer — single exercise session', () => {
  test('View Media button visible when exercise has media', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Alex' })
    await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT', mediaCount: 2 })
    await page.goto(`/trainee/${trainee.id}`)
    await page.fill('input[placeholder*="Search"]', 'Bench Press')
    await page.click('text=Bench Press')
    await expect(page.getByRole('button', { name: /View Media/ })).toBeVisible()
  })

  test('View Media button not shown when exercise has no media', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Alex' })
    await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT' })
    await page.goto(`/trainee/${trainee.id}`)
    await page.fill('input[placeholder*="Search"]', 'Bench Press')
    await page.click('text=Bench Press')
    await expect(page.getByRole('button', { name: /View Media/ })).not.toBeVisible()
  })

  test('clicking View Media opens fullscreen viewer', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Alex' })
    await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT', mediaCount: 1 })
    await page.goto(`/trainee/${trainee.id}`)
    await page.fill('input[placeholder*="Search"]', 'Bench Press')
    await page.click('text=Bench Press')
    await page.getByRole('button', { name: /View Media/ }).click()
    await expect(page.locator('.fixed.inset-0')).toBeVisible()
    await expect(page.getByText('1 of 1')).toBeVisible()
  })

  test('close button dismisses the viewer', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Alex' })
    await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT', mediaCount: 1 })
    await page.goto(`/trainee/${trainee.id}`)
    await page.fill('input[placeholder*="Search"]', 'Bench Press')
    await page.click('text=Bench Press')
    await page.getByRole('button', { name: /View Media/ }).click()
    await expect(page.locator('.fixed.inset-0')).toBeVisible()
    await page.getByRole('button', { name: /Close/i }).click()
    await expect(page.locator('.fixed.inset-0')).not.toBeVisible()
  })

  test('next and prev arrows navigate between media items', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Alex' })
    await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT', mediaCount: 3 })
    await page.goto(`/trainee/${trainee.id}`)
    await page.fill('input[placeholder*="Search"]', 'Bench Press')
    await page.click('text=Bench Press')
    await page.getByRole('button', { name: /View Media/ }).click()
    await expect(page.getByText('1 of 3')).toBeVisible()
    await page.getByRole('button', { name: /Next/i }).click()
    await expect(page.getByText('2 of 3')).toBeVisible()
    await page.getByRole('button', { name: /Previous/i }).click()
    await expect(page.getByText('1 of 3')).toBeVisible()
  })

  test('View Media button still visible during running phase', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Alex' })
    await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT', mediaCount: 2 })
    await page.goto(`/trainee/${trainee.id}`)
    await page.fill('input[placeholder*="Search"]', 'Bench Press')
    await page.click('text=Bench Press')
    await page.fill('input[name="sets"]', '1')
    await page.click('text=Start')
    await expect(page.getByRole('button', { name: /View Media/ })).toBeVisible()
  })
})

test.describe('Media viewer — plan session', () => {
  test('View Media button visible in plan session for exercise with media', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Alex' })
    const ex = await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT', mediaCount: 2 })
    await seedPlan({ name: 'Plan A', items: [{ exerciseId: ex.id, sets: 1, reps: 8 }] })
    await page.goto(`/trainee/${trainee.id}`)
    await page.click('text=Plan A')
    await expect(page.getByRole('button', { name: /View Media/ })).toBeVisible()
  })

  test('clicking View Media in plan session opens viewer', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Alex' })
    const ex = await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT', mediaCount: 2 })
    await seedPlan({ name: 'Plan A', items: [{ exerciseId: ex.id, sets: 1, reps: 8 }] })
    await page.goto(`/trainee/${trainee.id}`)
    await page.click('text=Plan A')
    await page.getByRole('button', { name: /View Media/ }).click()
    await expect(page.locator('.fixed.inset-0')).toBeVisible()
    await expect(page.getByText('1 of 2')).toBeVisible()
  })
})
