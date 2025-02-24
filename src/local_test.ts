import { canBookAppointment } from './canBookAppointment.ts'
import { writeFile } from 'node:fs/promises'

const { PRENOTAMI_EMAIL, PRENOTAMI_PASSWORD } = process.env
if (!PRENOTAMI_EMAIL || !PRENOTAMI_PASSWORD) {
  throw new Error('Missing required environment variables')
}

const result = await canBookAppointment({
  credentials: {
    email: PRENOTAMI_EMAIL,
    password: PRENOTAMI_PASSWORD,
  },
})

console.log(result)

if (result.domSnapshot) {
  await writeFile('domSnapshot.html', result.domSnapshot)
}

if (result.screenshot) {
  await writeFile('screenshot.png', result.screenshot)
}
