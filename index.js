export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // بخش ارتباط با OpenRouter با استفاده از متغیر محیطی کلودفلر
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const body = await request.json();
        const apiKey = env.OPENROUTER_API_KEY;

        if (!apiKey) {
          return new Response(JSON.stringify({ error: 'کلید API در متغیرهای کلودفلر تنظیم نشده است!' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
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

    // تحویل فایل‌های فرانت‌اند (HTML, CSS, JS) از طریق Static Assets کلودفلر
    return env.ASSETS.fetch(request);
  }
};
