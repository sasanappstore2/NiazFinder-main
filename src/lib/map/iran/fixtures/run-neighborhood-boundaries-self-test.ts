import assert from 'node:assert/strict';
import {
  buildNeighborhoodBoundariesFeatureCollection,
  unionNeighborhoodBbox,
} from '@/lib/map/iran/neighborhood-boundaries';
import { loadCityGeoFile, loadNeighborhoodGeoFeatures } from '@/lib/neighborhoods/geo';

async function run(): Promise<void> {
  const geo = await loadCityGeoFile('mashhad');
  assert.ok(geo?.features?.length, 'mashhad geo missing');
  const hoodId = geo!.features[0]!.properties.id;

  const features = await loadNeighborhoodGeoFeatures('mashhad', [hoodId]);
  assert.ok(features.length > 0, 'expected mashhad neighborhood geo');

  const collection = buildNeighborhoodBoundariesFeatureCollection({
    features,
    neighborhoodSlugs: [hoodId],
  });

  assert.equal(collection.features.length, 1);
  assert.equal(collection.features[0]!.properties.selected, true);

  const bbox = unionNeighborhoodBbox(features);
  assert.ok(bbox);
  assert.ok(bbox!.north > bbox!.south);
  assert.ok(bbox!.east > bbox!.west);

  console.log('[ok] neighborhood boundaries self-test');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
