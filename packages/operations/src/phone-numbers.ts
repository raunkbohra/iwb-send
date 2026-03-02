import { prisma } from '@iwb/db';

export interface SearchAvailableParams {
  tenantId: string;
  country: string; // e.g., "NP", "US"
  type: 'SMS' | 'VOICE' | 'WHATSAPP';
}

export interface AvailableNumber {
  number: string;
  country: string;
  type: string;
  provider: string;
  monthlyPrice: number; // In dollars
}

/**
 * Search available phone numbers from Telnyx
 * Stub: Returns mock numbers
 * TODO (Batch 4.5): Wire up Telnyx Numbering API
 */
export async function searchAvailable(
  params: SearchAvailableParams
): Promise<AvailableNumber[]> {
  const { country, type } = params;

  // Mock available numbers by country
  const mockNumbers: Record<string, AvailableNumber[]> = {
    NP: [
      {
        number: '+9779801000001',
        country: 'NP',
        type: 'SMS',
        provider: 'TELNYX',
        monthlyPrice: 5,
      },
      {
        number: '+9779801000002',
        country: 'NP',
        type: 'SMS',
        provider: 'TELNYX',
        monthlyPrice: 5,
      },
      {
        number: '+9779801000003',
        country: 'NP',
        type: 'VOICE',
        provider: 'TELNYX',
        monthlyPrice: 15,
      },
    ],
    IN: [
      {
        number: '+919900000001',
        country: 'IN',
        type: 'SMS',
        provider: 'TELNYX',
        monthlyPrice: 3,
      },
      {
        number: '+919900000002',
        country: 'IN',
        type: 'SMS',
        provider: 'TELNYX',
        monthlyPrice: 3,
      },
      {
        number: '+919900000003',
        country: 'IN',
        type: 'VOICE',
        provider: 'TELNYX',
        monthlyPrice: 10,
      },
    ],
    US: [
      {
        number: '+14155550001',
        country: 'US',
        type: 'SMS',
        provider: 'TELNYX',
        monthlyPrice: 1.5,
      },
      {
        number: '+14155550002',
        country: 'US',
        type: 'VOICE',
        provider: 'TELNYX',
        monthlyPrice: 8,
      },
    ],
  };

  const available = mockNumbers[country] || [];
  return available.filter((n) => n.type === type);
}

/**
 * Reserve a phone number
 * Stub: Just creates DB record, no purchase yet
 * TODO (Batch 4.5): Call Telnyx Order Number API
 */
export async function reservePhoneNumber(
  tenantId: string,
  number: string,
  country: string,
  type: string
) {
  // Check if already reserved
  const existing = await prisma.phoneNumber.findFirst({
    where: {
      tenantId,
      number,
    },
  });

  if (existing) {
    throw new Error('Number already reserved by you');
  }

  // Get pricing
  const available = await searchAvailable({ tenantId, country, type: type as any });
  const pricing = available.find((n) => n.number === number);
  const monthlyRentMicro = BigInt(Math.round((pricing?.monthlyPrice || 10) * 1_000_000));

  // Create phone number record
  const phoneNumber = await prisma.phoneNumber.create({
    data: {
      tenantId,
      country,
      number,
      provider: 'TELNYX',
      type,
      status: 'ACTIVE',
      monthlyRent: monthlyRentMicro,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    },
  });

  // Create verification task
  await prisma.verificationTask.create({
    data: {
      tenantId,
      type: 'PHONE_NUMBER',
      resourceId: phoneNumber.id,
      status: 'COMPLETED', // Auto-complete for now
    },
  });

  // TODO (Batch 4.5): Actually call Telnyx API to purchase
  // TODO (Batch 4.5): Charge wallet

  return phoneNumber;
}

/**
 * List reserved phone numbers
 */
export async function listPhoneNumbers(tenantId: string) {
  return prisma.phoneNumber.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get phone number by ID
 */
export async function getPhoneNumber(id: string, tenantId: string) {
  return prisma.phoneNumber.findFirst({
    where: { id, tenantId },
  });
}

/**
 * Release phone number
 */
export async function releasePhoneNumber(id: string, tenantId: string) {
  const phoneNumber = await prisma.phoneNumber.findFirst({
    where: { id, tenantId },
  });

  if (!phoneNumber) {
    throw new Error('Phone number not found');
  }

  // TODO (Batch 4.5): Call Telnyx API to release
  // TODO (Batch 4.5): Refund wallet

  return prisma.phoneNumber.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });
}
