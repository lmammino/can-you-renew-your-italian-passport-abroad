import * as cdk from 'aws-cdk-lib'
import type { Construct } from 'constructs'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CanYouRenewYourItalianPassportAbroadStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    console.log('TODO: implement stack')

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'CanYouRenewYourItalianPassportAbroadQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
