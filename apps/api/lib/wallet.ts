import { prisma } from '@iwb/db';

/**
 * Check if tenant has sufficient balance
 */
export async function checkBalance(
  tenantId: string,
  requiredUnits: bigint
): Promise<boolean> {
  const wallet = await prisma.walletAccount.findUnique({
    where: { tenantId },
    select: { balanceUnits: true },
  });

  if (!wallet) return false;
  return wallet.balanceUnits >= requiredUnits;
}

/**
 * Debit wallet and create ledger entry
 */
export async function debitWallet(
  tenantId: string,
  amountUnits: bigint,
  reference: { type: string; id: string }
): Promise<void> {
  const wallet = await prisma.walletAccount.update({
    where: { tenantId },
    data: {
      balanceUnits: {
        decrement: amountUnits,
      },
    },
  });

  await prisma.walletLedgerEntry.create({
    data: {
      tenantId,
      walletAccountId: wallet.id,
      type: 'DEBIT',
      amountUnits,
      balanceAfter: wallet.balanceUnits - amountUnits,
      description: `Debit for ${reference.type}`,
      referenceType: reference.type,
      referenceId: reference.id,
    },
  });
}
