const CONFIG = {
  FREE_MINUTES: 60,
  RATE_PER_HOUR: 20,
  CURRENCY: "฿"
};

let LANG = "th";
let durationTimerInterval = null;

const STR = {
  th: {
    gate_tag: "โซน B2 · G3",
    facility_name: "อาคารเรียนรวม 12",
    zone_line: "ชั้นใต้ดิน B2 · ประตู 3 ฝั่งสนามกีฬา",
    rule_note: "จอดต่อเนื่องได้ไม่เกิน 24 ชม. หากเกินกำหนดติดต่อเจ้าหน้าที่ที่ป้อมชั้น G",
    label_slot: "ช่องจอด",
    headline_home: "สแกน<br>แล้วไป",
    headline_ticket: "บัตร<br>จอดรถ",
    home_sub: "ระบบออกบัตรจอดรถอัตโนมัติ",
    pill_how: "ขั้นตอนการใช้งาน",
    step_scan: "สแกน",
    step_park: "จอดรถ",
    step_exit: "ออก",
    pill_scan: "สแกน QR ด้านล่างที่ทางเข้า",
    awaiting: "รอสแกน",
    ticket_sub: "ระบบออกบัตรจอดรถให้อัตโนมัติ",
    pill_info: "ข้อมูลบัตร",
    pill_status: "สถานะ",
    label_id: "หมายเลขบัตร",
    label_checkin: "เวลาเข้าจอด",
    label_rate: "อัตราค่าจอด",
    live_duration_label: "จอดมาแล้ว",
    status_1: "เข้าจอดแล้ว",
    status_2: "ชำระเงินตอนออก",
    exit_label: "สแกน QR นี้ตอนออกจากลานจอด",
    note: "ขับดีๆ นะ",
    save_ticket_btn: "บันทึกบัตรลงมือถือ",
    rate_note: h => `ชั่วโมงแรกฟรี จากนั้นคิด ${CONFIG.CURRENCY}${h} ต่อชั่วโมง`,
    not_found_title: "ไม่พบข้อมูลบัตร",
    not_found_sub: "ลิงก์นี้ไม่ถูกต้องหรือหมดอายุ",
    back_home: "กลับหน้าแรก",
    staff_link: "สำหรับเจ้าหน้าที่ (สแกนออก) →",
    footer_note: "โปรดเก็บใบนี้ไว้จนกว่าจะออกจากลานจอด"
  },
  en: {
    gate_tag: "ZONE B2 · G3",
    facility_name: "Building 12 Complex",
    zone_line: "Basement B2 · Gate 3, Stadium side",
    rule_note: "Max continuous stay 24 hrs — contact staff at the G-floor booth if exceeded",
    label_slot: "Slot",
    headline_home: "SCAN<br>&amp; GO",
    headline_ticket: "YOUR<br>TICKET",
    home_sub: "AUTOMATIC ENTRY TICKETING",
    pill_how: "HOW IT WORKS",
    step_scan: "SCAN",
    step_park: "PARK",
    step_exit: "EXIT",
    pill_scan: "SCAN THE QR BELOW AT ENTRY",
    awaiting: "Awaiting scan",
    ticket_sub: "AUTO-ISSUED · KEEP UNTIL EXIT",
    pill_info: "TICKET INFO",
    pill_status: "STATUS",
    label_id: "Ticket No.",
    label_checkin: "Check-in time",
    label_rate: "Rate",
    live_duration_label: "Time parked",
    status_1: "Checked in",
    status_2: "Pay on exit",
    exit_label: "SCAN THIS QR WHEN YOU LEAVE",
    note: "Drive safe",
    save_ticket_btn: "Save ticket to phone",
    rate_note: h => `First hour free, then ${CONFIG.CURRENCY}${h} per hour`,
    not_found_title: "Ticket not found",
    not_found_sub: "This link is invalid or expired.",
    back_home: "Back to home",
    staff_link: "Staff exit scanner →",
    footer_note: "Please keep this ticket until you leave the car park"
  }
};

function tr(k, ...args){
  const v = STR[LANG][k];
  return typeof v === "function" ? v(...args) : v;
}

function dtLocale(){ return LANG === "th" ? "th-TH" : "en-GB"; }

