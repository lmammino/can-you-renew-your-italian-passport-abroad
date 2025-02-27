import {
  CloudWatchEventsClient,
  DescribeRuleCommand,
  DisableRuleCommand,
  EnableRuleCommand,
} from '@aws-sdk/client-cloudwatch-events'
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda'

const TOKEN = process.env.TOKEN as string
const RULE_NAME = process.env.RULE_NAME as string

if (!TOKEN || !RULE_NAME) {
  throw new Error('Missing required environment variables')
}

const cloudwatchEventsClient = new CloudWatchEventsClient()

function renderPage(scheduleEnabled: boolean, token: string): string {
  return `
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Scheduler Status</title>
  </head>
  <body>
      <p>Scheduler ${scheduleEnabled ? 'enabled' : 'disabled'}</p>
      <form method="POST" action="/?token=${encodeURIComponent(token)}">
          <button type="submit">${scheduleEnabled ? 'Disable' : 'Enable'}</button>
      </form>
  </body>
</html>`
}

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  const authToken = event.queryStringParameters?.token
  if (!authToken || authToken !== TOKEN) {
    return {
      statusCode: 401,
      body: 'Unauthorized',
    }
  }

  if (
    event.requestContext.http.method !== 'GET' &&
    event.requestContext.http.method !== 'POST'
  ) {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  let scheduleEnabled = false
  try {
    const schedule = await cloudwatchEventsClient.send(
      new DescribeRuleCommand({ Name: RULE_NAME }),
    )
    scheduleEnabled = schedule.State === 'ENABLED'
  } catch (error) {
    console.error('Error fetching schedule:', error)
    return { statusCode: 500, body: 'Internal Server Error' }
  }

  if (event.requestContext.http.method === 'POST') {
    try {
      const command = scheduleEnabled
        ? new DisableRuleCommand({ Name: RULE_NAME })
        : new EnableRuleCommand({ Name: RULE_NAME })

      await cloudwatchEventsClient.send(command)
      scheduleEnabled = !scheduleEnabled
    } catch (error) {
      console.error('Error updating schedule:', error)
      return { statusCode: 500, body: 'Failed to update schedule' }
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: renderPage(scheduleEnabled, TOKEN),
  }
}
