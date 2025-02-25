#!/usr/bin/env node
import { CanYouRenewYourItalianPassportAbroadStack } from '../lib/can-you-renew-your-italian-passport-abroad-stack'
import * as cdk from 'aws-cdk-lib'
import { join } from 'node:path'
import { statfs } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createWriteStream } from 'node:fs'
import { mkdirp } from 'mkdirp'
import { Open } from 'unzipper'

const CHROMIUM_DOWNLOAD_URL =
  'https://github.com/chromium-for-lambda/chromium-binaries/releases/download/arm64-amazon-linux-2023-chromium-127.0.6533/headless_shell-127.0.6533.88-arm64-amazon-linux-2023.zip'
const CHROMIUM_DOWNLOAD_PATH = join(__dirname, '..', '.assets')

async function getChromiumPath() {
  const expectedPath = join(CHROMIUM_DOWNLOAD_PATH, 'chromium.zip')
  const expectedUncompressedPath = join(CHROMIUM_DOWNLOAD_PATH, 'chromium')

  let exists = true
  try {
    await statfs(expectedPath)
  } catch {
    exists = false
  }

  if (!exists) {
    console.log('Downloading chromium binary')
    await mkdirp(CHROMIUM_DOWNLOAD_PATH)

    // download the chromium binary
    const res = await fetch(CHROMIUM_DOWNLOAD_URL, {
      method: 'GET',
    })
    if (!res.ok || !res.body) {
      throw new Error('Failed to download chromium binary')
    }

    // needed ts-ignore because couldn't figure out how to make TS happy -.-
    // @ts-ignore
    await pipeline(Readable.fromWeb(res.body), createWriteStream(expectedPath))
    const directory = await Open.file(expectedPath)
    await directory.extract({ path: expectedUncompressedPath })
  }

  return expectedUncompressedPath
}

async function main() {
  const chromiumPath = await getChromiumPath()

  const app = new cdk.App()
  new CanYouRenewYourItalianPassportAbroadStack(
    app,
    'CanYouRenewYourItalianPassportAbroadStack',
    {
      chromiumPath,
    },
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
