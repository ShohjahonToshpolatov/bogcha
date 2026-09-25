// JARVIS — barcha sozlamalar shu yerda markazlashgan
require('dotenv').config();

const path = require('path');

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  provider: process.env.PROVIDER || 'gemini',

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
  },

  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
  },

  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.2',
  },

  dbPath: path.join(__dirname, '..', 'data', 'jarvis.db'),

  // Har bir so'rovda modelga yuboriladigan oxirgi xabarlar soni
  maxContextMessages: 20,

  // Kiruvchi xabar cheklovlari
  maxMessageLength: 10000,

  // Rasm biriktirish cheklovlari
  allowedImageMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  maxImageBase64Chars: 7_000_000, // taxminan ~5MB rasm

  // Bir IP uchun daqiqasiga ruxsat etilgan so'rovlar soni
  rateLimit: {
    windowMs: 60 * 1000,
    maxRequests: 20,
  },

  // Provider chaqiruvlari uchun qayta urinish sozlamalari
  retry: {
    maxAttempts: 3,
    baseDelayMs: 500,
  },

  // JARVIS shaxsiyati (system prompt)
  systemPrompt:
    "Sen JARVIS — shaxsiy AI yordamchisan. Faqat o'zbek tilida (lotin " +
    "yozuvida) javob berasan. Aniq, lo'nda, professional uslubda gapirasan. " +
    "Foydalanuvchiga har doim 'Xo'jayin' deb murojaat qilasan. Agar kod " +
    "so'ralsa, to'liq va ishlaydigan kod berasan, chala yoki qisqartirilgan " +
    "kod bermaysan. Javoblaring qisqa va foydali bo'lsin, ortiqcha cho'zib " +
    "yubormaysan. Sen foydalanuvchining shaxsiy kompyuterida amallar " +
    "bajara olasan: dastur ochish, fayl bilan ishlash, kod yozish va " +
    "ishga tushirish, terminal buyruqlarini bajarish — shu uchun mos " +
    "vaziyatlarda tegishli funksiyani (function call) chaqirasan. " +
    "Funksiya natijasi senga qaytgach, uni Xo'jayinga tabiiy o'zbek " +
    "tilida tushuntirasan.",

  // Gemini function-calling (tool use) orqali JARVIS bajara oladigan amallar
  tools: [
    {
      functionDeclarations: [
        {
          name: 'open_app',
          description:
            "Foydalanuvchi kompyuterida oldindan tanilgan dasturni ishga tushiradi (masalan, Chrome, Notepad, Kalkulyator, VSCode).",
          parameters: {
            type: 'OBJECT',
            properties: {
              app_name: { type: 'STRING', description: "Ochish kerak bo'lgan dastur nomi" },
            },
            required: ['app_name'],
          },
        },
        {
          name: 'open_url',
          description: 'Standart brauzerda berilgan veb-sahifani ochadi.',
          parameters: {
            type: 'OBJECT',
            properties: { url: { type: 'STRING', description: 'To\'liq yoki qisqa veb-manzil' } },
            required: ['url'],
          },
        },
        {
          name: 'write_file',
          description:
            "JARVIS-ish papkasida (Ish stolida) matnli fayl yaratadi yoki mavjudini qayta yozadi. Tasdiq talab qiladi.",
          parameters: {
            type: 'OBJECT',
            properties: {
              file_name: { type: 'STRING', description: 'Kengaytmasi bilan fayl nomi, masalan reja.txt' },
              content: { type: 'STRING', description: 'Faylga yoziladigan matn' },
            },
            required: ['file_name', 'content'],
          },
        },
        {
          name: 'read_file',
          description: 'JARVIS-ish papkasidagi mavjud faylning matnini o\'qiydi.',
          parameters: {
            type: 'OBJECT',
            properties: { file_name: { type: 'STRING' } },
            required: ['file_name'],
          },
        },
        {
          name: 'list_files',
          description: "JARVIS-ish papkasidagi barcha fayllar ro'yxatini qaytaradi.",
          parameters: { type: 'OBJECT', properties: {} },
        },
        {
          name: 'run_code',
          description:
            "Berilgan kodni (javascript, python yoki powershell) faylga yozib, darhol ishga tushiradi va natijasini qaytaradi. Tasdiq talab qiladi.",
          parameters: {
            type: 'OBJECT',
            properties: {
              language: { type: 'STRING', description: 'javascript | python | powershell' },
              code: { type: 'STRING', description: "To'liq, ishlaydigan kod matni" },
              file_name: { type: 'STRING', description: 'Ixtiyoriy fayl nomi' },
            },
            required: ['language', 'code'],
          },
        },
        {
          name: 'run_command',
          description:
            "Windows terminalida (cmd) ixtiyoriy buyruqni bajaradi. Tasdiq talab qiladi, ehtiyotkorlik bilan ishlatiladi.",
          parameters: {
            type: 'OBJECT',
            properties: { command: { type: 'STRING' } },
            required: ['command'],
          },
        },
      ],
    },
  ],

  // Tasdiqsiz avtomatik bajariladigan (xavfsiz) amallar
  safeActions: ['open_app', 'open_url', 'read_file', 'list_files'],
  // Foydalanuvchi tasdig'ini talab qiladigan (xavfliroq) amallar
  confirmRequiredActions: ['write_file', 'run_code', 'run_command'],
};

module.exports = config;
