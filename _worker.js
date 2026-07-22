export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // پاسخ به درخواست‌های OPTIONS برای CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // مدیریت درخواست‌های چت با API سرویس Groq
    if (request.method === "POST" && (url.pathname === "/api/chat" || url.pathname === "/api/chat/")) {
      try {
        const body = await request.json();
        const userMessage = body.message || "";
        
        // دریافت کلید Groq از متغیرهای کلودفلر یا استفاده از همین کلید
        const apiKey = env.GROQ_API_KEY || env.GEMINI_API_KEY || "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";

        // ارسال درخواست به سرورهای Groq (مدل Llama 3)
        const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: "تو دستیار هوشمند مسجد حضرت ابوالفضل (ع) به نام «آوای یقین» هستی. با لحنی صمیمی، محترمانه و دقیق به فارسی پاسخ بده."
              },
              {
                role: "user",
                content: userMessage
              }
            ],
            temperature: 0.7
          })
        });

        const aiData = await aiResponse.json();

        if (aiData.error) {
          return new Response(JSON.stringify({ 
            reply: "خطا از سمت Groq: " + aiData.error.message 
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }

        const replyText = aiData.choices?.[0]?.message?.content || "پاسخی دریافت نشد.";

        return new Response(JSON.stringify({ reply: replyText }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });

      } catch (err) {
        return new Response(JSON.stringify({ reply: "خطای سرور: " + err.message }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    // نمایش فایل‌های استاتیک
    return env.ASSETS ? env.ASSETS.fetch(request) : fetch(request);
  }
};
