import { test, expect } from '@playwright/test'
import { seedTrainee, seedExercise, seedPlan, seedSession, cleanDatabase } from './helpers/setup'

test.describe('Failure paths', () => {
  test.beforeEach(async () => {
    await cleanDatabase()
  })

  test('cannot delete exercise that is in use', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Active User' })
    const exercise = await seedExercise({ name: 'In-Use Exercise', trackingType: 'WEIGHT' })
    await seedSession({ traineeId: trainee.id, exerciseId: exercise.id })

    await page.goto('/trainer/exercises')
    await page.click('text=In-Use Exercise')
    await page.click('text=Delete Exercise')
    await page.click('text=Confirm Delete')

    await expect(page.locator('text=Cannot delete')).toBeVisible()
    await expect(page.locator('text=In-Use Exercise')).toBeVisible()
  })

  test('cannot delete trainee with sessions', async ({ page }) => {
    const trainee = await seedTrainee({ name: 'Busy Trainee' })
    await seedSession({ traineeId: trainee.id })

    await page.goto('/trainer/trainees')
    await page.click(`[aria-label="Delete Busy Trainee"]`)
    await page.click('text=Confirm')

    await expect(page.locator('text=Cannot delete')).toBeVisible()
  })

  test('media upload blocked after 10 items', async ({ page }) => {
    const exercise = await seedExercise({
      name: 'Full Media Exercise',
      trackingType: 'WEIGHT',
      mediaCount: 10,
    })

    await page.goto(`/trainer/exercises/${exercise.id}`)

    await expect(page.locator('text=maximum')).toBeVisible()
    await expect(page.locator('button:has-text("Add")')).toBeDisabled()
  })

  test('biseries item requires slot 1 before slot 2', async ({ page }) => {
    const plan = await seedPlan({ name: 'Test Plan', items: [] })
    await seedExercise({ name: 'Exercise A', trackingType: 'WEIGHT' })

    await page.goto(`/trainer/plans/${plan.id}`)
    await page.click('text=Add Item')
    await page.click('text=Biseries')
    await page.fill('[placeholder="Exercise 2"]', 'Exercise A')
    await page.click('text=Exercise A')
    await page.getByRole('dialog').getByRole('button', { name: 'Add Item' }).click()

    await expect(page.locator('text=Slot 1 exercise is required')).toBeVisible()
  })

  test('PWA manifest and service worker present', async ({ page }) => {
    await page.goto('/')

    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json')

    const manifestResponse = await page.request.get('/manifest.json')
    const manifest = await manifestResponse.json()
    expect(manifest.display).toBe('standalone')
    expect(manifest.theme_color).toBe('#E85D26')
  })
})
