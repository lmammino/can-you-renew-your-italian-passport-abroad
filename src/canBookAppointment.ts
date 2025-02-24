import { chromium, type LaunchOptions } from 'playwright'
import { randomUUID } from 'node:crypto'
import { getBrowserfingerprint } from './utils/fingerprint.ts'
import tmp from 'tmp-promise'
import { cloak } from './utils/cloak.ts'

export type CanBookAppointmentInput = {
  credentials: { email: string; password: string }
  launchOptions?: LaunchOptions
}

export type CanBookAppointmentOutput =
  | {
      bookable: true
      screenshot: Buffer
      domSnapshot: string
    }
  | {
      bookable: false
      error: string
      screenshot?: Buffer
      domSnapshot?: string
    }

export async function canBookAppointment(
  i: CanBookAppointmentInput,
): Promise<CanBookAppointmentOutput> {
  const defaultLaunchOptions = {
    args: [
      '--no-sandbox',
      '--remote-debugging-port=9222',
      '--disable-setuid-sandbox',
      '--ignore-certificate-errors',
      '--disk-cache-size=1',
      '--disable-infobars',
      '--disable-blink-features=AutomationControlled',
    ],
    bypassCSP: true,
    ignoreHTTPSErrors: true,
    timezoneId: 'Europe/Dublin',
  }

  const o = await tmp.dir({
    unsafeCleanup: true,
  })

  const userDataDir = o.path

  const launchOptions = i.launchOptions || { headless: false }
  const browser = await chromium.launchPersistentContext(userDataDir, {
    ...defaultLaunchOptions,
    ...launchOptions,
  })

  const fingerprint = await getBrowserfingerprint(randomUUID())

  const page = await browser.newPage()
  await cloak(page, fingerprint)

  try {
    // Visit the login page
    await page.goto('https://prenotami.esteri.it/')
    await page.waitForURL('https://prenotami.esteri.it/')

    // Fill in login details
    await page.waitForTimeout(Math.random() * 3000)
    await page.fill('#login-email', i.credentials.email)
    await page.waitForTimeout(Math.random() * 3000)
    await page.fill('#login-password', i.credentials.password)
    await page.waitForTimeout(Math.random() * 3000)
    await page.click('button[type="submit"]')

    await Promise.race([
      page.waitForURL('https://prenotami.esteri.it/UserArea'),
      page.waitForURL('https://prenotami.esteri.it/Login'),
    ])

    if (await page.$('div.validation-summary-errors.text-danger')) {
      await browser.close()
      return {
        bookable: false,
        error: 'Invalid credentials',
      }
    }

    const responseText = await page.evaluate(() =>
      document.body.innerText.trim(),
    )
    if (responseText === 'Unavailable') {
      await browser.close()
      return {
        bookable: false,
        error: 'Playwright automation detected, request blocked',
      }
    }

    // Go to the Services page
    await page.waitForTimeout(Math.random() * 3000)
    const servicesMenuItem = page.locator('a[href="/Services"]')
    await servicesMenuItem.waitFor({ state: 'visible' })
    await servicesMenuItem.click()
    await page.waitForURL('https://prenotami.esteri.it/Services')

    // Click on the Prenota button for DOCUMENTI DI IDENTITA'/VIAGGIO
    await page.waitForTimeout(Math.random() * 3000)
    const bookingButton = page.locator('a[href="/Services/Booking/1162"]')
    await bookingButton.waitFor({ state: 'visible' })
    await bookingButton.click()

    // Wait for the booking page to load, with a timeout of 10 seconds
    try {
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

      // Check for availability modal
      const noAvailability = await page
        .locator(
          '.jconfirm-content:has-text("Stante l\'elevata richiesta i posti disponibili per il servizio scelto sono esauriti.")',
        )
        .count()

      // removes your name from the page before taking the screenshot :)
      const userNameEl = page.locator(
        '.main-nav__container :not(.logo) figure > figcaption',
      )
      await userNameEl.evaluate((el) => {
        el.innerHTML = 'Mario Rossi'
      })
      const screenshot = await page.screenshot()
      const domSnapshot = await page.content()

      if (noAvailability > 0) {
        await browser.close()
        return {
          bookable: false,
          error: 'No available slots message detected.',
          screenshot,
          domSnapshot,
        }
      }

      await browser.close()
      return {
        bookable: true,
        screenshot,
        domSnapshot,
      }
    } catch (error) {
      await browser.close()
      return {
        bookable: false,
        error: 'Booking page timeout',
      }
    }
  } catch (error) {
    await browser.close()
    return {
      bookable: false,
      error: (error as Error).toString(),
    }
  }
}
