import type { CreateAuthChallengeTriggerHandler } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({ region: process.env.AWS_REGION || 'eu-south-1' });

export const handler: CreateAuthChallengeTriggerHandler = async (event) => {
  const { request } = event;

  // Generate a random 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Store in privateChallengeParameters (not visible to client)
  event.response.privateChallengeParameters = { answer: code };
  event.response.challengeMetadata = 'OTP_CODE';

  // Always send the code via email on every invocation.
  // On retry, a new code is generated — the user receives a fresh email with the updated code.
  // userAttributes.email may be empty for federated users;
  // fall back to event.userName which equals the email when
  // the User Pool uses email as username_attribute.
  const email = request.userAttributes.email || event.userName;

  if (!email || !email.includes('@')) {
    console.error(`User email not found. userAttributes.email=${request.userAttributes.email}, userName=${event.userName}`);
    throw new Error('Email non trovata per questo account. Contatta l\'amministratore.');
  }

  try {
    const command = new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL || 'noreply@simonemarra.it',
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: 'Il tuo codice di accesso Goodgest', Charset: 'UTF-8' },
        Body: {
          Html: {
            Data: `
              <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb;">Codice di Accesso</h2>
                    <p>Il tuo codice di accesso è:</p>
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                      <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1f2937;">${code}</span>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">Questo codice scadrà tra 5 minuti.</p>
                    <p style="color: #6b7280; font-size: 14px;">Se non hai richiesto questo codice, ignora questa email.</p>
                  </div>
                </body>
              </html>
            `,
            Charset: 'UTF-8',
          },
          Text: {
            Data: `Il tuo codice di accesso è: ${code}\n\nQuesto codice scadrà tra 5 minuti.\nSe non hai richiesto questo codice, ignora questa email.`,
            Charset: 'UTF-8',
          },
        },
      },
    });

    await sesClient.send(command);
    console.log(`OTP code sent to ${email} (attempt ${request.session.length + 1})`);
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Impossibile inviare il codice OTP. Riprova più tardi.');
  }

  return event;
};
