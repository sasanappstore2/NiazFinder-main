/**
 * Generate national geo progress dashboard (markdown).
 * Run: npm run geo:dashboard
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadAdminCities } from '../neighborhoods/lib';
import { ROOT } from './shared';
import type { ProvinceGeoQualityReport } from './geo-quality-gate';

const GATES_DIR = path.join(ROOT, 'reports/geo-gates');
const OUT_PATH = path.join(ROOT, 'reports/geo-dashboard.md');

function loadGateReports(): ProvinceGeoQualityReport[] {
  if (!fs.existsSync(GATES_DIR)) return [];
  const files = fs.readdirSync(GATES_DIR).filter((f) => f.endsWith('.json'));
  const reports: ProvinceGeoQualityReport[] = [];
  for (const file of files) {
    try {
      reports.push(
        JSON.parse(fs.readFileSync(path.join(GATES_DIR, file), 'utf8')) as ProvinceGeoQualityReport
      );
    } catch {
      /* skip */
    }
  }
  return reports.sort((a, b) => a.provinceName.localeCompare(b.provinceName, 'fa'));
}

async function main(): Promise<void> {
  const adminCities = await loadAdminCities();
  const reports = loadGateReports();
  const reportByProvince = new Map(reports.map((r) => [r.provinceId, r]));

  const lines: string[] = [
    '# Geo Coverage Dashboard',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Admin cities: **${adminCities.length}** | Province gate reports: **${reports.length}**`,
    '',
    '## Province summary',
    '',
    '| Province | Cities | Pass | Fail | Errors | Warnings | Gate |',
    '|----------|--------|------|------|--------|----------|------|',
  ];

  let totalPass = 0;
  let totalFail = 0;

  for (const report of reports) {
    const passCities = report.cities.filter((c) => c.pass).length;
    const failCities = report.cities.length - passCities;
    totalPass += passCities;
    totalFail += failCities;
    lines.push(
      `| ${report.provinceName} | ${report.cities.length} | ${passCities} | ${failCities} | ${report.errors} | ${report.warnings} | ${report.pass ? 'PASS' : 'FAIL'} |`
    );
  }

  lines.push('', '## City detail (failed only)', '');

  for (const report of reports) {
    const failed = report.cities.filter((c) => !c.pass);
    if (!failed.length) continue;
    lines.push(`### ${report.provinceName}`, '');
    lines.push('| City | Tier | Hoods | Real% | Issues |');
    lines.push('|------|------|-------|-------|--------|');
    for (const city of failed) {
      const realPct =
        city.shares.total > 0
          ? Math.round(
              ((city.shares.divar + city.shares.osm + city.shares.manual) / city.shares.total) *
                100
            )
          : 0;
      const errCount = city.issues.filter((i) => i.level === 'error').length;
      lines.push(
        `| ${city.cityName} | ${city.tier} | ${city.neighborhoodCount} | ${realPct}% | ${errCount} |`
      );
    }
    lines.push('');
  }

  const ungatedProvinces = [
    ...new Set(adminCities.map((c) => c.provinceId)),
  ].filter((id) => !reportByProvince.has(id));

  if (ungatedProvinces.length) {
    lines.push('## Provinces without gate report', '');
    for (const id of ungatedProvinces) {
      const name = adminCities.find((c) => c.provinceId === id)?.provinceName ?? id;
      lines.push(`- ${name} (\`${id}\`)`);
    }
    lines.push('');
  }

  lines.push('## Totals', '', `- Cities passed: **${totalPass}**`, `- Cities failed: **${totalFail}**`, '');

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, lines.join('\n') + '\n', 'utf8');
  console.log(`Dashboard → ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
