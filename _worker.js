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

    // مدیریت درخواست‌های ارسال پیام چت
    if (request.method === "POST" && (url.pathname === "/api/chat" || url.pathname === "/api/chat/")) {
      try {
        const body = await request.json();
        const userMessage = body.message || "";
        const apiKey = env.GEMINI_API_KEY;

        if (!apiKey) {
          return new Response(JSON.stringify({ 
            reply: "کلید GEMINI_API_KEY در تنظیمات Cloudflare تعریف نشده است." 
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }

        // ارتباط با هوش مصنوعی جمینای
        const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: `تو دستیار هوشمند مسجد حضرت ابوالفضل (ع) به نام «آوای یقین» هستی. با لحنی بسیار صمیمی، محترمانه و دقیق به این پرسش پاسخ بده: ${userMessage}` }]
            }]
          })
        });

        const aiData = await aiResponse.json();

        if (aiData.error) {
          return new Response(JSON.stringify({ 
            reply: "خطا از سمت API گوگل: " + aiData.error.message 
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }

        const replyText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "پاسخی از هوش مصنوعی دریافت نشد.";

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

    // نمایش صفحه اصلی و فایل‌های استاتیک
    return env.ASSETS ? env.ASSETS.fetch(request) : fetch(request);
  }
};
