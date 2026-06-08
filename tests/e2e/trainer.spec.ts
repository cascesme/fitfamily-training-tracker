import { test, expect } from '@playwright/test'
import { seedExercise, seedPlan } from './helpers/setup'

test.describe('Trainer — Add media to exercise', () => {
  test('adds YouTube media', async ({ page }) => {
    const exercise = await seedExercise({ name: 'YouTube Media Exercise', trackingType: 'WEIGHT' })
    await page.goto(`/trainer/exercises/${exercise.id}`)

    const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    await page.selectOption('[name=mediaType]', 'YOUTUBE')
    await page.fill('[name=url]', youtubeUrl)
    await page.click('button:has-text("Add")')

    await expect(page.locator(`text=${youtubeUrl}`)).toBeVisible()
  })

  test('adds video file', async ({ page }) => {
    const exercise = await seedExercise({ name: 'Video Media Exercise', trackingType: 'WEIGHT' })
    await page.goto(`/trainer/exercises/${exercise.id}`)

    await page.selectOption('[name=mediaType]', 'VIDEO')
    await page.setInputFiles('input[type=file]', {
      name: 'workout.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('fake-video-content'),
    })

    await expect(page.locator('text=workout.mp4')).toBeVisible()
  })

  test('adds photo file', async ({ page }) => {
    const exercise = await seedExercise({ name: 'Photo Media Exercise', trackingType: 'WEIGHT' })
    await page.goto(`/trainer/exercises/${exercise.id}`)

    await page.selectOption('[name=mediaType]', 'PHOTO')
    await page.setInputFiles('input[type=file]', {
      name: 'form-check.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-content'),
    })

    await expect(page.locator('text=form-check.jpg')).toBeVisible()
  })

  test('adds PDF file', async ({ page }) => {
    const exercise = await seedExercise({ name: 'PDF Media Exercise', trackingType: 'WEIGHT' })
    await page.goto(`/trainer/exercises/${exercise.id}`)

    await page.selectOption('[name=mediaType]', 'PDF')
    await page.setInputFiles('input[type=file]', {
      name: 'technique-guide.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake-pdf-content'),
    })

    await expect(page.locator('text=technique-guide.pdf')).toBeVisible()
  })
})

test.describe('Trainer — Exercise management', () => {
  test('creates exercise with media', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Switch to Trainer')
    await page.goto('/trainer/exercises')

    await page.click('text=New Exercise')
    await page.fill('[name=name]', 'Barbell Squat')
    await page.fill('input[name=description]', 'Compound leg exercise')
    await page.selectOption('[name=trackingType]', 'WEIGHT')
    await page.click('text=Save')

    await expect(page.locator('text=Barbell Squat')).toBeVisible()

    await page.click('text=Barbell Squat')
    await page.click('text=Add media')
    await page.selectOption('[name=mediaType]', 'YOUTUBE')
    await page.fill('[name=url]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await page.click('text=Add')
    await expect(page.locator('text=https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeVisible()
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
    await page.getByRole('dialog').getByRole('button', { name: 'Add Item' }).click()

    await expect(page.locator('text=Squat')).toBeVisible()
    await expect(page.locator('text=Lunge')).toBeVisible()
    await expect(page.locator('text=BISERIES')).toBeVisible()
  })
})
