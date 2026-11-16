// Supabase Auth "Send SMS Hook" → отправка кода через SMS.ru (российский СМС-шлюз).
// Встроенные провайдеры Supabase (Twilio и др.) плохо доставляют СМС в РФ,
// поэтому коды отправляем сами.
//
// Деплой:
//   supabase functions deploy send-sms --no-verify-jwt
//   supabase secrets set SMSRU_API_ID=ваш_api_id SEND_SMS_HOOK_SECRET="v1,whsec_..."
// Затем: Authentication → Hooks → Send SMS hook → HTTPS → URL этой функции.
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

const SMSRU_API_ID = Deno.env.get('SMSRU_API_ID')!;
const HOOK_SECRET = (Deno.env.get('SEND_SMS_HOOK_SECRET') ?? '').replace('v1,whsec_', '');

Deno.serve(async (req) => {
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  let data: { user: { phone: string }; sms: { otp: string } };
  try {
    data = new Webhook(HOOK_SECRET).verify(payload, headers) as typeof data;
  } catch {
    return new Response(JSON.stringify({ error: { http_code: 401, message: 'Invalid signature' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const phone = data.user.phone.replace(/\D/g, '');
  const msg = `Автоняня: код ${data.sms.otp}. Никому не сообщайте.`;
  const url =
    `https://sms.ru/sms/send?api_id=${encodeURIComponent(SMSRU_API_ID)}` +
    `&to=${phone}&msg=${encodeURIComponent(msg)}&json=1`;

  const res = await fetch(url);
  const body = await res.json();
  const ok = body.status === 'OK' && body.sms?.[phone]?.status === 'OK';

  if (!ok) {
    console.error('SMS.ru error', JSON.stringify(body));
    return new Response(
      JSON.stringify({ error: { http_code: 500, message: 'Не удалось отправить СМС' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
  return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
});
