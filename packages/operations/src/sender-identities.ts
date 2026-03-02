import { prisma } from '@iwb/db';

export interface AddCustomDomainParams {
  tenantId: string;
  email: string; // e.g., noreply@mycompany.com
}

export interface AddCustomDomainResult {
  senderIdentityId: string;
  domain: string;
  status: 'PENDING';
  verificationInstructions: {
    type: 'SES_DOMAIN_VERIFICATION';
    domain: string;
    dkimTokens: string[];
    dkimCname: string;
    spfRecord: string;
    dmarcRecord: string;
    manualUrl: string; // Link to AWS SES verification in AWS Console
  };
}

/**
 * Add custom email domain for sending
 * Stub: Just creates verification task, doesn't call SES yet
 * TODO (Batch 4.5): Wire up SES VerifyDomainIdentity API
 */
export async function addCustomDomain(
  params: AddCustomDomainParams
): Promise<AddCustomDomainResult> {
  const { tenantId, email } = params;

  // Extract domain from email
  const [, domain] = email.split('@');
  if (!domain) {
    throw new Error('Invalid email format');
  }

  // Check if already exists
  const existing = await prisma.senderIdentity.findFirst({
    where: {
      tenantId,
      type: 'EMAIL_DOMAIN',
      value: domain,
    },
  });

  if (existing) {
    throw new Error('Domain already registered');
  }

  // Create sender identity (status: PENDING)
  const identity = await prisma.senderIdentity.create({
    data: {
      tenantId,
      type: 'EMAIL_DOMAIN',
      value: domain,
      status: 'PENDING',
      meta: { email, createdAt: new Date().toISOString() },
    },
  });

  // Create verification task
  await prisma.verificationTask.create({
    data: {
      tenantId,
      type: 'SES_DOMAIN',
      resourceId: identity.id,
      status: 'PENDING',
      verificationUrl: `https://console.aws.amazon.com/ses/home?region=ap-south-1#verified-senders:${domain}`,
    },
  });

  // TODO (Batch 4.5): Call SES VerifyDomainIdentity(domain)
  // For now, return hardcoded mock instructions
  return {
    senderIdentityId: identity.id,
    domain,
    status: 'PENDING',
    verificationInstructions: {
      type: 'SES_DOMAIN_VERIFICATION',
      domain,
      dkimTokens: ['mock-token-1', 'mock-token-2', 'mock-token-3'],
      dkimCname: `${domain}._domainkey.${domain}.dkim.amazonses.com`,
      spfRecord: `v=spf1 include:sendingthrough.ses.amazonaws.com ~all`,
      dmarcRecord: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}`,
      manualUrl: `https://console.aws.amazon.com/ses/home?region=ap-south-1#verified-senders:${domain}`,
    },
  };
}

/**
 * List sender identities for a tenant
 */
export async function listSenderIdentities(tenantId: string) {
  return prisma.senderIdentity.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get sender identity by ID
 */
export async function getSenderIdentity(id: string, tenantId: string) {
  return prisma.senderIdentity.findFirst({
    where: { id, tenantId },
  });
}

/**
 * Delete sender identity
 */
export async function deleteSenderIdentity(id: string, tenantId: string) {
  // Check if in use by any routes
  const inUse = await prisma.message.findFirst({
    where: { tenantId, from: id },
  });

  if (inUse) {
    throw new Error('Cannot delete: in use by active messages');
  }

  return prisma.senderIdentity.delete({
    where: { id },
  });
}
