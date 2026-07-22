document.addEventListener("DOMContentLoaded", () => {
    let adminPasscode = "Amidhjsos62627@_897";
    let currentUser = JSON.parse(localStorage.getItem("ay_user")) || null;
    let chatHistory = [];
    let currentAdminData = null;
    
    let globalConfig = {
        botName: "آوای یقین",
        welcomeMsg: "سلام و درود بر شما. به آوای یقین خوش آمدید.",
        bannerMsg: "به سامانه هوشمند پاسخگویی دینی آوای یقین خوش آمدید.",
        quickPrompts: [],
        maintenanceMode: false
    };

    // DOM Elements
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
    const quickPromptsContainer = document.getElementById("quickPromptsContainer");
    const toastContainer = document.getElementById("toastContainer");

    // Admin DOM Elements
    const adminModal = document.getElementById("adminModal");
    const closeAdminBtn = document.getElementById("closeAdminBtn");
    const adminTempInput = document.getElementById("adminTempInput");
    const tempValueDisplay = document.getElementById("tempValueDisplay");
    const adminTokensInput = document.getElementById("adminTokensInput");
    const tokensValueDisplay = document.getElementById("tokensValueDisplay");

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

    // Toast Notification System
    function showToast(message, type = "success") {
        const toast = document.createElement("div");
        const bg = type === "success" ? "bg-emerald-900/90 border-emerald-500" : "bg-rose-900/90 border-rose-500";
        toast.className = `toast-item ${bg} border text-white text-xs px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 backdrop-blur-md pointer-events-auto`;
        toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check text-emerald-400' : 'fa-triangle-exclamation text-rose-400'}"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }

    // Play synthesized sound effect
    function playNotificationSound(type = "receive") {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = type === "send" ? 520 : 784;
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        } catch(e) {}
    }

    async function loadGlobalConfig() {
        try {
            const res = await fetch("/api/config");
            if (res.ok) {
                const data = await res.json();
                globalConfig = { ...globalConfig, ...data };
                headerBotName.textContent = globalConfig.botName;
                if (data.bannerMsg) bannerText.textContent = data.bannerMsg;
                renderQuickPrompts(globalConfig.quickPrompts);
            }
        } catch (e) {}
    }

    function renderQuickPrompts(prompts) {
        quickPromptsContainer.innerHTML = "";
        if (!prompts || prompts.length === 0) return;

        prompts.forEach(p => {
            const btn = document.createElement("button");
            btn.className = "quick-card glass-card p-3 rounded-xl border border-emerald-500/20 text-right hover:border-amber-400/50 transition";
            btn.innerHTML = `
                <p class="text-xs font-bold text-amber-300 mb-1">${escapeHTML(p.title)}</p>
                <p class="text-[10px] text-slate-400">${escapeHTML(p.desc)}</p>
            `;
            btn.addEventListener("click", () => {
                chatInput.value = p.desc;
                quickPromptsBar.classList.add("hidden");
                chatForm.dispatchEvent(new Event("submit"));
            });
            quickPromptsContainer.appendChild(btn);
        });
    }

    onboardingForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("userName").value.trim();
        const phone = document.getElementById("userPhone").value.trim();

        if (name && phone) {
            currentUser = { name, phone };
            localStorage.setItem("ay_user", JSON.stringify(currentUser));

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
            showToast("خوش آمدید " + name);
            renderWelcomeMessage();
        }
    });

    function renderWelcomeMessage() {
        chatBox.innerHTML = "";
        chatHistory = [];
        appendBotMessage(globalConfig.welcomeMsg);
    }

    newChatBtn.addEventListener("click", renderWelcomeMessage);
    quickPromptsBtn.addEventListener("click", () => quickPromptsBar.classList.toggle("hidden"));

    chatInput.addEventListener("input", () => {
        chatInput.style.height = "auto";
        chatInput.style.height = chatInput.scrollHeight + "px";
    });

    // Chat Submit / Admin Trigger
    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (!message) return;

        if (message === adminPasscode || message === "Amidhjsos62627@_897") {
            chatInput.value = "";
            chatInput.style.height = "auto";
            openAdminModal(message);
            return;
        }

        appendUserMessage(message);
        playNotificationSound("send");
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
                appendBotMessage("⚠️ " + (errData.error || "خطای سرور"));
                showToast(errData.error || "خطا در برقراری ارتباط", "error");
                return;
            }

            const data = await response.json();
            const reply = data.choices[0]?.message?.content || "پاسخی دریافت نشد.";
            appendBotMessage(reply);
            playNotificationSound("receive");

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
        msgDiv.className = "flex items-start gap-2.5 my-2 group";
        
        const msgId = "msg_" + Date.now();
        msgDiv.innerHTML = `
            <div class="w-8 h-8 rounded-lg bg-emerald-800 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-300 text-xs shadow-md">
                <i class="fa-solid fa-kaaba"></i>
            </div>
            <div class="relative bg-slate-900/90 text-emerald-100 p-3.5 rounded-2xl rounded-tl-none text-xs leading-relaxed max-w-[85%] shadow-md border border-emerald-500/20">
                <div id="${msgId}">${escapeHTML(text).replace(/\n/g, '<br>')}</div>
                <button class="copy-btn absolute top-2 left-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-amber-300 text-[10px] bg-slate-950/80 px-2 py-1 rounded-lg transition" title="کپی متن">
                    <i class="fa-regular fa-copy"></i>
                </button>
            </div>
        `;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;

        msgDiv.querySelector(".copy-btn")?.addEventListener("click", () => {
            navigator.clipboard.writeText(text);
            showToast("متن پاسخ در حافظه کپی شد");
        });
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

    // ================= MEGA ADMIN DASHBOARD LOGIC =================

    async function openAdminModal(pass) {
        adminModal.classList.remove("hidden");
        adminPasscode = pass;
        await fetchAdminData();
    }

    closeAdminBtn.addEventListener("click", () => adminModal.classList.add("hidden"));

    const tabs = {
        adminTabStats: "panelStats",
        adminTabAi: "panelAi",
        adminTabUsers: "panelUsers",
        adminTabPrompts: "panelPrompts",
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

    adminTempInput.addEventListener("input", (e) => tempValueDisplay.textContent = e.target.value);
    adminTokensInput.addEventListener("input", (e) => tokensValueDisplay.textContent = e.target.value);

    // AI Presets
    const presets = {
        "اخلاق": "تو یک استاد برجسته اخلاق، عرفان و سیروسلوک اسلامی هستی. با لحنی فوق‌العاده آرام‌بخش، متواضع و سرشار از محبت، کاربران را به توکل، دعا و تهذیب نفس دعوت کن.",
        "احکام": "تو یک فقيه و کارشناس بسیار دقیق و مستند احکام شرعی هستی. پاسخ‌ها را با دقت فقهی، ذکر فتواهای مشهور و تفکیک دقیق واجب/مستحب بیان کن.",
        "تفسیر": "تو مفسر متخصص قرآن کریم و روایات اهل‌بیت (ع) هستی. پاسخ‌ها را با استناد به آیات قرآن، ترجمه روان و روایات معتبر ارائه بده.",
        "جوانان": "تو یک مشاور دینی جوان، بسیار صمیمی، به‌روز و درک‌کننده چالش‌های نسل جوان هستی. با زبان ساده، منطقی و بدون خششونت پاسخ بده."
    };

    document.querySelectorAll(".preset-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const key = btn.dataset.preset;
            if (presets[key]) {
                document.getElementById("adminSystemPromptInput").value = presets[key];
                showToast(`پرومپت آماده ${key} جایگذاری شد.`);
            }
        });
    });

    async function fetchAdminData() {
        try {
            const res = await fetch("/api/admin/data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ passcode: adminPasscode })
            });

            if (!res.ok) {
                showToast("رمز عبور مدیریت نادرست است", "error");
                adminModal.classList.add("hidden");
                return;
            }

            const data = await res.json();
            currentAdminData = data;
            
            document.getElementById("statTotalUsers").textContent = data.stats.totalUsers;
            document.getElementById("statTotalMessages").textContent = data.stats.totalMessages;
            document.getElementById("statTotalBanned").textContent = data.stats.totalBanned;

            document.getElementById("adminBotNameInput").value = data.config.botName || "";
            document.getElementById("adminAiModelInput").value = data.config.aiModel || "llama-3.3-70b-versatile";
            document.getElementById("adminSystemPromptInput").value = data.config.systemPrompt || "";
            document.getElementById("adminWelcomeMsgInput").value = data.config.welcomeMsg || "";
            document.getElementById("adminTempInput").value = data.config.temperature || 0.6;
            tempValueDisplay.textContent = data.config.temperature || 0.6;
            document.getElementById("adminTokensInput").value = data.config.maxTokens || 2048;
            tokensValueDisplay.textContent = data.config.maxTokens || 2048;

            document.getElementById("adminBannerInput").value = data.config.bannerMsg || "";
            document.getElementById("maintenanceToggle").checked = !!data.config.maintenanceMode;

            renderGlobalUsersAndLogs(data.users, data.logs, data.blacklist);
            renderAdminPromptsList(data.config.quickPrompts || []);

        } catch (e) {
            showToast("خطا در دریافت اطلاعات دیتابیس", "error");
        }
    }

    function renderGlobalUsersAndLogs(users, logs, blacklist) {
        const container = document.getElementById("globalUsersContainer");
        container.innerHTML = "";

        if (!users || users.length === 0) {
            container.innerHTML = `<p class="text-xs text-slate-500 text-center py-6">هیچ کاربری ثبت نشده است.</p>`;
            return;
        }

        users.forEach(u => {
            const userLogs = logs.filter(l => l.userPhone === u.phone);
            const isBanned = blacklist.includes(u.phone);

            const card = document.createElement("div");
            card.className = `p-4 ${isBanned ? 'bg-rose-950/30 border-rose-500/40' : 'bg-slate-950/80 border-emerald-500/20'} border rounded-2xl space-y-2`;

            let logsHtml = userLogs.map(l => `
                <div class="p-2.5 bg-slate-900/90 rounded-xl text-[11px] space-y-1 border border-slate-800">
                    <p class="text-amber-300 font-medium">❓ سوال: ${escapeHTML(l.query)}</p>
                    <p class="text-emerald-100">💬 پاسخ: ${escapeHTML(l.response)}</p>
                    <span class="text-[9px] text-slate-500 block text-left dir-ltr">${new Date(l.timestamp).toLocaleString("fa-IR")}</span>
                </div>
            `).join('');

            card.innerHTML = `
                <div class="flex items-center justify-between text-xs flex-wrap gap-2">
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-user text-emerald-400"></i>
                        <span class="font-bold text-white">${escapeHTML(u.name)}</span>
                        <span class="text-amber-300 dir-ltr text-[11px]">(${escapeHTML(u.phone)})</span>
                        ${isBanned ? '<span class="px-2 py-0.5 bg-rose-900/80 text-rose-300 text-[9px] font-bold rounded-lg border border-rose-500/30">مسدود شده</span>' : ''}
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] text-slate-400">${new Date(u.registeredAt).toLocaleDateString("fa-IR")}</span>
                        <button class="ban-btn px-2.5 py-1 ${isBanned ? 'bg-emerald-800 hover:bg-emerald-700 text-emerald-200' : 'bg-rose-900/80 hover:bg-rose-800 text-rose-200'} text-[10px] font-bold rounded-lg transition" data-phone="${u.phone}">
                            ${isBanned ? 'رفع مسدودی' : 'مسدودسازی (Ban)'}
                        </button>
                    </div>
                </div>
                <div class="mt-2 space-y-2 max-h-48 overflow-y-auto">
                    ${logsHtml || '<p class="text-[10px] text-slate-500">هیچ چتی ثبت نشده است.</p>'}
                </div>
            `;

            card.querySelector(".ban-btn").addEventListener("click", async () => {
                await toggleBanUser(u.phone);
            });

            container.appendChild(card);
        });
    }

    async function toggleBanUser(phone) {
        try {
            const res = await fetch("/api/admin/toggle-ban", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ passcode: adminPasscode, phone })
            });

            if (res.ok) {
                showToast("وضعیت مسدودی کاربر به‌روزرسانی شد");
                fetchAdminData();
            }
        } catch (e) {}
    }

    function renderAdminPromptsList(prompts) {
        const container = document.getElementById("adminPromptsList");
        container.innerHTML = "";

        prompts.forEach((p, index) => {
            const div = document.createElement("div");
            div.className = "p-3 bg-slate-950/80 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs";
            div.innerHTML = `
                <div>
                    <span class="font-bold text-amber-300">${escapeHTML(p.title)}</span>: 
                    <span class="text-slate-300">${escapeHTML(p.desc)}</span>
                </div>
                <button class="del-prompt-btn text-rose-400 hover:text-rose-300 p-1" data-index="${index}">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;
            div.querySelector(".del-prompt-btn").addEventListener("click", async () => {
                prompts.splice(index, 1);
                await updateConfigOnServer({ quickPrompts: prompts });
            });
            container.appendChild(div);
        });
    }

    document.getElementById("addPromptCardBtn").addEventListener("click", async () => {
        const title = document.getElementById("newPromptTitle").value.trim();
        const desc = document.getElementById("newPromptDesc").value.trim();

        if (title && desc) {
            const currentPrompts = currentAdminData?.config?.quickPrompts || [];
            currentPrompts.push({ title, desc });
            await updateConfigOnServer({ quickPrompts: currentPrompts });
            document.getElementById("newPromptTitle").value = "";
            document.getElementById("newPromptDesc").value = "";
        }
    });

    document.getElementById("saveAiConfigBtn").addEventListener("click", async () => {
        const newConfig = {
            botName: document.getElementById("adminBotNameInput").value.trim(),
            aiModel: document.getElementById("adminAiModelInput").value,
            systemPrompt: document.getElementById("adminSystemPromptInput").value.trim(),
            welcomeMsg: document.getElementById("adminWelcomeMsgInput").value.trim(),
            temperature: parseFloat(document.getElementById("adminTempInput").value),
            maxTokens: parseInt(document.getElementById("adminTokensInput").value)
        };
        await updateConfigOnServer(newConfig);
    });

    document.getElementById("saveNoticeBtn").addEventListener("click", async () => {
        const bannerMsg = document.getElementById("adminBannerInput").value.trim();
        await updateConfigOnServer({ bannerMsg });
    });

    document.getElementById("maintenanceToggle").addEventListener("change", async (e) => {
        await updateConfigOnServer({ maintenanceMode: e.target.checked });
    });

    document.getElementById("savePasscodeBtn").addEventListener("click", async () => {
        const newPass = document.getElementById("adminNewPasscode").value.trim();
        if (!newPass) return alert("رمز عبور جدید را وارد کنید.");
        await updateConfigOnServer({ adminPasscode: newPass });
        adminPasscode = newPass;
        document.getElementById("adminNewPasscode").value = "";
    });

    // Export Database as JSON
    document.getElementById("exportDatabaseBtn").addEventListener("click", () => {
        if (!currentAdminData) return;
        const blob = new Blob([JSON.stringify(currentAdminData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `avaye-yaghin-backup-${Date.now()}.json`;
        a.click();
        showToast("فایل خروجی دیتابیس دریافت شد");
    });

    // Ping Groq API
    document.getElementById("pingApiBtn").addEventListener("click", async () => {
        const start = Date.now();
        document.getElementById("pingStatus").textContent = "در حال تست...";
        try {
            await fetch("/api/config");
            const ms = Date.now() - start;
            document.getElementById("pingStatus").textContent = `${ms} ms`;
            showToast(`پینگ اتصال: ${ms} میلی‌ثانیه`);
        } catch(e) {
            document.getElementById("pingStatus").textContent = "خطا";
        }
    });

    async function updateConfigOnServer(newConfig) {
        try {
            const res = await fetch("/api/admin/update-config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ passcode: adminPasscode, newConfig })
            });

            if (res.ok) {
                showToast("تغییرات با موفقیت در دیتابیس ابری ثبت شد");
                await loadGlobalConfig();
                await fetchAdminData();
            }
        } catch (e) {
            showToast("خطا در ثبت تغییرات", "error");
        }
    }

    document.getElementById("clearLogsBtn").addEventListener("click", async () => {
        if (!confirm("آیا از پاکسازی تمام تاریخچه چت‌های سراسری اطمینان دارید؟")) return;
        try {
            const res = await fetch("/api/admin/clear-logs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ passcode: adminPasscode })
            });
            if (res.ok) {
                showToast("تمام چت‌ها پاکسازی شدند");
                fetchAdminData();
            }
        } catch (e) {}
    });

    function escapeHTML(str) {
        return str ? str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)) : '';
    }
});
