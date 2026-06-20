/**
 * Export need/listing categories as a hierarchical JSON tree.
 *
 * Run:
 *   npm run categories:export-tree
 *   npm run categories:export-tree -- --out=reports/my-categories.json
 */
import { promises as fs } from 'fs';
import path from 'path';
import {
  CANONICAL_CATEGORIES,
  type CanonicalCategory,
} from '../../src/config/categories';
import { REPORTS_DIR } from '../neighborhoods/lib';

const DEFAULT_OUT = path.join(process.cwd(), 'src/data/iran-categories-tree.json');

interface TreeLeaf {
  slug: string;
  nameFa: string;
  nameEn: string;
  depth: number;
}

interface TreeNode extends TreeLeaf {
  childCount: number;
  children: TreeNode[];
}

interface CategoryTreeDocument {
  version: 1;
  generatedAt: string;
  summary: {
    roots: number;
    parents: number;
    leaves: number;
    total: number;
    missingEnglish: number;
  };
  categories: TreeNode[];
}

function parseOutArg(argv: string[]): string {
  for (const arg of argv) {
    if (arg.startsWith('--out=')) return path.resolve(arg.slice('--out='.length));
  }
  return DEFAULT_OUT;
}

function nameEn(c: CanonicalCategory): string {
  return c.englishTitle?.trim() || c.slug;
}

function toLeaf(c: CanonicalCategory): TreeLeaf {
  return {
    slug: c.slug,
    nameFa: c.title,
    nameEn: nameEn(c),
    depth: c.depth,
  };
}

function buildTree(categories: readonly CanonicalCategory[]): TreeNode[] {
  const byParent = new Map<string | null, CanonicalCategory[]>();

  for (const c of categories) {
    const key = c.parentSlug;
    const list = byParent.get(key) ?? [];
    list.push(c);
    byParent.set(key, list);
  }

  for (const list of byParent.values()) {
    list.sort((a, b) => a.title.localeCompare(b.title, 'fa'));
  }

  function build(parentSlug: string | null): TreeNode[] {
    const nodes = byParent.get(parentSlug) ?? [];
    return nodes.map((c) => {
      const children = build(c.slug);
      return {
        ...toLeaf(c),
        childCount: children.length,
        children,
      };
    });
  }

  return build(null);
}

function countNodes(nodes: TreeNode[]): {
  total: number;
  roots: number;
  parents: number;
  leaves: number;
} {
  let total = 0;
  let roots = 0;
  let parents = 0;
  let leaves = 0;

  const walk = (list: TreeNode[]) => {
    for (const n of list) {
      total += 1;
      if (n.depth === 0) roots += 1;
      else if (n.children.length === 0) leaves += 1;
      else parents += 1;
      if (n.children.length) walk(n.children);
    }
  };

  walk(nodes);
  return { total, roots, parents, leaves };
}

async function main(): Promise<void> {
  const outPath = parseOutArg(process.argv.slice(2));
  const tree = buildTree(CANONICAL_CATEGORIES);
  const counts = countNodes(tree);
  const missingEnglish = CANONICAL_CATEGORIES.filter((c) => !c.englishTitle?.trim()).length;

  const doc: CategoryTreeDocument = {
    version: 1,
    generatedAt: new Date().toISOString(),
    summary: {
      ...counts,
      missingEnglish,
    },
    categories: tree,
  };

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(doc, null, 2), 'utf8');

  const sizeKb = ((await fs.stat(outPath)).size / 1024).toFixed(1);
  console.log(`Category tree → ${outPath}`);
  console.log('Summary:', doc.summary);
  console.log(`File size: ${sizeKb} KB`);

  const reportCopy = path.join(REPORTS_DIR, 'iran-categories-tree.json');
  if (outPath !== reportCopy) {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
    await fs.writeFile(reportCopy, JSON.stringify(doc, null, 2), 'utf8');
    console.log(`Copy → ${reportCopy}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
