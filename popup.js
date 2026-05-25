function playAlarmSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const times = [0, 0.3, 0.6, 1.2, 1.5, 1.8];
    times.forEach(function(t) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = t < 1 ? 880 : 1100;
      o.type = 'sine';
      g.gain.setValueAtTime(0.5, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.3);
    });
  } catch(e) { console.log('sound error:', e); }
}

function closeEventPopup() {
  const el = document.getElementById('event-popup-overlay');
  if (el) el.remove();
}

function snoozeEventPopup() {
  closeEventPopup();
  const e = window._snoozeEvent;
  const whenStr = window._snoozeWhenStr;
  if (!e) return;
  setTimeout(function() { showEventPopup(e, whenStr); }, 5 * 60 * 1000);
  if (typeof addAlert === 'function') addAlert('info', '스누즈 설정', "'" + e.title + "' 알림이 5분 후 다시 울립니다.");
}

function showEventPopup(e, whenStr) {
  const ex = document.getElementById('event-popup-overlay');
  if (ex) ex.remove();
  playAlarmSound();

  const ov = document.createElement('div');
  ov.id = 'event-popup-overlay';
  ov.style.position = 'fixed';
  ov.style.inset = '0';
  ov.style.background = 'rgba(0,0,0,0.6)';
  ov.style.zIndex = '9998';
  ov.style.display = 'flex';
  ov.style.alignItems = 'center';
  ov.style.justifyContent = 'center';

  const box = document.createElement('div');
  box.style.background = '#ffffff';
  box.style.borderRadius = '16px';
  box.style.padding = '36px 32px';
  box.style.width = '400px';
  box.style.maxWidth = '92vw';
  box.style.textAlign = 'center';
  box.style.boxShadow = '0 24px 64px rgba(0,0,0,0.35)';

  const icon = document.createElement('div');
  icon.style.fontSize = '52px';
  icon.style.marginBottom = '16px';
  icon.textContent = '🔔';

  const label = document.createElement('div');
  label.style.fontSize = '11px';
  label.style.fontWeight = '700';
  label.style.color = '#854F0B';
  label.style.textTransform = 'uppercase';
  label.style.letterSpacing = '.1em';
  label.style.marginBottom = '10px';
  label.textContent = '일정 알림';

  const title = document.createElement('div');
  title.style.fontSize = '24px';
  title.style.fontWeight = '700';
  title.style.color = '#1a1917';
  title.style.marginBottom = '12px';
  title.style.lineHeight = '1.3';
  title.textContent = e.title;

  const when = document.createElement('div');
  when.style.fontSize = '16px';
  when.style.color = '#854F0B';
  when.style.fontWeight = '600';
  when.style.marginBottom = '8px';
  when.textContent = whenStr + ' 시작';

  box.appendChild(icon);
  box.appendChild(label);
  box.appendChild(title);
  box.appendChild(when);

  if (e.time) {
    const dt = document.createElement('div');
    dt.style.fontSize = '14px';
    dt.style.color = '#6b6a66';
    dt.style.marginBottom = '6px';
    dt.textContent = e.date + ' ' + e.time;
    box.appendChild(dt);
  }

  if (e.memo) {
    const memo = document.createElement('div');
    memo.style.fontSize = '13px';
    memo.style.color = '#6b6a66';
    memo.style.background = '#f5f4f0';
    memo.style.borderRadius = '8px';
    memo.style.padding = '10px 14px';
    memo.style.margin = '12px 0';
    memo.textContent = e.memo;
    box.appendChild(memo);
  }

  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.gap = '12px';
  btnRow.style.marginTop = '28px';
  btnRow.style.justifyContent = 'center';

  const snoozeBtn = document.createElement('button');
  snoozeBtn.style.padding = '12px 22px';
  snoozeBtn.style.border = '1.5px solid #d0cfc9';
  snoozeBtn.style.borderRadius = '10px';
  snoozeBtn.style.background = '#f5f4f0';
  snoozeBtn.style.cursor = 'pointer';
  snoozeBtn.style.fontSize = '14px';
  snoozeBtn.style.fontWeight = '500';
  snoozeBtn.textContent = '⏰ 5분 후 다시';
  snoozeBtn.onclick = snoozeEventPopup;

  const okBtn = document.createElement('button');
  okBtn.style.padding = '12px 32px';
  okBtn.style.border = 'none';
  okBtn.style.borderRadius = '10px';
  okBtn.style.background = '#854F0B';
  okBtn.style.color = '#ffffff';
  okBtn.style.cursor = 'pointer';
  okBtn.style.fontSize = '14px';
  okBtn.style.fontWeight = '700';
  okBtn.textContent = '✓ 확인';
  okBtn.onclick = closeEventPopup;

  btnRow.appendChild(snoozeBtn);
  btnRow.appendChild(okBtn);
  box.appendChild(btnRow);
  ov.appendChild(box);
  document.body.appendChild(ov);

  window._snoozeEvent = e;
  window._snoozeWhenStr = whenStr;
  if (!window._snoozeInit) { window._snoozeCount = 0; window._snoozeInit = true; }
}

function resetSnooze() { window._snoozeCount = 0; window._snoozeInit = false; }
