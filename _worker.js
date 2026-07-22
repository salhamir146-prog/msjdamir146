export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ۱. پنل مدیریت ساده و بدون نیاز به KV
    if (url.pathname === '/admin') {
      if (request.method === 'POST') {
        const formData = await request.formData();
        const apiKey = formData.get('api_key');
        const currentModel = formData.get('current_model');
        const imageGenEnabled = formData.get('image_gen_enabled') === 'on' ? 'true' : 'false';

        // ذخیره موقت در حافظه اجرایی کارنت (برای تست فوری)
        globalThis.CACHED_API_KEY = apiKey;
        globalThis.CACHED_MODEL = currentModel;
        globalThis.CACHED_IMAGE_GEN = imageGenEnabled;

        return new Response('تنظیمات با موفقیت ذخیره شد! <a href="/admin">بازگشت به پنل</a> | <a href="/">رفتن به صفحه چت</a>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }

      const apiKey = globalThis.CACHED_API_KEY || '';
      const currentModel = globalThis.CACHED_MODEL || 'openai/gpt-oss-20b:free';
      const imageGenEnabled = globalThis.CACHED_IMAGE_GEN === 'true';

      const html = `
        <!DOCTYPE html>
        <html lang="fa" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>پنل مدیریت آوای یقین</title>
          <style>
            body { font-family: Tahoma, sans-serif; background: #f4f7f6; padding: 20px; direction: rtl; }
            .card { background: white; padding: 20px; border-radius: 8px; max-width: 500px; margin: auto; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            input, select { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
            button { background: #4CAF50; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; width: 100%; }
            button:hover { background: #45a049; }
            .checkbox-label { display: flex; align-items: center; margin: 15px 0; font-weight: bold; }
            .checkbox-label input { width: auto; margin-left: 10px; }
            .links { margin-top: 15px; text-align: center; }
            .links a { color: #007bff; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>پنل ادمین آوای یقین</h2>
            <form method="POST">
              <label>کلید API (OpenRouter):</label>
              <input type="password" name="api_key" value="${apiKey}" required placeholder="sk-or-v1-...">

              <label>انتخاب مدل هوش مصنوعی:</label>
              <select name="current_model">
                <option value="openai/gpt-oss-20b:free" ${currentModel === 'openai/gpt-oss-20b:free' ? 'selected' : ''}>GPT-OSS 20B (رایگان)</option>
                <option value="google/gemini-2.5-flash:free" ${currentModel === 'google/gemini-2.5-flash:free' ? 'selected' : ''}>Gemini Flash (رایگان)</option>
                <option value="meta-llama/llama-3.3-70b-instruct:free" ${currentModel === 'meta-llama/llama-3.3-70b-instruct:free' ? 'selected' : ''}>Llama 3.3 (رایگان)</option>
                <option value="mistralai/mistral-small-24b-instruct-2501:free" ${currentModel === 'mistralai/mistral-small-24b-instruct-2501:free' ? 'selected' : ''}>Mistral 2 Lite (رایگان)</option>
              </select>

              <div class="checkbox-label">
                <input type="checkbox" name="image_gen_enabled" ${imageGenEnabled ? 'checked' : ''}>
                فعال‌سازی دکمه تولید تصویر برای کاربران
              </div>

              <button type="submit">ذخیره تنظیمات</button>
            </form>
            <div class="links">
              <a href="/">ورود به صفحه چت آوای یقین</a>
            </div>
          </div>
        </body>
        </html>
      `;
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // ۲. صفحه اصلی چت آوای یقین
    if (url.pathname === '/' || url.pathname === '/chat') {
      const imageGenEnabled = globalThis.CACHED_IMAGE_GEN === 'true';

      const chatHtml = `
        <!DOCTYPE html>
        <html lang="fa" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>آوای یقین</title>
          <style>
            body { font-family: Tahoma, sans-serif; background: #eef2f3; margin: 0; padding: 20px; display: flex; flex-direction: column; height: 90vh; }
            #chat-container { flex: 1; background: white; border-radius: 8px; padding: 15px; overflow-y: auto; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-bottom: 15px; }
            .message { margin: 10px 0; padding: 10px; border-radius: 6px; max-width: 75%; line-height: 1.5; word-wrap: break-word; }
            .user { background: #dcf8c6; margin-right: auto; text-align: right; }
            .bot { background: #f1f0f0; margin-left: auto; text-align: left; }
            .input-area { display: flex; gap: 10px; }
            input[type="text"] { flex: 1; padding: 12px; border: 1px solid #ccc; border-radius: 4px; }
            button { padding: 12px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
            button:hover { background: #0056b3; }
            .mode-switch { margin-bottom: 10px; display: flex; gap: 10px; align-items: center; font-weight: bold; }
            img.generated-img { max-width: 100%; border-radius: 6px; margin-top: 5px; display: block; }
            .download-btn { display: inline-block; margin-top: 8px; padding: 6px 12px; background: #28a745; color: white; text-decoration: none; border-radius: 4px; font-size: 13px; }
            .admin-link { margin-bottom: 10px; font-size: 13px; }
            .admin-link a { color: #555; text-decoration: none; background: #ddd; padding: 4px 8px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="admin-link">
            <a href="/admin">⚙️ رفتن به پنل مدیریت</a>
          </div>

          <div class="mode-switch">
            <label><input type="radio" name="mode" value="text" checked onchange="switchMode('text')"> گفتگوی متنی</label>
            ${imageGenEnabled ? '<label style="color: #d9534f;"><input type="radio" name="mode" value="image" onchange="switchMode(\'image\')"> تولید تصویر (فعال)</label>' : ''}
          </div>

          <div id="chat-container"></div>

          <div class="input-area">
            <input type="text" id="userInput" placeholder="پیام خود را به آوای یقین بنویسید..." onkeydown="if(event.key==='Enter') sendMessage()">
            <button onclick="sendMessage()">ارسال</button>
          </div>

          <script>
            let currentMode = 'text';
            function switchMode(mode) {
              currentMode = mode;
              const input = document.getElementById('userInput');
              input.placeholder = mode === 'image' ? 'توضیح تصویری که می‌خواهید را به فارسی بنویسید...' : 'پیام خود را به آوای یقین بنویسید...';
            }

            async function sendMessage() {
              const input = document.getElementById('userInput');
              const text = input.value.trim();
              if (!text) return;

              const container = document.getElementById('chat-container');
              container.innerHTML += '<div class="message user">' + text + '</div>';
              input.value = '';
              container.scrollTop = container.scrollHeight;

              const responseDiv = document.createElement('div');
              responseDiv.className = 'message bot';
              responseDiv.innerHTML = currentMode === 'image' ? 'در حال ترجمه پرامپت و ساخت تصویر...' : 'در حال پردازش...';
              container.appendChild(responseDiv);

              try {
                const res = await fetch('/api/chat', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ prompt: text, mode: currentMode })
                });
                const data = await res.json();
                
                if (currentMode === 'image') {
                  responseDiv.innerHTML = 'تصویر شما آماده شد:<br><img src="' + data.result + '" class="generated-img"><br><a href="' + data.result + '" target="_blank" download="image.jpg" class="download-btn">📥 دانلود تصویر</a>';
                } else {
                  responseDiv.innerHTML = data.result;
                }
              } catch (err) {
                responseDiv.innerHTML = 'خطا در ارتباط با سرور.';
              }
              container.scrollTop = container.scrollHeight;
            }
          </script>
        </body>
        </html>
      `;
      return new Response(chatHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // ۳. مسیر پردازش درخواست‌ها
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const { prompt, mode } = await request.json();
        const apiKey = globalThis.CACHED_API_KEY;
        const currentModel = globalThis.CACHED_MODEL || 'openai/gpt-oss-20b:free';

        if (!apiKey) {
          return Response.json({ result: 'لطفاً اول کلید OpenRouter را از طریق پنل مدیریت تنظیم کنید.' });
        }

        // حالت تولید تصویر
        if (mode === 'image') {
          const translationRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: currentModel,
              messages: [
                { role: 'system', content: 'Translate the following Persian text into a detailed English prompt for an AI image generator. Output ONLY the English translation.' },
                { role: 'user', content: prompt }
              ]
            })
          });

          const transData = await translationRes.json();
          let englishPrompt = prompt;
          if (transData.choices && transData.choices[0]) {
            englishPrompt = transData.choices[0].message.content.trim();
          }

          const imageUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(englishPrompt);
          return Response.json({ result: imageUrl });
        }

        // حالت چت متنی
        const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type': 'application/json',
            'HTTP-Referer': url.origin,
            'X-Title': 'Avaye Yaghin'
          },
          body: JSON.stringify({
            model: currentModel,
            messages: [{ role: 'user', content: prompt }]
          })
        });

        const aiData = await aiResponse.json();
        let reply = 'پاسخی دریافت نشد.';
        
        if (aiData.choices && aiData.choices[0]) {
          reply = aiData.choices[0].message.content;
        } else if (aiData.error) {
          reply = 'خطای OpenRouter: ' + (aiData.error.message || JSON.stringify(aiData.error));
        } else {
          reply = 'پاسخ ناشناخته از سرور: ' + JSON.stringify(aiData);
        }

        return Response.json({ result: reply });

      } catch (e) {
        return Response.json({ result: 'خطای سیستمی: ' + e.message });
      }
    }

    return new Response('صفحه مورد نظر پیدا نشد (404)', { status: 404 });
  }
};
