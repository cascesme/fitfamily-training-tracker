import { test, expect } from '@playwright/test'

test.describe('Mode switch', () => {
  test('switching to trainer navigates to /trainer', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Switch to Trainer')
    await expect(page).toHaveURL('/trainer')
    await expect(page.locator('h1')).toBeVisible()
  })

  test('switching back to trainee navigates to home', async ({ page }) => {
    await page.goto('/trainer')
    await page.click('text=Switch to Trainee')
    await expect(page).toHaveURL('/')
  })

  test('mode persists across page reload', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Switch to Trainer')
    await expect(page).toHaveURL('/trainer')
    await page.reload()
    await expect(page.getByRole('button', { name: /switch to trainee/i })).toBeVisible()
  })

  test('trainer button label reflects current mode', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Switch to Trainer' })).toBeVisible()
    await page.click('text=Switch to Trainer')
    await expect(page.getByRole('button', { name: 'Switch to Trainee' })).toBeVisible()
  })
})
