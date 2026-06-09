import { test, expect } from '@playwright/test'
import { cleanDatabase, seedExercise } from './helpers/setup'

test.beforeEach(async () => {
  await cleanDatabase()
})

test.describe('UI layout — Add Item modal', () => {
  test('Sets and Reps inputs stay within modal boundary', async ({ page }) => {
    await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT' })
    await page.goto('/trainer/plans')
    await page.click('text=New Plan')
    await page.fill('input[name="name"]', 'Test Plan')
    await page.click('text=Save')
    await page.click('text=Test Plan')
    const modal = page.locator('[role="dialog"]')
    await page.click('text=Add Item')
    await expect(modal).toBeVisible()

    const repsInput = modal.locator('input[name="reps1"]')
    const modalBox = await modal.boundingBox()
    const repsBox = await repsInput.boundingBox()

    expect(modalBox).not.toBeNull()
    expect(repsBox).not.toBeNull()
    expect(repsBox!.x + repsBox!.width).toBeLessThanOrEqual(modalBox!.x + modalBox!.width + 1)
  })

  test('Sets and Reps inputs have approximately equal width', async ({ page }) => {
    await seedExercise({ name: 'Bench Press', trackingType: 'WEIGHT' })
    await page.goto('/trainer/plans')
    await page.click('text=New Plan')
    await page.fill('input[name="name"]', 'Test Plan')
    await page.click('text=Save')
    await page.click('text=Test Plan')
    const modal = page.locator('[role="dialog"]')
    await page.click('text=Add Item')
    await expect(modal).toBeVisible()

    const setsInput = modal.locator('input[name="sets1"]')
    const repsInput = modal.locator('input[name="reps1"]')
    const setsBox = await setsInput.boundingBox()
    const repsBox = await repsInput.boundingBox()

    expect(Math.abs(setsBox!.width - repsBox!.width)).toBeLessThan(10)
  })
})
