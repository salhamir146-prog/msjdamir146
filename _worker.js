export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ۱. پردازش درخواست‌های مربوط به هوش مصنوعی
    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const body = await request.json();
        const { messages, systemPrompt } = body;

        // خواندن کلید API از تنظیمات کلودفلر
        const apiKey = env.GROQ_API_KEY;

        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "کلید GROQ_API_KEY در تنظیمات کلودفلر یافت نشد." }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }

        // ارسال درخواست به هدر رسمی Groq API
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              ...messages
            ],
            temperature: 0.6,
            max_tokens: 2048
          })
        });

        const data = await groqResponse.json();

        if (!groqResponse.ok) {
          return new Response(
            JSON.stringify({ error: data.error?.message || "خطا در پاسخگویی هوش مصنوعی" }),
            { status: groqResponse.status, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });

      } catch (err) {
        return new Response(
          JSON.stringify({ error: err.message || "خطای داخلی سرور" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // ۲. بارگذاری صفحات وب (HTML/CSS/JS)
    return env.ASSETS.fetch(request);
  }
};
