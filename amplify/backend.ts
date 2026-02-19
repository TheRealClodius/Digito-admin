import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement, ManagedPolicy, Effect } from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib';
import { auth } from './auth/resource.ts';
import { preSignUp } from './auth/pre-signup/resource.ts';
import { postConfirmation } from './auth/post-confirmation/resource.ts';
import { postAuthentication } from './auth/post-authentication/resource.ts';
import { defineAuthChallenge } from './auth/define-auth-challenge/resource.ts';
import { createAuthChallenge } from './auth/create-auth-challenge/resource.ts';
import { verifyAuthChallengeResponse } from './auth/verify-auth-challenge-response/resource.ts';

const backend = defineBackend({
  auth,
  preSignUp,
  postConfirmation,
  postAuthentication,
  defineAuthChallenge,
  createAuthChallenge,
  verifyAuthChallengeResponse,
});

// Grant SES permissions to the createAuthChallenge Lambda (for OTP emails)
backend.createAuthChallenge.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['ses:SendEmail', 'ses:SendRawEmail'],
    resources: ['*'],
  })
);

/**
 * Managed policy for Cognito admin operations.
 * After deployment, manually attach this policy's ARN to the
 * Amplify Hosting compute role in the AWS Console.
 */
const stack = Stack.of(backend.auth.resources.userPool);
const cognitoAdminPolicy = new ManagedPolicy(stack, 'CognitoAdminPolicy', {
  managedPolicyName: `amplify-cognito-admin-${stack.stackName}`,
  description: 'Allows server-side functions to manage Cognito users',
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'cognito-idp:AdminCreateUser',
        'cognito-idp:AdminDeleteUser',
        'cognito-idp:AdminUpdateUserAttributes',
        'cognito-idp:AdminSetUserPassword',
        'cognito-idp:AdminDisableUser',
        'cognito-idp:AdminEnableUser',
        'cognito-idp:AdminGetUser',
        'cognito-idp:ListUsers',
      ],
      resources: [backend.auth.resources.userPool.userPoolArn],
    }),
  ],
});

backend.addOutput({
  custom: {
    cognitoAdminPolicyArn: cognitoAdminPolicy.managedPolicyArn,
  },
});
