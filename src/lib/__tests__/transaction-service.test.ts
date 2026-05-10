import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { getPocketBalance } from '../services/transaction-service';

describe('Transaction Service', () => {
  beforeEach(async () => {
    await db.transactions.clear();
  });

  it('should dynamically calculate pocket balance', async () => {
    await db.transactions.bulkAdd([
      { id: '1', type: 'income', amount: 100, date: Date.now(), pocketId: 'p1' },
      { id: '2', type: 'expense', amount: 30, date: Date.now(), pocketId: 'p1' },
      { id: '3', type: 'transfer', amount: 20, date: Date.now(), pocketId: 'p1', destinationPocketId: 'p2' },
      { id: '4', type: 'transfer', amount: 20, date: Date.now(), pocketId: 'p0', destinationPocketId: 'p1' },
    ]);

    // Income(100) - Expense(30) - TransferOut(20) + TransferIn(20) = 70
    const balance = await getPocketBalance('p1');
    expect(balance).toBe(70);
  });
});
