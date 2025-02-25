import * as cdk from 'aws-cdk-lib'
import { join } from 'node:path'
import { statfs } from 'node:fs/promises'
import type { Construct } from 'constructs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createWriteStream, mkdir } from 'node:fs'
import { mkdirp } from 'mkdirp'
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda'
import path = require('node:path')

const CHROMIUM_DOWNLOAD_URL =
  'https://github.com/chromium-for-lambda/chromium-binaries/releases/download/arm64-amazon-linux-2023-chromium-127.0.6533/headless_shell-127.0.6533.88-arm64-amazon-linux-2023.zip'
const CHROMIUM_DOWNLOAD_PATH = join(__dirname, '..', '.assets')

async function getChromiumBinary() {
  const expectedPath = join(CHROMIUM_DOWNLOAD_PATH, 'chromium.zip')
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
  }

  return expectedPath
}

export type CanYouRenewYourItalianPassportAbroadStackProps = cdk.StackProps & {
  chromiumPath: string
}

export class CanYouRenewYourItalianPassportAbroadStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: CanYouRenewYourItalianPassportAbroadStackProps,
  ) {
    super(scope, id, props)

    const lambdaFn = new NodejsFunction(this, 'LambdaFn', {
      description:
        "Checks if there's an available appointment for renewing an Italian passport",
      handler: 'handler',
      entry: join(__dirname, '..', '..', 'src', 'lambda.ts'),
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      logRetention: 90,
      timeout: cdk.Duration.seconds(900),
      memorySize: 512,
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        // TODO: move this to Secrets Manager or SSM
        PRENOTAMI_EMAIL: process.env.PRENOTAMI_EMAIL || '',
        PRENOTAMI_PASSWORD: process.env.PRENOTAMI_PASSWORD || '',
        DEBUG: 'pw:browser',
      },
      bundling: {
        // NOTE: the following 3 lines should solve the runtime error:
        //   >> Dynamic require of \"node:os\" is not supported
        //   ref: https://github.com/evanw/esbuild/issues/1921#issuecomment-2302290651
        format: OutputFormat.ESM,
        mainFields: ['module', 'main'],
        banner:
          "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
        minify: true,
        sourceMap: true,
        sourcesContent: true,
        target: 'esnext',
        nodeModules: ['playwright-core'],
        commandHooks: {
          beforeBundling: () => [],
          afterBundling: (inputDir, outputDir) => {
            const commands = [
              `rm -rf ${outputDir}/lib`,
              `mkdir -p ${outputDir}/lib`,
              `cp -R ${props.chromiumPath}/chrome-headless-shell-linux64/ ${outputDir}/lib`,
            ]
            return commands
          },
          beforeInstall: () => [],
        },
      },
    })
  }
}
