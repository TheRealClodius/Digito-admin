import type { PreSignUpTriggerHandler } from 'aws-lambda';

/**
 * Pre-Signup Lambda Handler
 *
 * Verifies that a user is pre-approved before allowing Cognito registration.
 * Calls the admin dashboard's webhook to check if the email exists in MongoDB.
 *
 * Flow:
 * 1. AdminCreateUser → allow immediately (already pre-approved)
 * 2. ExternalProvider (Google) or normal signup → call webhook
 * 3. If approved → allow signup (auto-confirm for external providers)
 * 4. If not approved → throw error (blocks signup)
 */
export const handler: PreSignUpTriggerHandler = async (event) => {
  console.log(`PreSignUp trigger: ${event.triggerSource} for ${event.request.userAttributes.email}`);

  const { email } = event.request.userAttributes;
  const triggerSource = event.triggerSource;
  const apiUrl = process.env.API_URL;
  const webhookSecret = process.env.WEBHOOK_SECRET;

  // Admin-created users are already pre-approved
  if (triggerSource === 'PreSignUp_AdminCreateUser') {
    console.log('Admin-created user, allowing signup');
    return event;
  }

  if (!apiUrl) {
    console.error('API_URL is not defined in environment variables');
    throw new Error('Configurazione del sistema non valida. Contatta l\'amministratore.');
  }

  if (!email) {
    console.error('Email not provided in signup event');
    throw new Error('Email non fornita durante la registrazione.');
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': webhookSecret || '',
      },
      body: JSON.stringify({
        email: email.toLowerCase(),
        triggerSource,
      }),
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error(`Failed to parse webhook response: ${responseText.substring(0, 500)}`);
      throw new Error('Risposta del server non valida. Contatta l\'amministratore.');
    }

    if (!response.ok || !result.approved) {
      console.log(`User ${email} not pre-approved, blocking signup`);
      throw new Error(
        result.message ||
          'Account non autorizzato. Contatta l\'amministratore per richiedere l\'accesso.'
      );
    }

    console.log(`User ${email} is pre-approved, allowing signup`);

    // Auto-confirm external provider users (Google OAuth)
    if (triggerSource === 'PreSignUp_ExternalProvider') {
      event.response.autoConfirmUser = true;
      event.response.autoVerifyEmail = true;
    }

    return event;
  } catch (error) {
    if (error instanceof Error && (error.message.includes('non autorizzato') || error.message.includes('Configurazione'))) {
      throw error;
    }
    console.error('Error calling verification webhook:', error);
    throw new Error('Errore durante la verifica dell\'account. Riprova più tardi.');
  }
};
