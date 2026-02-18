(() => {
  const $ = (id) => document.getElementById(id);

  // ======== CONFIG (mude aqui para testar) ========
  const ALARM_HOUR = 8;     // 08:00
  const ALARM_MINUTE = 0;   // 00
  // Ex teste rápido: ALARM_MINUTE = new Date().getMinutes() + 1;
  // ===============================================

  const pageSize = 10;
  let all = [];
  let view = [];
  let visibleCount = pageSize;

  let currentFilter = 'all';
  let currentQuery = '';

  let currentModalItem = null;
  let redoTargetDia = null;

  const LS_DONE = 'quaresma_done_v1';
  const LS_REDO = 'quaresma_redo_v2';
  const LS_LAST_NOTIF = 'quaresma_last_notif_iso_v1'; // controle diário (evitar spam)

  function loadObj(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); }
    catch { return {}; }
  }
  function saveObj(key, obj) {
    localStorage.setItem(key, JSON.stringify(obj));
  }
  function norm(s='') {
    return (s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  }
  function formatBR(iso) {
    const [y,m,d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function nowHM() {
    const d = new Date();
    return { h: d.getHours(), m: d.getMinutes() };
  }

  function getState(dia) {
    const done = loadObj(LS_DONE);
    const redo = loadObj(LS_REDO);
    if (redo[dia]) return 'redo';
    if (done[dia]) return 'done';
    return 'todo';
  }
  function getRedoDate(dia) {
    const redo = loadObj(LS_REDO);
    return redo[dia] || null;
  }
  function setDone(dia, value) {
    const done = loadObj(LS_DONE);
    const redo = loadObj(LS_REDO);

    if (value) {
      done[dia] = true;
      delete redo[dia];
    } else {
      delete done[dia];
    }

    saveObj(LS_DONE, done);
    saveObj(LS_REDO, redo);
  }
  function setRedoWithDate(dia, isoDate) {
    const done = loadObj(LS_DONE);
    const redo = loadObj(LS_REDO);

    delete done[dia];
    redo[dia] = isoDate;

    saveObj(LS_DONE, done);
    saveObj(LS_REDO, redo);
  }
  function clearRedo(dia) {
    const redo = loadObj(LS_REDO);
    delete redo[dia];
    saveObj(LS_REDO, redo);
  }

  function computeView() {
    const q = norm(currentQuery);

    view = all.filter(item => {
      const hay = norm(`${item.dia} ${item.data} ${item.titulo} ${item.texto_biblico} ${item.descricao}`);
      const matchesQuery = !q || hay.includes(q);

      const st = getState(item.dia);
      const matchesFilter =
        currentFilter === 'all' ||
        (currentFilter === 'todo' && st === 'todo') ||
        (currentFilter === 'done' && st === 'done') ||
        (currentFilter === 'redo' && st === 'redo');

      return matchesQuery && matchesFilter;
    });
  }

  function updateStats() {
    const done = loadObj(LS_DONE);
    const redo = loadObj(LS_REDO);

    const total = all.length;
    const doneCount = Object.keys(done).length;
    const redoCount = Object.keys(redo).length;

    $('statTotal').textContent = String(total);
    $('statDone').textContent = String(doneCount);
    $('statRedo').textContent = String(redoCount);

    const pct = total ? Math.round((doneCount / total) * 100) : 0;
    $('progressBar').style.width = `${pct}%`;
    $('progressText').textContent = `${pct}%`;
  }

  function buildSteps(item) {
    const base = norm(item.descricao || '');
    const hasJejum = base.includes('jejum') || base.includes('abstin');
    const hasOracao = base.includes('oração') || base.includes('oracao') || base.includes('rez');
    const hasCaridade = base.includes('caridade') || base.includes('esmola') || base.includes('ajud');

    const steps = [];
    steps.push(hasOracao ? 'Reze 2 minutos em silêncio, bem simples.' : 'Faça 2 minutos de silêncio e entregue o dia a Deus.');
    steps.push(hasJejum ? 'Pratique um jejum/abstinência possível hoje.' : 'Renuncie a uma distração por 10 minutos (celular, reclamação).');
    steps.push(hasCaridade ? 'Faça um gesto concreto de caridade.' : 'Finalize com gratidão e um ato de bondade (mesmo pequeno).');
    return steps;
  }

  function render() {
    computeView();
    updateStats();

    if (visibleCount < pageSize) visibleCount = pageSize;

    const list = $('list');
    list.innerHTML = '';

    const shown = view.slice(0, visibleCount);

    shown.forEach(item => {
      const st = getState(item.dia);

      const stateClass = st === 'done' ? 'state-done' : st === 'redo' ? 'state-redo' : 'state-todo';
      const badgeClass = st === 'done' ? 'badge-done' : st === 'redo' ? 'badge-redo' : 'badge-todo';

      let badgeText = 'PENDENTE';
      if (st === 'done') badgeText = 'FEITA ✓';
      if (st === 'redo') {
        const rd = getRedoDate(item.dia);
        badgeText = rd ? `REFAZER EM ${formatBR(rd)}` : 'REFAZER';
      }

      const col = document.createElement('div');
      col.className = 'col-12 col-md-6';

      col.innerHTML = `
        <article class="day-card ${stateClass}" data-dia="${item.dia}">
          <div class="day-head">
            <div>
              <h3 class="day-title">${item.titulo}</h3>
              <div class="day-meta">
                <i class="bi bi-calendar-event me-1"></i>${formatBR(item.data)}
                <span class="mx-2">•</span>
                <i class="bi bi-book me-1"></i>${item.texto_biblico || '—'}
              </div>
              <div class="mt-1 badge-state ${badgeClass}">${badgeText}</div>
            </div>
            <div class="pill">${item.dia}</div>
          </div>

          <div class="day-body">
            <div class="day-desc"><i class="bi bi-cross me-1"></i>${item.descricao}</div>
          </div>

          <div class="day-actions">
            <button class="btn btn-dark btn-mini js-done" data-dia="${item.dia}" ${st === 'done' ? 'disabled' : ''}>
              <i class="bi bi-check2-circle me-1"></i> ${st === 'done' ? 'Feita ✓' : 'Marcar feita'}
            </button>

            <button class="btn btn-outline-dark btn-mini js-redo" data-dia="${item.dia}">
              <i class="bi bi-arrow-repeat me-1"></i> ${st === 'redo' ? 'Remover refazer' : 'Refazer'}
            </button>

            <button class="btn btn-outline-dark btn-mini js-open" data-dia="${item.dia}">
              <i class="bi bi-eye me-1"></i> Ver
            </button>
          </div>
        </article>
      `;
      list.appendChild(col);
    });

    const btnMore = $('btnMore');
    if (visibleCount < view.length) {
      btnMore.style.display = 'inline-block';
      const remaining = view.length - visibleCount;
      btnMore.textContent = `Carregar mais ${Math.min(pageSize, remaining)}`;
    } else {
      btnMore.style.display = 'none';
    }
  }

  function setFilterUI(filter) {
    const ids = ['filterAll','filterTodo','filterDone','filterRedo'];
    ids.forEach(id => {
      const b = $(id);
      b.classList.remove('btn-dark');
      b.classList.add('btn-outline-dark');
    });
    const map = { all:'filterAll', todo:'filterTodo', done:'filterDone', redo:'filterRedo' };
    const active = $(map[filter]);
    active.classList.add('btn-dark');
    active.classList.remove('btn-outline-dark');
  }

  function openDayModal(dia) {
    const item = all.find(x => x.dia === dia);
    if (!item) return;

    currentModalItem = item;

    $('modalKicker').textContent = `DIA ${item.dia}`;
    $('modalTitle').textContent = item.titulo;
    $('modalMeta').textContent = `Calendário Quaresma 2026 • Penitência do dia`;

    $('modalDate').textContent = formatBR(item.data);
    $('modalBible').textContent = item.texto_biblico || '—';
    $('modalDesc').textContent = item.descricao;

    const st = getState(item.dia);
    if (st === 'done') $('modalStatus').textContent = 'FEITA ✓';
    else if (st === 'redo') {
      const rd = getRedoDate(item.dia);
      $('modalStatus').textContent = rd ? `REFAZER EM ${formatBR(rd)}` : 'REFAZER';
    } else $('modalStatus').textContent = 'PENDENTE';

    const steps = buildSteps(item);
    $('modalSteps').innerHTML = steps.map(s => `<li>${s}</li>`).join('');

    if (st === 'done') {
      $('modalDone').disabled = true;
      $('modalDone').innerHTML = `<i class="bi bi-check2-circle me-1"></i> Feita ✓`;
    } else {
      $('modalDone').disabled = false;
      $('modalDone').innerHTML = `<i class="bi bi-check2-circle me-1"></i> Marcar feita`;
    }

    $('modalRedo').innerHTML = st === 'redo'
      ? `<i class="bi bi-arrow-repeat me-1"></i> Remover refazer`
      : `<i class="bi bi-arrow-repeat me-1"></i> Refazer`;

    bootstrap.Modal.getOrCreateInstance($('dayModal')).show();
  }

  function openRedoModal(dia) {
    redoTargetDia = dia;

    const item = all.find(x => x.dia === dia);
    if (!item) return;

    $('redoDayLabel').textContent = `DIA ${item.dia} (${formatBR(item.data)})`;

    const input = $('redoDateInput');
    input.value = todayISO();
    input.min = item.data;
    $('redoHint').textContent = `Escolha hoje ou data futura. (mínimo: ${formatBR(item.data)})`;

    bootstrap.Modal.getOrCreateInstance($('redoModal')).show();
  }

  // ===== Export / Import =====
  function exportProgress() {
    const payload = {
      exportedAt: new Date().toISOString(),
      done: localStorage.getItem(LS_DONE) || "{}",
      redo: localStorage.getItem(LS_REDO) || "{}"
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "progresso-quaresma-2026.json";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  function importProgress(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result);
        if (typeof payload.done === "string") localStorage.setItem(LS_DONE, payload.done);
        if (typeof payload.redo === "string") localStorage.setItem(LS_REDO, payload.redo);
        location.reload();
      } catch {
        alert("Arquivo inválido. Envie um JSON exportado pelo Portal Quaresma.");
      }
    };
    reader.readAsText(file);
  }

  // ===== Notificação (PWA best-effort) =====
  function getTodayItem() {
    const today = todayISO();
    // se o seu JSON tem datas do período, tenta achar exatamente a de hoje:
    return all.find(x => x.data === today) || all[0] || null;
  }

  function shouldFireToday() {
    const last = localStorage.getItem(LS_LAST_NOTIF);
    const today = todayISO();
    return last !== today;
  }

  function markFiredToday() {
    localStorage.setItem(LS_LAST_NOTIF, todayISO());
  }

  function inAlarmWindow() {
    const t = nowHM();
    // janela de 30 min após o horário (evita precisar do segundo exato)
    const nowMinutes = t.h * 60 + t.m;
    const alarmMinutes = ALARM_HOUR * 60 + ALARM_MINUTE;
    return nowMinutes >= alarmMinutes && nowMinutes <= alarmMinutes + 30;
  }

  async function fireDailyNotificationBestEffort() {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (!shouldFireToday()) return;
    if (!inAlarmWindow()) return;

    const item = getTodayItem();
    if (!item) return;

    // vibração (se suportado)
    if ("vibrate" in navigator) navigator.vibrate([180, 80, 180]);

    new Notification(`Quaresma • Dia ${item.dia}: ${item.titulo}`, {
      body: item.descricao,
      icon: "./icons/icon-gold-192.png",
      badge: "./icons/badge-96.png"
      // som: PWA não garante som custom; o sistema decide.
    });

    markFiredToday();
  }

  async function enableNotifications() {
    if (!("Notification" in window)) {
      alert("Seu navegador não suporta notificações.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      alert("Permissão negada. Ative nas configurações do navegador.");
      return;
    }
    alert("Notificações ativadas! (No PWA, o disparo em 08:00 é 'best effort'. No APK com Capacitor fica perfeito.)");
    fireDailyNotificationBestEffort();
  }

  function bindEvents() {
    $('search').addEventListener('input', (e) => {
      currentQuery = e.target.value || '';
      visibleCount = pageSize;
      render();
    });

    $('filterAll').addEventListener('click', () => {
      currentFilter = 'all'; visibleCount = pageSize; setFilterUI('all'); render();
    });
    $('filterTodo').addEventListener('click', () => {
      currentFilter = 'todo'; visibleCount = pageSize; setFilterUI('todo'); render();
    });
    $('filterDone').addEventListener('click', () => {
      currentFilter = 'done'; visibleCount = pageSize; setFilterUI('done'); render();
    });
    $('filterRedo').addEventListener('click', () => {
      currentFilter = 'redo'; visibleCount = pageSize; setFilterUI('redo'); render();
    });

    $('btnMore').addEventListener('click', () => {
      visibleCount += pageSize;
      render();
    });

    $('btnResetAll').addEventListener('click', () => {
      if (!confirm('Deseja zerar todas as marcações (feitas/refazer)?')) return;
      localStorage.removeItem(LS_DONE);
      localStorage.removeItem(LS_REDO);
      localStorage.removeItem(LS_LAST_NOTIF);
      visibleCount = pageSize;
      render();
    });

    $('btnExport').addEventListener('click', exportProgress);
    $('btnImport').addEventListener('click', () => $('fileImport').click());
    $('fileImport').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) importProgress(f);
      e.target.value = "";
    });

    $('btnEnableNotif').addEventListener('click', enableNotifications);

    $('list').addEventListener('click', (e) => {
      const doneBtn = e.target.closest('.js-done');
      const redoBtn = e.target.closest('.js-redo');
      const openBtn = e.target.closest('.js-open');
      const card = e.target.closest('.day-card');

      if (doneBtn) {
        const dia = Number(doneBtn.dataset.dia);
        const st = getState(dia);
        if (st === 'done') return;
        setDone(dia, true);
        render();
        return;
      }

      if (redoBtn) {
        const dia = Number(redoBtn.dataset.dia);
        const st = getState(dia);

        if (st === 'redo') {
          clearRedo(dia);
          render();
        } else {
          openRedoModal(dia);
        }
        return;
      }

      if (openBtn) {
        openDayModal(Number(openBtn.dataset.dia));
        return;
      }

      if (card && !e.target.closest('button')) {
        openDayModal(Number(card.dataset.dia));
      }
    });

    $('modalDone').addEventListener('click', () => {
      if (!currentModalItem) return;
      const dia = currentModalItem.dia;
      const st = getState(dia);
      if (st === 'done') return;
      setDone(dia, true);
      render();
      openDayModal(dia);
    });

    $('modalRedo').addEventListener('click', () => {
      if (!currentModalItem) return;
      const dia = currentModalItem.dia;
      const st = getState(dia);

      if (st === 'redo') {
        clearRedo(dia);
        render();
        openDayModal(dia);
      } else {
        bootstrap.Modal.getOrCreateInstance($('dayModal')).hide();
        openRedoModal(dia);
      }
    });

    $('redoConfirmBtn').addEventListener('click', () => {
      if (!redoTargetDia) return;

      const picked = $('redoDateInput').value;
      if (!picked) return alert('Escolha uma data para refazer.');

      const item = all.find(x => x.dia === redoTargetDia);
      if (item && picked < item.data) {
        alert(`A data para refazer não pode ser antes de ${formatBR(item.data)}.`);
        return;
      }

      setRedoWithDate(redoTargetDia, picked);
      redoTargetDia = null;

      bootstrap.Modal.getOrCreateInstance($('redoModal')).hide();
      render();
    });
  }

  async function init() {
    try {
      const res = await fetch('./quaresma.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('Não consegui carregar quaresma.json');
      all = await res.json();
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar o JSON. Verifique se "quaresma.json" está na pasta /docs.');
      return;
    }

    all.sort((a,b) => a.dia - b.dia);

    setFilterUI('all');
    bindEvents();
    visibleCount = pageSize;
    render();

    // tenta disparar notificação (best effort) ao abrir
    fireDailyNotificationBestEffort();

    // e checa a cada 60s enquanto estiver aberto
    setInterval(fireDailyNotificationBestEffort, 60 * 1000);
  }

  init();
})();
