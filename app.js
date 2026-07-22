document.addEventListener("DOMContentLoaded", () => {
    let adminPasscode = "Amidhjsos62627@_897";
    let currentUser = JSON.parse(localStorage.getItem("ay_user")) || null;
    let chatHistory = [];
    let globalConfig = {
        botName: "آوای یقین",
        welcomeMsg: "سلام و درود بر شما. به آوای یقین خوش آمدید.",
        bannerMsg: "به سامانه هوشمند پاسخگویی دینی آوای یقین خوش آمدید."
    };

    // Elements
    const onboardingModal = document.getElementById("onboardingModal");
    const onboardingForm = document.getElementById("onboardingForm");
    const mainApp = document.getElementById("mainApp");
    const chatBox = document.getElementById("chatBox");
    const chatForm = document.getElementById("chatForm");
    const chatInput = document.getElementById("chatInput");
    const headerBotName = document.getElementById("headerBotName");
    const displayUserName = document.getElementById("displayUserName");
    const bannerText = document.getElementById("bannerText");
    const newChatBtn = document.getElementById("newChatBtn");
    const quickPromptsBtn = document.getElementById("quickPromptsBtn");
    const quickPromptsBar = document.getElementById("quickPromptsBar");

    // Admin Elements
    const adminModal = document.getElementById("adminModal");
    const closeAdminBtn = document.getElementById("closeAdminBtn");
    const adminTempInput = document.getElementById("adminTempInput");
    const tempValueDisplay = document.getElementById("tempValueDisplay");

    initApp();

    async function initApp() {
        await loadGlobalConfig();

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

    // دریافت تنظیمات عمومی سراسری از کلودفلر
    async function loadGlobalConfig() {
        try {
            const res = await fetch("/api/config");
            if (res.ok) {
                const data = await res.json();
                globalConfig = { ...globalConfig, ...data };
                headerBotName.textContent = globalConfig.botName;
                if (data.bannerMsg) bannerText.textContent = data.bannerMsg;
            }
        } catch (e) {
            console.log("استفاده از تنظیمات پیش‌فرض");
        }
    }

    // Onboarding Submit
    onboardingForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("userName").value.trim();
        const phone = document.getElementById("userPhone").value.trim();

        if (name && phone) {
            currentUser = { name, phone };
            localStorage.setItem("ay_user", JSON.stringify(currentUser));

            // ثبت کاربر در دیتابیس ابری
            try {
                await fetch("/api/user/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(currentUser)
                });
            } catch (err) {}

            onboardingModal.classList.add("hidden");
            mainApp.classList.remove("hidden");
            displayUserName.textContent = currentUser.name;
            renderWelcomeMessage();
        }
    });

    function renderWelcomeMessage() {
        chatBox.innerHTML = "";
        chatHistory = [];
        appendBotMessage(globalConfig.welcomeMsg);
    }

    newChatBtn.addEventListener("click", renderWelcomeMessage);

    quickPromptsBtn.addEventListener("click", () => {
        quickPromptsBar.classList.toggle("hidden");
    });

    document.querySelectorAll(".quick-card").forEach(card => {
        card.addEventListener("click", () => {
            const text = card.querySelector("p:nth-child(2)").textContent;
            chatInput.value = text;
            quickPromptsBar.classList.add("hidden");
            chatForm.dispatchEvent(new Event("submit"));
        });
    });

    chatInput.addEventListener("input", () => {
        chatInput.style.height = "auto";
        chatInput.style.height = chatInput.scrollHeight + "px";
    });

    // Chat Submit & Admin Check
    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (!message) return;

        // چک کردن رمز مدیریت
        if (message === adminPasscode || message === "Amidhjsos62627@_897") {
            chatInput.value = "";
            chatInput.style.height = "auto";
            openAdminModal(message);
            return;
        }

        appendUserMessage(message);
        chatInput.value = "";
        chatInput.style.height = "auto";

        const typingId = appendTypingIndicator();

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: chatHistory,
                    user: currentUser
                })
            });

            removeTypingIndicator(typingId);

            if (!response.ok) {
                const errData = await response.json();
                appendBotMessage("⚠️ خطایی رخ داد: " + (errData.error || "خطای سرور"));
                return;
            }

            const data = await response.json();
            const reply = data.choices[0]?.message?.content || "پاسخی دریافت نشد.";
            appendBotMessage(reply);

        } catch (error) {
            removeTypingIndicator(typingId);
            appendBotMessage("⚠️ ارتباط با سرور برقرار نشد.");
        }
    });

    function appendUserMessage(text) {
        chatHistory.push({ role: "user", content: text });
        const msgDiv = document.createElement("div");
        msgDiv.className = "flex justify-start flex-row-reverse items-start gap-2.5 my-2";
        msgDiv.innerHTML = `
            <div class="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-300 text-xs">
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

    // ================= ADMIN PANEL LOGIC =================

    async function openAdminModal(pass) {
        adminModal.classList.remove("hidden");
        adminPasscode = pass;
        await fetchAdminData();
    }

    closeAdminBtn.addEventListener("click", () => adminModal.classList.add("hidden"));

    // Admin Tabs Switcher
    const tabs = {
        adminTabStats: "panelStats",
        adminTabAi: "panelAi",
        adminTabUsers: "panelUsers",
        adminTabNotice: "panelNotice",
        adminTabSecurity: "panelSecurity"
    };

    Object.keys(tabs).forEach(tabId => {
        document.getElementById(tabId).addEventListener("click", (e) => {
            Object.keys(tabs).forEach(id => {
                document.getElementById(id).classList.remove("active");
                document.getElementById(tabs[id]).classList.add("hidden");
            });
            e.currentTarget.classList.add("active");
            document.getElementById(tabs[tabId]).classList.remove("hidden");
        });
    });

    adminTempInput.addEventListener("input", (e) => {
        tempValueDisplay.textContent = e.target.value;
    });

    async function fetchAdminData() {
        try {
            const res = await fetch("/api/admin/data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ passcode: adminPasscode })
            });

            if (!res.ok) {
                alert("⚠️ رمز عبور مدیریت نادرست است.");
                adminModal.classList.add("hidden");
                return;
            }

            const data = await res.json();
            
            // Fill stats
            document.getElementById("statTotalUsers").textContent = data.stats.totalUsers;
            document.getElementById("statTotalMessages").textContent = data.stats.totalMessages;

            // Fill AI Inputs
            document.getElementById("adminBotNameInput").value = data.config.botName || "";
            document.getElementById("adminSystemPromptInput").value = data.config.systemPrompt || "";
            document.getElementById("adminWelcomeMsgInput").value = data.config.welcomeMsg || "";
            document.getElementById("adminTempInput").value = data.config.temperature || 0.6;
            tempValueDisplay.textContent = data.config.temperature || 0.6;
            document.getElementById("adminBannerInput").value = data.config.bannerMsg || "";

            renderGlobalUsersAndLogs(data.users, data.logs);

        } catch (e) {
            alert("خطا در دریافت اطلاعات دیتابیس.");
        }
    }

    function renderGlobalUsersAndLogs(users, logs) {
        const container = document.getElementById("globalUsersContainer");
        container.innerHTML = "";

        if (!users || users.length === 0) {
            container.innerHTML = `<p class="text-xs text-slate-500 text-center py-6">هیچ کاربری در دیتابیس ابری ثبت نشده است.</p>`;
            return;
        }

        users.forEach(u => {
            const userLogs = logs.filter(l => l.userPhone === u.phone);
            const card = document.createElement("div");
            card.className = "p-4 bg-slate-950/80 border border-emerald-500/20 rounded-2xl space-y-2";

            let logsHtml = userLogs.map(l => `
                <div class="p-2.5 bg-slate-900/90 rounded-xl text-[11px] space-y-1 border border-slate-800">
                    <p class="text-amber-300 font-medium">❓ سوال کاربر: ${escapeHTML(l.query)}</p>
                    <p class="text-emerald-100">💬 پاسخ هوش مصنوعی: ${escapeHTML(l.response)}</p>
                    <span class="text-[9px] text-slate-500 block text-left dir-ltr">${new Date(l.timestamp).toLocaleString("fa-IR")}</span>
                </div>
            `).join('');

            card.innerHTML = `
                <div class="flex items-center justify-between text-xs">
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-user text-emerald-400"></i>
                        <span class="font-bold text-white">${escapeHTML(u.name)}</span>
                        <span class="text-amber-300 dir-ltr text-[11px]">(${escapeHTML(u.phone)})</span>
                    </div>
                    <span class="text-[10px] text-slate-400">${new Date(u.registeredAt).toLocaleDateString("fa-IR")}</span>
                </div>
                <div class="mt-2 space-y-2 max-h-48 overflow-y-auto">
                    ${logsHtml || '<p class="text-[10px] text-slate-500">هیچ چتی ثبت نشده است.</p>'}
                </div>
            `;
            container.appendChild(card);
        });
    }

    // Save AI Config Button
    document.getElementById("saveAiConfigBtn").addEventListener("click", async () => {
        const newConfig = {
            botName: document.getElementById("adminBotNameInput").value.trim(),
            systemPrompt: document.getElementById("adminSystemPromptInput").value.trim(),
            welcomeMsg: document.getElementById("adminWelcomeMsgInput").value.trim(),
            temperature: parseFloat(document.getElementById("adminTempInput").value)
        };

        await updateConfigOnServer(newConfig);
    });

    // Save Notice Button
    document.getElementById("saveNoticeBtn").addEventListener("click", async () => {
        const bannerMsg = document.getElementById("adminBannerInput").value.trim();
        await updateConfigOnServer({ bannerMsg });
    });

    // Save Security Password Button
    document.getElementById("savePasscodeBtn").addEventListener("click", async () => {
        const newPass = document.getElementById("adminNewPasscode").value.trim();
        if (!newPass) return alert("لطفا رمز عبور جدید را وارد کنید.");
        await updateConfigOnServer({ adminPasscode: newPass });
        adminPasscode = newPass;
        document.getElementById("adminNewPasscode").value = "";
    });

    async function updateConfigOnServer(newConfig) {
        try {
            const res = await fetch("/api/admin/update-config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ passcode: adminPasscode, newConfig })
            });

            if (res.ok) {
                alert("✅ تنظیمات با موفقیت در دیتابیس ابری ذخیره و سراسری شد!");
                await loadGlobalConfig();
            } else {
                alert("❌ خطا در ذخیره‌سازی.");
            }
        } catch (e) {
            alert("خطا در ارتباط با دیتابیس.");
        }
    }

    // Clear Logs
    document.getElementById("clearLogsBtn").addEventListener("click", async () => {
        if (!confirm("آیا از پاکسازی تمام چت‌های سراسری اطمینان دارید؟")) return;
        try {
            const res = await fetch("/api/admin/clear-logs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ passcode: adminPasscode })
            });
            if (res.ok) {
                alert("چت‌ها پاکسازی شدند.");
                fetchAdminData();
            }
        } catch (e) {}
    });

    function escapeHTML(str) {
        return str ? str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)) : '';
    }
});