function fmtDateTime(ms){
  return new Date(ms).toLocaleString(dtLocale(), {
    day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: false
  });
}

function playDing(){
  try{
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(1318.51, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.09);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.55);
  }catch(e){}
}

function vibrate(p){ try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }

function parseHash(){
  const hash = location.hash.replace(/^#/, "") || "/";
  const [path, qs] = hash.split("?");
  const params = new URLSearchParams(qs || "");
  return { path: path || "/", params };
}

function buildUrl(path, params){
  const qs = new URLSearchParams(params).toString();
  return location.origin + location.pathname + "#" + path + (qs ? "?" + qs : "");
}

function lineItem(label, value){
  return `<div class="li"><span class="lbl">${label}</span><span class="fill"></span><span class="val">${value}</span></div>`;
}

function fmtLiveDuration(t){
  const totalSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = n => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function zigzagSVG(){
  const w=320,h=11,tooth=16,n=Math.ceil(w/tooth);
  let pts=[`0,0`];
  for(let i=0;i<=n;i++){ const x=Math.min(i*tooth,w); const y=(i%2===0)?h:0; pts.push(`${x},${y}`); }
  pts.push(`${w},0`);
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polygon points="${pts.join(' ')}" fill="var(--paper)"></polygon></svg>`;
}

function iconScan(){ return `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h3M20 7V4h-3M4 17v3h3M20 17v3h-3"/></svg>`; }
function iconCar(){ return `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16v-4l2-5h12l2 5v4"/><circle cx="7.5" cy="16.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/></svg>`; }
function iconExit(){ return `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4h5v16h-5M9 12h9M13 8l4 4-4 4"/></svg>`; }
function iconCheck(){ return `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-5"/></svg>`; }
function iconClock(){ return `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`; }

function deriveSlot(id){
  let sum = 0;
  for(const ch of id) sum += ch.charCodeAt(0);
  const row = String.fromCharCode(65 + (sum % 6)); // A-F
  const num = (sum % 24) + 1;
  return `B2-${row}${num}`;
}

function render(){
  const { path, params } = parseHash();
  const view = document.getElementById("view");
  view.innerHTML = "";
  if(durationTimerInterval){ clearInterval(durationTimerInterval); durationTimerInterval = null; }

  if(path === "/") renderHome(view);
  else if(path === "/checkin") handleCheckin();
  else if(path === "/ticket") renderTicket(view, params);
  else renderNotFound(view);
}

function renderHome(view){
  view.innerHTML = `
    <div class="fade-in">
      <div class="ticket stagger">
        <div class="head-row">
          <div class="head-brand">
            <div class="head-name">SMART PARKING</div>
            <div class="head-loc">${tr('facility_name')}</div>
          </div>
          <div class="head-tag">${tr('gate_tag')}</div>
        </div>
        <p class="headline">${tr('headline_home')}</p>
        <p class="sub-caps">${tr('home_sub')}</p>
        <p class="rule-note">${tr('zone_line')} — ${tr('rule_note')}</p>
        <div class="pill">${tr('pill_how')}</div>
        <div class="steps">
          <div class="step">${iconScan()}<div class="step-label">${tr('step_scan')}</div></div>
          <div class="step">${iconCar()}<div class="step-label">${tr('step_park')}</div></div>
          <div class="step">${iconExit()}<div class="step-label">${tr('step_exit')}</div></div>
        </div>
        <div class="divider"></div>
        <p class="sub-caps" style="margin-bottom:8px;">${tr('pill_scan')}</p>
        <div class="qr-block centered">
          <div class="qr-wrap qr-bounce" id="qrcode"></div>
          <p class="footer-note" style="margin-bottom:0;">${tr('awaiting')}</p>
        </div>
      </div>
      <div class="zig">${zigzagSVG()}</div>
    </div>
    <a class="staff-link" href="exit-scan.html">${tr('staff_link')}</a>
  `;
  const url = buildUrl("/checkin", {});
  new QRCode(document.getElementById("qrcode"), { text: url, width: 156, height: 156, correctLevel: QRCode.CorrectLevel.M });
}

function handleCheckin(){
  let ticketId = "";
  try {
    if(window.pyscript && pyscript.interpreter && pyscript.interpreter.globals){
      const pyGen = pyscript.interpreter.globals.get('gen_ticket_id_py');
      ticketId = pyGen();
    }
  } catch(e) {}

  if(!ticketId){
    const randSuffix = Math.random().toString(36).slice(2, 4).toUpperCase();
    ticketId = "P-" + Date.now().toString(36).toUpperCase().slice(-6) + randSuffix;
  }

  const t = Date.now();
  location.replace(buildUrl("/ticket", { id: ticketId, t }));
}

function renderTicket(view, params){
  const id = params.get("id");
  const t = Number(params.get("t"));
  if(!id || !t) return renderNotFound(view);

  view.innerHTML = `
    <div class="issue-in">
      <div class="ticket stagger" id="ticketCard">
        <div class="head-row">
          <div class="head-brand">
            <div class="head-name">SMART PARKING</div>
            <div class="head-loc">${tr('facility_name')}</div>
          </div>
          <div class="head-tag">${tr('gate_tag')}</div>
        </div>
        <p class="headline">${tr('headline_ticket')}</p>
        <p class="sub-caps">${tr('ticket_sub')}</p>
        <p class="rule-note">${tr('zone_line')}</p>

        <div class="slot-row">
          <span class="slot-lbl">${tr('label_slot')}</span>
          <span class="slot-val">${deriveSlot(id)}</span>
        </div>

        <div class="section">
          <div class="pill">${tr('pill_info')}</div>
          ${lineItem(tr('label_id'), id)}
          ${lineItem(tr('label_checkin'), fmtDateTime(t))}
          ${lineItem(tr('label_rate'), `<span style="font-family:Arial,Helvetica,sans-serif;">${CONFIG.CURRENCY}</span>${CONFIG.RATE_PER_HOUR}/hr`)}
          <div class="live-duration">
            <span class="lbl">${tr('live_duration_label')}</span>
            <span class="val" id="liveDuration">${fmtLiveDuration(t)}</span>
          </div>
        </div>
        <div class="section">
          <div class="pill">${tr('pill_status')}</div>
          <div class="status-row">${iconCheck()}<span>${tr('status_1')}</span></div>
          <div class="status-row">${iconClock()}<span>${tr('status_2')}</span></div>
        </div>

        <div class="divider"></div>
        <p class="sub-caps" style="margin-bottom:8px;">${tr('exit_label')}</p>
        <div class="qr-block split">
          <div class="qr-wrap qr-bounce" id="qrcode"></div>
          <div class="qr-text">
            <p class="note">${tr('note')}</p>
            <p class="footer-note">${tr('footer_note')}</p>
          </div>
        </div>
      </div>
      <div class="zig">${zigzagSVG()}</div>
    </div>
    <button class="btn no-print" id="saveBtn">${tr('save_ticket_btn')}</button>
    <p class="rate-note">${tr('rate_note', CONFIG.RATE_PER_HOUR)}</p>
  `;

  const checkoutUrl = buildUrl("/checkout", { id, t });
  new QRCode(document.getElementById("qrcode"), { text: checkoutUrl, width: 140, height: 140, correctLevel: QRCode.CorrectLevel.M });

  const liveDurationEl = document.getElementById("liveDuration");
  if(liveDurationEl){
    durationTimerInterval = setInterval(() => {
      const el = document.getElementById("liveDuration");
      if(!el){ clearInterval(durationTimerInterval); durationTimerInterval = null; return; }
      el.textContent = fmtLiveDuration(t);
    }, 1000);
  }

  playDing();
  vibrate(60);

  document.getElementById("saveBtn").onclick = async () => {
    const btn = document.getElementById("saveBtn");
    const originalLabel = btn.textContent;
    btn.disabled = true;
    const targetCard = document.getElementById("ticketCard");
    targetCard.classList.remove("stagger");
    targetCard.querySelectorAll(".qr-bounce").forEach(el => {
      el.classList.remove("qr-bounce");
      el.style.animation = "none";
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    try{
      if(document.fonts && document.fonts.ready){ await document.fonts.ready; }
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const cardRect = targetCard.getBoundingClientRect();
      const qrEl = document.querySelector("#qrcode canvas, #qrcode img");
      let qrDataUrl = null, qrOffsetX = 0, qrOffsetY = 0, qrW = 0, qrH = 0;
      if(qrEl){
        const qrRect = qrEl.getBoundingClientRect();
        qrOffsetX = qrRect.left - cardRect.left;
        qrOffsetY = qrRect.top - cardRect.top;
        qrW = qrRect.width;
        qrH = qrRect.height;
        qrDataUrl = qrEl.tagName === "CANVAS" ? qrEl.toDataURL("image/png") : qrEl.src;
      }

      const paperColor = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim() || "#fbf9f3";
      const canvas = await html2canvas(targetCard, { backgroundColor: paperColor, scale: 2, useCORS: true, logging: false });

      if(qrDataUrl){
        const scale = canvas.width / targetCard.offsetWidth;
        const qrImg = new Image();
        qrImg.src = qrDataUrl;
        await new Promise(res => { qrImg.onload = res; qrImg.onerror = res; });
        const ctx = canvas.getContext("2d");
        ctx.drawImage(qrImg, qrOffsetX * scale, qrOffsetY * scale, qrW * scale, qrH * scale);
      }
      const link = document.createElement("a");
      link.download = "parking-ticket-" + id + ".png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  };
}

function renderNotFound(view){
  view.innerHTML = `
    <div class="fade-in">
      <div class="ticket error">
        <div class="head-row">
          <div class="head-brand">
            <div class="head-name">SMART PARKING</div>
          </div>
        </div>
        <p class="headline">${tr('not_found_title')}</p>
        <p class="sub-caps" style="text-transform:none; letter-spacing:normal; font-weight:500;">${tr('not_found_sub')}</p>
        <a class="btn ghost" href="#/">${tr('back_home')}</a>
      </div>
      <div class="zig">${zigzagSVG()}</div>
    </div>
  `;
}

window.addEventListener("hashchange", render);

function loadPyscriptDeferred(){
  if(document.querySelector('script[src*="pyscript"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://pyscript.net/releases/2024.1.1/core.css";
  document.head.appendChild(link);

  const coreScript = document.createElement("script");
  coreScript.type = "module";
  coreScript.src = "https://pyscript.net/releases/2024.1.1/core.js";
  document.head.appendChild(coreScript);

  const pyScript = document.createElement("script");
  pyScript.type = "py";
  pyScript.src = "script.py";
  pyScript.setAttribute("config", '{"packages":[]}');
  document.body.appendChild(pyScript);
}

window.addEventListener("DOMContentLoaded", () => {
  const langLabel = document.getElementById("langLabel");
  const langToggle = document.getElementById("langToggle");
  if(langToggle){
    langToggle.onclick = () => {
      LANG = LANG === "th" ? "en" : "th";
      if(langLabel) langLabel.textContent = LANG === "th" ? "EN" : "TH";
      render();
    };
  }

  const themeToggle = document.getElementById("themeToggle");
  const themeIcon = document.getElementById("themeIcon");
  const syncThemeIcon = () => {
    if(themeIcon) themeIcon.textContent = document.documentElement.getAttribute("data-theme") === "dark" ? "🔆" : "🌙";
  };
  syncThemeIcon();
  if(themeToggle){
    themeToggle.onclick = () => {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      if(isDark){
        document.documentElement.removeAttribute("data-theme");
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
      }
      syncThemeIcon();
      try{ localStorage.setItem("sp-theme", isDark ? "light" : "dark"); }catch(e){}
    };
  }

  if(!location.hash) location.hash = "/";
  render();

  // Load PyScript only after the first view has painted and settled, so its
  // heavy Pyodide download/init doesn't compete with the entrance animations
  // for the main thread on a cold mobile load. handleCheckin() already falls
  // back to a plain-JS ticket ID generator if PyScript isn't ready yet.
  const startPyscript = () => setTimeout(loadPyscriptDeferred, 1200);
  if("requestIdleCallback" in window){
    requestIdleCallback(startPyscript, { timeout: 3000 });
  } else {
    window.addEventListener("load", startPyscript, { once: true });
  }
});
