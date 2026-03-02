import { prisma } from '@iwb/db';
import { getEstimatedCost, AppError } from '@iwb/shared';

/**
 * Check if tenant has sufficient balance
 */
export async function checkBalance(
  tenantId: string,
  channel: string
): Promise<boolean> {
  const wallet = await prisma.walletAccount.findUnique({
    where: { tenantId },
  });

  if (!wallet) {
    throw AppError.internalError({ message: 'Wallet not found' });
  }

  const estimatedCost = getEstimatedCost(channel);

  if (wallet.balanceUnits < estimatedCost) {
    throw AppError.insufficientBalance();
  }

  return true;
}

/**
 * Deduct cost from wallet (called after send succeeds)
 */
export async function debitWallet(
  tenantId: string,
  channel: string,
  actualCost: bigint
) {
  const wallet = await prisma.walletAccount.findUnique({
    where: { tenantId },
  });

  if (!wallet) {
    throw AppError.internalError({ message: 'Wallet not found' });
  }

  const newBalance = wallet.balanceUnits - actualCost;

  // Update wallet
  await prisma.walletAccount.update({
    where: { tenantId },
    data: { balanceUnits: newBalance },
  });

  // Create ledger entry
  await prisma.walletLedgerEntry.create({
    data: {
      tenantId,
      walletAccountId: wallet.id,
      type: 'DEBIT',
      amountUnits: actualCost,
      balanceAfter: newBalance,
      description: `${channel} message sent`,
      referenceType: 'MESSAGE',
    },
  });
}
