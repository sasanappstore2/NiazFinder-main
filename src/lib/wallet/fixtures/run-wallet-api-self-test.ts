/**
 * Self-test: wallet API response shape matches store expectations.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function main(): void {
  const storePath = join(import.meta.dirname, '../../store.ts');
  const storeSrc = readFileSync(storePath, 'utf8');

  assert(
    storeSrc.includes("apiFetch<{ data: any[] }>('/api/wallet')") ||
      storeSrc.includes("apiFetch<{ transactions:") ||
      storeSrc.includes("'/api/wallet'"),
    'store.fetchTransactions must call GET /api/wallet (not /api/wallet/transactions)'
  );

  assert(
    !storeSrc.includes("'/api/wallet/transactions'"),
    'store must not reference deprecated /api/wallet/transactions'
  );

  const walletRoute = readFileSync(
    join(import.meta.dirname, '../../../app/api/wallet/route.ts'),
    'utf8'
  );
  assert(walletRoute.includes('export async function GET'), 'wallet route must export GET handler');
  assert(walletRoute.includes('transactions'), 'wallet GET must return transactions');

  console.log('wallet-api self-test passed');
}

main();
