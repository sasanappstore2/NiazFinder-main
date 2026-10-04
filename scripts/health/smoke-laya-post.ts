const baseUrl = process.env.LAYA_POST_HEALTH_URL?.trim() || 'http://127.0.0.1:8101';

async function main(): Promise<void> {
  const healthResponse = await fetch(`${baseUrl}/health`, { cache: 'no-store' });
  const health = (await healthResponse.json().catch(() => null)) as {
    ok?: boolean;
    model_loaded?: boolean;
    model_name?: string;
    device?: string;
    error?: string | null;
  } | null;

  if (!healthResponse.ok || !health) {
    throw new Error(`laya-post health failed: ${healthResponse.status}`);
  }

  console.log(JSON.stringify(health));
  if (health.model_name !== 'convaiinnovations/laya-multilingual') {
    throw new Error('unexpected Laya model');
  }

  if (!health.model_loaded) {
    console.log('laya-post worker is reachable but model is not loaded; /post manual mode remains available');
    return;
  }

  const response = await fetch(`${baseUrl}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      state: { text: 'یک دفتر کار در تهران برای اجاره می‌خواهم' },
      questions: {
        transaction_type: {
          type: 'choice',
          instructions: 'نوع معامله را مشخص کن.',
          criteria: { rent_monthly: 'اجاره ماهانه', unknown: 'در متن مشخص نیست' },
        },
      },
    }),
  });
  if (!response.ok) throw new Error(`laya-post predict failed: ${response.status}`);
  console.log('laya-post predict: ok');
}

void main();
