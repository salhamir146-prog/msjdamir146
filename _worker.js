export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ۱. ثبت‌نام کاربر جدید
      if (path === "/api/register" && request.method === "POST") {
        const { name, phone } = await request.json();
        if (!name || !phone) return new Response(JSON.stringify({ error: "اطلاعات ناقص است" }), { status: 400, headers: corsHeaders });
        
        let users = JSON.parse(await env.AVAYE_YAGHIN_KV.get("users") || "[]");
        if (!users.some(u => u.phone === phone)) {
          users.push({ name, phone, time: new Date().toLocaleString("fa-IR") });
          await env.AVAYE_YAGHIN_KV.put("users", JSON.stringify(users));
        }
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // ۲. ارسال پیام و ارتباط با هوش مصنوعی Groq
      if (path === "/api/chat" && request.method === "POST") {
        const { message, user } = await request.json();
        
        // بررسی مسدود بودن کاربر
        const blocked = JSON.parse(await env.AVAYE_YAGHIN_KV.get("blocked") || "[]");
        if (user && blocked.includes(user.phone)) {
          return new Response(JSON.stringify({ reply: "حساب کاربری شما توسط مدیریت مسدود شده است." }), { headers: corsHeaders });
        }

        // فراخوانی ای‌پی‌آی گروگ (Groq API)
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: "تو دستیار هوشمند و متخصص دینی سامانه آوای یقین هستی. پاسخ‌ها باید کاملاً مستند، دقیق و به زبان فارسی روان باشند." },
              { role: "user", content: message }
            ]
          })
        });

        const groqData = await groqRes.json();
        const reply = groqData.choices?.[0]?.message?.content || "پاسخی از سرور دریافت نشد.";

        // ذخیره لاگ چت در KV ابری
        let logs = JSON.parse(await env.AVAYE_YAGHIN_KV.get("chat_logs") || "[]");
        logs.unshift({
          userName: user?.name || "مهمان",
          userPhone: user?.phone || "نامشخص",
          question: message,
          reply: reply,
          time: new Date().toLocaleString("fa-IR")
        });
        if (logs.length > 100) logs = logs.slice(0, 100);
        await env.AVAYE_YAGHIN_KV.put("chat_logs", JSON.stringify(logs));

        return new Response(JSON.stringify({ reply }), { headers: corsHeaders });
      }

      // ۳. دریافت اطلاعات پنل ادمین
      if (path === "/api/admin/data" && request.method === "GET") {
        const users = JSON.parse(await env.AVAYE_YAGHIN_KV.get("users") || "[]");
        const logs = JSON.parse(await env.AVAYE_YAGHIN_KV.get("chat_logs") || "[]");
        const blocked = JSON.parse(await env.AVAYE_YAGHIN_KV.get("blocked") || "[]");
        return new Response(JSON.stringify({ users, logs, blocked }), { headers: corsHeaders });
      }

      // ۴. مسدود یا آزاد کردن کاربر
      if (path === "/api/admin/block" && request.method === "POST") {
        const { phone } = await request.json();
        let blocked = JSON.parse(await env.AVAYE_YAGHIN_KV.get("blocked") || "[]");
        if (blocked.includes(phone)) {
          blocked = blocked.filter(p => p !== phone);
        } else {
          blocked.push(phone);
        }
        await env.AVAYE_YAGHIN_KV.put("blocked", JSON.stringify(blocked));
        return new Response(JSON.stringify({ success: true, blocked }), { headers: corsHeaders });
      }

      return new Response("Not Found", { status: 404, headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
  }
};
