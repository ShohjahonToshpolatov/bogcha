// JARVIS — Gemini function-calling (vazifa bajarish) tsiklini boshqaruvchi modul
const config = require('./config');
const logger = require('./logger');
const gemini = require('./providers/gemini');
const executor = require('./executor');

const MAX_ITERATIONS = 4;

async function executeAction(name, args) {
  switch (name) {
    case 'open_app':
      return executor.openApp(args.app_name);
    case 'open_url':
      return executor.openUrl(args.url);
    case 'write_file':
      return executor.writeFile(args.file_name, args.content);
    case 'read_file':
      return executor.readFile(args.file_name);
    case 'list_files':
      return executor.listFiles();
    case 'run_code':
      return executor.runCode(args.language, args.code, args.file_name);
    case 'run_command':
      return executor.runCommand(args.command);
    default:
      return { ok: false, message: `Noma'lum amal: ${name}` };
  }
}

// Tasdiqlanishi kerak bo'lgan amal haqida foydalanuvchiga tushunarli tavsif tuzadi
function describeAction(name, args) {
  switch (name) {
    case 'write_file':
      return `"${args.file_name}" nomli faylni yozish (JARVIS-ish papkasida)`;
    case 'run_code':
      return `${args.language} kodini ishga tushirish${args.file_name ? ` (${args.file_name})` : ''}`;
    case 'run_command':
      return `Terminal buyrug'ini bajarish: ${args.command}`;
    default:
      return `Amalni bajarish: ${name}`;
  }
}

/**
 * Function-calling tsiklini bajaradi.
 * @param {Array} contents - Gemini formatidagi xabarlar (rol/parts)
 * @param {(payload: object) => void} [onNotice] - xavfsiz amal bajarilganda chaqiriladigan callback
 * @returns {Promise<{status: 'done', text: string, model: string} | {status: 'confirm', contents: Array, functionCall: object, description: string}>}
 */
async function runToolLoop(contents, onNotice) {
  let currentContents = contents;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const result = await gemini.generateRaw(currentContents, config.systemPrompt);

    if (!result.functionCall) {
      return { status: 'done', text: result.text, model: result.model };
    }

    const { name, args } = result.functionCall;
    logger.info(`JARVIS amal chaqirmoqda: ${name}(${JSON.stringify(args)})`);

    if (config.confirmRequiredActions.includes(name)) {
      return {
        status: 'confirm',
        contents: currentContents,
        functionCall: { name, args },
        functionCallPart: result.functionCallPart,
        description: describeAction(name, args),
      };
    }

    // Xavfsiz amal — darhol bajaramiz
    const actionResult = await executeAction(name, args);
    if (onNotice) {
      onNotice({ name, args, result: actionResult });
    }

    currentContents = [
      ...currentContents,
      { role: 'model', parts: [result.functionCallPart] },
      { role: 'user', parts: [{ functionResponse: { name, response: actionResult } }] },
    ];
  }

  return {
    status: 'done',
    text: "Xo'jayin, vazifa bir necha bosqichdan oshib ketdi, iltimos so'rovni soddaroq qayta bering.",
    model: config.gemini.model,
  };
}

// Tasdiqlangan/rad etilgan amaldan keyin tsiklni davom ettiradi
async function resumeAfterDecision(pendingContents, functionCall, functionCallPart, approved, actionResult) {
  const functionResponse = approved
    ? actionResult
    : { ok: false, message: "Xo'jayin bu amalni bekor qildi." };

  const contents = [
    ...pendingContents,
    { role: 'model', parts: [functionCallPart] },
    {
      role: 'user',
      parts: [{ functionResponse: { name: functionCall.name, response: functionResponse } }],
    },
  ];

  return runToolLoop(contents);
}

module.exports = { runToolLoop, resumeAfterDecision, executeAction, describeAction };
