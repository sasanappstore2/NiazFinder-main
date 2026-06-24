# Stage 1 — mapbox-gl uninstall

**Decision: SKIP**

- `mapbox-gl@3.24.0` installed via `react-map-gl` and static import in `NiazMapCore.tsx`
- Baseline: 5 chunk files contain `mapbox-gl` string in `.next/static`
- Uninstall would break build

**Follow-up (out of scope):** dynamic import mapbox branch in `NiazMapCore.tsx` when `resolveMapEngine() === 'mapbox'`
