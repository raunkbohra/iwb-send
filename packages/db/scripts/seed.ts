import { prisma } from '../src/client';

/**
 * Database seeding script for development and testing
 *
 * Populates the database with:
 * - 3 test tenants (Nepal, India, Global)
 * - Users per tenant (Owner, Admin, Member roles)
 * - API keys with scopes
 * - Provider accounts (SMS, Email, WhatsApp)
 * - Routes (SMS routing preferences)
 * - Sender identities
 * - Sample templates
 */

async function main() {
  try {
    console.log('🌱 Starting database seed...\n');

    // Clear existing data (be careful in production!)
    if (process.env.RESET_DB === 'true') {
      console.log('⚠️  Clearing existing data...');
      await prisma.messageEvent.deleteMany({});
      await prisma.message.deleteMany({});
      await prisma.webhookDelivery.deleteMany({});
      await prisma.webhookEndpoint.deleteMany({});
      await prisma.walletLedgerEntry.deleteMany({});
      await prisma.walletAccount.deleteMany({});
      await prisma.route.deleteMany({});
      await prisma.template.deleteMany({});
      await prisma.senderIdentity.deleteMany({});
      await prisma.providerAccount.deleteMany({});
      await prisma.apiKey.deleteMany({});
      await prisma.user.deleteMany({});
      await prisma.tenant.deleteMany({});
      console.log('✓ Data cleared\n');
    }

    // Create test tenants
    console.log('📝 Creating test tenants...');

    const tenantNP = await prisma.tenant.upsert({
      where: { slug: 'test-np' },
      update: {},
      create: {
        name: 'Test Tenant Nepal',
        slug: 'test-np',
        status: 'ACTIVE',
        kycStatus: 'APPROVED',
        countryPrimary: 'NP',
        dailySmsLimit: BigInt(10000),
        dailyEmailLimit: BigInt(5000),
        dailyWhatsappLimit: BigInt(1000),
        dailyVoiceLimit: BigInt(500),
      },
    });

    const tenantIN = await prisma.tenant.upsert({
      where: { slug: 'test-in' },
      update: {},
      create: {
        name: 'Test Tenant India',
        slug: 'test-in',
        status: 'ACTIVE',
        kycStatus: 'APPROVED',
        countryPrimary: 'IN',
        dailySmsLimit: BigInt(50000),
        dailyEmailLimit: BigInt(25000),
        dailyWhatsappLimit: BigInt(5000),
        dailyVoiceLimit: BigInt(2000),
      },
    });

    const tenantGL = await prisma.tenant.upsert({
      where: { slug: 'test-global' },
      update: {},
      create: {
        name: 'Test Tenant Global',
        slug: 'test-global',
        status: 'ACTIVE',
        kycStatus: 'APPROVED',
        countryPrimary: 'US',
        dailySmsLimit: BigInt(100000),
        dailyEmailLimit: BigInt(100000),
        dailyWhatsappLimit: BigInt(10000),
        dailyVoiceLimit: BigInt(5000),
      },
    });

    console.log(`✓ Created 3 test tenants\n`);

    // Create users
    console.log('👤 Creating test users...');

    const userOwnerNP = await prisma.user.create({
      data: {
        tenantId: tenantNP.id,
        email: 'owner@test-np.local',
        name: 'Owner Nepal',
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });

    const userAdminIN = await prisma.user.create({
      data: {
        tenantId: tenantIN.id,
        email: 'admin@test-in.local',
        name: 'Admin India',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    console.log(`✓ Created test users\n`);

    // Create API keys
    console.log('🔑 Creating test API keys...');

    const apiKey1 = await prisma.apiKey.create({
      data: {
        tenantId: tenantNP.id,
        name: 'Development Key',
        keyPrefix: 'test_np_dev',
        keyHash: 'hash_placeholder_np_dev', // Would be SHA256(raw key) in production
        scopes: ['sms:send', 'email:send', 'whatsapp:send'],
        status: 'ACTIVE',
      },
    });

    const apiKey2 = await prisma.apiKey.create({
      data: {
        tenantId: tenantIN.id,
        name: 'Production Key',
        keyPrefix: 'test_in_prod',
        keyHash: 'hash_placeholder_in_prod',
        scopes: ['sms:send', 'email:send', 'whatsapp:send', 'voice:initiate'],
        status: 'ACTIVE',
      },
    });

    console.log(`✓ Created test API keys\n`);

    // Create provider accounts
    console.log('🔌 Creating provider accounts...');

    const providerSpacrow = await prisma.providerAccount.create({
      data: {
        tenantId: tenantNP.id,
        provider: 'SPARROW',
        channel: 'SMS',
        status: 'ACTIVE',
        credentialsRef: 'iwb/provider/SPARROW/test-np',
        config: {
          senderId: 'iWB',
          region: 'ap-south-1',
        },
        healthScore: 95,
      },
    });

    const providerAakash = await prisma.providerAccount.create({
      data: {
        tenantId: tenantNP.id,
        provider: 'AAKASH',
        channel: 'SMS',
        status: 'ACTIVE',
        credentialsRef: 'iwb/provider/AAKASH/test-np',
        config: {
          region: 'ap-south-1',
        },
        healthScore: 90,
      },
    });

    const providerSES = await prisma.providerAccount.create({
      data: {
        tenantId: tenantIN.id,
        provider: 'SES',
        channel: 'EMAIL',
        status: 'ACTIVE',
        credentialsRef: 'iwb/provider/SES/test-in',
        config: {
          region: 'ap-south-1',
          configSetName: 'iwb-transactional',
        },
        healthScore: 98,
      },
    });

    const providerMetaWA = await prisma.providerAccount.create({
      data: {
        tenantId: tenantIN.id,
        provider: 'META_WA',
        channel: 'WHATSAPP',
        status: 'ACTIVE',
        credentialsRef: 'iwb/provider/META_WA/test-in',
        config: {
          region: 'ap-south-1',
        },
        healthScore: 92,
      },
    });

    console.log(`✓ Created provider accounts\n`);

    // Create routes (routing preferences)
    console.log('🛣️  Creating message routes...');

    // Nepal SMS routing: Sparrow (high), Aakash (fallback)
    await prisma.route.create({
      data: {
        tenantId: tenantNP.id,
        channel: 'SMS',
        countryCode: 'NP',
        providerAccountId: providerSpacrow.id,
        priority: 1,
        weight: 70,
        isActive: true,
      },
    });

    await prisma.route.create({
      data: {
        tenantId: tenantNP.id,
        channel: 'SMS',
        countryCode: 'NP',
        providerAccountId: providerAakash.id,
        priority: 2,
        weight: 30,
        isActive: true,
      },
    });

    // India Email routing: SES
    await prisma.route.create({
      data: {
        tenantId: tenantIN.id,
        channel: 'EMAIL',
        countryCode: 'IN',
        providerAccountId: providerSES.id,
        priority: 1,
        weight: 100,
        isActive: true,
      },
    });

    // India WhatsApp routing: Meta WA
    await prisma.route.create({
      data: {
        tenantId: tenantIN.id,
        channel: 'WHATSAPP',
        countryCode: 'IN',
        providerAccountId: providerMetaWA.id,
        priority: 1,
        weight: 100,
        isActive: true,
      },
    });

    console.log(`✓ Created message routes\n`);

    // Create sender identities
    console.log('📬 Creating sender identities...');

    await prisma.senderIdentity.create({
      data: {
        tenantId: tenantNP.id,
        type: 'SMS_SENDER_ID',
        value: 'iWB',
        status: 'VERIFIED',
        meta: {
          country: 'NP',
          approved: true,
        },
      },
    });

    await prisma.senderIdentity.create({
      data: {
        tenantId: tenantIN.id,
        type: 'EMAIL_DOMAIN',
        value: 'noreply@test-in.local',
        status: 'VERIFIED',
        meta: {
          dkim: true,
          spf: true,
          dmarc: true,
        },
      },
    });

    await prisma.senderIdentity.create({
      data: {
        tenantId: tenantIN.id,
        type: 'WA_PHONE',
        value: '+919876543210',
        status: 'VERIFIED',
        meta: {
          displayName: 'iWB Support',
          template: 'approved',
        },
      },
    });

    console.log(`✓ Created sender identities\n`);

    // Create templates
    console.log('📋 Creating message templates...');

    await prisma.template.create({
      data: {
        tenantId: tenantNP.id,
        channel: 'SMS',
        purpose: 'OTP',
        name: 'OTP Verification',
        content: {
          text: 'Your verification code is {{code}}. Valid for 10 minutes.',
        },
        status: 'APPROVED',
      },
    });

    await prisma.template.create({
      data: {
        tenantId: tenantIN.id,
        channel: 'EMAIL',
        purpose: 'TRANSACTIONAL',
        name: 'Welcome Email',
        content: {
          subject: 'Welcome to iWB Send',
          html: '<h1>Welcome {{name}}!</h1><p>Thank you for joining.</p>',
          text: 'Welcome to iWB Send!',
        },
        status: 'APPROVED',
      },
    });

    await prisma.template.create({
      data: {
        tenantId: tenantIN.id,
        channel: 'WHATSAPP',
        purpose: 'TRANSACTIONAL',
        name: 'Order Confirmation',
        externalTemplateId: 'order_confirmation',
        content: {
          templateName: 'order_confirmation',
          templateLanguage: 'en_US',
        },
        status: 'APPROVED',
      },
    });

    console.log(`✓ Created templates\n`);

    // Create wallet accounts
    console.log('💰 Creating wallet accounts...');

    await prisma.walletAccount.create({
      data: {
        tenantId: tenantNP.id,
        balanceUnits: BigInt(1000000), // $1.00 in units
        currency: 'USD',
      },
    });

    await prisma.walletAccount.create({
      data: {
        tenantId: tenantIN.id,
        balanceUnits: BigInt(5000000), // $5.00 in units
        currency: 'USD',
      },
    });

    console.log(`✓ Created wallet accounts\n`);

    // Create webhook endpoints
    console.log('🪝 Creating webhook endpoints...');

    await prisma.webhookEndpoint.create({
      data: {
        tenantId: tenantNP.id,
        url: 'https://webhook.example.com/events',
        secretHash: 'webhook_secret_hash_np', // Would be HMAC-SHA256 in production
        events: ['MESSAGE_SENT', 'MESSAGE_DELIVERED', 'MESSAGE_FAILED'],
        status: 'ACTIVE',
      },
    });

    console.log(`✓ Created webhook endpoints\n`);

    console.log('✅ Database seeding completed successfully!\n');
    console.log('Test data created:');
    console.log(`  • 3 tenants (NP, IN, Global)`);
    console.log(`  • 2 users (Owner, Admin)`);
    console.log(`  • 2 API keys`);
    console.log(`  • 4 provider accounts (Sparrow, Aakash, SES, Meta WA)`);
    console.log(`  • 4 routes`);
    console.log(`  • 3 sender identities`);
    console.log(`  • 3 templates`);
    console.log(`  • 2 wallet accounts`);
    console.log(`  • 1 webhook endpoint\n`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
