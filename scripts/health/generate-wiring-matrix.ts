/**
 * Generate site wiring matrix: sections → routes → APIs → admin panels.
 * Run: npm run health:wiring-matrix
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const root = join(import.meta.dirname, '../..');
const reportsDir = join(root, 'reports');

type WiringRow = {
  section: string;
  routes: string[];
  apis: string[];
  adminPanel: string | null;
  dataSources: string[];
};

const WIRING_MATRIX: WiringRow[] = [
  {
    section: 'home',
    routes: ['/', '/en'],
    apis: [],
    adminPanel: 'analytics',
    dataSources: ['localStorage', 'routeBuilder'],
  },
  {
    section: 'browse-need',
    routes: ['/n/iran', '/n/{city}', '/n/{city}/{category}'],
    apis: ['/api/requests', '/api/requests/map-pins'],
    adminPanel: 'requests',
    dataSources: ['Prisma:ServiceRequest', 'config:categories', 'config:locations'],
  },
  {
    section: 'browse-business',
    routes: ['/b/iran', '/b/{city}', '/b/{profileSlug}'],
    apis: ['/api/business/browse', '/api/business/map-pins', '/api/business/{id}'],
    adminPanel: 'businesses',
    dataSources: ['Prisma:BusinessProfile', 'config:business-occupations'],
  },
  {
    section: 'need-detail',
    routes: ['/v/{slug}/{id}', '/propose/{id}'],
    apis: ['/api/requests/{id}', '/api/requests/{id}/matched-businesses', '/api/proposals'],
    adminPanel: 'requests',
    dataSources: ['Prisma:ServiceRequest', 'Prisma:Proposal'],
  },
  {
    section: 'intake',
    routes: ['/post', '/post/edit/{id}'],
    apis: [
      '/api/intake/analyze',
      '/api/need-intake/publish',
      '/api/need-intake/preview-listing',
      '/api/need-intake/duplicate-check',
    ],
    adminPanel: 'intake-field-specs',
    dataSources: ['Prisma:ServiceRequest', 'Prisma:NeedIntakeSession', 'intake-field-spec-overrides.json'],
  },
  {
    section: 'user-dashboard',
    routes: ['/dashboard', '/dashboard/referral'],
    apis: ['/api/dashboard', '/api/requests?mine=1', '/api/wallet', '/api/users/profile'],
    adminPanel: 'users',
    dataSources: ['Prisma:User', 'Prisma:Wallet', 'Prisma:Transaction'],
  },
  {
    section: 'business-hub',
    routes: ['/my-business', '/pro/{id}/edit'],
    apis: ['/api/business/me', '/api/business/me/*'],
    adminPanel: 'businesses',
    dataSources: ['Prisma:BusinessProfile'],
  },
  {
    section: 'chat',
    routes: ['/chat', '/chat/{id}', '/messages'],
    apis: ['/api/chat', '/api/chat/{id}', '/api/calls'],
    adminPanel: 'messages',
    dataSources: ['Prisma:Conversation', 'Prisma:Message', 'chat-service:Socket.IO'],
  },
  {
    section: 'super-admin',
    routes: ['/super-admin/*'],
    apis: ['/api/super-admin/*'],
    adminPanel: 'overview',
    dataSources: ['Prisma (all domains)', 'admin-locations.json', 'categories config'],
  },
  {
    section: 'blog-seo',
    routes: ['/blog', '/blog/{slug}', '/sitemap.xml'],
    apis: ['/api/blog'],
    adminPanel: 'blog',
    dataSources: ['Prisma:BlogPost'],
  },
];

const SUPER_ADMIN_PANELS: Record<string, string[]> = {
  overview: ['GET /api/super-admin/overview', 'GET /api/super-admin/analytics'],
  analytics: ['GET /api/super-admin/analytics/*'],
  workflow: ['GET /api/super-admin/workflow'],
  categories: ['GET/POST /api/super-admin/categories', 'PATCH/DELETE /api/super-admin/categories/[id]'],
  'business-occupations': ['GET/POST /api/super-admin/business-occupations'],
  'online-stores': ['GET/POST /api/super-admin/online-stores'],
  locations: ['GET/POST/PATCH/DELETE /api/super-admin/locations'],
  requests: ['GET /api/super-admin/requests', 'POST /api/super-admin/requests/[id]/moderate'],
  proposals: ['GET /api/super-admin/proposals'],
  businesses: ['GET /api/super-admin/businesses'],
  outreach: ['GET /api/super-admin/outreach'],
  'need-alerts': ['GET/PATCH /api/super-admin/need-alerts'],
  users: ['GET/PATCH /api/super-admin/users/[id]', 'GET/POST /api/super-admin/rbac/assignments'],
  reports: ['GET /api/super-admin/reports'],
  messages: ['GET /api/super-admin/chat-review/conversations'],
  'voice-calls': ['GET /api/super-admin/voice-calls', 'GET /api/super-admin/voice-calls/[id]'],
  notifications: ['GET/POST /api/super-admin/notifications/broadcast'],
  reviews: ['GET/PATCH /api/super-admin/reviews'],
  billing: ['GET /api/super-admin/transactions', 'GET /api/super-admin/wallets/[userId]'],
  system: ['GET/POST /api/super-admin/rbac/*', 'GET /api/super-admin/intake-governance', 'GET /api/super-admin/intake-scale'],
  audit: ['GET /api/super-admin/audit'],
  files: ['GET /api/super-admin/files'],
  settings: ['GET/PATCH /api/super-admin/settings'],
  referrals: ['GET /api/super-admin/referrals'],
  coupons: ['GET /api/super-admin/coupons'],
  blog: ['GET/POST /api/super-admin/blog'],
  'intake-migration': ['GET /api/super-admin/intake-migration'],
  'intake-ai-evaluation': ['GET /api/super-admin/intake-ai-evaluation'],
  'intake-training': ['GET/PATCH /api/super-admin/intake-training'],
  'intake-field-specs': ['GET/POST /api/super-admin/intake-field-specs'],
};

function loadApiCount(): number {
  const invPath = join(reportsDir, 'api-inventory.json');
  if (!existsSync(invPath)) return 0;
  try {
    const inv = JSON.parse(readFileSync(invPath, 'utf8')) as { count?: number };
    return inv.count ?? 0;
  } catch {
    return 0;
  }
}

function main(): void {
  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });

  const report = {
    timestamp: new Date().toISOString(),
    apiRouteCount: loadApiCount(),
    userSections: WIRING_MATRIX.length,
    superAdminPanels: Object.keys(SUPER_ADMIN_PANELS).length,
    sections: WIRING_MATRIX,
    superAdminPanelApis: SUPER_ADMIN_PANELS,
    services: [
      { name: 'nextjs', port: 3000, role: 'main app + Prisma PG' },
      { name: 'chat-service', port: 3004, role: 'Socket.IO realtime' },
      { name: 'nest-backend', port: 4000, role: 'intake queue worker (optional)' },
      { name: 'intake-mlx', port: 8100, role: 'MLX inference sidecar' },
    ],
  };

  const jsonPath = join(reportsDir, 'wiring-matrix.json');
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const mdLines = [
    '# NiazFinder Wiring Matrix',
    '',
    `Generated: ${report.timestamp}`,
    '',
    `API routes: ${report.apiRouteCount} | User sections: ${report.userSections} | Admin panels: ${report.superAdminPanels}`,
    '',
    '## User-facing sections',
    '',
    '| Section | Routes | Key APIs | Admin panel |',
    '|---------|--------|----------|-------------|',
    ...WIRING_MATRIX.map(
      (r) =>
        `| ${r.section} | ${r.routes.join(', ')} | ${r.apis.slice(0, 2).join(', ')}${r.apis.length > 2 ? '…' : ''} | ${r.adminPanel ?? '—'} |`
    ),
    '',
    '## Super-admin panel → API mapping',
    '',
    ...Object.entries(SUPER_ADMIN_PANELS).flatMap(([panel, apis]) => [
      `### ${panel}`,
      ...apis.map((a) => `- ${a}`),
      '',
    ]),
  ];

  const mdPath = join(root, 'docs/wiring-matrix.md');
  const docsDir = join(root, 'docs');
  if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true });
  writeFileSync(mdPath, mdLines.join('\n'));

  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
}

main();
