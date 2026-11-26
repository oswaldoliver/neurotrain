import { db } from './db.js';
import { WORKFLOWS, getWorkflow } from './workflows.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
const now = () => new Date().toISOString();
const fmtTs = iso => iso ? new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : '';
const fmtDay = d => d ? new Date(d).toLocaleDateString('de-DE') : '';
const fmtSize = n => n < 1024 ? n + ' B' : n < 1048576 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
const STATUS = { aktiv: 'Aktiv', abgeschlossen: 'Abgeschlossen', archiviert: 'Archiviert' };

const app = $('#app');
const ui = { q: '', filter: 'aktiv' };
let current = null;            // aktuell geöffneter Vorgang
let objectUrls = [];

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.append(t); setTimeout(() => t.remove(), 2200);
}

// ---------- Datenlogik ----------
const allSteps = wf => wf.phases.flatMap(p => p.steps);
function progress(c, list) {
  list ??= allSteps(getWorkflow(c.workflowId));
  const done = list.filter(s => c.steps[s.id]?.done).length;
  return { done, total: list.length, pct: list.length ? Math.round(done / list.length * 100) : 0 };
}
const openRequired = c => allSteps(getWorkflow(c.workflowId)).filter(s => s.required && !c.steps[s.id]?.done);
function log(c, text) { c.log.unshift({ ts: now(), text }); }
async function save(c) { c.updatedAt = now(); await db.put('cases', c); }

let saveTimer;
function saveSoon(c) { clearTimeout(saveTimer); saveTimer = setTimeout(() => save(c), 400); }

// ---------- Router ----------
async function route() {
  objectUrls.forEach(URL.revokeObjectURL); objectUrls = [];
  const [view, id, tab] = location.hash.replace(/^#\/?/, '').split('/');
  window.scrollTo(0, 0);
  if (view === 'neu') return viewNew();
  if (view === 'einstellungen') return viewSettings();
  if (view === 'v' && id) {
    current = await db.get('cases', id);
    if (!current || !getWorkflow(current.workflowId)) { app.innerHTML = '<p class="empty">Vorgang nicht gefunden.</p>'; return; }
    return viewCase(current, tab || 'workflow');
  }
  return viewList();
}
addEventListener('hashchange', route);

// ---------- Liste ----------
async function viewList() {
  const cases = (await db.all('cases')).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const q = ui.q.toLowerCase();
  const shown = cases.filter(c => (ui.filter === 'alle' || c.status === ui.filter) &&
    (!q || [c.title, c.fields.adresse, c.fields.eigentuemer].join(' ').toLowerCase().includes(q)));
  app.innerHTML = `
    <div class="row"><h1>Vorgänge</h1><span class="spacer"></span><span class="muted small">${cases.length} gesamt</span></div>
    <div class="row" style="margin-top:12px">
      <input type="search" id="q" placeholder="Suche: Titel, Adresse, Eigentümer" value="${esc(ui.q)}" style="flex:1;min-width:180px">
      <select id="filter" style="width:auto">
        ${['aktiv', 'abgeschlossen', 'archiviert', 'alle'].map(f => `<option value="${f}" ${f === ui.filter ? 'selected' : ''}>${STATUS[f] || 'Alle'}</option>`).join('')}
      </select>
    </div>
    <div class="list">
      ${shown.map(c => {
        const p = progress(c), wf = getWorkflow(c.workflowId), req = wf ? openRequired(c).length : 0;
        return `<a class="card case" href="#/v/${c.id}">
          <div class="row"><h3>${esc(c.title)}</h3><span class="spacer"></span>
            <span class="pill ${c.status === 'abgeschlossen' ? 'ok' : ''}">${STATUS[c.status]}</span></div>
          <div class="muted small">${esc(c.fields.adresse || '—')} · ${esc(c.fields.eigentuemer || '—')} · ${esc(wf?.short || c.workflowId)}</div>
          <div class="row small muted" style="margin-top:6px"><span>${p.done}/${p.total} Schritte</span>
            ${req ? `<span class="pill warn">${req} Pflicht offen</span>` : ''}
            <span class="spacer"></span><span>${fmtTs(c.updatedAt)}</span></div>
          <div class="bar"><i style="width:${p.pct}%"></i></div></a>`;
      }).join('') || `<div class="empty">Keine Vorgänge. <a href="#/neu">Ersten Vorgang anlegen</a></div>`}
    </div>`;
  $('#q').oninput = e => { ui.q = e.target.value; const pos = e.target.selectionStart; viewList().then(() => { const i = $('#q'); i.focus(); i.setSelectionRange(pos, pos); }); };
  $('#filter').onchange = e => { ui.filter = e.target.value; viewList(); };
}

// ---------- Neu ----------
function viewNew() {
  app.innerHTML = `
    <h1>Neuer Vorgang</h1>
    <form id="nf" class="card" style="display:flex;flex-direction:column;gap:12px;margin-top:12px">
      <label class="f">Titel*<input name="title" required placeholder="z. B. ETW Musterstraße 5, 3. OG"></label>
      <label class="f">Workflow<select name="workflowId">${WORKFLOWS.map(w => `<option value="${w.id}">${esc(w.name)}</option>`).join('')}</select></label>
      <div class="grid">
        <label class="f">Adresse<input name="adresse"></label>
        <label class="f">Eigentümer<input name="eigentuemer"></label>
        <label class="f">Besichtigungstermin<input type="date" name="termin"></label>
      </div>
      <div class="row"><button class="btn primary">Anlegen</button><a href="#/" class="btn ghost">Abbrechen</a></div>
    </form>`;
  $('#nf').onsubmit = async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const c = { id: uid(), title: f.title.trim(), workflowId: f.workflowId, status: 'aktiv', createdAt: now(), updatedAt: now(),
      fields: { adresse: f.adresse, eigentuemer: f.eigentuemer, termin: f.termin }, steps: {}, log: [] };
    log(c, 'Vorgang angelegt');
    await save(c);
    location.hash = `#/v/${c.id}`;
  };
  $('[name=title]').focus();
}

