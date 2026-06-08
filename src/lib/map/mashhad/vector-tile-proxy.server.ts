/** @deprecated Mashhad tiles are served from the Iran vector cache ? see `@/lib/map/iran/vector-tile-proxy.server`. */
export {
  EMPTY_VECTOR_TILE,
  resolveMashhadVectorTile,
  resolveIranVectorTile,
  resolveMapGlyph,
  buildIranVectorTilejson as buildMashhadVectorTilejson,
  writeIranVectorTileToCache as writeMashhadVectorTileToCache,
  writeMapGlyphToCache,
  getIranVectorCacheDir as getMashhadVectorCacheDir,
  VECTOR_GLYPH_PREWARM_RANGES as MASHHAD_GLYPH_PREWARM_RANGES,
} from '@/lib/map/iran/vector-tile-proxy.server';
