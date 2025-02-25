#!/usr/bin/env node
import { CanYouRenewYourItalianPassportAbroadStack } from '../lib/can-you-renew-your-italian-passport-abroad-stack'
import * as cdk from 'aws-cdk-lib'

const { PRENOTAMI_EMAIL, PRENOTAMI_PASSWORD, NOTIFICATION_EMAIL } = process.env
if (!PRENOTAMI_EMAIL || !PRENOTAMI_PASSWORD || !NOTIFICATION_EMAIL) {
  throw new Error(
    'Missing required environment variables: PRENOTAMI_EMAIL, PRENOTAMI_PASSWORD, NOTIFICATION_EMAIL',
  )
}

const app = new cdk.App()
new CanYouRenewYourItalianPassportAbroadStack(
  app,
  'CanYouRenewYourItalianPassportAbroadStack',
  {
    notificationEmail: NOTIFICATION_EMAIL,
    prenotamiEmail: PRENOTAMI_EMAIL,
    prenotamiPassword: PRENOTAMI_PASSWORD,
  },
)
