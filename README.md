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

export the following environment variables:

- `PRENOTAMI_EMAIL`: your email
- `PRENOTAMI_PASSWORD`: your password

Then run

```bash
node --import tsx ./src/local_test.ts
```

... and now keep your finger crossed! 🤞

## Install as a Lambda with periodic checks

Coming soon...
