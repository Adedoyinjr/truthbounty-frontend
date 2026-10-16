import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

function isE2EHarnessEnabled(): boolean {
  // Only enable in development or when E2E_HARNESS is set
  return process.env.NODE_ENV !== 'production' || process.env.E2E_HARNESS === '1';
}

export default async function TransactionStatesPage() {
  if (!isE2EHarnessEnabled()) {
    notFound();
  }

  // Loaded only when the harness is enabled, so the fixtures/components are
  // code-split out of the default production graph and never sent to a client
  // on a normal deploy (where this route 404s before importing them).
  const { TransactionStatesHarness } = await import('./TransactionStatesHarness');
  return <TransactionStatesHarness />;
}
