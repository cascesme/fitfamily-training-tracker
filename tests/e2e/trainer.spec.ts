import { test, expect } from '@playwright/test'
import { seedExercise, seedPlan } from './helpers/setup'

test.describe('Trainer — Exercise management', () => {
  test('creates exercise with media', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Switch to Trainer')
    await page.goto('/trainer/exercises')

    await page.click('text=New Exercise')
    await page.fill('[name=name]', 'Barbell Squat')
    await page.fill('[name=description]', 'Compound leg exercise')
    await page.selectOption('[name=trackingType]', 'WEIGHT')
    await page.click('text=Save')

    await expect(page.locator('text=Barbell Squat')).toBeVisible()

    await page.click('text=Barbell Squat')
    await page.click('text=Add media')
    await page.selectOption('[name=mediaType]', 'YOUTUBE')
    await page.fill('[name=url]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await page.click('text=Add')
    await expect(page.locator('iframe')).toBeVisible()
  })

  test('creates training plan with biseries', async ({ page }) => {
    await seedExercise({ name: 'Squat', trackingType: 'WEIGHT' })
    await seedExercise({ name: 'Lunge', trackingType: 'WEIGHT' })

    await page.goto('/trainer/plans')
    await page.click('text=New Plan')
    await page.fill('[name=name]', 'Leg Day')
    await page.click('text=Save')
    await page.click('text=Leg Day')

    await page.click('text=Add Item')
    await page.click('text=Biseries')
    await page.fill('[placeholder="Exercise 1"]', 'Squat')
    await page.click('text=Squat')
    await page.fill('[name=sets1]', '3')
    await page.fill('[name=reps1]', '10')
    await page.fill('[placeholder="Exercise 2"]', 'Lunge')
    await page.click('text=Lunge')
    await page.fill('[name=sets2]', '3')
    await page.fill('[name=reps2]', '12')
    await page.click('text=Add Item')

    await expect(page.locator('text=Squat')).toBeVisible()
    await expect(page.locator('text=Lunge')).toBeVisible()
    await expect(page.locator('text=BISERIES')).toBeVisible()
  })
})
