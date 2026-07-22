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
      // مقداردهی اولیه تنظیمات پیش‌فرض در صورت خالی بودن
      let settings = JSON.parse(await env.AVAYE_YAGHIN_KV.get("settings") || JSON.stringify({
        systemPrompt: "تو دستیار هوشمند و متخصص دینی سامانه آوای یقین هستی. پاسخ‌ها باید کاملاً مستند، دقیق و به زبان فارسی روان باشند.",
        model: "llama-3.3-70b-versatile",
        botActive: true,
        welcomeMsg: "سلام! به سامانه جامع و هوشمند آوای یقین خوش آمدید. پرسش خود را وارد کنید...",
        temperature: 0.7,
        maxTokens: 1024,
        adminNotes: "خوش آمدید، لطفاً امور مسجد را به دقت مدیریت کنید."
      }));

      // ۱. ثبت‌نام کاربر
      if (path === "/api/register" && request.method === "POST") {
        const { name, phone } = await request.json();
        if (!name || !phone) return new Response(JSON.stringify({ error: "اطلاعات ناقص است" }), { status: 400, headers: corsHeaders });
        
        try {
          let users = JSON.parse(await env.AVAYE_YAGHIN_KV.get("users") || "[]");
          if (!users.some(u => u.phone === phone)) {
            users.push({ name, phone, time: new Date().toLocaleString("fa-IR") });
            await env.AVAYE_YAGHIN_KV.put("users", JSON.stringify(users));
          }
        } catch (e) {}

        return new Response(JSON.stringify({ success: true, welcomeMsg: settings.welcomeMsg }), { headers: corsHeaders });
      }

      // ۲. چت با هوش مصنوعی (با لحاظ کردن تنظیمات زنده ادمین)
      if (path === "/api/chat" && request.method === "POST") {
        if (!settings.botActive) {
          return new Response(JSON.stringify({ reply: "سامانه موقتاً جهت به‌روزرسانی یا تعمیرات غیرفعال می‌باشد. لطفاً بعداً مراجعه فرمایید." }), { headers: corsHeaders });
        }

        const { message, user } = await request.json();
        
        // بررسی مسدود بودن
        try {
          const blocked = JSON.parse(await env.AVAYE_YAGHIN_KV.get("blocked") || "[]");
          if (user && blocked.includes(user.phone)) {
            return new Response(JSON.stringify({ reply: "حساب کاربری شما توسط مدیریت مسدود شده است." }), { headers: corsHeaders });
          }
        } catch (e) {}

        // فراخوانی Groq با پارامترهای تنظیمی ادمین
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: settings.model,
            temperature: Number(settings.temperature),
            max_tokens: Number(settings.maxTokens),
            messages: [
              { role: "system", content: settings.systemPrompt },
              { role: "user", content: message }
            ]
          })
        });

        const groqData = await groqRes.json();
        if (!groqRes.ok) {
          return new Response(JSON.stringify({ error: groqData.error?.message || "خطا در ارتباط با هوش مصنوعی" }), { status: 500, headers: corsHeaders });
        }
        
        const reply = groqData.choices?.[0]?.message?.content || "پاسخی از سرور دریافت نشد.";

        // ذخیره لاگ
        try {
          let logs = JSON.parse(await env.AVAYE_YAGHIN_KV.get("chat_logs") || "[]");
          logs.unshift({
            userName: user?.name || "مهمان",
            userPhone: user?.phone || "نامشخص",
            question: message,
            reply: reply,
            time: new Date().toLocaleString("fa-IR")
          });
          if (logs.length > 150) logs = logs.slice(0, 150);
          await env.AVAYE_YAGHIN_KV.put("chat_logs", JSON.stringify(logs));
        } catch (e) {}

        return new Response(JSON.stringify({ reply }), { headers: corsHeaders });
      }

      // ۳. دریافت داده‌های پنل ادمین
      if (path === "/api/admin/data" && request.method === "GET") {
        let users = [], logs = [], blocked = [], broadcasts = [];
        try {
          users = JSON.parse(await env.AVAYE_YAGHIN_KV.get("users") || "[]");
          logs = JSON.parse(await env.AVAYE_YAGHIN_KV.get("chat_logs") || "[]");
          blocked = JSON.parse(await env.AVAYE_YAGHIN_KV.get("blocked") || "[]");
          broadcasts = JSON.parse(await env.AVAYE_YAGHIN_KV.get("broadcasts") || "[]");
        } catch (e) {}
        return new Response(JSON.stringify({ users, logs, blocked, broadcasts, settings }), { headers: corsHeaders });
      }

      // ۴. ذخیره تنظیمات ربات و هوش مصنوعی
      if (path === "/api/admin/settings" && request.method === "POST") {
        const newSettings = await request.json();
        await env.AVAYE_YAGHIN_KV.put("settings", JSON.stringify(newSettings));
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // ۵. مسدودسازی کاربر
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

      // ۶. پاکسازی کل لاگ‌ها
      if (path === "/api/admin/clear-logs" && request.method === "POST") {
        await env.AVAYE_YAGHIN_KV.put("chat_logs", JSON.stringify([]));
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // ۷. ارسال اطلاعیه همگانی
      if (path === "/api/admin/broadcast" && request.method === "POST") {
        const { message } = await request.json();
        let broadcasts = JSON.parse(await env.AVAYE_YAGHIN_KV.get("broadcasts") || "[]");
        broadcasts.unshift({ message, time: new Date().toLocaleString("fa-IR") });
        await env.AVAYE_YAGHIN_KV.put("broadcasts", JSON.stringify(broadcasts));
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      return new Response("Not Found", { status: 404, headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
  }
};
