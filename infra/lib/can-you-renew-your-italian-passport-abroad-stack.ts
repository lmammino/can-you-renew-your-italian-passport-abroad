import { join } from 'node:path'
import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as events from 'aws-cdk-lib/aws-events'
import * as targets from 'aws-cdk-lib/aws-events-targets'
import * as iam from 'aws-cdk-lib/aws-iam'
import {
  Architecture,
  Runtime,
  FunctionUrl,
  FunctionUrlAuthType,
} from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions'
import type { Construct } from 'constructs'

export type CanYouRenewYourItalianPassportAbroadStackProps = cdk.StackProps & {
  notificationEmail: string
  prenotamiEmail: string
  prenotamiPassword: string
}

export class CanYouRenewYourItalianPassportAbroadStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: CanYouRenewYourItalianPassportAbroadStackProps,
  ) {
    super(scope, id, props)

    const storageBucket = new s3.Bucket(this, 'Storage', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })

    const statsTable = new dynamodb.Table(this, 'Stats', {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    const notificationTopic = new sns.Topic(this, 'Notifications')
    notificationTopic.addSubscription(
      new snsSubscriptions.EmailSubscription(props.notificationEmail),
    )

    const lambdaFn = new NodejsFunction(this, 'LambdaFn', {
      description:
        "Checks if there's an available appointment for renewing an Italian passport",
      handler: 'handler',
      entry: join(__dirname, '..', '..', 'src', 'lambda.ts'),
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.X86_64,
      logRetention: 30,
      timeout: cdk.Duration.seconds(900),
      memorySize: 1024,
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        // TODO: move this to Secrets Manager or SSM
        PRENOTAMI_EMAIL: props.prenotamiEmail,
        PRENOTAMI_PASSWORD: props.prenotamiPassword,
        TABLE_NAME: statsTable.tableName,
        BUCKET_NAME: storageBucket.bucketName,
        NOTIFICATION_TOPIC_ARN: notificationTopic.topicArn,
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
        nodeModules: ['playwright-core', '@sparticuz/chromium'],
      },
    })

    const lambdaSchedule = new events.Rule(this, 'LambdaScheduleRule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(30)),
      targets: [new targets.LambdaFunction(lambdaFn)],
    })

    storageBucket.grantWrite(lambdaFn)
    statsTable.grantWriteData(lambdaFn)
    notificationTopic.grantPublish(lambdaFn)

    const lambdaWebUi = new NodejsFunction(this, 'LambdaWebUi', {
      description: 'Provides a minimal web ui to enable/disable the scheduler',
      handler: 'handler',
      entry: join(__dirname, '..', '..', 'src', 'lambdaWebUi.ts'),
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.X86_64,
      logRetention: 7,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        // TODO: move this to Secrets Manager or SSM
        TOKEN: 'unicorn',
        RULE_NAME: lambdaSchedule.ruleName,
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
        nodeModules: [],
      },
    })

    lambdaWebUi.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'events:DescribeRule',
          'events:EnableRule',
          'events:DisableRule',
        ],
        resources: [lambdaSchedule.ruleArn],
      }),
    )

    const fUrl = new FunctionUrl(this, 'LambdaFunctionUrl', {
      function: lambdaWebUi,
      authType: FunctionUrlAuthType.NONE, // We rely on basic auth inside the function
    })

    new cdk.CfnOutput(this, 'FunctionUrl', {
      value: fUrl.url,
      description: 'The URL to the lambda function dashboard',
    })
  }
}
