import { runInBatches } from '@/lib/source-validation';

describe('runInBatches', () => {
  it('limits concurrent validation work and continues after a failure', async () => {
    let activeWorkers = 0;
    let maxActiveWorkers = 0;
    const completedItems: number[] = [];

    await runInBatches([1, 2, 3, 4, 5], 2, async (item) => {
      activeWorkers++;
      maxActiveWorkers = Math.max(maxActiveWorkers, activeWorkers);

      await Promise.resolve();
      activeWorkers--;

      if (item === 2) {
        throw new Error('source unavailable');
      }

      completedItems.push(item);
    });

    expect(maxActiveWorkers).toBe(2);
    expect(completedItems).toEqual([1, 3, 4, 5]);
  });
});
