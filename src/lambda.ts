import type { Context, EventBridgeEvent } from 'aws-lambda'
import 'source-map-support/register'
import { canBookAppointment } from './canBookAppointment.ts'

// biome-ignore lint/complexity/noBannedTypes: <explanation>
type EmptyDetail = {}

const { PRENOTAMI_EMAIL, PRENOTAMI_PASSWORD } = process.env
if (!PRENOTAMI_EMAIL || !PRENOTAMI_PASSWORD) {
  throw new Error('Missing required environment variables')
}

export async function handler(
  event: EventBridgeEvent<'Scheduled Event', EmptyDetail>,
  _context: Context,
): Promise<void> {
  console.log('Received event:', JSON.stringify(event, null, 2))

  const result = await canBookAppointment({
    credentials: {
      email: PRENOTAMI_EMAIL as string,
      password: PRENOTAMI_PASSWORD as string,
    },
    launchOptions: {
      headless: true,
      executablePath: 'lib/chrome-headless-shell',
    },
  })

  console.log(result)
}
