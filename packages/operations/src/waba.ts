import { prisma } from '@iwb/db';

export interface InitiateOAuthParams {
  tenantId: string;
  redirectUri: string; // e.g., https://app.iwbsend.com/settings/whatsapp/callback
}

export interface InitiateOAuthResult {
  authUrl: string;
  state: string; // CSRF token
}

export interface HandleOAuthCallbackParams {
  tenantId: string;
  code: string;
  state: string;
}

export interface HandleOAuthCallbackResult {
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  status: 'PENDING_APPROVAL';
}

/**
 * Initiate Meta WhatsApp OAuth flow
 * Stub: Returns mock OAuth URL
 * TODO (Batch 4.5): Wire up Meta Graph API
 */
export async function initiateOAuth(
  params: InitiateOAuthParams
): Promise<InitiateOAuthResult> {
  const { tenantId, redirectUri } = params;

  // Generate CSRF state token
  const state = `state_${tenantId}_${Date.now()}`;

  // Store state in Redis/DB (stub: just return for now)
  // TODO: Store state temporarily for CSRF validation

  const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
  authUrl.searchParams.append('client_id', process.env.META_APP_ID || 'MOCK_APP_ID');
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('scope', 'whatsapp_business_messaging,whatsapp_business_management');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('response_type', 'code');

  return {
    authUrl: authUrl.toString(),
    state,
  };
}

/**
 * Handle Meta OAuth callback
 * Stub: Creates verification task, doesn't call Meta API
 * TODO (Batch 4.5): Exchange code for access token, get WABA details
 */
export async function handleOAuthCallback(
  params: HandleOAuthCallbackParams
): Promise<HandleOAuthCallbackResult> {
  const { tenantId, code, state } = params;

  // TODO (Batch 4.5): Validate state token
  // TODO (Batch 4.5): Exchange code for access token via Meta API
  // TODO (Batch 4.5): Get WABA ID + phone number ID

  // For now, mock the response
  const mockWabaId = `waba_${tenantId}_${Date.now()}`;
  const mockPhoneNumberId = `phone_${tenantId}_${Date.now()}`;
  const mockPhoneNumber = '+9779801234567';

  // Create phone number sender identity
  const senderIdentity = await prisma.senderIdentity.create({
    data: {
      tenantId,
      type: 'SMS_SENDER_ID', // Will be WA_PHONE in real implementation
      value: mockPhoneNumber,
      status: 'PENDING',
      meta: {
        wabaId: mockWabaId,
        phoneNumberId: mockPhoneNumberId,
        oauthCode: code,
        linkedAt: new Date().toISOString(),
      },
    },
  });

  // Create verification task
  await prisma.verificationTask.create({
    data: {
      tenantId,
      type: 'WABA_LINK',
      resourceId: senderIdentity.id,
      status: 'IN_PROGRESS',
      verificationUrl: `https://business.facebook.com/wa/manage/phone-numbers/`,
    },
  });

  return {
    wabaId: mockWabaId,
    phoneNumberId: mockPhoneNumberId,
    displayPhoneNumber: mockPhoneNumber,
    status: 'PENDING_APPROVAL',
  };
}

/**
 * List WhatsApp accounts linked to tenant
 */
export async function listWabaAccounts(tenantId: string) {
  return prisma.senderIdentity.findMany({
    where: {
      tenantId,
      type: 'SMS_SENDER_ID', // Will filter for WA_PHONE later
    },
  });
}

/**
 * Unlink WhatsApp account
 */
export async function unlinkWabaAccount(tenantId: string, senderIdentityId: string) {
  const identity = await prisma.senderIdentity.findFirst({
    where: { id: senderIdentityId, tenantId },
  });

  if (!identity) {
    throw new Error('WhatsApp account not found');
  }

  // TODO (Batch 4.5): Call Meta API to revoke access token

  return prisma.senderIdentity.update({
    where: { id: senderIdentityId },
    data: { status: 'INACTIVE' },
  });
}
