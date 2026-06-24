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

    // Heavy embedding warmup (~15–20s) — opt-in via WARMUP_ENABLED=true in production.
    if (process.env.NODE_ENV === 'production' && process.env.WARMUP_ENABLED === 'true') {
      const { warmCategoryEmbeddingIndex } = await import(
        '@/intake/intelligence-engine/semantic/category-embedding-index'
      );
      void warmCategoryEmbeddingIndex().catch(() => undefined);
    }
  }
}
