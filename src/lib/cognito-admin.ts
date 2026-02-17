import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  AdminDeleteUserCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';

// Cached client for serverless reuse
let cognitoAdminClient: CognitoIdentityProviderClient | null = null;

function getConfig() {
  const region = process.env.COGNITO_REGION || 'eu-central-1';
  const userPoolId = process.env.COGNITO_USER_POOL_ID;

  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID is not configured');
  }

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  return {
    region,
    userPoolId,
    credentials:
      accessKeyId && secretAccessKey
        ? { accessKeyId, secretAccessKey }
        : undefined,
  };
}

export function getCognitoAdminClient(): CognitoIdentityProviderClient {
  if (!cognitoAdminClient) {
    const config = getConfig();
    cognitoAdminClient = new CognitoIdentityProviderClient({
      region: config.region,
      credentials: config.credentials,
    });
  }
  return cognitoAdminClient;
}

export function getUserPoolId(): string {
  return getConfig().userPoolId;
}

/**
 * Generate a temporary password satisfying Cognito complexity rules:
 * uppercase, lowercase, numbers, special characters.
 */
export function generateTemporaryPassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const all = uppercase + lowercase + numbers + special;

  let password = '';
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += special.charAt(Math.floor(Math.random() * special.length));

  for (let i = password.length; i < length; i++) {
    password += all.charAt(Math.floor(Math.random() * all.length));
  }

  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

/**
 * Create a user in Cognito with SUPPRESS message action (admin provides credentials).
 * Returns the cognitoSub for linking to MongoDB.
 */
export async function createCognitoUser(params: {
  email: string;
  temporaryPassword: string;
  firstName?: string;
  lastName?: string;
}): Promise<{ cognitoSub: string }> {
  const client = getCognitoAdminClient();
  const userPoolId = getUserPoolId();

  const userAttributes = [
    { Name: 'email', Value: params.email.toLowerCase() },
    { Name: 'email_verified', Value: 'true' },
  ];

  if (params.firstName) {
    userAttributes.push({ Name: 'given_name', Value: params.firstName });
  }
  if (params.lastName) {
    userAttributes.push({ Name: 'family_name', Value: params.lastName });
  }

  const createResponse = await client.send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: params.email.toLowerCase(),
      UserAttributes: userAttributes,
      TemporaryPassword: params.temporaryPassword,
      MessageAction: 'SUPPRESS',
    })
  );

  const subAttribute = createResponse.User?.Attributes?.find(
    (a) => a.Name === 'sub'
  );
  const cognitoSub = subAttribute?.Value || createResponse.User?.Username;

  if (!cognitoSub) {
    throw new Error('Failed to get Cognito sub from created user');
  }

  return { cognitoSub };
}

/** Update user attributes in Cognito (firstName, lastName) */
export async function updateCognitoUserAttributes(params: {
  email: string;
  firstName?: string;
  lastName?: string;
}): Promise<void> {
  const client = getCognitoAdminClient();
  const userPoolId = getUserPoolId();

  const userAttributes = [];
  if (params.firstName !== undefined) {
    userAttributes.push({ Name: 'given_name', Value: params.firstName || '' });
  }
  if (params.lastName !== undefined) {
    userAttributes.push({ Name: 'family_name', Value: params.lastName || '' });
  }

  if (userAttributes.length > 0) {
    await client.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: userPoolId,
        Username: params.email.toLowerCase(),
        UserAttributes: userAttributes,
      })
    );
  }
}

/** Reset user password with a new temporary password */
export async function resetCognitoUserPassword(params: {
  email: string;
  temporaryPassword: string;
}): Promise<void> {
  const client = getCognitoAdminClient();
  const userPoolId = getUserPoolId();

  await client.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: params.email.toLowerCase(),
      Password: params.temporaryPassword,
      Permanent: false,
    })
  );
}

/** Disable a user in Cognito (prevents login) */
export async function disableCognitoUser(email: string): Promise<void> {
  const client = getCognitoAdminClient();
  const userPoolId = getUserPoolId();

  await client.send(
    new AdminDisableUserCommand({
      UserPoolId: userPoolId,
      Username: email.toLowerCase(),
    })
  );
}

/** Enable a user in Cognito (allows login) */
export async function enableCognitoUser(email: string): Promise<void> {
  const client = getCognitoAdminClient();
  const userPoolId = getUserPoolId();

  await client.send(
    new AdminEnableUserCommand({
      UserPoolId: userPoolId,
      Username: email.toLowerCase(),
    })
  );
}

/**
 * Delete a user from Cognito.
 * Finds all identities (native + social) with the given email and deletes them all.
 */
export async function deleteCognitoUser(email: string): Promise<void> {
  const client = getCognitoAdminClient();
  const userPoolId = getUserPoolId();

  try {
    const listResponse = await client.send(
      new ListUsersCommand({
        UserPoolId: userPoolId,
        Filter: `email = "${email.toLowerCase()}"`,
      })
    );

    const usersToDelete = listResponse.Users || [];

    if (usersToDelete.length > 0) {
      await Promise.all(
        usersToDelete
          .filter((user) => user.Username)
          .map((user) =>
            client.send(
              new AdminDeleteUserCommand({
                UserPoolId: userPoolId,
                Username: user.Username!,
              })
            )
          )
      );
    } else {
      // Fallback: try direct delete by username = email
      await client.send(
        new AdminDeleteUserCommand({
          UserPoolId: userPoolId,
          Username: email.toLowerCase(),
        })
      );
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'UserNotFoundException') {
      return; // User already gone
    }
    throw error;
  }
}

/** Reset cached client (for testing) */
export function _resetClient() {
  cognitoAdminClient = null;
}
