const ADMIN_PASSCODE = "Amidhjsos62627@_897";
let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
    const savedUser = localStorage.getItem("avaye_ يقين_user");
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            document.getElementById("displayUserName").innerText = currentUser.name;
            document.getElementById("registrationModal").classList.add("hidden");
        } catch (e) {
            localStorage.removeItem("avaye_يقين_user");
        }
    }

    // مدیریت باز شدن سایدبار در موبایل
    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", () => {
            sidebar.classList.toggle("active");
        });
    }

    // فرم ثبت‌نام اولیه
    const onboardingForm = document.getElementById("onboardingForm");
    if (onboardingForm) {
        onboardingForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const name = document.getElementById("userNameInput").value.trim();
            const phone = document.getElementById("userPhoneInput").value.trim();

            if (name && phone) {
                currentUser = { name, phone, id: Date.now() };
                localStorage.setItem("avaye_يقين_user", JSON.stringify(currentUser));
                document.getElementById("displayUserName").innerText = name;
                document.getElementById("registrationModal").classList.add("hidden");
                showToast("ورود با موفقیت انجام شد. خوش آمدید!");
            }
        });
    }

    // ارسال فرم چت
    const chatForm = document.getElementById("chatForm");
    const chatInput = document.getElementById("chatInput");

    if (chatForm && chatInput) {
        chatForm.addEventListener("submit", (e) => {
            e.preventDefault();
            handleUserMessage();
        });

        chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleUserMessage();
            }
        });
    }

    // دکمه گفتگوی جدید
    const newChatBtn = document.getElementById("newChatBtn");
    if (newChatBtn) {
        newChatBtn.addEventListener("click", () => {
            document.getElementById("messagesArea").innerHTML = "";
            document.getElementById("welcomeScreen").style.display = "flex";
            showToast("صفحه گفتگوی جدید آماده شد.");
        });
    }

    // کلید میانبر پنل مدیریت
    const adminTrigger = document.getElementById("adminTriggerBtn");
    if (adminTrigger) {
        adminTrigger.addEventListener("click", () => {
            const pass = prompt("لطفاً رمز عبور مدیریت را وارد کنید:");
            if (pass === ADMIN_PASSCODE) {
                alert("ورود به پنل مدیریت موفقیت‌آمیز بود! (می‌توانید کدهای پنل پیشرفته را در این بخش متصل کنید)");
            } else if (pass !== null) {
                showToast("رمز عبور اشتباه است!");
            }
        });
    }
});

function sendSuggestion(text) {
    const chatInput = document.getElementById("chatInput");
    if (chatInput) {
        chatInput.value = text;
        handleUserMessage();
    }
}

async function handleUserMessage() {
    const chatInput = document.getElementById("chatInput");
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = "";
    document.getElementById("welcomeScreen").style.display = "none";

    appendMessage(text, "user");
    const aiBubble = appendMessage("در حال پردازش و استعلام پاسخ معتبر...", "ai");

    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text, user: currentUser })
        });

        const rawText = await res.text();
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (err) {
            aiBubble.innerText = rawText || "پاسخی از سرور دریافت نشد.";
            return;
        }

        aiBubble.innerText = data.reply || data.response || "پاسخی دریافت نشد.";
    } catch (err) {
        aiBubble.innerText = "خطا در ارتباط با سرور. لطفاً اتصال خود را بررسی کنید.";
    }

    const chatContainer = document.getElementById("chatContainer");
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function appendMessage(text, sender) {
    const messagesArea = document.getElementById("messagesArea");
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}`;

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    contentDiv.innerText = text;

    messageDiv.appendChild(contentDiv);
    messagesArea.appendChild(messageDiv);

    const chatContainer = document.getElementById("chatContainer");
    chatContainer.scrollTop = chatContainer.scrollHeight;

    return contentDiv;
}

function showToast(message) {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
}
