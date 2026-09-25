# JARVIS — Shaxsiy AI Yordamchi

JARVIS — bu 100% bepul texnologiyalarda qurilgan, shaxsiy AI yordamchingiz.
U Google Gemini (asosiy), Groq (zaxira) va Ollama (lokal, internetsiz)
sun'iy intellekt provayderlari bilan ishlaydi va asosiy provider ishlamay
qolsa, avtomatik ravishda zaxiraga o'tadi. Suhbatlaringiz lokal SQLite
bazasida saqlanadi, interfeys esa to'liq o'zbek tilida (lotin yozuvida).

Ovozli buyruq berish, javobni ovozda eshitish, kod bloklarini nusxalash
va bir nechta suhbatni parallel saqlash kabi imkoniyatlar mavjud.

JARVIS shuningdek laptopingizda **haqiqiy amallar** bajara oladi — dastur
ochish, fayl yaratish/o'qish, kod yozib ishga tushirish, terminal
buyruqlarini bajarish — va **uzluksiz ovozli suhbat** rejimida gapirib
turishingiz mumkin (filmdagi JARVIS kabi).

---

## 0. VAZIFA BAJARISH VA OVOZLI SUHBAT (yangi imkoniyatlar)

### Vazifa bajarish (faqat Gemini bilan ishlaydi)

JARVIS'ga oddiy tilda vazifa bersangiz ("Chrome'ni och", "Python'da ... kod
yoz va ishga tushir", "reja.txt fayliga ... deb yoz"), u Gemini'ning
function-calling (tool use) imkoniyati orqali tegishli amalni bajaradi.

**Xavfsizlik modeli — ikki daraja:**

| Daraja | Amallar | Tartib |
|---|---|---|
| **Xavfsiz** (avtomatik) | Dastur ochish, sayt ochish, faylni o'qish, fayllar ro'yxati | Darhol bajariladi, natija chatda ko'rsatiladi |
| **Tasdiq talab qiladi** | Faylga yozish, kod ishga tushirish, terminal buyrug'i | Chatda "Tasdiqlash / Bekor qilish" tugmali kartochka chiqadi — faqat siz bosgandan keyin bajariladi |

Barcha fayl amallari **faqat** Ish stolingizdagi `JARVIS-ish` papkasi bilan
chegaralangan — JARVIS boshqa joydagi fayllaringizga tegmaydi. Kod ishga
tushirish uchun `python` buyrug'i (Python o'rnatilgan bo'lishi kerak) va
`node` (Node.js allaqachon bor) ishlatiladi.

Qo'llab-quvvatlanadigan dasturlar ro'yxati `server/executor.js` dagi
`APP_WHITELIST` da: chrome, edge, notepad, calculator, explorer, paint,
cmd, powershell, word, excel, vscode, spotify, telegram, outlook.

> Eslatma: vazifa bajarish faqat `PROVIDER=gemini` bilan ishlaydi (Groq/
> Ollama'da function-calling qo'llab-quvvatlanmagani uchun) — Gemini
> zaxiraga o'tsa, oddiy suhbat davom etadi, lekin vazifa bajarmaydi.

### Uzluksiz ovozli suhbat

Kiritish maydoni yonidagi quloqchin belgili tugmani bosing — JARVIS
tinglashni boshlaydi, siz gapirgan xabar avtomatik yuboriladi, javob
ovozda o'qib beriladi, so'ng JARVIS yana avtomatik tinglashni boshlaydi.
To'xtatish uchun tugmani qayta bosing. (Faqat Google Chrome'da to'liq
ishlaydi, mikrofonga ruxsat so'ralganda "Ruxsat berish"ni bosing.)

