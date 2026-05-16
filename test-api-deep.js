const http = require('http');
const BASE = 'http://localhost:3000';

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
        resolve({ status: res.statusCode, time: elapsed, size: fullBody.length, body: fullBody });
      });
    });
    req.on('error', function(e) {
      resolve({ status: 0, time: '0.000', size: 0, body: '', preview: 'ERROR: ' + e.message });
    });
    if (data) req.write(data);
    req.end();
  });
}

async function run(label, method, url, body, headers) {
  var r = await doFetch(method, url, body, headers);
  console.log('[' + r.status + '] ' + r.time + 's ' + r.size + 'B - ' + label);
  try { console.log(JSON.stringify(JSON.parse(r.body), null, 2).substring(0, 400)); } catch(e) { console.log(r.body.substring(0, 400)); }
  console.log('---');
  return r;
}

async function main() {
  console.log('=== ADDITIONAL DEEP DIVE TESTS ===\n');

  // AUTH: Register with firstName (the trigger for register mode)
  console.log('--- AUTH REGISTER (with firstName) ---');
  var ts = Date.now();
  var regResp = await run('Register with firstName', 'POST', BASE + '/api/auth', { 
    firstName: 'Test', lastName: 'User', email: 'reg' + ts + '@test.com', password: 'Pass123456' 
  });
  var regToken = '';
  try { var rd = JSON.parse(regResp.body); regToken = rd.token || ''; } catch(e) {}
  
  // Login with the newly registered user
  if (regResp.status === 201) {
    await run('Login with registered user', 'POST', BASE + '/api/auth', {
      email: 'reg' + ts + '@test.com', password: 'Pass123456'
    });
  }

  // Test register with existing email
  await run('Register duplicate email', 'POST', BASE + '/api/auth', {
    firstName: 'Dup', email: 'admin@needfinder.ir', password: 'Pass123456'
  });

  // Test register without email/password
  await run('Register missing fields', 'POST', BASE + '/api/auth', { firstName: 'NoEmail' });

  // Test reviews with specialist ID as userId
  var specId = 'cmp62dbn1004om7v06ruraze0';
  await run('Reviews with specialist ID', 'GET', BASE + '/api/reviews?userId=' + specId);
  await run('Reviews with specialist ID + page', 'GET', BASE + '/api/reviews?userId=' + specId + '&page=1&limit=5');

  // Test search with Persian query (the main use case)
  await run('Search Persian: وب', 'GET', BASE + '/api/search?q=وب');
  await run('Search no query', 'GET', BASE + '/api/search');

  // Test requests with valid params
  await run('Requests sort=budget_low', 'GET', BASE + '/api/requests?limit=3&sort=budget_low');
  await run('Requests with categoryId', 'GET', BASE + '/api/requests?categoryId=cmp62d6ud0000m7tdbrfuf2s2&limit=3');
  await run('Requests with status', 'GET', BASE + '/api/requests?status=OPEN&limit=3');

  // Test requests/[id] with valid ID
  var reqId = 'cmp62dbt700k9m7v0au125bur';
  await run('Request detail valid', 'GET', BASE + '/api/requests/' + reqId);

  // Test with admin token for protected writes
  if (regToken) {
    var ah = { Authorization: 'Bearer ' + regToken };
    await run('POST /api/requests (with token)', 'POST', BASE + '/api/requests', {
      title: 'تست API', description: 'توضیحات تست', categoryId: 'cmp62d6ud0000m7tdbrfuf2s2',
      budgetMin: 1000000, budgetMax: 5000000, city: 'تهران'
    }, ah);
  }

  // Test proposals with auth
  var loginResp = await doFetch('POST', BASE + '/api/auth', { email: 'admin@needfinder.ir', password: '123456' });
  var adminToken = '';
  try { adminToken = JSON.parse(loginResp.body).token || ''; } catch(e) {}
  if (adminToken) {
    var ah = { Authorization: 'Bearer ' + adminToken };
    await run('POST /api/proposals (admin token)', 'POST', BASE + '/api/proposals', {
      requestId: reqId, message: 'تست پروپوزال', price: 2000000, deliveryTime: 10
    }, ah);
  }

  // Test conversation detail
  if (adminToken) {
    var ah = { Authorization: 'Bearer ' + adminToken };
    await run('GET /api/conversations/invalid (auth)', 'GET', BASE + '/api/conversations/test-id', null, ah);
  }

  // Test users/profile  
  await run('GET /api/users/profile?id=' + specId, 'GET', BASE + '/api/users/profile?id=' + specId);
  
  // Test calls endpoint
  if (adminToken) {
    var ah = { Authorization: 'Bearer ' + adminToken };
    await run('GET /api/calls (auth)', 'GET', BASE + '/api/calls', null, ah);
  }

  // Test OTP and verify endpoints
  await run('POST /api/auth/otp', 'POST', BASE + '/api/auth/otp', { phone: '09120000001' });
  await run('POST /api/auth/verify', 'POST', BASE + '/api/auth/verify', { phone: '09120000001', code: '123456' });
  await run('POST /api/auth/logout (no auth)', 'POST', BASE + '/api/auth/logout', {});

  // Admin endpoints
  if (adminToken) {
    var ah = { Authorization: 'Bearer ' + adminToken };
    await run('GET /api/admin/stats (admin)', 'GET', BASE + '/api/admin/stats', null, ah);
  }

  // Test request detail - check if it's slow due to includes
  var startT = Date.now();
  await run('Request detail (warm)', 'GET', BASE + '/api/requests/' + reqId);

  process.exit(0);
}

main().catch(function(e) { console.error(e); process.exit(1); });
