import { chromium as playwright, type LaunchOptions } from 'playwright-core'
import chromium from '@sparticuz/chromium'
import { type Logger, pino } from 'pino'

const CHROMIUM_PATH: string | undefined = process.env.CHROMIUM_PATH

export type CanBookAppointmentInput = {
  credentials: { email: string; password: string }
  launchOptions?: LaunchOptions
  logger?: Logger
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
  const log = i.logger || pino()

  // CHROMIUM_PATH being set assumes you are running locally
  if (CHROMIUM_PATH) {
    await chromium.font(
      'https://raw.githack.com/googlei18n/noto-emoji/master/fonts/NotoColorEmoji.ttf',
    )
  }

  const browser = await playwright.launch({
    args: CHROMIUM_PATH ? [] : chromium.args,
    executablePath: CHROMIUM_PATH || (await chromium.executablePath()),
    headless: !CHROMIUM_PATH,
  })

  const page = await browser.newPage()

  try {
    // Visit the login page
    log.info('Visiting the home page')
    await page.goto('https://prenotami.esteri.it/')
    await page.waitForURL('https://prenotami.esteri.it/')
    log.info('Home page loaded')

    // Fill in login details
    log.info('Filling login details')
    await page.waitForTimeout(Math.random() * 4000)
    await page.fill('#login-email', i.credentials.email)
    await page.waitForTimeout(Math.random() * 4000)
    await page.fill('#login-password', i.credentials.password)
    await page.waitForTimeout(Math.random() * 4000)
    await page.click('button[type="submit"]')
    log.info('Login details filled in and submitted')

    await Promise.race([
      page.waitForURL('https://prenotami.esteri.it/UserArea'),
      page.waitForURL('https://prenotami.esteri.it/Login'),
    ])
    log.info('Login completed')

    if (await page.$('div.validation-summary-errors.text-danger')) {
      log.error('Invalid credentials message detected')
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
      log.error('Playwright automation detected, request blocked')
      await browser.close()
      return {
        bookable: false,
        error: 'Playwright automation detected, request blocked',
      }
    }

    // Go to the Services page
    log.info('Loading services page')
    await page.waitForTimeout(Math.random() * 3000)
    const servicesMenuItem = page.locator('a[href="/Services"]')
    await servicesMenuItem.waitFor({ state: 'visible' })
    await servicesMenuItem.click()
    await page.waitForURL('https://prenotami.esteri.it/Services')
    log.info('Loaded services page')

    // Click on the Prenota button for DOCUMENTI DI IDENTITA'/VIAGGIO
    log.info('Loading service booking page')
    await page.waitForTimeout(Math.random() * 3000)
    const bookingButton = page.locator('a[href="/Services/Booking/1162"]')
    await bookingButton.waitFor({ state: 'visible' })
    await bookingButton.click()

    // Wait for the booking page to load, with a timeout of 10 seconds
    try {
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 })
      log.info('Service booking page loaded')

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
        log.info('No available slots message detected')
        await browser.close()
        return {
          bookable: false,
          error: 'No available slots message detected.',
          screenshot,
          domSnapshot,
        }
      }

      log.info('Availability detected')
      await browser.close()
      return {
        bookable: true,
        screenshot,
        domSnapshot,
      }
    } catch (error) {
      log.error('Timeout waiting for booking page to load', error)
      await browser.close()
      return {
        bookable: false,
        error: 'Booking page timeout',
      }
    }
  } catch (error) {
    log.error('Arbitrary error occurred', error)
    await browser.close()
    return {
      bookable: false,
      error: (error as Error).toString(),
    }
  }
}
