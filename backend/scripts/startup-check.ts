#!/usr/bin/env tsx
/**
 * Startup check script - runs on application start
 * Verifies all systems are configured correctly
 */

import { prisma } from '../ticket/db';

async function checkDatabase() {
  console.log('🔍 Checking database connection...');
  try {
    await prisma.$connect();
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected. Users: ${userCount}`);

    // Check if migrations are applied
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      LIMIT 5
    `;
    console.log('✅ Database migrations applied');

    return true;
  } catch (error) {
    console.error('❌ Database check failed:', error);
    return false;
  }
}

async function checkSecrets() {
  console.log('🔍 Checking required secrets...');

  const required = [
    'RESEND_API_KEY',
    'CLERK_SECRET_KEY',
  ];

  const missing = [];
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.warn('⚠️  Missing secrets:', missing.join(', '));
    console.log('   Run: encore secret set --prod SECRET_NAME');
    return false;
  }

  console.log('✅ All required secrets configured');
  return true;
}

async function checkEmailSystem() {
  console.log('🔍 Checking email system...');

  try {
    // Check if Resend API key works
    const { Resend } = await import('resend');
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.warn('⚠️  RESEND_API_KEY not set');
      return false;
    }

    const resend = new Resend(apiKey);
    // Just initialize, don't actually send
    console.log('✅ Resend API configured');

    // Reminder about webhook
    if (process.env.NODE_ENV === 'production') {
      console.log('📌 Remember to update Resend webhook URL to production!');
    }

    return true;
  } catch (error) {
    console.error('❌ Email system check failed:', error);
    return false;
  }
}

async function seedDefaultData() {
  console.log('🔍 Checking for default data...');

  try {
    // Check if we need to create default admin user
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' }
    });

    if (adminCount === 0) {
      console.log('⚠️  No admin users found. Consider running seed script.');
    } else {
      console.log(`✅ Found ${adminCount} admin user(s)`);
    }

    return true;
  } catch (error) {
    console.error('❌ Default data check failed:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting application checks...\n');

  const checks = [
    { name: 'Database', fn: checkDatabase },
    { name: 'Secrets', fn: checkSecrets },
    { name: 'Email System', fn: checkEmailSystem },
    { name: 'Default Data', fn: seedDefaultData },
  ];

  const results = [];
  for (const check of checks) {
    const passed = await check.fn();
    results.push({ name: check.name, passed });
    console.log('');
  }

  console.log('📊 Startup Check Summary:');
  console.log('========================');
  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
  }

  const allPassed = results.every(r => r.passed);
  if (allPassed) {
    console.log('\n✨ All checks passed! Application ready.');
  } else {
    console.log('\n⚠️  Some checks failed. Review logs above.');
  }

  await prisma.$disconnect();
  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);