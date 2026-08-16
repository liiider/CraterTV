export async function runInBatches<T, TResult>(
  items: T[],
  batchSize: number,
  worker: (item: T) => Promise<TResult>
): Promise<PromiseSettledResult<TResult>[]> {
  const results: PromiseSettledResult<TResult>[] = [];

  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    results.push(...(await Promise.allSettled(batch.map(worker))));
  }

  return results;
}
