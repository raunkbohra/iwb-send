import { prisma } from '@iwb/db';

export interface UploadKycDocumentParams {
  tenantId: string;
  type: string; // BUSINESS_REGISTRATION, TAX_ID, DIRECTOR_ID, PASSPORT
  fileUrl: string; // S3/R2 signed URL
  notes?: string;
}

export interface UploadKycDocumentResult {
  documentId: string;
  type: string;
  status: 'PENDING'; // Manual review
  uploadedAt: string;
}

export interface ApproveKycParams {
  tenantId: string;
  documentId: string;
  adminNotes?: string;
}

export interface RejectKycParams {
  tenantId: string;
  documentId: string;
  reason: string;
}

/**
 * Upload KYC document
 * Stub: Just saves to DB with PENDING status
 * TODO (Batch 4.5): Auto-verify or queue for manual review
 */
export async function uploadKycDocument(
  params: UploadKycDocumentParams
): Promise<UploadKycDocumentResult> {
  const { tenantId, type, fileUrl, notes } = params;

  const document = await prisma.kycDocument.create({
    data: {
      tenantId,
      type,
      fileUrl,
      status: 'PENDING',
      notes: notes || null,
    },
  });

  // Create verification task
  await prisma.verificationTask.create({
    data: {
      tenantId,
      type: 'KYC',
      resourceId: document.id,
      status: 'PENDING',
      verificationUrl: `dashboard://kyc/${document.id}`, // Admin will review in dashboard
    },
  });

  return {
    documentId: document.id,
    type,
    status: 'PENDING',
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * List KYC documents for a tenant
 */
export async function listKycDocuments(tenantId: string) {
  return prisma.kycDocument.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get KYC document
 */
export async function getKycDocument(id: string, tenantId: string) {
  return prisma.kycDocument.findFirst({
    where: { id, tenantId },
  });
}

/**
 * Admin: Approve KYC document
 * Updates document status and verification task
 */
export async function approveKyc(params: ApproveKycParams) {
  const { tenantId, documentId, adminNotes } = params;

  const document = await prisma.kycDocument.update({
    where: { id: documentId },
    data: {
      status: 'APPROVED',
      notes: adminNotes || 'Approved by admin',
    },
  });

  // Update verification task
  await prisma.verificationTask.updateMany({
    where: {
      tenantId,
      resourceId: documentId,
      type: 'KYC',
    },
    data: {
      status: 'COMPLETED',
    },
  });

  // Check if all KYC requirements met, update ComplianceRegistry
  const allApproved = await prisma.kycDocument.findMany({
    where: { tenantId, status: 'APPROVED' },
  });

  if (allApproved.length >= 1) {
    // At least one approved KYC doc = can access global (other restrictions apply)
    await prisma.complianceRegistry.upsert({
      where: { tenantId },
      create: {
        tenantId,
        canSendGlobal: true,
        canSendToIndia: false, // Requires DLT
        canSendToNepal: false, // Requires BTRC
      },
      update: {
        canSendGlobal: true,
      },
    });
  }

  return document;
}

/**
 * Admin: Reject KYC document
 */
export async function rejectKyc(params: RejectKycParams) {
  const { tenantId, documentId, reason } = params;

  const document = await prisma.kycDocument.update({
    where: { id: documentId },
    data: {
      status: 'REJECTED',
      notes: reason,
    },
  });

  // Update verification task
  await prisma.verificationTask.updateMany({
    where: {
      tenantId,
      resourceId: documentId,
      type: 'KYC',
    },
    data: {
      status: 'FAILED',
      failureReason: reason,
    },
  });

  return document;
}

/**
 * Get KYC approval status for tenant
 */
export async function getKycStatus(tenantId: string) {
  const documents = await prisma.kycDocument.findMany({
    where: { tenantId },
  });

  const approved = documents.filter((d) => d.status === 'APPROVED').length;
  const rejected = documents.filter((d) => d.status === 'REJECTED').length;
  const pending = documents.filter((d) => d.status === 'PENDING').length;

  const compliance = await prisma.complianceRegistry.findUnique({
    where: { tenantId },
  });

  return {
    approved,
    rejected,
    pending,
    total: documents.length,
    canSendGlobal: compliance?.canSendGlobal || false,
    canSendToIndia: compliance?.canSendToIndia || false,
    canSendToNepal: compliance?.canSendToNepal || false,
  };
}
