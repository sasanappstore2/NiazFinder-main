export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { warmOccupationsCache, setOccupationsCache } = await import(
      '@/lib/business/occupations-registry'
    );
    const occupations = await warmOccupationsCache();
    setOccupationsCache(occupations);

    const { warmOnlineStoresCache, setOnlineStoresCache } = await import(
      '@/lib/business/online-stores-registry'
    );
    const onlineStores = await warmOnlineStoresCache();
    setOnlineStoresCache(onlineStores);

    const { getIntakeIndexes } = await import('@/intake/dictionaries/loader');
    void getIntakeIndexes().catch(() => undefined);

    const { initRabbitMQ } = await import('@/lib/queue/rabbitmq-client');
    void initRabbitMQ().catch(() => undefined);

    // Build the bge-m3 category-embedding index at boot instead of lazily on
    // the first /post analyze — without this, the first real user after every
    // server (re)start eats the ~15-20s one-time embed-the-whole-catalog cost.
    const { warmCategoryEmbeddingIndex } = await import(
      '@/intake/intelligence-engine/semantic/category-embedding-index'
    );
    void warmCategoryEmbeddingIndex().catch(() => undefined);
  }
}
