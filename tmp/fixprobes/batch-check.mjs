import fs from 'fs';
const cases = fs.readFileSync('out/laya-matrix/cases-base-v2.jsonl','utf8').trim().split('\n').map(JSON.parse);
const failIds = new Set(fs.readFileSync('out/laya-matrix/base-v2/failures.jsonl','utf8').trim().split('\n').map(JSON.parse).map(r=>r.id));
const passing = cases.filter(c=>!failIds.has(c.id));
// deterministic pseudo-random sample
const seedRand = (()=>{let s=42;return()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};})();
const risky = passing.filter(c=>/سباری|نیاوران|شهرک دانشگاه|ونک|ابوذر|جانباز|مهران|حافظ|اختیاریه|دانشگاه|موران|گوهرکوه/.test(c.text));
const rest = passing.filter(c=>!risky.includes(c));
const shuffled=[...rest].sort(()=>seedRand()-0.5).slice(0,150);
const failSample = cases.filter(c=>failIds.has(c.id)).filter(c=>['c20261001-0','c20261001-2','c20261001-4','c20261001-5','c20261001-8','c20261001-14','c20261001-15','c20261001-19','c20261001-24','c20261001-30','c20261001-47','c20261001-50','c20261001-56','c20261001-81','c20261001-89','c20261001-101','c20261001-124','c20261001-125','c20261001-146','c20261001-211','c20261001-257','c20261001-265','c20261001-267','c20261001-279','c20261001-289','c20261001-306','c20261001-307','c20261001-314','c20261001-327','c20261001-340','c20261001-342','c20261001-343','c20261001-348','c20261001-360','c20261001-364','c20261001-479','c20261001-5476','c20261001-6042','c20261001-6440','c20261001-6787','c20261001-753','c20261001-8096','c20261001-9035','c20261001-9193','c20261001-993','c20261001-995','c20261001-2051','c20261001-724','c20261001-760','c20261001-784','c20261001-5','c20261001-38'].includes(c.id));
const run = [...risky, ...shuffled, ...failSample];
console.error(`running ${run.length} cases (risky=${risky.length}, sample=${shuffled.length}, failSample=${failSample.length})`);

const HOOD_ALIASES = {'امام-زاده-قاسم-نیاوران':'امام زاده قاسم (نیاوران)','جماران-نیاوران':'جماران (نیاوران)'};
const normId = (id)=>HOOD_ALIASES[id]??id;
const moneyEqual=(g,e)=>{if(e==null)return true;if(typeof g!=='number'||!Number.isFinite(g))return false;return Math.abs(g-e)<=Math.max(1000,e*0.001);};
function grade(c,r){
  const grades=[];
  const e=r?.draftPatch?.entities??{}; const a=r?.draftPatch?.answers??{};
  const str=(k)=>typeof e[k]==='string'?e[k]:undefined;
  const numv=(k)=>typeof e[k]==='number'?e[k]:undefined;
  const bareCityId=c.expect.cityId.replace(/-city$/,'');
  const cityOk=str('city')===c.expect.cityName||str('citySlug')===c.expect.cityId||str('citySlug')===bareCityId||(str('city')??'').includes(c.expect.cityName);
  if(!cityOk&&c.expect.cityKnown) grades.push({field:c.expect.cityInText?'city':'city-from-context',severity:'wrong-fill'});
  const hoodIds=c.expect.hoodIds.map(normId);
  const gotHood=str('neighborhood'); const gotHoodSlug=str('neighborhoodSlug');
  const autoHit=(gotHoodSlug!=null&&hoodIds.includes(gotHoodSlug))||(gotHood!=null&&hoodIds.includes(gotHood));
  const cands=(r?.locationCandidates??[]).map(x=>x.slug);
  const candHit=hoodIds.some(id=>cands.includes(id)||cands.includes(normId(id)));
  if(!autoHit&&!candHit) grades.push({field:'neighborhood',severity:(gotHood||cands.length)?'wrong-fill':'missing'});
  else if(!autoHit&&candHit) grades.push({field:'neighborhood',severity:'ambiguous-ok'});
  if(c.expect.categorySlug){const cat=r?.provisionalCategory?.slug??str('categorySlug')??r?.categoryCandidates?.[0]?.slug??'';if(!cat.startsWith(c.expect.categorySlug.split('-')[0]))grades.push({field:'category',severity:'wrong-fill'});}
  if(c.expect.dealType&&c.expect.dealType.startsWith('rent')){const got=(typeof a.dealType==='string'?a.dealType:undefined)??str('dealType')??'';if(!/rahn|rent|deposit/i.test(got))grades.push({field:'dealType',severity:'wrong-fill'});}
  const rahn=numv('rahnAmount')??numv('deposit');
  if(c.expect.rahnAmount!=null&&!moneyEqual(rahn,c.expect.rahnAmount))grades.push({field:'rahnAmount',severity:rahn==null?'missing':'wrong-fill'});
  if(c.expect.monthlyRent!=null&&!moneyEqual(numv('monthlyRent'),c.expect.monthlyRent))grades.push({field:'monthlyRent',severity:numv('monthlyRent')==null?'missing':'wrong-fill'});
  if(c.expect.budgetMax!=null){const got=numv('budgetMax')??numv('totalPrice')??numv('price');if(!moneyEqual(got,c.expect.budgetMax))grades.push({field:'budgetMax',severity:got==null?'missing':'wrong-fill'});}
  if(c.expect.areaMeters!=null){const g=numv('area');if(g==null||Math.abs(g-c.expect.areaMeters)>1)grades.push({field:'area',severity:g==null?'missing':'wrong-fill'});}
  return grades;
}
let cursor=0, results=[];
async function worker(){
  while(cursor<run.length){
    const c=run[cursor++]; let r=null, err=null;
    try{
      const res=await fetch('http://localhost:3006/api/post/natural-analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sourceText:c.text,cityName:c.expect.cityName,citySlug:c.expect.cityId}),signal:AbortSignal.timeout(45000)});
      if(!res.ok) err=`HTTP ${res.status}`; else r=await res.json();
    }catch(e){err=String(e).slice(0,80);}
    const wasFail=failIds.has(c.id);
    results.push({id:c.id,wasFail,grades:r?grade(c,r):[{field:'http',severity:'missing'}],err});
  }
}
await Promise.all(Array.from({length:8},worker));
const hard=(x)=>x.grades.some(g=>g.severity==='wrong-fill'||g.severity==='missing');
const oldPassNowFail=results.filter(x=>!x.wasFail&&hard(x));
const oldFailNowPass=results.filter(x=>x.wasFail&&!hard(x));
const oldFailStillFail=results.filter(x=>x.wasFail&&hard(x));
const oldPassStillPass=results.filter(x=>!x.wasFail&&!hard(x));
console.log(JSON.stringify({total:results.length,oldPassStillPass:oldPassStillPass.length,oldPassNowFail:oldPassNowFail.length,oldFailNowPass:oldFailNowPass.length,oldFailStillFail:oldFailStillFail.length},null,1));
console.log('REGRESSIONS:', JSON.stringify(oldPassNowFail.map(x=>({id:x.id,grades:x.grades})),null,1).slice(0,3000));
console.log('STILL-FAIL:', JSON.stringify(oldFailStillFail.map(x=>({id:x.id,grades:x.grades})),null,1).slice(0,4000));
