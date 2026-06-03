'use client';

function cellColor(pct: number): string {
  if (pct >= 80) return 'rgb(16 185 129 / 0.85)';
  if (pct >= 50) return 'rgb(59 130 246 / 0.75)';
  if (pct >= 25) return 'rgb(245 158 11 / 0.65)';
  if (pct > 0) return 'rgb(226 232 240 / 0.9)';
  return 'transparent';
}

export function CohortHeatmap({
  rows,
  weeks,
}: {
  rows: Array<{ cohort: string; label: string; size: number; cells: number[] }>;
  weeks: number;
}) {
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-(--color-secondaryText)">داده cohort کافی نیست</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="p-2 text-right">هفته cohort</th>
            <th className="p-2">اندازه</th>
            {Array.from({ length: weeks }).map((_, w) => (
              <th key={w} className="p-2 text-center">
                W{w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.cohort}>
              <td className="p-2 font-medium">{row.label}</td>
              <td className="p-2 text-center">{row.size.toLocaleString('fa-IR')}</td>
              {row.cells.slice(0, weeks).map((pct, i) => (
                <td
                  key={i}
                  className="p-2 text-center"
                  style={{ background: cellColor(pct), color: pct >= 50 ? '#fff' : 'inherit' }}
                >
                  {pct ? `${pct}٪` : '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
