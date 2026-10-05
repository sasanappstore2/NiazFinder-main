const baseUrl = process.env.SI_POST_HEALTH_URL?.trim() || 'http://127.0.0.1:8101';

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
    throw new Error(`si-post health failed: ${healthResponse.status}`);
  }

  console.log(JSON.stringify(health));
  if (health.model_name !== (process.env.SI_MODEL_NAME?.trim() || 'si/multilingual')) {
    throw new Error('unexpected Si model');
  }

  if (!health.model_loaded) {
    console.log('si-post worker is reachable but model is not loaded; /post manual mode remains available');
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
  if (!response.ok) throw new Error(`si-post predict failed: ${response.status}`);
  console.log('si-post predict: ok');
}

void main();
