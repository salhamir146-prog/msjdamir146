export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ۱. هندل کردن مسیر API چت و هوش مصنوعی
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const body = await request.json();
        // گرفتن کلید از متغیرهای محیطی کلودفلر (Secrets) یا حافظه موقت
        const apiKey = env.OPENROUTER_API_KEY || globalThis.OPENROUTER_API_KEY;

        if (!apiKey) {
          return new Response(JSON.stringify({ error: 'کلید API تنظیم نشده است. لطفاً از طریق پنل کلودفلر یا بخش ادمین کلید را وارد کنید.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // ارتباط با OpenRouter
        const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'Application/json',
            'HTTP-Referer': 'https://msjdamir146.workers.dev',
            'X-Title': 'Avaye Yaghin'
          },
          body: JSON.stringify(body)
        });

        const data = await aiResponse.json();
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // ۲. ذخیره موقت کلید API از طریق پنل ادمین (اگر خواستی همینجا هم کار کنه)
    if (url.pathname === '/api/set-key' && request.method === 'POST') {
      try {
        const { key } = await request.json();
        if (key) {
          globalThis.OPENROUTER_API_KEY = key;
          return new Response(JSON.stringify({ success: true, message: 'کلید با موفقیت ذخیره شد' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (e) {
        // نادیده گرفتن خطای جزئی
      }
    }

    // ۳. تحویل بقیه فایل‌های استاتیک سایت (HTML, CSS, JS و...) از طریق assets داخلی کلودفلر
    return env.ASSETS.fetch(request);
  }
};
