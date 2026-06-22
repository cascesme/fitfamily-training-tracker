import { test, expect } from '@playwright/test'

test.describe('Locale toggle', () => {
  test('default locale is Spanish (no cookie)', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/access-denied')
    await expect(page.getByText('Acceso no concedido.')).toBeVisible()
  })

  test('toggle EN switches UI to English', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/access-denied')
    await expect(page.getByText('Acceso no concedido.')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'es')

    await page.getByRole('button', { name: 'EN' }).click()

    await expect(page.getByText('Access not granted.')).toBeVisible()
    await expect(page.getByText('Acceso no concedido.')).not.toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('English locale persists on reload', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/access-denied')
    await page.getByRole('button', { name: 'EN' }).click()
    await expect(page.getByText('Access not granted.')).toBeVisible()

    await page.reload()

    await expect(page.getByText('Access not granted.')).toBeVisible()
  })

  test('toggle ES switches back to Spanish', async ({ page, context }) => {
    await context.addCookies([{
      name: 'FITFAMILY_LOCALE',
      value: 'en',
      domain: 'localhost',
      path: '/',
    }])
    await page.goto('/access-denied')
    await expect(page.getByText('Access not granted.')).toBeVisible()

    await page.getByRole('button', { name: 'ES' }).click()

    await expect(page.getByText('Acceso no concedido.')).toBeVisible()
    await expect(page.getByText('Access not granted.')).not.toBeVisible()
  })

  test('active locale button is disabled', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/access-denied')

    const esButton = page.getByRole('button', { name: 'ES' })
    const enButton = page.getByRole('button', { name: 'EN' })

    await expect(esButton).toBeDisabled()
    await expect(enButton).toBeEnabled()
  })
})
