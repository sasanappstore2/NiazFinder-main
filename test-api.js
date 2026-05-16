const http = require('http');
const BASE = 'http://localhost:3000';
const results = [];

function doFetch(method, url, body, headers) {
  headers = headers || {};
  return new Promise(function(resolve) {
    const u = new URL(url);
    const start = Date.now();
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: u.hostname, port: u.port,
      path: u.pathname + u.search, method: method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    };
    if (headers.Authorization) opts.headers.Authorization = headers.Authorization;
    const req = http.request(opts, function(res) {
      let chunks = [];
      res.on('data', function(c) { chunks.push(c); });
      res.on('end', function() {
        const elapsed = ((Date.now() - start) / 1000).toFixed(3);
        const fullBody = Buffer.concat(chunks).toString('utf-8');
        resolve({ status: res.statusCode, time: elapsed, size: fullBody.length, body: fullBody, preview: fullBody.substring(0, 300) });
      });
    });
    req.on('error', function(e) {
      resolve({ status: 0, time: '0.000', size: 0, body: '', preview: 'ERROR: ' + e.message });
    });
    req.on('timeout', function() { req.destroy(); resolve({ status: 0, time: '10.000', size: 0, body: '', preview: 'TIMEOUT' }); });
    if (data) req.write(data);
    req.end();
  });
}

async function runTest(label, method, url, body, headers) {
  const r = await doFetch(method, url, body, headers);
  results.push({ label: label, method: method, url: url, status: r.status, time: r.time, size: r.size, body: r.body, preview: r.preview });
  console.log('[' + r.status + '] ' + r.time + 's ' + r.size + 'B - ' + label);
  return r;
}

