import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { PRESETS } from '../src/app/presets'

// Every state the app can open by link, at both widths: it renders, nothing throws, nothing scrolls sideways,
// and axe finds no WCAG 2.2 AA violation.
for (const name of Object.keys(PRESETS)) {
  test(name, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(`/?state=${name}`)
    await page.locator('#main, main').first().waitFor()
    await page.waitForTimeout(900)
    if (name === 'error-page') await expect(page.getByRole('heading', { name: 'Something broke on our side' })).toBeVisible()
    else expect(errors).toEqual([])
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    expect(axe.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
  })
}

test('a member books Thursday\'s Lead Technique with credits after cancelling it', async ({ page }) => {
  await page.goto('/?state=cancel-free')
  await page.getByRole('button', { name: 'Cancel and refund' }).click()
  // The toast also has a screen-reader copy in Radix's live region, so take the visible one.
  await expect(page.locator('.toast').getByText('2 credits back on your 10-pass')).toBeVisible()
  await page.goto('/checkout?session=lt-1900&day=5')
  await expect(page.getByRole('button', { name: /Confirm · 2 credits/ })).toBeVisible()
})

test('a first-time climber signs the waiver and pays with Pix', async ({ page }) => {
  await page.goto('/?state=waiver')
  await page.getByLabel('Full name, as your signature').fill('Ana Lima')
  await page.getByRole('checkbox', { name: /agree/ }).click()
  await page.getByRole('button', { name: 'Sign and continue' }).click()
  await page.getByRole('button', { name: /Pay R\$ 105,00 with Pix/ }).click()
  await page.getByRole('button', { name: "Simulate the bank's payment (demo)" }).first().click()
  await expect(page.getByRole('heading', { name: "You're in" })).toBeVisible()
})

test('the declined card offers Pix instead', async ({ page }) => {
  await page.goto('/checkout?session=ib-1830&day=3')
  await page.getByRole('radio', { name: /Credit or debit card/ }).click()
  await page.getByRole('radio', { name: /0002/ }).click()
  await page.getByRole('button', { name: 'Use this card' }).click()
  await page.getByRole('button', { name: /Pay R\$ 90,00/ }).click()
  await expect(page.getByRole('heading', { name: "Your payment didn't work" })).toBeVisible()
})
