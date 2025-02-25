import type { Context, EventBridgeEvent } from 'aws-lambda'
import 'source-map-support/register'
import { pino } from 'pino'
import { lambdaRequestTracker, pinoLambdaDestination } from 'pino-lambda'
import { canBookAppointment } from './canBookAppointment.ts'
import { performance } from 'node:perf_hooks'
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'

// biome-ignore lint/complexity/noBannedTypes: CloudWatch Scehduled events don't have a detail
type EmptyDetail = {}

const { PRENOTAMI_EMAIL, PRENOTAMI_PASSWORD } = process.env
if (!PRENOTAMI_EMAIL || !PRENOTAMI_PASSWORD) {
  throw new Error('Missing required environment variables')
}

const destination = pinoLambdaDestination()
const logger = pino({}, destination)
const withRequest = lambdaRequestTracker()
const dynamoClient = new DynamoDBClient()
const s3Client = new S3Client()
const snsClient = new SNSClient()

export async function handler(
  event: EventBridgeEvent<'Scheduled Event', EmptyDetail>,
  context: Context,
): Promise<void> {
  withRequest(event, context)
  try {
    const startTime = performance.now()
    const result = await canBookAppointment({
      credentials: {
        email: PRENOTAMI_EMAIL as string,
        password: PRENOTAMI_PASSWORD as string,
      },
      launchOptions: {
        headless: true,
        executablePath: 'lib/chrome-headless-shell',
      },
      logger,
    })
    const endTime = performance.now()
    const timeTaken = endTime - startTime

    logger.info('Execution completed', {
      bookable: result.bookable,
      error: 'error' in result ? result.error : undefined,
      timeTaken,
    })

    // send notification if bookable
    if (result.bookable) {
      const command = new PublishCommand({
        TopicArn: process.env.NOTIFICATION_TOPIC_ARN,
        Message:
          'An appointment is available for renewing your passport. Go to https://prenotami.esteri.it/ to book it.',
      })
      await snsClient.send(command)
      logger.info('Sent a notification via SNS')
    }

    const screenshotName = `${event.time}.png`
    const domSnapshotName = `${event.time}.html`

    // save the screenshot to S3
    if (result.screenshot) {
      const command = new PutObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: screenshotName,
        Body: result.screenshot,
      })
      await s3Client.send(command)
      logger.info('Saved the screenshot to S3', {
        screenshotName,
        bucket: process.env.BUCKET_NAME,
      })
    }
    // save the DOM snapshot to S3
    if (result.domSnapshot) {
      const command = new PutObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: domSnapshotName,
        Body: result.domSnapshot,
      })
      await s3Client.send(command)
      logger.info('Saved the DOM snapshot to S3', {
        domSnapshotName,
        bucket: process.env.BUCKET_NAME,
      })
    }

    // save the results to DynamoDB
    const item = {
      PK: { S: '#Appointment' },
      SK: { S: event.time },
      bookable: { BOOL: result.bookable },
      timeTaken: { N: timeTaken.toString() },
      error: { S: 'error' in result ? result.error : '' },
      domSnapshot: { S: result.domSnapshot ? domSnapshotName : '' },
      screenshot: { S: result.screenshot ? screenshotName : '' },
      notified: { BOOL: result.bookable },
    }

    const command = new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: item,
    })
    await dynamoClient.send(command)
    logger.info('Saved the results to DynamoDB', { item })

    if (result.domSnapshot) {
      // save the DOM snapshot to S3
    }
  } catch (err) {
    logger.error('Unexpected error happend', { error: err })
  }
}
