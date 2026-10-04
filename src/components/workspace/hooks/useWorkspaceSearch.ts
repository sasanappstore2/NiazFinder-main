'use client';

import { useMemo, useState } from 'react';
import type {
  WorkspaceCollaborationItem,
  WorkspaceFileItem,
  WorkspaceNeedItem,
} from '../types';

function matchesQuery(text: string | null | undefined, q: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(q);
}

export function useWorkspaceSearch(
  needs: WorkspaceNeedItem[],
  files: WorkspaceFileItem[],
  collaborations: WorkspaceCollaborationItem[]
) {
  const [query, setQuery] = useState('');

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return { needs, files, collaborations };
    }

    return {
      needs: needs.filter(
        (n) =>
          matchesQuery(n.title, q) ||
          matchesQuery(n.location, q) ||
          matchesQuery(n.budget, q) ||
          matchesQuery(n.matchReasonFa, q)
      ),
      files: files.filter(
        (f) =>
          matchesQuery(f.listing.title, q) ||
          matchesQuery(f.listing.location, q) ||
          matchesQuery(f.priceDisplay, q) ||
          matchesQuery(f.categoryLabel, q)
      ),
      collaborations: collaborations.filter(
        (c) =>
          matchesQuery(c.businessName, q) ||
          matchesQuery(c.collaborationType, q) ||
          matchesQuery(c.description, q) ||
          matchesQuery(c.headline, q) ||
          matchesQuery(c.note, q) ||
          matchesQuery(c.area, q)
      ),
    };
  }, [needs, files, collaborations, query]);

  return { query, setQuery, searched };
}
