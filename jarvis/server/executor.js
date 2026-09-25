// JARVIS — laptopda amal bajaruvchi modul (dastur ochish, fayl bilan ishlash, kod ishga tushirish)
// XAVFSIZLIK: fayl amallari faqat JARVIS-ish papkasi bilan chegaralangan,
// dastur ochish faqat oldindan belgilangan (whitelist) ro'yxatdan bajariladi.
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
const logger = require('./logger');

const WORK_DIR = path.join(os.homedir(), 'Desktop', 'JARVIS-ish');
if (!fs.existsSync(WORK_DIR)) {
  fs.mkdirSync(WORK_DIR, { recursive: true });
}

// Dastur nomi -> Windows'da ishga tushirish buyrug'i
const APP_WHITELIST = {
  chrome: 'start chrome',
  google: 'start chrome',
  edge: 'start msedge',
  brauzer: 'start msedge',
  notepad: 'start notepad',
  bloknot: 'start notepad',
  calculator: 'start calc',
  kalkulyator: 'start calc',
  explorer: 'start explorer',
  fayllar: 'start explorer',
  paint: 'start mspaint',
  cmd: 'start cmd',
  terminal: 'start cmd',
  powershell: 'start powershell',
  word: 'start winword',
  excel: 'start excel',
  vscode: 'start code',
  'visual studio code': 'start code',
  spotify: 'start spotify:',
  telegram: 'start tg:',
  outlook: 'start outlook',
};

// Har bir amal turi uchun (soniyalarda) bajarilish muddati chegarasi
const EXEC_TIMEOUT_MS = 15000;
const MAX_OUTPUT_CHARS = 4000;

function safeFileName(name) {
  // Yo'l ajratuvchilarni va "yuqoriga chiqish" urinishlarini olib tashlaymiz
  const base = path.basename(String(name || 'jarvis-fayl.txt'));
  return base.replace(/[<>:"|?*\x00-\x1F]/g, '_');
}

function resolveInsideWorkDir(fileName) {
  const safe = safeFileName(fileName);
  const fullPath = path.join(WORK_DIR, safe);
  if (!fullPath.startsWith(WORK_DIR)) {
    throw new Error("Ruxsat etilmagan fayl yo'li.");
  }
  return fullPath;
}

function runShell(command, cwd) {
  return new Promise((resolve) => {
    exec(
      command,
      { cwd: cwd || WORK_DIR, timeout: EXEC_TIMEOUT_MS, windowsHide: true },
      (error, stdout, stderr) => {
        if (error && !stdout && !stderr) {
          resolve({ ok: false, output: `Xato: ${error.message}` });
          return;
        }
        let output = (stdout || '') + (stderr ? `\n${stderr}` : '');
        if (output.length > MAX_OUTPUT_CHARS) {
          output = output.slice(0, MAX_OUTPUT_CHARS) + '\n... (qisqartirildi)';
        }
        resolve({ ok: !error, output: output.trim() || '(natija bo\'sh)' });
      }
    );
  });
}

// ============ AMALLAR ============

async function openApp(appName) {
  const key = String(appName || '').trim().toLowerCase();
  const command = APP_WHITELIST[key];
  if (!command) {
    return {
      ok: false,
      message: `"${appName}" dasturi ro'yxatda yo'q. Qo'llab-quvvatlanadigan dasturlar: ${Object.keys(
        APP_WHITELIST
      ).join(', ')}`,
    };
  }
  const result = await runShell(command);
  return {
    ok: result.ok,
    message: result.ok ? `"${appName}" ochildi.` : `"${appName}"ni ochib bo'lmadi: ${result.output}`,
  };
}

async function openUrl(url) {
  let safeUrl = String(url || '').trim();
  if (!/^https?:\/\//i.test(safeUrl)) {
    safeUrl = 'https://' + safeUrl;
  }
  // Buyruq in'ektsiyasidan himoya: URL ichida qo'shtirnoq/maxsus belgilarga yo'l qo'ymaymiz
  if (/["&|<>^]/.test(safeUrl)) {
    return { ok: false, message: "URL manzilida ruxsat etilmagan belgilar bor." };
  }
  const result = await runShell(`start "" "${safeUrl}"`);
  return {
    ok: result.ok,
    message: result.ok ? `${safeUrl} brauzerda ochildi.` : `Sahifani ochib bo'lmadi: ${result.output}`,
  };
}

async function writeFile(fileName, content) {
  const fullPath = resolveInsideWorkDir(fileName);
  fs.writeFileSync(fullPath, content ?? '', 'utf8');
  return { ok: true, message: `Fayl saqlandi: ${fullPath}`, path: fullPath };
}

async function readFile(fileName) {
  const fullPath = resolveInsideWorkDir(fileName);
  if (!fs.existsSync(fullPath)) {
    return { ok: false, message: `Fayl topilmadi: ${fileName}` };
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  return { ok: true, message: 'Fayl o\'qildi.', content: content.slice(0, MAX_OUTPUT_CHARS) };
}

async function listFiles() {
  const files = fs.readdirSync(WORK_DIR);
  return {
    ok: true,
    message: files.length ? files.join(', ') : "JARVIS-ish papkasi hozircha bo'sh.",
    files,
  };
}

const LANG_RUNNERS = {
  javascript: (filePath) => `node "${filePath}"`,
  js: (filePath) => `node "${filePath}"`,
  python: (filePath) => `python "${filePath}"`,
  py: (filePath) => `python "${filePath}"`,
  powershell: (filePath) => `powershell -NoProfile -ExecutionPolicy Bypass -File "${filePath}"`,
};

const LANG_EXTENSIONS = {
  javascript: '.js',
  js: '.js',
  python: '.py',
  py: '.py',
  powershell: '.ps1',
};

async function runCode(language, code, fileName) {
  const lang = String(language || 'javascript').trim().toLowerCase();
  const runnerBuilder = LANG_RUNNERS[lang];
  if (!runnerBuilder) {
    return {
      ok: false,
      message: `"${language}" tili qo'llab-quvvatlanmaydi. Mavjud tillar: javascript, python, powershell.`,
    };
  }
  const ext = LANG_EXTENSIONS[lang] || '.txt';
  const baseName = safeFileName(fileName || `kod-${Date.now()}${ext}`);
  const finalName = baseName.endsWith(ext) ? baseName : baseName + ext;
  const fullPath = resolveInsideWorkDir(finalName);

  fs.writeFileSync(fullPath, code || '', 'utf8');
  const result = await runShell(runnerBuilder(fullPath), WORK_DIR);

  return {
    ok: result.ok,
    message: result.ok
      ? `Kod ishga tushirildi (${finalName}). Natija:\n${result.output}`
      : `Kodni ishga tushirishda xatolik:\n${result.output}`,
    filePath: fullPath,
    output: result.output,
  };
}

async function runCommand(command) {
  const result = await runShell(command);
  return {
    ok: result.ok,
    message: result.ok
      ? `Buyruq bajarildi. Natija:\n${result.output}`
      : `Buyruqni bajarishda xatolik:\n${result.output}`,
    output: result.output,
  };
}

module.exports = {
  WORK_DIR,
  APP_WHITELIST,
  openApp,
  openUrl,
  writeFile,
  readFile,
  listFiles,
  runCode,
  runCommand,
};
