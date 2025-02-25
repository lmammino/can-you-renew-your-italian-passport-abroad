import { chromium, type LaunchOptions } from 'playwright-core'
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
  const args = [
    '--allow-running-insecure-content', // https://source.chromium.org/search?q=lang:cpp+symbol:kAllowRunningInsecureContent&ss=chromium
    '--disable-blink-features=AutomationControlled',
    '--disable-domain-reliability', // https://github.com/GoogleChrome/chrome-launcher/blob/main/docs/chrome-flags-for-tools.md#background-networking
    '--disable-font-subpixel-positioning', // Force disables font subpixel positioning. This affects the character glyph sharpness, kerning, hinting and layout.
    '--disable-gpu-compositing', // Prevent the compositor from using its GPU implementation.
    '--disable-gpu-rasterization', // Disable GPU rasterization, i.e. rasterize on the CPU only. Overrides the kEnableGpuRasterization flag.
    '--disable-gpu', // Disables GPU hardware acceleration. If software renderer is not in place, then the GPU process won't launch.
    '--disable-infobars',
    '--disable-lcd-text',
    '--disable-print-preview', // https://source.chromium.org/search?q=lang:cpp+symbol:kDisablePrintPreview&ss=chromium
    '--disable-setuid-sandbox', // https://source.chromium.org/search?q=lang:cpp+symbol:kDisableSetuidSandbox&ss=chromium
    '--disable-site-isolation-trials', // https://source.chromium.org/search?q=lang:cpp+symbol:kDisableSiteIsolation&ss=chromium
    // '--disable-software-rasterizer', // Disables the use of a 3D software rasterizer. (Necessary to make --disable-gpu work)
    '--disable-speech-api', // https://source.chromium.org/search?q=lang:cpp+symbol:kDisableSpeechAPI&ss=chromium
    '--disable-web-security', // https://source.chromium.org/search?q=lang:cpp+symbol:kDisableWebSecurity&ss=chromium
    // '--disk-cache-size=1',
    '--disk-cache-size=33554432', // https://source.chromium.org/search?q=lang:cpp+symbol:kDiskCacheSize&ss=chromium
    '--font-render-hinting=none', // https://github.com/puppeteer/puppeteer/issues/2410#issuecomment-560573612
    '--force-color-profile=srgb',
    '--force-device-scale-factor=1', // Overrides the device scale factor for the browser UI and the contents.
    '--hide-scrollbars', // https://source.chromium.org/search?q=lang:cpp+symbol:kHideScrollbars&ss=chromium
    '--ignore-certificate-errors',
    '--ignore-gpu-blocklist', // https://source.chromium.org/search?q=lang:cpp+symbol:kIgnoreGpuBlocklist&ss=chromium
    '--in-process-gpu', // https://source.chromium.org/search?q=lang:cpp+symbol:kInProcessGPU&ss=chromium
    '--mute-audio', // https://source.chromium.org/search?q=lang:cpp+symbol:kMuteAudio&ss=chromium
    '--no-default-browser-check', // https://source.chromium.org/search?q=lang:cpp+symbol:kNoDefaultBrowserCheck&ss=chromium
    '--no-pings', // https://source.chromium.org/search?q=lang:cpp+symbol:kNoPings&ss=chromium
    '--no-sandbox', // https://source.chromium.org/search?q=lang:cpp+symbol:kNoSandbox&ss=chromium
    '--no-zygote', // https://source.chromium.org/search?q=lang:cpp+symbol:kNoZygote&ss=chromium
    '--ppapi-subpixel-rendering-setting=0', // The enum value of FontRenderParams::subpixel_rendering to be passed to Ppapi processes.
    '--single-process', // Needs to be single-process to avoid `prctl(PR_SET_NO_NEW_PRIVS) failed` error
    '--use-angle=swiftshader',
    '--use-gl=angle',
    '--window-size=1280,1024', // https://source.chromium.org/search?q=lang:cpp+symbol:kWindowSize&ss=chromium
    // '--remote-debugging-port=9222',
  ]
  if (i.launchOptions?.headless) {
    args.push(
      '--headless=new',
      '--remote-allow-origins=*',
      '--autoplay-policy=user-gesture-required',
      '--disable-software-rasterizer',
    )
  }

  const defaultLaunchOptions = {
    args,
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
  // await cloak(page, fingerprint, { minWidth: 1280, minHeight: 1024 })

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
      console.error(error)
      await browser.close()
      return {
        bookable: false,
        error: 'Booking page timeout',
      }
    }
  } catch (error) {
    console.error(error)
    await browser.close()
    return {
      bookable: false,
      error: (error as Error).toString(),
    }
  }
}
