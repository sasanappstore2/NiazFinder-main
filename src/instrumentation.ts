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
  }
}
