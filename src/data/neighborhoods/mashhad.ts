/**
 * Mashhad neighborhoods — sourced from Divar catalog import.
 * @see src/data/neighborhoods/catalog/mashhad.json
 */
import { readFileSync } from 'fs';
import path from 'path';

export interface NeighborhoodSeed {
  id: string;
  name: string;
  areas?: string[];
}

const catalogPath = path.join(__dirname, 'catalog', 'mashhad.json');

function loadMashhadFromCatalog(): NeighborhoodSeed[] {
  try {
    const raw = readFileSync(catalogPath, 'utf8');
    const data = JSON.parse(raw) as { neighborhoods: NeighborhoodSeed[] };
    return data.neighborhoods ?? [];
  } catch {
    return [];
  }
}

export const MASHHAD_NEIGHBORHOODS: NeighborhoodSeed[] = loadMashhadFromCatalog();
