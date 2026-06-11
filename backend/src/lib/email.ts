import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

export interface EmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n📧 [EMAIL]')
    console.log(`  To: ${to}`)
    console.log(`  Subject: ${subject}`)
    console.log(`  Body: ${html}\n`)
    return
  }

  const ses = new SESClient({ region: process.env.AWS_REGION ?? 'ap-southeast-1' })
  await ses.send(new SendEmailCommand({
    Source: process.env.EMAIL_FROM!,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: { Html: { Data: html } },
    },
  }))
}
