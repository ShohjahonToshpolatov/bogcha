// JARVIS — frontend mantiq (vanilla JS, tashqi kutubxonasiz)
(() => {
  'use strict';

  const API_BASE = 'http://localhost:5000';

  // ---------- DOM elementlari ----------
  const $messages = document.getElementById('messages');
  const $emptyState = document.getElementById('empty-state');
  const $chatForm = document.getElementById('chat-form');
  const $chatInput = document.getElementById('chat-input');
  const $sendBtn = document.getElementById('send-btn');
  const $micBtn = document.getElementById('mic-btn');
  const $imageInput = document.getElementById('image-input');
  const $imageAttachBtn = document.getElementById('image-attach-btn');
  const $imagePreviewWrap = document.getElementById('image-preview-wrap');
  const $imagePreview = document.getElementById('image-preview');
  const $imagePreviewRemove = document.getElementById('image-preview-remove');
  const $voiceModeBtn = document.getElementById('voice-mode-btn');
  const $voiceModeStatus = document.getElementById('voice-mode-status');
  const $hintText = document.getElementById('hint-text');
  const $newChatBtn = document.getElementById('new-chat-btn');
  const $sessionsList = document.getElementById('sessions-list');
  const $providerSelect = document.getElementById('provider-select');
  const $statusDot = document.getElementById('status-dot');
  const $statusText = document.getElementById('status-text');
  const $errorBanner = document.getElementById('error-banner');
  const $errorBannerText = document.getElementById('error-banner-text');
  const $errorBannerClose = document.getElementById('error-banner-close');
  const $hamburgerBtn = document.getElementById('hamburger-btn');
  const $sidebar = document.getElementById('sidebar');
  const $sidebarOverlay = document.getElementById('sidebar-overlay');

  // ---------- Holat ----------
  let currentSessionId = null;
  let isStreaming = false;
  let errorHideTimer = null;
  const messageRawText = new Map(); // msgId -> AI javobining xom matni (ovozda o'qish/nusxalash uchun)
  let msgCounter = 0;
  let voiceConversationActive = false;
  let isSpeaking = false;
  let pendingImage = null; // { mimeType, data (base64, prefiksiz), previewUrl }
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

  // ================= YORDAMCHI FUNKSIYALAR =================

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showError(message) {
    $errorBannerText.textContent = message;
    $errorBanner.classList.remove('hidden');
    clearTimeout(errorHideTimer);
    errorHideTimer = setTimeout(() => {
      $errorBanner.classList.add('hidden');
    }, 7000);
  }

  $errorBannerClose.addEventListener('click', () => {
    $errorBanner.classList.add('hidden');
  });

  function scrollToBottom() {
    $messages.scrollTop = $messages.scrollHeight;
  }

  function hideEmptyState() {
    if ($emptyState && $emptyState.parentNode) {
      $emptyState.remove();
    }
  }

  // ================= MARKDOWN RENDERER =================
  // Oddiy markdown -> HTML aylantirgich: **bold**, `code`, ```blok```,
  // ro'yxatlar, sarlavhalar. Tashqi kutubxonasiz.
  function renderMarkdown(rawText) {
    const codeBlocks = [];
    let text = rawText.replace(/\r\n/g, '\n');

    // 1) Kod bloklarini vaqtincha ajratib olamiz
    text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
      const index = codeBlocks.length;
      codeBlocks.push({ lang: lang || 'matn', code: code.replace(/\n$/, '') });
      return `

CODEBLOCK${index}

`;
    });

    // 2) Qolgan matnni HTML uchun xavfsizlashtiramiz
    text = escapeHtml(text);

    // 3) Sarlavhalar
    text = text.replace(/^### (.*)$/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.*)$/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.*)$/gm, '<h1>$1</h1>');

    // 4) Qalin matn va ichki kod
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/`([^`]+?)`/g, '<code class="inline-code">$1</code>');

    // 5) Ro'yxatlar (oddiy, ketma-ket qatorlarni <ul>/<ol> ga o'raymiz)
    text = text.replace(/(?:^|\n)((?:[-*] .*(?:\n|$))+)/g, (match, block) => {
      const items = block
        .trim()
        .split('\n')
        .map((line) => `<li>${line.replace(/^[-*]\s+/, '')}</li>`)
        .join('');
      return `\n<ul>${items}</ul>\n`;
    });
    text = text.replace(/(?:^|\n)((?:\d+\. .*(?:\n|$))+)/g, (match, block) => {
      const items = block
        .trim()
        .split('\n')
        .map((line) => `<li>${line.replace(/^\d+\.\s+/, '')}</li>`)
        .join('');
      return `\n<ol>${items}</ol>\n`;
    });

    // 6) Paragraflar
    text = text
      .split(/\n{2,}/)
      .map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return '';
        if (/^<(h1|h2|h3|ul|ol)/.test(trimmed) || /^CODEBLOCK\d+$/.test(trimmed)) return trimmed;
        return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
      })
      .join('');

    // 7) Kod bloklarini joyiga qaytaramiz
    text = text.replace(/CODEBLOCK(\d+)/g, (match, idx) => {
      const block = codeBlocks[parseInt(idx, 10)];
      const escapedCode = escapeHtml(block.code);
      const encodedForCopy = encodeURIComponent(block.code);
      return `<div class="code-block-wrap">
        <div class="code-block-header">
          <span>${escapeHtml(block.lang)}</span>
          <button type="button" class="code-block-copy" data-code="${encodedForCopy}">Nusxalash</button>
        </div>
        <pre><code>${escapedCode}</code></pre>
      </div>`;
    });

    return text;
  }

  // ================= XABAR QO'SHISH =================

  function addUserMessage(text, imagePreviewUrl) {
    hideEmptyState();
    const row = document.createElement('div');
    row.className = 'msg-row user';
    const imageHtml = imagePreviewUrl
      ? `<img src="${imagePreviewUrl}" class="user-msg-image" alt="Biriktirilgan rasm" />`
      : '';
    row.innerHTML = `
      <div class="msg-avatar user">SIZ</div>
      <div class="msg-bubble user">${imageHtml}${escapeHtml(text).replace(/\n/g, '<br>')}</div>
    `;
    $messages.appendChild(row);
    scrollToBottom();
  }

  function addNotice(text) {
    const notice = document.createElement('div');
    notice.className = 'msg-row assistant';
    notice.innerHTML = `<div style="width:32px"></div><div class="text-xs text-amber-300/80 bg-amber-500/10 border border-amber-400/20 rounded-lg px-3 py-1.5">${escapeHtml(text)}</div>`;
    $messages.appendChild(notice);
    scrollToBottom();
  }

  function addAssistantPlaceholder() {
    hideEmptyState();
    msgCounter += 1;
    const id = `msg-${msgCounter}`;
    const row = document.createElement('div');
    row.className = 'msg-row assistant';
    row.id = id;
    row.innerHTML = `
      <div class="msg-avatar assistant">J</div>
      <div class="flex flex-col" style="max-width:85%">
        <div class="msg-bubble assistant">
          <span class="typing-dots"><span></span><span></span><span></span></span>
        </div>
        <div class="msg-meta"></div>
      </div>
    `;
    $messages.appendChild(row);
    scrollToBottom();
    return id;
  }

  function updateAssistantStreamingText(id, partialText) {
    const row = document.getElementById(id);
    if (!row) return;
    const bubble = row.querySelector('.msg-bubble');
    bubble.textContent = partialText;
  }

  function finalizeAssistantMessage(id, fullText, provider, model) {
    const row = document.getElementById(id);
    if (!row) return;
    const bubble = row.querySelector('.msg-bubble');
    const meta = row.querySelector('.msg-meta');
    bubble.innerHTML = renderMarkdown(fullText);
    messageRawText.set(id, fullText);

    meta.innerHTML = `
      <span>${escapeHtml(provider || '')}${model ? ' &middot; ' + escapeHtml(model) : ''}</span>
      <button type="button" class="speak-btn" data-msg-id="${id}" title="Ovozda o'qish">Ovozda o'qish</button>
    `;
    scrollToBottom();
  }

  function showAssistantError(id, message) {
    const row = document.getElementById(id);
    if (!row) return;
    const bubble = row.querySelector('.msg-bubble');
    bubble.innerHTML = `<span class="text-red-300">${escapeHtml(message)}</span>`;
  }

  // Kod nusxalash va ovozda o'qish tugmalari uchun delegatsiya
  $messages.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.code-block-copy');
    if (copyBtn) {
      const code = decodeURIComponent(copyBtn.dataset.code || '');
      navigator.clipboard
        .writeText(code)
        .then(() => {
          const original = copyBtn.textContent;
          copyBtn.textContent = 'Nusxalandi!';
          setTimeout(() => (copyBtn.textContent = original), 1500);
        })
        .catch(() => showError("Nusxalashda xatolik yuz berdi."));
      return;
    }

    const speakBtn = e.target.closest('.speak-btn');
    if (speakBtn) {
      const text = messageRawText.get(speakBtn.dataset.msgId) || '';
      speakText(text);
    }
  });

  function stripMarkdownForSpeech(text) {
    return text
      .replace(/```[\s\S]*?```/g, ' kod bloki. ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/[#*_>]/g, '')
      .trim();
  }

  // O'zbekcha matnni eng yaqin talaffuzda o'qiydigan ovozni tanlaydi.
  // Brauzerlarda maxsus o'zbek ovozi deyarli hech qachon topilmaydi — shu
  // sabab fonetik jihatdan eng yaqin turkiy/lotin tillardan foydalanamiz.
  let cachedVoices = [];
  function refreshVoices() {
    cachedVoices = window.speechSynthesis.getVoices();
  }
  if ('speechSynthesis' in window) {
    refreshVoices();
    window.speechSynthesis.onvoiceschanged = refreshVoices;
  }
  function pickBestVoice() {
    if (!cachedVoices.length) refreshVoices();
    const byPrefix = (prefix) =>
      cachedVoices.find((v) => v.lang.toLowerCase().startsWith(prefix));
    return byPrefix('uz') || byPrefix('tr') || byPrefix('az') || null;
  }

  function speakText(text, onEnd) {
    if (!('speechSynthesis' in window)) {
      showError("Brauzeringiz ovozda o'qishni qo'llab-quvvatlamaydi.");
      if (onEnd) onEnd();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(stripMarkdownForSpeech(text));
    const bestVoice = pickBestVoice();
    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang;
    } else {
      utterance.lang = 'uz-UZ';
    }
    utterance.rate = 1;
    isSpeaking = true;
    utterance.onend = () => {
      isSpeaking = false;
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      isSpeaking = false;
      if (onEnd) onEnd();
    };
    window.speechSynthesis.speak(utterance);
  }

  // ================= AMAL TASDIQLASH KARTOCHKASI =================

  function renderConfirmCard(assistantId, payload) {
    const row = document.getElementById(assistantId);
    if (!row) return;
    const bubble = row.querySelector('.msg-bubble');
    const meta = row.querySelector('.msg-meta');
    const args = payload.args || {};

    let preview = '';
    if (payload.action === 'run_code') {
      preview = `<div class="code-block-wrap"><div class="code-block-header"><span>${escapeHtml(
        args.language || ''
      )}</span></div><pre><code>${escapeHtml(args.code || '')}</code></pre></div>`;
    } else if (payload.action === 'write_file') {
      preview = `<div class="code-block-wrap"><div class="code-block-header"><span>${escapeHtml(
        args.file_name || ''
      )}</span></div><pre><code>${escapeHtml(args.content || '')}</code></pre></div>`;
    } else if (payload.action === 'run_command') {
      preview = `<div class="code-block-wrap"><div class="code-block-header"><span>terminal</span></div><pre><code>${escapeHtml(
        args.command || ''
      )}</code></pre></div>`;
    }

    bubble.innerHTML = `
      <div class="confirm-card">
        <div class="confirm-card-title">JARVIS ruxsat so'ramoqda</div>
        <div class="confirm-card-desc">${escapeHtml(payload.description)}</div>
        ${preview}
        <div class="confirm-card-actions">
          <button type="button" class="confirm-approve">Tasdiqlash</button>
          <button type="button" class="confirm-reject">Bekor qilish</button>
        </div>
      </div>
    `;
    meta.innerHTML = '';

    const approveBtn = bubble.querySelector('.confirm-approve');
    const rejectBtn = bubble.querySelector('.confirm-reject');

    approveBtn.addEventListener('click', () => {
      approveBtn.disabled = true;
      rejectBtn.disabled = true;
      approveBtn.textContent = 'Bajarilmoqda...';
      handleActionDecision(payload.pending_id, 'approve');
    });
    rejectBtn.addEventListener('click', () => {
      approveBtn.disabled = true;
      rejectBtn.disabled = true;
      handleActionDecision(payload.pending_id, 'reject');
    });

    scrollToBottom();
  }

  async function handleActionDecision(pendingId, decision) {
    const assistantId = addAssistantPlaceholder();
    try {
      const response = await fetch(`${API_BASE}/api/execute/${pendingId}/${decision}`, {
        method: 'POST',
      });
      await consumeStream(response, assistantId);
    } catch (err) {
      showAssistantError(assistantId, err.message || 'Kutilmagan xatolik yuz berdi.');
      showError(err.message || 'Kutilmagan xatolik yuz berdi.');
    }
  }

  // ================= SSE OQIMINI O'QISH (umumiy) =================

  async function consumeStream(response, assistantId) {
    if (!response.ok || !response.body) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Server bilan bog'lanishda xatolik.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulatedText = '';
    let finalProvider = '';
    let finalModel = '';
    let sawConfirm = false;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split('\n\n');
      buffer = parts.pop();

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith('data:')) continue;
        const jsonStr = line.slice(5).trim();
        let payload;
        try {
          payload = JSON.parse(jsonStr);
        } catch (e) {
          continue;
        }

        if (payload.type === 'session') {
          if (!currentSessionId) {
            currentSessionId = payload.session_id;
            loadSessions();
          }
        } else if (payload.type === 'notice') {
          addNotice(payload.message);
        } else if (payload.type === 'chunk') {
          accumulatedText += payload.text;
          updateAssistantStreamingText(assistantId, accumulatedText);
          scrollToBottom();
        } else if (payload.type === 'confirm_required') {
          sawConfirm = true;
          renderConfirmCard(assistantId, payload);
        } else if (payload.type === 'done') {
          finalProvider = payload.provider;
          finalModel = payload.model;
        } else if (payload.type === 'error') {
          throw new Error(payload.message);
        }
      }
    }

    if (!sawConfirm) {
      finalizeAssistantMessage(assistantId, accumulatedText, finalProvider, finalModel);
      loadSessions();
      if (voiceConversationActive && accumulatedText) {
        speakText(accumulatedText, () => {
          if (voiceConversationActive) startListening();
        });
      }
    }
  }

  // ================= XABAR YUBORISH (SSE STREAMING) =================

  async function sendMessage(text) {
    const imageToSend = pendingImage;
    if ((!text.trim() && !imageToSend) || isStreaming) return;

    isStreaming = true;
    $sendBtn.disabled = true;
    clearImagePreview();

    addUserMessage(text.trim() || "(rasm yuborildi)", imageToSend ? imageToSend.previewUrl : null);
    const assistantId = addAssistantPlaceholder();

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: currentSessionId,
          provider: $providerSelect.value,
          image: imageToSend ? { mimeType: imageToSend.mimeType, data: imageToSend.data } : undefined,
        }),
      });

      await consumeStream(response, assistantId);
    } catch (err) {
      showAssistantError(assistantId, err.message || 'Kutilmagan xatolik yuz berdi.');
      showError(err.message || 'Kutilmagan xatolik yuz berdi.');
    } finally {
      isStreaming = false;
      $sendBtn.disabled = false;
    }
  }

  // ================= RASM BIRIKTIRISH =================

  function clearImagePreview() {
    pendingImage = null;
    $imagePreviewWrap.hidden = true;
    $imagePreview.src = '';
    $imageInput.value = '';
  }

  $imageAttachBtn.addEventListener('click', () => $imageInput.click());

  $imagePreviewRemove.addEventListener('click', clearImagePreview);

  $imageInput.addEventListener('change', () => {
    const file = $imageInput.files && $imageInput.files[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_BYTES) {
      showError("Rasm hajmi juda katta (5MB dan kichik bo'lsin).");
      $imageInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1] || '';
      pendingImage = { mimeType: file.type, data: base64, previewUrl: dataUrl };
      $imagePreview.src = dataUrl;
      $imagePreviewWrap.hidden = false;
    };
    reader.onerror = () => showError("Rasmni o'qib bo'lmadi.");
    reader.readAsDataURL(file);
  });

  // ================= FORMA BOSHQARUVI =================

  $chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = $chatInput.value;
    $chatInput.value = '';
    $chatInput.style.height = 'auto';
    sendMessage(text);
  });

  $chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      $chatForm.requestSubmit();
    }
  });

  $chatInput.addEventListener('input', () => {
    $chatInput.style.height = 'auto';
    $chatInput.style.height = `${Math.min($chatInput.scrollHeight, 160)}px`;
  });

  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      sendMessage(btn.textContent.trim());
    });
  });

  // ================= YANGI SUHBAT =================

  $newChatBtn.addEventListener('click', () => {
    currentSessionId = null;
    messageRawText.clear();
    $messages.innerHTML = '';
    $messages.appendChild($emptyState || buildEmptyStateFallback());
    highlightActiveSession(null);
    closeSidebarMobile();
  });

  function buildEmptyStateFallback() {
    // Agar bo'sh holat elementi allaqachon olib tashlangan bo'lsa, sahifani qayta yuklaymiz
    location.reload();
    return document.createElement('div');
  }

  // ================= SUHBATLAR TARIXI (SIDEBAR) =================

  async function loadSessions() {
    try {
      const res = await fetch(`${API_BASE}/api/history/sessions`);
      const data = await res.json();
      renderSessionsList(data.sessions || []);
    } catch (err) {
      // Tarixni yuklab bo'lmasa ham interfeys ishlashda davom etadi
    }
  }

  function renderSessionsList(sessions) {
    $sessionsList.innerHTML = '';
    sessions.forEach((session) => {
      const item = document.createElement('div');
      item.className = 'session-item' + (session.id === currentSessionId ? ' active' : '');
      item.dataset.sessionId = session.id;
      item.innerHTML = `
        <span class="session-title">${escapeHtml(session.title)}</span>
        <span class="session-delete" title="O'chirish">&times;</span>
      `;
      item.addEventListener('click', (e) => {
        if (e.target.closest('.session-delete')) return;
        openSession(session.id);
      });
      item.querySelector('.session-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSession(session.id);
      });
      $sessionsList.appendChild(item);
    });
  }

  function highlightActiveSession(sessionId) {
    document.querySelectorAll('.session-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.sessionId === sessionId);
    });
  }

  async function openSession(sessionId) {
    try {
      const res = await fetch(`${API_BASE}/api/history/${sessionId}`);
      if (!res.ok) throw new Error('Suhbat topilmadi.');
      const data = await res.json();

      currentSessionId = sessionId;
      messageRawText.clear();
      $messages.innerHTML = '';

      data.messages.forEach((msg) => {
        if (msg.role === 'user') {
          addUserMessage(msg.content);
        } else {
          const id = addAssistantPlaceholder();
          finalizeAssistantMessage(id, msg.content, msg.provider, '');
        }
      });

      highlightActiveSession(sessionId);
      closeSidebarMobile();
    } catch (err) {
      showError(err.message || 'Suhbatni yuklab bo\'lmadi.');
    }
  }

  async function deleteSession(sessionId) {
    try {
      await fetch(`${API_BASE}/api/history/${sessionId}`, { method: 'DELETE' });
      if (sessionId === currentSessionId) {
        $newChatBtn.click();
      }
      loadSessions();
    } catch (err) {
      showError("Suhbatni o'chirishda xatolik yuz berdi.");
    }
  }

  // ================= MOBIL SIDEBAR =================

  function openSidebarMobile() {
    $sidebar.classList.add('sidebar-open');
    $sidebarOverlay.classList.remove('hidden');
    $sidebarOverlay.classList.add('overlay-open');
  }
  function closeSidebarMobile() {
    $sidebar.classList.remove('sidebar-open');
    $sidebarOverlay.classList.add('hidden');
    $sidebarOverlay.classList.remove('overlay-open');
  }
  $hamburgerBtn.addEventListener('click', openSidebarMobile);
  $sidebarOverlay.addEventListener('click', closeSidebarMobile);

  // ================= PROVIDER TANLASH (saqlanadi) =================

  const savedProvider = localStorage.getItem('jarvis_provider');
  if (savedProvider) $providerSelect.value = savedProvider;
  $providerSelect.addEventListener('change', () => {
    localStorage.setItem('jarvis_provider', $providerSelect.value);
  });

  // ================= SERVER HOLATI =================

  async function checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (!res.ok) throw new Error('offline');
      const data = await res.json();
      $statusDot.className = 'w-2 h-2 rounded-full bg-green-500';
      $statusText.textContent = `Server ishlayapti (${data.provider})`;
    } catch (err) {
      $statusDot.className = 'w-2 h-2 rounded-full bg-red-500';
      $statusText.textContent = 'Server ishlamayapti';
    }
  }

  // ================= OVOZLI KIRITISH (Web Speech API) =================

  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isListening = false;
  let usedFallbackLang = false;
  let autoRestartOnEnd = false;

  function startListening() {
    if (!recognition || isListening || isStreaming || isSpeaking) return;
    try {
      recognition.start();
      isListening = true;
      $micBtn.classList.add('listening');
    } catch (err) {
      // recognition hali to'liq to'xtamagan bo'lishi mumkin — e'tiborsiz qoldiramiz
    }
  }

  function stopListening() {
    if (recognition && isListening) {
      autoRestartOnEnd = false;
      recognition.stop();
    }
  }

  function setVoiceConversationActive(active) {
    voiceConversationActive = active;
    $voiceModeBtn.classList.toggle('active', active);
    $voiceModeStatus.hidden = !active;
    $hintText.hidden = active;

    if (active) {
      startListening();
    } else {
      autoRestartOnEnd = false;
      stopListening();
      window.speechSynthesis.cancel();
    }
  }

  if (SpeechRecognitionCtor) {
    recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'uz-UZ';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (voiceConversationActive) {
        sendMessage(transcript);
      } else {
        $chatInput.value = ($chatInput.value ? $chatInput.value + ' ' : '') + transcript;
        $chatInput.dispatchEvent(new Event('input'));
      }
    };

    recognition.onerror = (event) => {
      autoRestartOnEnd = false;

      if (!usedFallbackLang && event.error === 'language-not-supported') {
        usedFallbackLang = true;
        recognition.lang = 'ru-RU';
        showError("O'zbek tili qo'llab-quvvatlanmadi. Rus tiliga o'tildi (ru-RU).");
        if (voiceConversationActive) autoRestartOnEnd = true;
        return;
      }
      if (event.error === 'no-speech') {
        if (voiceConversationActive) {
          autoRestartOnEnd = true;
        } else {
          showError("Ovoz eshitilmadi. Qaytadan urinib ko'ring.");
        }
        return;
      }
      if (event.error === 'not-allowed') {
        showError('Mikrofonga ruxsat berilmadi.');
        if (voiceConversationActive) setVoiceConversationActive(false);
        return;
      }
      if (event.error === 'aborted') {
        return;
      }
      showError('Ovozli kiritishda xatolik: ' + event.error);
      if (voiceConversationActive) setVoiceConversationActive(false);
    };

    recognition.onend = () => {
      isListening = false;
      $micBtn.classList.remove('listening');
      if (autoRestartOnEnd) {
        autoRestartOnEnd = false;
        startListening();
      }
    };

    $micBtn.addEventListener('click', () => {
      if (isListening) {
        stopListening();
        return;
      }
      startListening();
    });

    $voiceModeBtn.addEventListener('click', () => {
      setVoiceConversationActive(!voiceConversationActive);
    });
  } else {
    $micBtn.addEventListener('click', () => {
      showError("Brauzeringiz ovozli kiritishni qo'llab-quvvatlamaydi. Chrome brauzerini sinab ko'ring.");
    });
    $voiceModeBtn.addEventListener('click', () => {
      showError("Brauzeringiz ovozli kiritishni qo'llab-quvvatlamaydi. Chrome brauzerini sinab ko'ring.");
    });
  }

  // ================= ISHGA TUSHIRISH =================

  loadSessions();
  checkHealth();
  setInterval(checkHealth, 15000);
})();