> **Ovoz sifati haqida:** brauzerlarning bepul ovoz sintezida (Web Speech
> Synthesis) alohida o'zbek ovozi deyarli hech qachon mavjud emas — bu
> loyihaning emas, brauzerning cheklovi. JARVIS avtomatik ravishda eng
> yaqin talaffuzli mavjud ovozni (o'zbek → turk → ozarbayjon → standart)
> tanlaydi, lekin native darajadagi tabiiy ovozni bepul kafolatlab
> bo'lmaydi.

### Rasm yuborish

Kiritish maydoni yonidagi rasm belgisi orqali rasm biriktirib, unga
oid savol berishingiz mumkin (masalan, "bu rasmda nima bor?"). Gemini
rasmni ko'rib, o'zbek tilida tushuntiradi. Rasm hajmi 5MB dan oshmasligi
kerak, PNG/JPEG/WEBP/GIF formatlari qo'llab-quvvatlanadi. Rasm faqat
shu xabar uchun ishlatiladi — suhbat tarixida saqlanmaydi (faqat matn
saqlanadi).

---

## 1. Talablar

- **Node.js 22.5 yoki undan yuqori versiya** (tavsiya etiladi: eng so'nggi
  LTS versiya). Buni tekshirish:

```bash
node -v
```

  > Nega aynan 22.5+? Backend ma'lumotlar bazasi uchun Node.js ning
  > o'rnatilgan `node:sqlite` moduli ishlatiladi — bu hech qanday tashqi
  > paket yoki Visual Studio kabi C++ build vositalarini talab qilmaydi
  > va shu sabab loyiha birinchi urinishdayoq ishga tushadi. Agar
  > Node.js versiyangiz eskiroq bo'lsa, https://nodejs.org dan eng
  > so'nggi LTS versiyani yuklab oling.

- Zamonaviy brauzer (tavsiya etiladi: **Google Chrome** — ovozli
  kiritish va ovozda o'qish funksiyalari Chrome'da eng yaxshi ishlaydi).
- Internet aloqasi (Gemini/Groq uchun) — yoki Ollama o'rnatilgan bo'lsa,
  internetsiz ham ishlaydi.

---

## 2. GEMINI API KALITINI OLISH (asosiy, bepul)

1. Brauzerda [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey) manzilini oching.
2. Google akkauntingiz bilan kiring.
3. **"Create API key"** tugmasini bosing, so'ng **"Create API key in
   new project"** ni tanlang.
4. Yaratilgan kalitni nusxalang (u `AIza...` bilan boshlanadi).
5. Kalitni `server/.env` faylidagi `GEMINI_API_KEY=` qatoriga qo'ying.

---

## 3. GROQ API KALITINI OLISH (zaxira, bepul, juda tez)

1. [https://console.groq.com/keys](https://console.groq.com/keys) manzilini oching.
2. GitHub akkauntingiz bilan kiring.
3. **"Create API Key"** tugmasini bosing va kalitni nusxalang
   (u `gsk_...` bilan boshlanadi).
4. Kalitni `server/.env` faylidagi `GROQ_API_KEY=` qatoriga qo'ying.

Gemini ishlamay qolsa (limit tugasa yoki internet uzilsa), JARVIS
avtomatik ravishda Groq'ga o'tadi.

---

## 4. OLLAMA O'RNATISH (ixtiyoriy, internetsiz ishlash uchun)

1. [https://ollama.com/download](https://ollama.com/download) dan
   Windows/Mac uchun mos versiyani yuklab o'rnating.
2. Terminalda modelni yuklab oling:

```bash
ollama pull llama3.2
```

3. Ollama serverini ishga tushiring:

```bash
ollama serve
```

Agar Gemini ham, Groq ham ishlamasa (masalan, internet yo'q), JARVIS
avtomatik ravishda lokal Ollama'ga o'tadi.

---

## 5. O'RNATISH BUYRUQLARI

Loyihani yuklab olgach, backend papkasiga o'ting va bog'liqliklarni
o'rnating (Windows va Mac uchun bir xil):

```bash
cd jarvis/server
npm install
```

`server/.env` fayli allaqachon mavjud (bo'sh API kalitlar bilan) —
uni oching va yuqoridagi bosqichlarda olingan kalitlaringizni kiriting.

---

## 6. ISHGA TUSHIRISH (2 ta terminal kerak)

**1-terminal — backend server:**

```bash
cd jarvis/server
npm start
```

Konsolda quyidagiga o'xshash banner chiqsa — server ishga tushdi:

```
==================================================
   J A R V I S   —   shaxsiy AI yordamchi
==================================================
  Port:      5000
  Provider:  gemini
  ...
```

**2-terminal — frontend (client):**

```bash
cd jarvis/client
node serve.js
```

So'ngra brauzerda **http://localhost:3000** manzilini oching.

> Windows va Mac uchun buyruqlar bir xil — ikkalasida ham terminalda
> (Mac: Terminal.app, Windows: PowerShell yoki CMD) yuqoridagi
> buyruqlarni ishlatasiz.

---

## 7. `.env` FAYL NAMUNASI (izohlar bilan)

```env
# Server qaysi portda ishga tushishi kerak
PORT=5000

# Qaysi AI provider asosiy sifatida ishlatilsin: gemini | groq | ollama
PROVIDER=gemini

# --- GOOGLE GEMINI (asosiy, bepul) ---
GEMINI_API_KEY=AIza...sizning-kalitingiz
GEMINI_MODEL=gemini-flash-lite-latest

# --- GROQ (zaxira, bepul) ---
GROQ_API_KEY=gsk_...sizning-kalitingiz
GROQ_MODEL=llama-3.1-8b-instant

# --- OLLAMA (lokal, internetsiz) ---
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Log darajasi: debug | info | error
LOG_LEVEL=info

# Muhit: development | production
NODE_ENV=development
```

> Diqqat: agar `PORT` qiymatini o'zgartirsangiz, `client/app.js`
> faylining boshidagi `API_BASE` o'zgaruvchisini ham yangi portga
> mos qilib o'zgartiring (standart holatda `http://localhost:5000`).

---

## 8. TEZ-TEZ UCHRAYDIGAN XATOLAR

| Xato | Sabab | Yechim |
|---|---|---|
| `API kalit noto'g'ri. .env faylni tekshiring.` | `GEMINI_API_KEY` yoki `GROQ_API_KEY` bo'sh yoki noto'g'ri kiritilgan | `.env` faylni ochib kalitni qaytadan tekshiring, bo'sh joy yoki qo'shtirnoq qolmaganiga ishonch hosil qiling |
| `Kunlik limit tugadi. Zaxira providerga o'tilmoqda.` | Gemini yoki Groq'ning bepul kunlik so'rov limiti tugagan | Kuting yoki `.env` da boshqa providerni asosiy qilib belgilang (`PROVIDER=groq`) |
| `Internetga ulanib bo'lmadi.` | Kompyuter internetga ulanmagan yoki tarmoq bloklangan | Internet aloqasini tekshiring yoki `PROVIDER=ollama` qilib lokal rejimga o'ting |
| `Ollama ishga tushmagan. 'ollama serve' buyrug'ini bajaring.` | Ollama o'rnatilgan, lekin ishga tushirilmagan | Alohida terminalda `ollama serve` buyrug'ini ishga tushiring |
| Sahifa ochilmayapti (`localhost:3000` ishlamayapti) | Client server ishga tushirilmagan | 2-terminalda `node client/serve.js` buyrug'i ishlab turganiga ishonch hosil qiling |
| Server holati "ishlamayapti" (qizil nuqta) | Backend server (5000-port) ishlamayapti | 1-terminalda `npm start` buyrug'i xatosiz ishlab turganini tekshiring |
| `node:sqlite moduli topilmadi` | Node.js versiyasi juda eski (22.5 dan past) | Node.js'ni eng so'nggi LTS versiyaga yangilang |
| Mikrofon ishlamayapti | Brauzer ovozli kiritishni qo'llab-quvvatlamaydi yoki ruxsat berilmagan | Google Chrome'dan foydalaning va mikrofonga ruxsat bering |
| "python kodini ishga tushirishda xatolik" | Kompyuterda Python o'rnatilmagan | https://python.org dan Python o'rnating ("Add to PATH" belgilang) |
| Vazifa bajarilmayapti, faqat matn javob keladi | `PROVIDER` gemini emas yoki Gemini ishlamayapti | Provider tanlovini "Gemini" qiling va API kalitni tekshiring |

---

## 9. BEPUL LIMITLAR HAQIDA ESLATMA

Gemini va Groq bepul API kalitlari kunlik/daqiqalik so'rov limitiga ega.
Joriy limitlarni bu yerdan tekshirishingiz mumkin:

- Gemini: https://ai.google.dev/gemini-api/docs/rate-limits
- Groq: https://console.groq.com/docs/rate-limits

Limit tugasa, JARVIS avtomatik ravishda zaxira providerga o'tadi —
hech narsa qo'lda o'zgartirish shart emas.

---

## 10. RENDER.COM'GA BEPUL JOYLASHTIRISH (ixtiyoriy)

Agar JARVIS'ni internetga chiqarmoqchi bo'lsangiz, Render.com'ning
bepul rejasidan foydalanishingiz mumkin:

1. Loyihani GitHub'ga yuklang (`git init`, `git add .`, `git commit`,
   so'ng GitHub'da repository yarating va push qiling).
2. [https://render.com](https://render.com) da ro'yxatdan o'ting va
   **"New +" → "Web Service"** ni tanlang.
3. GitHub repository'ngizni ulang.
4. Sozlamalarni kiriting:
   - **Root Directory:** `jarvis/server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. **Environment Variables** bo'limida `.env` faylidagi barcha
   o'zgaruvchilarni (GEMINI_API_KEY, GROQ_API_KEY va h.k.) qo'lda
   kiriting.
6. Frontend uchun alohida **"Static Site"** yarating, Root Directory
   sifatida `jarvis/client` ni ko'rsating.
7. Frontend'dagi `client/app.js` faylida `API_BASE` o'zgaruvchisini
   Render'dan olingan backend manzilingizga o'zgartiring.

> Eslatma: Render'ning bepul rejasida server bir muddat ishlatilmasa
> "uxlab qoladi" va keyingi so'rovda uyg'onishi bir necha soniya vaqt
> olishi mumkin — bu normal holat va pul to'lashni talab qilmaydi.

---

## Loyiha tuzilmasi

```
jarvis/
├── server/          # Backend (Node.js/Express)
│   ├── executor.js        # Vazifa bajarish (dastur ochish, fayl, kod)
│   ├── toolLoop.js         # Gemini function-calling tsikli
│   ├── pendingActions.js   # Tasdiq kutayotgan amallar xotirasi
│   └── routes/execute.js   # Tasdiqlash/bekor qilish endpoint'lari
├── client/          # Frontend (Vanilla HTML/JS + Tailwind CDN)
├── data/            # SQLite ma'lumotlar bazasi (avtomatik yaratiladi)
└── README.md
```

Vazifa bajarish paytida yaratilgan fayllar Ish stolingizdagi
`JARVIS-ish` papkasida saqlanadi (avtomatik yaratiladi).

Xo'jayin, savolingiz bo'lsa — JARVIS doim xizmatingizda.