async function main() {
  console.log('=== NEEDFINDER API COMPREHENSIVE TEST ===\n');

  // PUBLIC ENDPOINTS
  console.log('--- PUBLIC ENDPOINTS ---');
  var catResp = await runTest('1. GET /api/categories', 'GET', BASE + '/api/categories');
  var reqResp = await runTest('2. GET /api/requests?limit=5&page=1', 'GET', BASE + '/api/requests?limit=5&page=1');
  var firstReqId = null;
  try { var rd = JSON.parse(reqResp.body); var arr = rd.data || rd.requests || []; if (arr.length > 0) firstReqId = arr[0].id; } catch(e) {}
  console.log('  -> First request ID: ' + firstReqId);

  var specResp = await runTest('3. GET /api/specialists?limit=5', 'GET', BASE + '/api/specialists?limit=5');
  var firstSpecId = null, firstUserId = null;
  try { var sd = JSON.parse(specResp.body); var sarr = sd.data || sd.specialists || []; if (sarr.length > 0) { firstSpecId = sarr[0].id; firstUserId = sarr[0].userId || (sarr[0].user && sarr[0].user.id); } } catch(e) {}
  console.log('  -> First specialist ID: ' + firstSpecId + ', userId: ' + firstUserId);

  if (firstReqId) {
    await runTest('4. GET /api/requests/' + firstReqId, 'GET', BASE + '/api/requests/' + firstReqId);
  } else {
    await runTest('4. GET /api/requests/MISSING', 'GET', BASE + '/api/requests/nonexistent-123');
  }

  if (firstSpecId) {
    await runTest('5. GET /api/specialists/' + firstSpecId, 'GET', BASE + '/api/specialists/' + firstSpecId);
  } else {
    await runTest('5. GET /api/specialists/MISSING', 'GET', BASE + '/api/specialists/nonexistent');
  }

  // AUTH
  console.log('\n--- AUTH ENDPOINTS ---');
  var loginResp = await runTest('6. POST /api/auth (login admin)', 'POST', BASE + '/api/auth', { email: 'admin@needfinder.ir', password: '123456' });
  var token = null;
  try { var ld = JSON.parse(loginResp.body); token = ld.token || ld.access_token || (ld.data && (ld.data.token || ld.data.access_token)) || ''; } catch(e) {}
  console.log('  -> Token: ' + (token ? token.substring(0, 30) + '...' : 'NOT FOUND'));

  var ts = Date.now();
  await runTest('7. POST /api/auth (register)', 'POST', BASE + '/api/auth', { name: 'TestUser' + ts, email: 'tu' + ts + '@test.com', password: 'Pass123456' });
  await runTest('8. POST /api/auth (wrong password)', 'POST', BASE + '/api/auth', { email: 'admin@needfinder.ir', password: 'wrongpassword' });
  await runTest('9. POST /api/auth (empty body)', 'POST', BASE + '/api/auth', {});

  // PROTECTED (NO AUTH)
  console.log('\n--- PROTECTED ENDPOINTS (NO AUTH) ---');
  await runTest('10. GET /api/notifications (no auth)', 'GET', BASE + '/api/notifications');
  await runTest('11. GET /api/conversations (no auth)', 'GET', BASE + '/api/conversations');
  await runTest('12. GET /api/wallet (no auth)', 'GET', BASE + '/api/wallet');
  await runTest('13. GET /api/dashboard (no auth)', 'GET', BASE + '/api/dashboard');
  await runTest('14. GET /api/users/me (no auth)', 'GET', BASE + '/api/users/me');
  await runTest('15. POST /api/requests (no auth)', 'POST', BASE + '/api/requests', { title: 'Test', description: 'Test desc', categoryId: 'test' });
  await runTest('16. POST /api/proposals (no auth)', 'POST', BASE + '/api/proposals', { message: 'test', requestId: 'test' });

  // PROTECTED (WITH AUTH)
  if (token && token.length > 10) {
    console.log('\n--- PROTECTED ENDPOINTS (WITH AUTH) ---');
    var authHeaders = { Authorization: 'Bearer ' + token };
    await runTest('17. GET /api/users/me (auth)', 'GET', BASE + '/api/users/me', null, authHeaders);
    await runTest('18. GET /api/notifications (auth)', 'GET', BASE + '/api/notifications', null, authHeaders);
    await runTest('19. GET /api/conversations (auth)', 'GET', BASE + '/api/conversations', null, authHeaders);
    await runTest('20. GET /api/wallet (auth)', 'GET', BASE + '/api/wallet', null, authHeaders);
    await runTest('21. GET /api/dashboard (auth)', 'GET', BASE + '/api/dashboard', null, authHeaders);
    await runTest('22. GET /api/reviews (auth)', 'GET', BASE + '/api/reviews', null, authHeaders);
  } else {
    console.log('\n--- PROTECTED ENDPOINTS (WITH AUTH) - SKIPPED ---');
  }

  // REVIEWS
  console.log('\n--- REVIEWS & OTHER ---');
  await runTest('23. GET /api/reviews (no params)', 'GET', BASE + '/api/reviews');
  if (firstUserId) {
    await runTest('24. GET /api/reviews?userId=' + firstUserId, 'GET', BASE + '/api/reviews?userId=' + firstUserId);
  }
  await runTest('25. GET /api/search?q=test', 'GET', BASE + '/api/search?q=test');
  await runTest('26. GET /api/posts', 'GET', BASE + '/api/posts');
  await runTest('27. GET /api/users', 'GET', BASE + '/api/users');
  await runTest('28. GET /api/bookmarks', 'GET', BASE + '/api/bookmarks');
  await runTest('29. GET /api/chat', 'GET', BASE + '/api/chat');

  // ERROR HANDLING
  console.log('\n--- ERROR HANDLING ---');
  await runTest('30. GET /api/nonexistent', 'GET', BASE + '/api/nonexistent');
  await runTest('31. GET /api/requests?limit=abc', 'GET', BASE + '/api/requests?limit=abc');
  await runTest('32. GET /api/requests/invalid-id', 'GET', BASE + '/api/requests/invalid-id-12345');
  await runTest('33. GET /api/specialists/invalid-id', 'GET', BASE + '/api/specialists/invalid-id-12345');

  // DETAILED BODIES
  console.log('\n\n========================================');
  console.log(' DETAILED RESPONSE BODIES');
  console.log('========================================\n');
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    console.log('--- ' + r.label + ' [' + r.status + '] ---');
    try { var p = JSON.parse(r.body); console.log(JSON.stringify(p, null, 2).substring(0, 600)); }
    catch(e) { console.log(r.preview); }
    console.log('');
  }

  // SUMMARY
  console.log('\n========================================');
  console.log(' FINAL SUMMARY');
  console.log('========================================\n');
  var passed = results.filter(function(r) { return r.status >= 200 && r.status < 300; });
  var clientErr = results.filter(function(r) { return r.status >= 400 && r.status < 500; });
  var serverErr = results.filter(function(r) { return r.status >= 500; });
  var connFail = results.filter(function(r) { return r.status === 0; });

  console.log('Total tests: ' + results.length);
  console.log('2xx Success: ' + passed.length);
  console.log('4xx Client Error: ' + clientErr.length);
  console.log('5xx Server Error: ' + serverErr.length);
  console.log('Connection Failed: ' + connFail.length);

  console.log('\n--- 2xx Success ---');
  for (var j = 0; j < passed.length; j++) console.log('  OK [' + passed[j].status + '] ' + passed[j].label + ' (' + passed[j].time + 's)');

  console.log('\n--- 4xx Client Errors ---');
  for (var k = 0; k < clientErr.length; k++) console.log('  ! [' + clientErr[k].status + '] ' + clientErr[k].label + ' (' + clientErr[k].time + 's)');

  if (serverErr.length > 0) {
    console.log('\n--- 5xx Server Errors ---');
    for (var l = 0; l < serverErr.length; l++) console.log('  X [' + serverErr[l].status + '] ' + serverErr[l].label);
  }

  if (connFail.length > 0) {
    console.log('\n--- Connection Failures ---');
    for (var m = 0; m < connFail.length; m++) console.log('  X [CONN] ' + connFail[m].label);
  }

  process.exit(0);
}

main().catch(function(e) { console.error(e); process.exit(1); });
