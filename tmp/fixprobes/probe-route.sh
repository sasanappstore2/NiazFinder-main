#!/bin/bash
# args: label text city citySlug
resp=$(curl -s --max-time 30 http://localhost:3006/api/post/natural-analyze \
  -H 'Content-Type: application/json' \
  -d "{\"sourceText\": \"$2\", \"cityName\": \"$3\", \"citySlug\": \"$4\"}")
echo "$resp" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const r=JSON.parse(d);
  const e=r.draftPatch?.entities??{};
  console.log('$1', JSON.stringify({city:e.city??null, citySlug:e.citySlug??null, neighborhood:e.neighborhood??null, nSlugs:e.neighborhoodSlug??null, rahn:e.rahnAmount??null, rent:e.monthlyRent??null, budget:e.budgetMax??null, cat:r.categoryCandidates?.slice(0,3).map(c=>c.slug)??null, cands:(r.locationCandidates??[]).slice(0,4).map(c=>c.slug), cityFields:(r.fields??[]).filter(f=>f.key==='city').map(f=>({v:f.value, src:f.source, conf:f.requiresConfirmation}))}));
});"
