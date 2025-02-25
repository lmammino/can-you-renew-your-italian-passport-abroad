# can-you-renew-your-italian-passport-abroad

The answer is likely to be NO! ...Because we all know Italian embassies are
always very very... busy! Poor them! 🥹

Anyway, this project lets you run a PlayWright script that automates your
browser to check if it is possible to renew your Italian passport abroad, or to
be more accurate, to book an appointment to do that.

## Install dependencies

```bash
pnpm install
```

## Run the script locally

Install your local binaries for `chromium`.

One way you could do this is by using `playwright`:

```bash
pnpm dlx playwright install --with-deps chromium
```

Then you need to export the following environment variables:

- `PRENOTAMI_EMAIL`: your email
- `PRENOTAMI_PASSWORD`: your password
- `CHROMIUM_PATH`: The full path to your chromium binary (on Mac this is
  generally under
  `/Library/Caches/ms-playwright/chromium-<version>/chrome-mac/Chromium.app/Contents/MacOS/Chromium`)

Then run

```bash
node --import tsx ./src/local_test.ts
```

... and now keep your finger crossed! 🤞

## Install as a Lambda with periodic checks

This project can deploy a Lambda to your AWS account that does the following:

- It's executed every 30 minutes to check availability
- If an appointment is available, it sends an email to the address you specify
- It will also store the results of every check in a DynamoDB table
- And it will store the screenshot and a DOM snapshot of the final page in an S3
  bucket

To deploy the Lambda, you need to have the AWS CLI installed and configured with
your credentials.

You also need to configure the following environment variables:

- `PRENOTAMI_EMAIL`: your email for logging in
- `PRENOTAMI_PASSWORD`: your password for logging in
- `NOTIFICATION_EMAIL`: the email address to send notifications to

Then you can run:

```bash
cd infra
cdk deploy
```

Note that the first time you deploy this you should receive an email to confirm
your SNS subscription and activate the email notifications.

Enjoy! 🎉