// ---------- Vorgang ----------
async function viewCase(c, tab) {
  const wf = getWorkflow(c.workflowId);
  const files = await db.filesOf(c.id);
  const p = progress(c);
  const tabs = [['workflow', 'Workflow'], ['daten', 'Stammdaten'], ['dateien', `Dateien (${files.length})`], ['verlauf', 'Verlauf'], ['protokoll', 'Protokoll']];
  app.innerHTML = `
    <div class="row noprint"><a href="#/" class="small">← Vorgänge</a></div>
    <div class="row" style="margin-top:8px"><h1>${esc(c.title)}</h1><span class="spacer"></span>
      <span class="pill ${c.status === 'abgeschlossen' ? 'ok' : ''}">${STATUS[c.status]}</span></div>
    <div class="muted small">${esc(wf.name)} · <span id="ptxt">${p.done}/${p.total} Schritte · ${p.pct}%</span></div>
    <div class="bar"><i id="pbar" style="width:${p.pct}%"></i></div>
    <nav class="tabs">${tabs.map(([k, l]) => `<a href="#/v/${c.id}/${k}" ${k === tab ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
    <section id="tab"></section>`;
  const el = $('#tab');
  ({ workflow: tabWorkflow, daten: tabData, dateien: tabFiles, verlauf: tabLog, protokoll: tabProto }[tab] || tabWorkflow)(c, wf, files, el);
}

function inputHtml(def, value, attr) {
  const v = esc(value);
  let h;
  switch (def.input) {
    case 'textarea': h = `<textarea ${attr}>${v}</textarea>`; break;
    case 'select': h = `<select ${attr}><option value="">– wählen –</option>${def.options.map(o => `<option ${o === value ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`; break;
    case 'number': h = `<input type="number" inputmode="decimal" step="any" ${attr} value="${v}">`; break;
    case 'date': h = `<input type="date" ${attr} value="${v}">`; break;
    default: h = `<input type="text" ${attr} value="${v}">`;
  }
  return def.unit ? `<div class="unit">${h}<span>${esc(def.unit)}</span></div>` : h;
}

function tabWorkflow(c, wf, files, el) {
  const fileCount = id => files.filter(f => f.stepId === id).length;
  const firstOpen = wf.phases.find(ph => progress(c, ph.steps).done < ph.steps.length)?.id;
  el.innerHTML = `
    <div class="row noprint" style="margin-bottom:10px">
      <button class="btn sm" data-act="expand">Alle aufklappen</button><button class="btn sm" data-act="collapse">Alle zuklappen</button>
      <span class="spacer"></span><button class="btn sm" data-act="close">${c.status === 'aktiv' ? 'Vorgang abschließen' : 'Wieder öffnen'}</button>
    </div>
    ${wf.phases.map(ph => {
      const pp = progress(c, ph.steps);
      return `<details class="phase ${pp.done === pp.total ? 'complete' : ''}" data-phase="${ph.id}" ${ph.id === firstOpen ? 'open' : ''}>
        <summary>${esc(ph.title)}<span class="count">${pp.done}/${pp.total}</span></summary>
        ${ph.steps.map(s => {
          const st = c.steps[s.id] || {};
          const n = fileCount(s.id);
          return `<div class="step ${st.done ? 'done' : ''} ${s.warn ? 'warn' : ''} ${s.kind === 'rule' ? 'rule' : ''}" data-step="${s.id}">
            <input type="checkbox" data-k="done" ${st.done ? 'checked' : ''} aria-label="${esc(s.label)}">
            <div class="lbl">${esc(s.label)}${s.required ? ' <span class="pill warn">Pflicht</span>' : ''}</div>
            <div class="body">
              ${s.info ? `<div class="info">${esc(s.info)}</div>` : ''}
              ${s.input ? inputHtml(s, st.value, 'data-k="value"') : ''}
              <textarea data-k="note" placeholder="Notiz" ${st.note ? '' : 'hidden'}>${esc(st.note)}</textarea>
              <div class="meta">
                ${st.note ? '' : '<button data-act="note">+ Notiz</button>'}
                ${s.kind === 'rule' ? '' : `<button data-act="attach">📎 Datei${n ? ` (${n})` : ''}</button>`}
                ${st.doneAt ? `<span>erledigt ${fmtTs(st.doneAt)}</span>` : ''}
              </div>
            </div></div>`;
        }).join('')}
      </details>`;
    }).join('')}`;

  const refresh = () => {
    const p = progress(c);
    $('#ptxt').textContent = `${p.done}/${p.total} Schritte · ${p.pct}%`; $('#pbar').style.width = p.pct + '%';
    wf.phases.forEach(ph => {
      const d = el.querySelector(`[data-phase="${ph.id}"]`), pp = progress(c, ph.steps);
      d.querySelector('.count').textContent = `${pp.done}/${pp.total}`;
      d.classList.toggle('complete', pp.done === pp.total);
    });
  };
  const stepOf = t => { const row = t.closest('.step'); return row && { row, def: allSteps(wf).find(s => s.id === row.dataset.step) }; };
  const setDone = (row, def, done) => {
    const st = c.steps[def.id] ??= {};
    st.done = done; st.doneAt = done ? now() : null;
    row.classList.toggle('done', done); row.querySelector('[data-k=done]').checked = done;
    log(c, `${done ? '✓' : '↺'} ${def.label}`);
  };

  el.onchange = e => {
    const s = stepOf(e.target); if (!s) return;
    const k = e.target.dataset.k, st = c.steps[s.def.id] ??= {};
    if (k === 'done') setDone(s.row, s.def, e.target.checked);
    if (k === 'value') {
      st.value = e.target.value;
      if (st.value && !st.done) setDone(s.row, s.def, true);  // Eingabe = erledigt
    }
    if (k === 'note') st.note = e.target.value;
    refresh(); save(c);
  };
  el.oninput = e => {
    const s = stepOf(e.target); if (!s || e.target.type === 'checkbox') return;
    const st = c.steps[s.def.id] ??= {};
    st[e.target.dataset.k] = e.target.value; saveSoon(c);
  };
  el.onclick = async e => {
    const act = e.target.dataset.act; if (!act) return;
    if (act === 'expand' || act === 'collapse') return el.querySelectorAll('details').forEach(d => d.open = act === 'expand');
    if (act === 'close') return toggleClose(c);
    const s = stepOf(e.target);
    if (act === 'note') { const t = s.row.querySelector('[data-k=note]'); t.hidden = false; t.focus(); e.target.remove(); }
    if (act === 'attach') pickFiles(c, s.def.id);
  };
}

async function toggleClose(c) {
  if (c.status === 'aktiv') {
    const open = openRequired(c);
    if (open.length && !confirm(`Noch ${open.length} Pflichtschritt(e) offen:\n\n• ${open.map(s => s.label).join('\n• ')}\n\nTrotzdem abschließen?`)) return;
    c.status = 'abgeschlossen'; log(c, 'Vorgang abgeschlossen');
  } else { c.status = 'aktiv'; log(c, 'Vorgang wieder geöffnet'); }
  await save(c); route();
}

function tabData(c, wf, files, el) {
  el.innerHTML = `
    <form id="df" class="card" style="display:flex;flex-direction:column;gap:12px">
      <label class="f">Titel<input name="__title" value="${esc(c.title)}" required></label>
      <div class="grid">${wf.fields.map(f => `<label class="f">${esc(f.label)}${inputHtml(f, c.fields[f.id], `name="${f.id}"`)}</label>`).join('')}</div>
      <label class="f">Status<select name="__status">${Object.entries(STATUS).map(([k, l]) => `<option value="${k}" ${k === c.status ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="f">Allgemeine Notizen<textarea name="__notes">${esc(c.notes)}</textarea></label>
    </form>
    <h2>Gefahrenzone</h2>
    <button class="btn danger" id="del">Vorgang inkl. Dateien löschen</button>`;
  const form = $('#df');
  const apply = e => {
    const { name, value } = e.target;
    if (e.target.tagName === 'SELECT' && e.type !== 'change') return;
    if (name === '__title') c.title = value.trim() || c.title;
    else if (name === '__status') { c.status = value; log(c, `Status: ${STATUS[value]}`); }
    else if (name === '__notes') c.notes = value;
    else c.fields[name] = value;
    e.type === 'change' ? save(c) : saveSoon(c);
  };
  form.oninput = apply; form.onchange = apply;
  form.onsubmit = e => e.preventDefault();
  $('#del').onclick = async () => {
    if (!confirm(`„${c.title}“ und alle ${files.length} Dateien endgültig löschen?`)) return;
    for (const f of files) await db.del('files', f.id);
    await db.del('cases', c.id); location.hash = '#/';
  };
}

// ---------- Dateien ----------
const picker = $('#filepick');
let pickTarget = null;
function pickFiles(c, stepId = null) { pickTarget = { c, stepId }; picker.value = ''; picker.click(); }
picker.onchange = async () => { if (pickTarget) await addFiles(pickTarget.c, picker.files, pickTarget.stepId); };

async function addFiles(c, list, stepId = null) {
  if (!list?.length) return;
  for (const file of list) {
    await db.put('files', { id: uid(), caseId: c.id, stepId, name: file.name, type: file.type, size: file.size, addedAt: now(), blob: file });
    log(c, `📎 ${file.name}${stepId ? ` → ${allSteps(getWorkflow(c.workflowId)).find(s => s.id === stepId)?.label}` : ''}`);
  }
  await save(c); toast(`${list.length} Datei(en) gespeichert`); route();
}

function tabFiles(c, wf, files, el) {
  const label = id => allSteps(wf).find(s => s.id === id)?.label;
  el.innerHTML = `
    <div class="drop" id="drop">Dateien hierher ziehen oder <u>auswählen</u><br><span class="small">Fotos, PDFs, Dokumente – lokal im Browser gespeichert</span></div>
    <div class="files" style="margin-top:14px">
      ${files.sort((a, b) => b.addedAt.localeCompare(a.addedAt)).map(f => {
        const url = URL.createObjectURL(f.blob); objectUrls.push(url);
        return `<div class="file">
          <a class="thumb" href="${url}" target="_blank" rel="noopener">${f.type.startsWith('image/') ? `<img src="${url}" alt="">` : (f.type === 'application/pdf' ? 'PDF' : '📄')}</a>
          <div class="fi"><strong>${esc(f.name)}</strong>
            <span class="muted">${fmtSize(f.size)} · ${fmtDay(f.addedAt)}</span>
            ${f.stepId ? `<span class="pill">${esc(label(f.stepId) || f.stepId)}</span>` : ''}
            <div class="row"><a class="btn sm" href="${url}" download="${esc(f.name)}">Laden</a><button class="btn sm danger" data-del="${f.id}">Löschen</button></div>
          </div></div>`;
      }).join('')}
    </div>`;
  const drop = $('#drop');
  drop.onclick = () => pickFiles(c);
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = e => { e.preventDefault(); addFiles(c, e.dataTransfer.files); };
  el.onclick = async e => {
    const id = e.target.dataset.del; if (!id) return;
    const f = files.find(x => x.id === id);
    if (!confirm(`„${f.name}“ löschen?`)) return;
    await db.del('files', id); log(c, `🗑 ${f.name}`); await save(c); route();
  };
}

function tabLog(c, wf, files, el) {
  el.innerHTML = `<div class="card"><ul class="log">${c.log.map(l => `<li><time>${fmtTs(l.ts)}</time>${esc(l.text)}</li>`).join('')}</ul></div>`;
}

function tabProto(c, wf, files, el) {
  const fv = (def, v) => !v ? '' : def.input === 'date' ? fmtDay(v) : def.unit ? `${v} ${def.unit}` : v;
  el.innerHTML = `
    <div class="row noprint" style="margin-bottom:12px"><button class="btn primary" onclick="print()">Drucken / PDF</button></div>
    <div class="card proto">
      <h1>Protokoll: ${esc(c.title)}</h1>
      <p class="muted small">Erstellt ${fmtTs(now())} · Workflow: ${esc(wf.name)} · Status: ${STATUS[c.status]}</p>
      <h2>Stammdaten</h2>
      <table>${wf.fields.filter(f => c.fields[f.id]).map(f => `<tr><td colspan="2"><strong>${esc(f.label)}:</strong> ${esc(fv(f, c.fields[f.id]))}</td></tr>`).join('')}</table>
      ${c.notes ? `<p>${esc(c.notes).replace(/\n/g, '<br>')}</p>` : ''}
      ${wf.phases.map(ph => `<h2>${esc(ph.title)}</h2><table>${ph.steps.map(s => {
        const st = c.steps[s.id] || {};
        return `<tr><td>${st.done ? '☑' : '☐'}</td><td>${esc(s.label)}${st.value ? `<br><strong>${esc(fv(s, st.value)).replace(/\n/g, '<br>')}</strong>` : ''}${st.note ? `<br><em>${esc(st.note).replace(/\n/g, '<br>')}</em>` : ''}</td></tr>`;
      }).join('')}</table>`).join('')}
      ${files.length ? `<h2>Dateien</h2><ul>${files.map(f => `<li>${esc(f.name)}</li>`).join('')}</ul>` : ''}
    </div>`;
}

// ---------- Einstellungen / Backup ----------
const toB64 = blob => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });

function viewSettings() {
  app.innerHTML = `
    <h1>Einstellungen</h1>
    <div class="card" style="margin-top:12px">
      <h2 style="margin-top:0">Datensicherung</h2>
      <p class="muted small">Alle Daten liegen nur in diesem Browser auf diesem Gerät. Regelmäßig sichern!</p>
      <div class="row"><button class="btn primary" id="exp">Backup exportieren (JSON)</button>
        <label class="btn">Backup importieren<input type="file" id="imp" accept="application/json" hidden></label></div>
      <p class="muted small" id="storage"></p>
    </div>
    <div class="card" style="margin-top:12px"><h2 style="margin-top:0">Workflows</h2>
      ${WORKFLOWS.map(w => `<p><strong>${esc(w.name)}</strong><br><span class="muted small">${w.phases.length} Phasen · ${allSteps(w).length} Schritte</span></p>`).join('')}
    </div>`;
  navigator.storage?.estimate?.().then(e => { $('#storage').textContent = `Belegt: ${fmtSize(e.usage)} von ca. ${fmtSize(e.quota)}`; });
  $('#exp').onclick = async () => {
    const cases = await db.all('cases');
    const files = await Promise.all((await db.all('files')).map(async f => ({ ...f, blob: await toB64(f.blob) })));
    const blob = new Blob([JSON.stringify({ app: 'makler-workflow', version: 1, exportedAt: now(), cases, files })], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `makler-backup-${now().slice(0, 10)}.json` });
    a.click(); URL.revokeObjectURL(a.href);
  };
  $('#imp').onchange = async e => {
    try {
      const data = JSON.parse(await e.target.files[0].text());
      if (data.app !== 'makler-workflow') throw new Error('Kein gültiges Backup');
      if (!confirm(`${data.cases.length} Vorgänge und ${data.files.length} Dateien importieren? Gleiche Vorgänge werden überschrieben.`)) return;
      for (const c of data.cases) await db.put('cases', c);
      for (const f of data.files) await db.put('files', { ...f, blob: await (await fetch(f.blob)).blob() });
      toast('Import abgeschlossen'); location.hash = '#/';
    } catch (err) { alert('Import fehlgeschlagen: ' + err.message); }
  };
}

navigator.storage?.persist?.();
route();
