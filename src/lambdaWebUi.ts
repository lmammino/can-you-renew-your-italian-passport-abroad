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
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Scheduler Status</title>
    <style>
      /* Base styles */
      :root {
        --primary-color: #4f46e5;
        --primary-hover: #4338ca;
        --success-color: #10b981;
        --danger-color: #ef4444;
        --text-color: #1f2937;
        --background-color: #f9fafb;
        --card-background: #ffffff;
        --border-color: #e5e7eb;
      }
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      }
      
      body {
        background-color: var(--background-color);
        color: var(--text-color);
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 1rem;
      }
      
      /* Card container */
      .card {
        background-color: var(--card-background);
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        width: 100%;
        max-width: 400px;
        padding: 2rem;
        text-align: center;
      }
      
      /* Status indicator */
      .status {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 1.5rem;
        padding: 0.75rem;
        border-radius: 0.375rem;
        display: inline-block;
      }
      
      .status.enabled {
        background-color: rgba(16, 185, 129, 0.1);
        color: var(--success-color);
      }
      
      .status.disabled {
        background-color: rgba(239, 68, 68, 0.1);
        color: var(--danger-color);
      }
      
      /* Form styles */
      form {
        margin-top: 1rem;
      }
      
      button {
        background-color: var(--primary-color);
        color: white;
        border: none;
        border-radius: 0.375rem;
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s ease;
        width: 100%;
      }
      
      button:hover {
        background-color: var(--primary-hover);
      }
      
      button.enable {
        background-color: var(--success-color);
      }
      
      button.enable:hover {
        background-color: #0da271;
      }
      
      button.disable {
        background-color: var(--danger-color);
      }
      
      button.disable:hover {
        background-color: #dc2626;
      }
      
      /* Header */
      .header {
        margin-bottom: 2rem;
      }
      
      .header h1 {
        font-size: 1.5rem;
        color: var(--text-color);
        margin-bottom: 0.5rem;
      }
      
      /* Responsive adjustments */
      @media (min-width: 640px) {
        .card {
          padding: 2.5rem;
        }
        
        .header h1 {
          font-size: 1.75rem;
        }
        
        button {
          width: auto;
          min-width: 150px;
        }
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <h1>Scheduler Status</h1>
      </div>
      
      <p class="status ${scheduleEnabled ? 'enabled' : 'disabled'}">
        Scheduler is currently ${scheduleEnabled ? 'enabled' : 'disabled'}
      </p>
      
      <form method="POST" action="/?token=${encodeURIComponent(token)}">
        <button type="submit" class="${scheduleEnabled ? 'disable' : 'enable'}">
          ${scheduleEnabled ? 'Disable Scheduler' : 'Enable Scheduler'}
        </button>
      </form>
    </div>
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
