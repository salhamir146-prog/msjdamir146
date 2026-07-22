export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const KV = env.AVAYE_YAGHIN_KV;

    // هدرهای CORS برای ارتباط امن
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Admin-Passcode",
      "Content-Type": "application/json; charset=utf-8"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // مقادیر پیش‌فرض سیستم
    const defaultConfig = {
      botName: "آوای یقین",
      systemPrompt: "تو یک کارشناس دینی و معارفی دانا، مهربان، متواضع و مستند هستی. وظیفه تو پاسخگویی به سوالات دینی، شرعی، قرآنی و اخلاقی با لحنی محترمانه، شیوا و امیدبخش است.",
      welcomeMsg: "سلام و درود بر شما. به آوای یقین خوش آمدید. چگونه می‌توانم در مسیر معارف دینی و پاسخگویی به پرسش‌هایتان به شما کمک کنم؟",
      adminPasscode: "Amidhjsos62627@_897",
      bannerMsg: "به سامانه هوشمند پاسخگویی دینی آوای یقین خوش آمدید.",
      temperature: 0.6
    };

    // تابع کمکی برای دریافت تنظیمات عمومی از دیتابیس
    async function getConfig() {
      if (!KV) return defaultConfig;
      const data = await KV.get("global_config", { type: "json" });
      return data || defaultConfig;
    }

    // ۱. دریافت تنظیمات عمومی برای فرانت‌اند
    if (url.pathname === "/api/config" && request.method === "GET") {
      const config = await getConfig();
      return new Response(JSON.stringify({
        botName: config.botName,
        welcomeMsg: config.welcomeMsg,
        bannerMsg: config.bannerMsg
      }), { headers: corsHeaders });
    }

    // ۲. ثبت کاربر جدید در دیتابیس سراسری
    if (url.pathname === "/api/user/register" && request.method === "POST") {
      try {
        const { name, phone } = await request.json();
        if (!name || !phone) return new Response(JSON.stringify({ error: "اطلاعات ناقص است" }), { status: 400, headers: corsHeaders });

        if (KV) {
          let users = (await KV.get("global_users", { type: "json" })) || [];
          if (!users.some(u => u.phone === phone)) {
            users.push({ name, phone, registeredAt: new Date().toISOString() });
            await KV.put("global_users", JSON.stringify(users));
          }
        }
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ۳. ارسال پیام به هوش مصنوعی و ثبت چت سراسری
    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const body = await request.json();
        const { messages, user } = body;

        const apiKey = env.GROQ_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "کلید GROQ_API_KEY در کلودفلر یافت نشد." }), { status: 500, headers: corsHeaders });
        }

        const config = await getConfig();

        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: config.systemPrompt },
              ...messages
            ],
            temperature: parseFloat(config.temperature) || 0.6,
            max_tokens: 2048
          })
        });

        const data = await groqResponse.json();
        if (!groqResponse.ok) {
          return new Response(JSON.stringify({ error: data.error?.message || "خطا در هوش مصنوعی" }), { status: groqResponse.status, headers: corsHeaders });
        }

        const aiReply = data.choices[0]?.message?.content || "پاسخی دریافت نشد.";

        // ثبت چت در دیتابیس ابری
        if (KV && user) {
          let logs = (await KV.get("global_chat_logs", { type: "json" })) || [];
          const lastMsg = messages[messages.length - 1]?.content || "";
          logs.unshift({
            userName: user.name,
            userPhone: user.phone,
            query: lastMsg,
            response: aiReply,
            timestamp: new Date().toISOString()
          });
          // نگه داشتن ۱۰۰۰ چت اخیر
          if (logs.length > 1000) logs = logs.slice(0, 1000);
          await KV.put("global_chat_logs", JSON.stringify(logs));
        }

        return new Response(JSON.stringify(data), { headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ۴. دریافت داده‌های کامل پنل مدیریت (مخصوص مدیر)
    if (url.pathname === "/api/admin/data" && request.method === "POST") {
      try {
        const { passcode } = await request.json();
        const config = await getConfig();

        if (passcode !== config.adminPasscode) {
          return new Response(JSON.stringify({ error: "رمز عبور مدیریت نادرست است." }), { status: 403, headers: corsHeaders });
        }

        let users = [];
        let logs = [];
        if (KV) {
          users = (await KV.get("global_users", { type: "json" })) || [];
          logs = (await KV.get("global_chat_logs", { type: "json" })) || [];
        }

        return new Response(JSON.stringify({
          config,
          users,
          logs,
          stats: {
            totalUsers: users.length,
            totalMessages: logs.length
          }
        }), { headers: corsHeaders });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ۵. به‌روزرسانی تنظیمات مدیریت (سراسری)
    if (url.pathname === "/api/admin/update-config" && request.method === "POST") {
      try {
        const { passcode, newConfig } = await request.json();
        const currentConfig = await getConfig();

        if (passcode !== currentConfig.adminPasscode) {
          return new Response(JSON.stringify({ error: "رمز عبور مدیریت نادرست است." }), { status: 403, headers: corsHeaders });
        }

        const updatedConfig = { ...currentConfig, ...newConfig };
        if (KV) {
          await KV.put("global_config", JSON.stringify(updatedConfig));
        }

        return new Response(JSON.stringify({ success: true, config: updatedConfig }), { headers: corsHeaders });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ۶. پاکسازی لوگ‌ها (در صورت نیاز مدیر)
    if (url.pathname === "/api/admin/clear-logs" && request.method === "POST") {
      try {
        const { passcode } = await request.json();
        const config = await getConfig();
        if (passcode !== config.adminPasscode) {
          return new Response(JSON.stringify({ error: "رمز عبور غیرمجاز" }), { status: 403, headers: corsHeaders });
        }
        if (KV) await KV.put("global_chat_logs", JSON.stringify([]));
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
      }
    }

    // سرو کردن فایل‌های استاتیک HTML/CSS/JS
    return env.ASSETS.fetch(request);
  }
};
