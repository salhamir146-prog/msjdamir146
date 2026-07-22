document.addEventListener("DOMContentLoaded", () => {
    // Secret Passcode
    const ADMIN_PASSCODE = "Amidhjsos62627@_897";

    // App State (Default Values)
    let config = {
        botName: localStorage.getItem("ay_botName") || "آوای یقین",
        systemPrompt: localStorage.getItem("ay_systemPrompt") || "تو یک کارشناس دینی و معارفی دانا، مهربان، متواضع و مستند هستی. اسم تو «آوای یقین» است. وظیفه تو پاسخگویی به سوالات دینی، شرعی، قرآنی و اخلاقی با لحنی محترمانه، شیوا و امیدبخش است. اگر سوالی غیرمرتبط با حوزه دین مطرح شد، محترمانه کاربر را به سمت موضوعات دینی هدایت کن.",
        welcomeMsg: localStorage.getItem("ay_welcomeMsg") || "سلام و درود بر شما. به آوای یقین خوش آمدید. چگونه می‌توانم در مسیر معارف دینی و پاسخگویی به پرسش‌هایتان به شما کمک کنم؟"
    };

    let currentUser = JSON.parse(localStorage.getItem("ay_user")) || null;
    let chatHistory = [];

    // DOM Elements
    const onboardingModal = document.getElementById("onboardingModal");
    const onboardingForm = document.getElementById("onboardingForm");
    const mainApp = document.getElementById("mainApp");
    const chatBox = document.getElementById("chatBox");
    const chatForm = document.getElementById("chatForm");
    const chatInput = document.getElementById("chatInput");
    const headerBotName = document.getElementById("headerBotName");
    const displayUserName = document.getElementById("displayUserName");
    const newChatBtn = document.getElementById("newChatBtn");

    // Admin Modal Elements
    const adminModal = document.getElementById("adminModal");
    const closeAdminBtn = document.getElementById("closeAdminBtn");
    const adminBotName = document.getElementById("adminBotName");
    const adminSystemPrompt = document.getElementById("adminSystemPrompt");
    const adminWelcomeMsg = document.getElementById("adminWelcomeMsg");
    const saveSettingsBtn = document.getElementById("saveSettingsBtn");
    const tabSettingsBtn = document.getElementById("tabSettingsBtn");
    const tabUsersBtn = document.getElementById("tabUsersBtn");
    const tabSettings = document.getElementById("tabSettings");
    const tabUsers = document.getElementById("tabUsers");
    const usersListContainer = document.getElementById("usersListContainer");
    const refreshLogsBtn = document.getElementById("refreshLogsBtn");

    // Initialize App
    init();

    function init() {
        updateUIConfig();

        if (currentUser) {
            onboardingModal.classList.add("hidden");
            mainApp.classList.remove("hidden");
            displayUserName.textContent = currentUser.name;
            renderWelcomeMessage();
        } else {
            onboardingModal.classList.remove("hidden");
            mainApp.classList.add("hidden");
        }
    }

    function updateUIConfig() {
        headerBotName.textContent = config.botName;
        adminBotName.value = config.botName;
        adminSystemPrompt.value = config.systemPrompt;
        adminWelcomeMsg.value = config.welcomeMsg;
    }

    // Handle Onboarding Form Submit
    onboardingForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("userName").value.trim();
        const phone = document.getElementById("userPhone").value.trim();

        if (name && phone) {
            currentUser = { name, phone, id: "user_" + Date.now() };
            localStorage.setItem("ay_user", JSON.stringify(currentUser));
            
            // Register User in Global Storage
            saveUserToDatabase(currentUser);

            onboardingModal.classList.add("hidden");
            mainApp.classList.remove("hidden");
            displayUserName.textContent = currentUser.name;
            renderWelcomeMessage();
        }
    });

    // Render Initial Welcome Message
    function renderWelcomeMessage() {
        chatBox.innerHTML = "";
        chatHistory = [];
        appendBotMessage(config.welcomeMsg);
    }

    // New Chat Button
    newChatBtn.addEventListener("click", renderWelcomeMessage);

    // Auto resize input textarea
    chatInput.addEventListener("input", () => {
        chatInput.style.height = "auto";
        chatInput.style.height = chatInput.scrollHeight + "px";
    });

    // Chat Form Submit / Secret Password Check
    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (!message) return;

        // Check for Admin Secret Password
        if (message === ADMIN_PASSCODE) {
            chatInput.value = "";
            chatInput.style.height = "auto";
            openAdminPanel();
            return;
        }

        // Normal Message Flow
        appendUserMessage(message);
        chatInput.value = "";
        chatInput.style.height = "auto";

        // Show typing indicator
        const typingId = appendTypingIndicator();

        try {
            // Send request to Cloudflare Pages API endpoint
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: chatHistory,
                    systemPrompt: config.systemPrompt,
                    user: currentUser
                })
            });

            removeTypingIndicator(typingId);

            if (!response.ok) {
                const errData = await response.json();
                appendBotMessage("⚠️ خطایی رخ داده است: " + (errData.error || "مشکلی در پاسخگویی سرور وجود دارد."));
                return;
            }

            const data = await response.json();
            const aiReply = data.choices[0]?.message?.content || "متاسفانه مشکلی در دریافت پاسخ رخ داد.";
            appendBotMessage(aiReply);

            // Log chat history for Admin View
            logUserChat(currentUser, message, aiReply);

        } catch (error) {
            removeTypingIndicator(typingId);
            appendBotMessage("⚠️ ارتباط با سرور برقرار نشد. لطفاً اتصال اینترنت یا تنظیمات کلودفلر را بررسی کنید.");
        }
    });

    // UI Append Helpers
    function appendUserMessage(text) {
        chatHistory.push({ role: "user", content: text });
        const msgDiv = document.createElement("div");
        msgDiv.className = "flex justify-start flex-row-reverse items-start gap-2.5 my-2";
        msgDiv.innerHTML = `
            <div class="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0 text-amber-300 text-xs">
                <i class="fa-regular fa-user"></i>
            </div>
            <div class="bg-gradient-to-r from-emerald-700 to-emerald-800 text-white p-3.5 rounded-2xl rounded-tr-none text-xs leading-relaxed max-w-[85%] shadow-md border border-emerald-500/30">
                ${escapeHTML(text)}
            </div>
        `;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function appendBotMessage(text) {
        chatHistory.push({ role: "assistant", content: text });
        const msgDiv = document.createElement("div");
        msgDiv.className = "flex items-start gap-2.5 my-2";
        msgDiv.innerHTML = `
            <div class="w-8 h-8 rounded-lg bg-emerald-800 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-300 text-xs shadow-md">
                <i class="fa-solid fa-kaaba"></i>
            </div>
            <div class="bg-slate-900/90 text-emerald-100 p-3.5 rounded-2xl rounded-tl-none text-xs leading-relaxed max-w-[85%] shadow-md border border-emerald-500/20">
                ${escapeHTML(text).replace(/\n/g, '<br>')}
            </div>
        `;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function appendTypingIndicator() {
        const id = "typing_" + Date.now();
        const msgDiv = document.createElement("div");
        msgDiv.id = id;
        msgDiv.className = "flex items-start gap-2.5 my-2";
        msgDiv.innerHTML = `
            <div class="w-8 h-8 rounded-lg bg-emerald-800 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-300 text-xs">
                <i class="fa-solid fa-kaaba"></i>
            </div>
            <div class="bg-slate-900/90 p-3.5 rounded-2xl rounded-tl-none border border-emerald-500/20 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-amber-400 typing-dot"></span>
                <span class="w-2 h-2 rounded-full bg-amber-400 typing-dot"></span>
                <span class="w-2 h-2 rounded-full bg-amber-400 typing-dot"></span>
            </div>
        `;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
        return id;
    }

    function removeTypingIndicator(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    // Admin Panel Logic
    function openAdminPanel() {
        adminModal.classList.remove("hidden");
        updateUIConfig();
        loadAdminUsersLogs();
    }

    closeAdminBtn.addEventListener("click", () => {
        adminModal.classList.add("hidden");
    });

    tabSettingsBtn.addEventListener("click", () => {
        tabSettings.classList.remove("hidden");
        tabUsers.classList.add("hidden");
        tabSettingsBtn.className = "flex-1 py-3 px-4 text-xs font-bold text-amber-300 border-b-2 border-amber-400 flex items-center justify-center gap-2";
        tabUsersBtn.className = "flex-1 py-3 px-4 text-xs font-bold text-slate-400 border-b-2 border-transparent flex items-center justify-center gap-2";
    });

    tabUsersBtn.addEventListener("click", () => {
        tabUsers.classList.remove("hidden");
        tabSettings.classList.add("hidden");
        tabUsersBtn.className = "flex-1 py-3 px-4 text-xs font-bold text-amber-300 border-b-2 border-amber-400 flex items-center justify-center gap-2";
        tabSettingsBtn.className = "flex-1 py-3 px-4 text-xs font-bold text-slate-400 border-b-2 border-transparent flex items-center justify-center gap-2";
        loadAdminUsersLogs();
    });

    saveSettingsBtn.addEventListener("click", () => {
        config.botName = adminBotName.value.trim() || "آوای یقین";
        config.systemPrompt = adminSystemPrompt.value.trim();
        config.welcomeMsg = adminWelcomeMsg.value.trim();

        localStorage.setItem("ay_botName", config.botName);
        localStorage.setItem("ay_systemPrompt", config.systemPrompt);
        localStorage.setItem("ay_welcomeMsg", config.welcomeMsg);

        headerBotName.textContent = config.botName;
        alert("✅ تنظیمات با موفقیت ذخیره شد!");
        adminModal.classList.add("hidden");
    });

    refreshLogsBtn.addEventListener("click", loadAdminUsersLogs);

    // Database simulation with localStorage
    function saveUserToDatabase(user) {
        let users = JSON.parse(localStorage.getItem("ay_all_users")) || [];
        if (!users.some(u => u.phone === user.phone)) {
            users.push({ ...user, date: new Date().toLocaleDateString("fa-IR") });
            localStorage.setItem("ay_all_users", JSON.stringify(users));
        }
    }

    function logUserChat(user, query, response) {
        let logs = JSON.parse(localStorage.getItem("ay_chat_logs")) || [];
        logs.push({
            userName: user.name,
            userPhone: user.phone,
            query,
            response,
            time: new Date().toLocaleTimeString("fa-IR")
        });
        localStorage.setItem("ay_chat_logs", JSON.stringify(logs));
    }

    function loadAdminUsersLogs() {
        usersListContainer.innerHTML = "";
        let users = JSON.parse(localStorage.getItem("ay_all_users")) || [];
        let logs = JSON.parse(localStorage.getItem("ay_chat_logs")) || [];

        if (users.length === 0) {
            usersListContainer.innerHTML = `<p class="text-xs text-slate-500 text-center py-4">هیچ کاربر ثبت‌شده‌ای یافت نشد.</p>`;
            return;
        }

        users.forEach(u => {
            const userLogs = logs.filter(l => l.userPhone === u.phone);
            const userCard = document.createElement("div");
            userCard.className = "p-3.5 bg-slate-950/70 border border-emerald-500/20 rounded-2xl space-y-2";
            
            let logsHtml = userLogs.map(l => `
                <div class="p-2 bg-slate-900/80 rounded-xl text-[11px] space-y-1 border border-slate-800">
                    <p class="text-amber-300 font-medium">❓ سوال: ${escapeHTML(l.query)}</p>
                    <p class="text-slate-300">💬 پاسخ: ${escapeHTML(l.response)}</p>
                    <span class="text-[9px] text-slate-500 block text-left">${l.time}</span>
                </div>
            `).join('');

            userCard.innerHTML = `
                <div class="flex items-center justify-between text-xs">
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-user-tag text-emerald-400"></i>
                        <span class="font-bold text-white">${escapeHTML(u.name)}</span>
                        <span class="text-slate-400 dir-ltr text-[11px]">(${escapeHTML(u.phone)})</span>
                    </div>
                    <span class="text-[10px] text-slate-500">${u.date || ''}</span>
                </div>
                <div class="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    ${logsHtml || '<p class="text-[10px] text-slate-500">چتی ثبت نشده است.</p>'}
                </div>
            `;
            usersListContainer.appendChild(userCard);
        });
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }
});
