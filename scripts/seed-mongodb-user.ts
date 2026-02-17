/**
 * Seed an admin user into MongoDB
 *
 * Usage:
 *   pnpm tsx scripts/seed-mongodb-user.ts
 *
 * Interactive prompts will ask for: email, firstName, lastName, role.
 * The user is created as active with cognitoSub="SEED" (updated on first Cognito login).
 *
 * Requires MONGODB_URI in .env
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';
import * as readline from 'readline';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_ADMIN_DB_NAME = process.env.MONGODB_ADMIN_DB_NAME || 'goodgest-admin';

const VALID_ROLES = ['superadmin', 'clientAdmin', 'eventAdmin'] as const;
type AdminRole = (typeof VALID_ROLES)[number];

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not set in .env');
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    // Collect input
    const email = (await ask(rl, 'Email: ')).trim().toLowerCase();
    if (!email || !email.includes('@')) {
      console.error('Invalid email');
      process.exit(1);
    }

    const firstName = (await ask(rl, 'First name: ')).trim();
    const lastName = (await ask(rl, 'Last name: ')).trim();

    console.log('Available roles:');
    VALID_ROLES.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
    const roleInput = (await ask(rl, 'Role (name or number): ')).trim();
    const roleIndex = Number(roleInput);
    const role: AdminRole =
      roleIndex >= 1 && roleIndex <= VALID_ROLES.length
        ? VALID_ROLES[roleIndex - 1]
        : (roleInput as AdminRole);
    if (!VALID_ROLES.includes(role)) {
      console.error(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
      process.exit(1);
    }

    rl.close();

    // Determine scope based on role
    const clientIds = role === 'superadmin' ? null : [];
    const eventCodes = role === 'superadmin' ? null : [];

    const now = new Date();
    const document = {
      cognitoSub: 'SEED',
      email,
      role,
      clientIds,
      eventCodes,
      firstName,
      lastName,
      isActive: true,
      language: 'it' as const,
      createdAt: now,
      updatedAt: now,
      createdBy: 'SEED',
      updatedBy: 'SEED',
    };

    // Connect and insert
    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(MONGODB_ADMIN_DB_NAME);
    const collection = db.collection('adminUsers');

    const existing = await collection.findOne({ email });
    if (existing) {
      console.error(`User with email "${email}" already exists`);
      await client.close();
      process.exit(1);
    }

    await collection.insertOne(document);
    console.log(`\nUser created successfully:`);
    console.log(`  Email:  ${email}`);
    console.log(`  Name:   ${firstName} ${lastName}`);
    console.log(`  Role:   ${role}`);
    console.log(`\nThe cognitoSub will be linked automatically on first Cognito login.`);

    await client.close();
  } catch (error) {
    console.error('Error:', error);
    rl.close();
    process.exit(1);
  }
}

main();
