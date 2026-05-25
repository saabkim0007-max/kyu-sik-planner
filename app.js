import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// ★★★ 여기에 Firebase 설정을 입력하세요 ★★★
const firebaseConfig = {
  apiKey: "AIzaSyCn54iAiLh7FEirtptogba5SUQkfTquYrE",
  authDomain: "kyu-sik-s-planner.firebaseapp.com",
  projectId: "kyu-sik-s-planner",
  storageBucket: "kyu-sik-s-planner.firebasestorage.app",
  messagingSenderId: "203411344275",
  appId: "1:203411344275:web:b537d3a270e7be644fb666",
  measurementId: "G-N9SW1ZF9T4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let unsubscribe = null;

const DEFAULT_DATA = {
  tasks: [
    {id:1,name:'기상 및 물 한 잔',time:'06:00',period:'morning',done:false,cat:'건강',memo:''},
    {id:2,name:'명상 10분',time:'06:10',period:'morning',done:false,cat:'자기계발',memo:''},
    {id:3,name:'스트레칭 15분',time:'06:30',period:'morning',done:false,cat:'건강',memo:''},
    {id:4,name:'영어 단어 20개',time:'07:00',period:'morning',done:false,cat:'학습',memo:'단어장 앱 활용'},
    {id:5,name:'업무 우선순위 정리',time:'09:00',period:'daytime',done:false,cat:'업무',memo:''},
    {id:6,name:'점심 후 10분 산책',time:'13:00',period:'daytime',done:false,cat:'건강',memo:''},
    {id:7,name:'독서 30분',time:'20:00',period:'evening',done:false,cat:'학습',memo:''},
    {id:8,name:'일기 쓰기',time:'22:00',period:'evening',done:false,cat:'자기계발',memo:'감사한 일 3가지'},
  ],
  goals: [
    {id:1,name:'하루 물 2L 마시기',period:'daily',target:2,current:0,unit:'L',cat:'건강',deadline:'매일'},
    {id:2,name:'주 5회 운동',period:'weekly',target:5,current:3,unit:'회',cat:'건강',deadline:''},
    {id:3,name:'영어 책 3권 읽기',period:'monthly',target:3,current:1,unit:'권',cat:'학습',deadline:''},
    {id:4,name:'비상금 200만원 모으기',period:'quarterly',target:200,current:76,unit:'만원',cat:'재정',deadline:''},
    {id:5,name:'자격증 2개 취득',period:'yearly',target:2,current:0,unit:'개',cat:'자기계발',deadline:''},
  ],
  alerts: [],
  streak: 0,
  weekHistory: {},
  nextId: 20,
  lastReset: new Date().toDateString(),
};

let state = JSON.parse(JSON.stringify(DEFAULT_DATA));
let currentFilter = 'all';
let currentPeriod = 'all';
let progressTargetId = null;
let editTaskId = null;
let editGoalId = null;

// ── 인증 ──
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch(e) {
    alert('로그인 실패: ' + e.message);
  }
}

export async function signOut() {
  if (unsubscribe) unsubscribe();
  await fbSignOut(auth);
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    document.getElementById('user-info').innerHTML = `<span title="PC 동기화 ID: ${user.uid}" style="cursor:pointer;text-decoration:underline dotted" onclick="navigator.clipboard.writeText('${user.uid}').then(()=>alert('PC 동기화 ID 복사완료!\nPC앱에서 클라우드 동기화 버튼 누르고 붙여넣기 하세요.'))">${user.displayName || user.email} 🔗</span>`;
    document.getElementById('page-login').classList.remove('active');
    document.getElementById('page-today').classList.add('active');
    await loadFromFirebase();
    listenFirebase();
    renderAll();
    setupEvents();
  } else {
    currentUser = null;
    document.getElementById('page-login').classList.add('active');
    document.querySelectorAll('.page:not(#page-login)').forEach(p => p.classList.remove('active'));
  }
});

async function loadFromFirebase() {
  if (!currentUser) return;
  const ref = doc(db, 'users', currentUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const saved = snap.data();
    state = {...DEFAULT_DATA, ...saved};
    const today = new Date().toDateString();
    if (state.lastReset !== today) {
      state.tasks.forEach(t => t.done = false);
      state.lastReset = today;
      await saveData();
    }
  } else {
    state = JSON.parse(JSON.stringify(DEFAULT_DATA));
    await saveData();
  }
}

function listenFirebase() {
  if (!currentUser) return;
  const ref = doc(db, 'users', currentUser.uid);
  unsubscribe = onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const saved = snap.data();
      if (saved.lastSaved !== state.lastSaved) {
        state = {...DEFAULT_DATA, ...saved};
        renderAll();
        const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
        if (activeTab) {
          const renders = {goals:renderGoals,schedule:renderTimeline,stats:renderStats,coach:renderCoach,alerts:renderAlerts,settings:renderSettings};
          if (renders[activeTab]) renders[activeTab]();
        }
      }
    }
  });
}

async function saveData() {
  if (!currentUser) return;
  state.lastSaved = Date.now();
  const ref = doc(db, 'users', currentUser.uid);
  await setDoc(ref, state);
  const el = document.getElementById('save-status');
  if (el) { el.textContent = '저장됨 ✓'; setTimeout(() => el.textContent = '', 2000); }
}

// ── 이벤트 ──
function setupEvents() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  document.querySelectorAll('.sidebar-item[data-filter]').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-item[data-filter]').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      currentFilter = item.dataset.filter;
      renderRoutineSections();
    });
  });
  document.querySelectorAll('.sidebar-item[data-goto]').forEach(item => {
    item.addEventListener('click', () => { switchTab(item.dataset.goto); setPeriod(item.dataset.period); });
  });
  document.querySelectorAll('.period-tag').forEach(tag => {
    tag.addEventListener('click', () => setPeriod(tag.dataset.period));
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id.replace('modal-', ''));
    });
  });
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + tab).classList.add('active');
  const renders = {goals:renderGoals,schedule:renderTimeline,stats:renderStats,coach:renderCoach,alerts:renderAlerts,settings:renderSettings};
  if (renders[tab]) renders[tab]();
}

function renderAll() {
  const now = new Date();
  const days = ['일','월','화','수','목','금','토'];
  const el = document.getElementById('today-date');
  if (el) el.textContent = now.getFullYear()+'년 '+(now.getMonth()+1)+'월 '+now.getDate()+'일 '+days[now.getDay()]+'요일';
  renderWeekGrid();
  renderRoutineSections();
  updateSidebar();
  updateAlertBadge();
}

function renderWeekGrid() {
  const el = document.getElementById('week-grid');
  if (!el) return;
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const dayNames = ['월','화','수','목','금','토','일'];
  let html = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isToday = d.toDateString() === now.toDateString();
    const v = state.weekHistory[i] || 0;
    const dc = v >= 80 ? '#3B6D11' : v >= 50 ? '#854F0B' : v > 0 ? '#A32D2D' : 'rgba(0,0,0,.15)';
    html += '<div class="week-day '+(isToday?'today':'')+'"><div class="week-day-name">'+dayNames[i]+'</div><div class="week-day-num">'+d.getDate()+'</div><div class="week-dots"><span class="week-dot" style="background:'+(isToday?'rgba(255,255,255,.5)':dc)+'"></span><span class="week-dot" style="background:'+(isToday?'rgba(255,255,255,.3)':dc)+'"></span></div></div>';
  }
  el.innerHTML = html;
}

function renderRoutineSections() {
  const el = document.getElementById('routine-sections');
  if (!el) return;
  const periods = currentFilter === 'all' ? ['morning','daytime','evening'] : [currentFilter];
  const info = {
    morning:{label:'아침 루틴',icon:'ti-sunrise',badgeClass:'blue',time:'06:00-09:00'},
    daytime:{label:'낮 루틴',icon:'ti-sun',badgeClass:'amber',time:'09:00-18:00'},
    evening:{label:'저녁 루틴',icon:'ti-moon',badgeClass:'purple',time:'18:00-23:00'},
  };
  const catColor = {건강:'green',학습:'blue',재정:'amber',관계:'coral',자기계발:'purple',업무:'teal',감사은혜:'pink'};
  let html = '';
  periods.forEach(p => {
    const pi = info[p];
    const tasks = state.tasks.filter(t => t.period === p).sort((a,b) => a.time.localeCompare(b.time));
    html += '<div class="section-title"><i class="ti '+pi.icon+'"></i> '+pi.label+' <span class="badge '+pi.badgeClass+'">'+pi.time+'</span></div>';
    if (!tasks.length) {
      html += '<div style="font-size:13px;color:var(--t3);padding:12px 0;text-align:center">이 시간대에 루틴이 없습니다</div>';
    } else {
      tasks.forEach(t => {
        const cc = catColor[t.cat] || 'blue';
        html += '<div class="task-item '+(t.done?'done':'')+'" onclick="toggleTask('+t.id+')">'
          +'<div class="task-check">'+(t.done?'<i class="ti ti-check" style="font-size:10px"></i>':'')+'</div>'
          +'<div class="task-body"><div class="task-name">'+t.name+'</div>'
          +'<div class="task-meta"><span class="badge '+cc+'" style="font-size:10px;padding:1px 6px">'+t.cat+'</span>'+(t.memo?'<span>'+t.memo+'</span>':'')+'</div></div>'
          +'<div class="task-time">'+t.time+'</div>'
          +'<div class="task-actions">'
          +'<button class="btn-icon" onclick="event.stopPropagation();openEditTask('+t.id+')" style="margin-right:2px"><i class="ti ti-edit" style="font-size:14px"></i></button>'
          +'<button class="btn-icon" onclick="event.stopPropagation();deleteTask('+t.id+')"><i class="ti ti-trash" style="font-size:14px"></i></button>'
          +'</div></div>';
      });
    }
  });
  el.innerHTML = html;
  updateProgress();
}

window.toggleTask = function(id) {
  const t = state.tasks.find(t => t.id === id);
  if (t) t.done = !t.done;
  const dayOfWeek = (new Date().getDay() + 6) % 7;
  state.weekHistory[dayOfWeek] = getCompletionPct();
  saveData();
  renderRoutineSections();
  updateSidebar();
};

window.deleteTask = function(id) {
  if (!confirm('이 루틴을 삭제할까요?')) return;
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveData(); renderRoutineSections();
};

window.openEditTask = function(id) {
  editTaskId = id;
  const t = state.tasks.find(t => t.id === id);
  if (!t) return;
  document.getElementById('edit-task-name').value = t.name;
  document.getElementById('edit-task-time').value = t.time;
  document.getElementById('edit-task-memo').value = t.memo || '';
  const s = document.getElementById('edit-task-cat');
  for (let i = 0; i < s.options.length; i++) {
    if (s.options[i].text === t.cat) { s.selectedIndex = i; break; }
  }
  openModal('edit-task');
};

window.saveEditTask = function() {
  if (!editTaskId) return;
  const t = state.tasks.find(t => t.id === editTaskId);
  if (!t) return;
  const name = document.getElementById('edit-task-name').value.trim();
  if (!name) return;
  t.name = name;
  t.time = document.getElementById('edit-task-time').value;
  t.cat = document.getElementById('edit-task-cat').value;
  t.memo = document.getElementById('edit-task-memo').value.trim();
  const h = parseInt(t.time.split(':')[0]);
  t.period = h < 9 ? 'morning' : h < 18 ? 'daytime' : 'evening';
  saveData(); closeModal('edit-task'); renderRoutineSections();
};

window.deleteTaskFromEdit = function() {
  if (!editTaskId || !confirm('삭제할까요?')) return;
  state.tasks = state.tasks.filter(t => t.id !== editTaskId);
  saveData(); closeModal('edit-task'); renderRoutineSections();
};

function getCompletionPct() {
  if (!state.tasks.length) return 0;
  return Math.round(state.tasks.filter(t => t.done).length / state.tasks.length * 100);
}

function updateProgress() {
  const done = state.tasks.filter(t => t.done).length;
  const el = document.getElementById('done-count');
  if (el) el.textContent = done+'/'+state.tasks.length+' 완료';
  updateSidebar();
}

function updateSidebar() {
  const pct = getCompletionPct();
  const p = document.getElementById('sb-pct'); if (p) p.textContent = pct+'%';
  const b = document.getElementById('sb-bar'); if (b) b.style.width = pct+'%';
  const s = document.getElementById('sb-streak'); if (s) s.textContent = (state.streak||0)+'일';
}

// ── 목표 ──
function setPeriod(p) {
  currentPeriod = p;
  document.querySelectorAll('.period-tag').forEach(tag => tag.classList.toggle('active', tag.dataset.period === p));
  renderGoals();
}

function renderGoals() {
  const el = document.getElementById('goals-list');
  if (!el) return;
  const filtered = currentPeriod === 'all' ? state.goals : state.goals.filter(g => g.period === currentPeriod);
  const pl = {daily:'일간',weekly:'주간',monthly:'월간',quarterly:'분기',yearly:'연간'};
  const pc = {daily:'blue',weekly:'teal',monthly:'purple',quarterly:'amber',yearly:'coral'};
  const cf = {blue:'var(--blue)',teal:'var(--teal)',purple:'var(--purple)',amber:'var(--amber)',coral:'var(--coral)'};
  if (!filtered.length) {
    el.innerHTML = '<div style="text-align:center;color:var(--t3);padding:40px;font-size:13px">목표가 없습니다<br><button class="btn-primary" style="margin-top:12px" onclick="openModal(\'goal\')">목표 추가</button></div>';
    return;
  }
  el.innerHTML = filtered.map(g => {
    const pct = Math.min(100, Math.round(g.current/g.target*100));
    const col = pc[g.period] || 'blue';
    const pctCol = pct>=80?'var(--green)':pct>=50?'var(--amber)':'var(--coral)';
    return '<div class="goal-row">'
      +'<div class="goal-header"><div style="flex:1;min-width:0"><span class="badge '+col+'" style="margin-bottom:4px;display:inline-flex">'+pl[g.period]+'</span><div class="goal-name">'+g.name+'</div></div>'
      +'<div class="goal-actions"><span style="font-size:14px;font-weight:500;color:'+pctCol+'">'+pct+'%</span>'
      +'<button class="btn-icon" onclick="openProgress('+g.id+')" title="업데이트"><i class="ti ti-edit" style="font-size:14px"></i></button>'
      +'<button class="btn-icon" onclick="deleteGoal('+g.id+')" title="삭제"><i class="ti ti-trash" style="font-size:14px"></i></button>'
      +'</div></div>'
      +'<div class="goal-sub">'+g.current+' / '+g.target+g.unit+(g.deadline?' · '+g.deadline:'')+'</div>'
      +'<div class="progress-bar" style="height:6px"><div class="progress-fill" style="width:'+pct+'%;background:'+cf[col]+'"></div></div>'
      +'</div>';
  }).join('');
}

window.deleteGoal = function(id) {
  if (!confirm('이 목표를 삭제할까요?')) return;
  state.goals = state.goals.filter(g => g.id !== id);
  saveData(); renderGoals();
};

function renderTimeline() {
  const el = document.getElementById('timeline-list');
  if (!el) return;
  const sorted = state.tasks.slice().sort((a,b) => a.time.localeCompare(b.time));
  const catColor = {건강:'green',학습:'blue',재정:'amber',관계:'coral',자기계발:'purple',업무:'teal',감사은혜:'pink'};
  const pk = {morning:'아침',daytime:'낮',evening:'저녁'};
  el.innerHTML = !sorted.length ? '<div style="text-align:center;color:var(--t3);padding:40px">등록된 루틴이 없습니다</div>'
    : sorted.map((t,i) => '<div class="timeline-block">'
        +'<div class="tl-time">'+t.time+'</div>'
        +'<div class="tl-dot-col"><div class="tl-dot '+(t.done?'done':'')+'"></div>'+(i<sorted.length-1?'<div class="tl-line"></div>':'')+'</div>'
        +'<div class="tl-card"><div class="tl-card-title">'+t.name+(t.done?' <span style="color:var(--green);font-size:11px">완료</span>':'')+'</div>'
        +'<div class="tl-card-sub"><span class="badge '+(catColor[t.cat]||'blue')+'" style="font-size:10px;padding:1px 6px">'+t.cat+'</span> · '+pk[t.period]+(t.memo?' · '+t.memo:'')+'</div></div></div>'
      ).join('');
}

function renderStats() {
  const done = state.tasks.filter(t => t.done).length;
  const todayPct = state.tasks.length ? Math.round(done/state.tasks.length*100) : 0;
  const wv = Object.values(state.weekHistory).filter(v => v > 0);
  const weekAvg = wv.length ? Math.round(wv.reduce((a,b)=>a+b,0)/wv.length) : 0;
  const el = document.getElementById('stat-metrics');
  if (el) el.innerHTML = [
    {label:'오늘 달성률',val:todayPct+'%'},
    {label:'주간 평균',val:weekAvg+'%'},
  ].map(m => '<div class="metric"><div class="metric-label">'+m.label+'</div><div class="metric-val">'+m.val+'</div></div>').join('');
  const cats = ['건강','학습','재정','자기계발','업무','감사은혜'];
  const catFills = {건강:'var(--green)',학습:'var(--blue)',재정:'var(--amber)',자기계발:'var(--purple)',업무:'var(--teal)',감사은혜:'var(--pink)'};
  const cc = document.getElementById('cat-chart');
  if (cc) cc.innerHTML = cats.map(c => {
    const gs = state.goals.filter(g => g.cat === c);
    const v = gs.length ? Math.round(gs.reduce((s,g)=>s+Math.min(100,g.current/g.target*100),0)/gs.length) : 0;
    return '<div class="chart-row"><div class="chart-label">'+c+'</div><div class="chart-bg"><div class="chart-fill" style="width:'+v+'%;background:'+catFills[c]+'"></div></div><div class="chart-val">'+v+'%</div></div>';
  }).join('');
  const dayNames = ['월','화','수','목','금','토','일'];
  const wc = document.getElementById('week-chart');
  if (wc) wc.innerHTML = dayNames.map((d,i) => {
    const v = state.weekHistory[i] || 0;
    return '<div class="chart-row"><div class="chart-label">'+d+'</div><div class="chart-bg"><div class="chart-fill" style="width:'+v+'%;background:var(--blue)"></div></div><div class="chart-val">'+(v?v+'%':'-')+'</div></div>';
  }).join('');
  const pl = {daily:'일간',weekly:'주간',monthly:'월간',quarterly:'분기',yearly:'연간'};
  const pcc = {daily:'blue',weekly:'teal',monthly:'purple',quarterly:'amber',yearly:'coral'};
  const st = document.getElementById('stat-table');
  if (st) st.innerHTML = state.goals.map(g => {
    const pct = Math.min(100,Math.round(g.current/g.target*100));
    const pctCol = pct>=80?'var(--green)':pct>=50?'var(--amber)':'var(--coral)';
    return '<tr><td>'+g.name+'</td><td><span class="badge '+(pcc[g.period]||'blue')+'" style="font-size:10px">'+pl[g.period]+'</span></td><td style="font-weight:500;color:'+pctCol+'">'+pct+'%</td><td style="color:var(--t2)">'+g.current+'/'+g.target+g.unit+'</td><td style="color:var(--t2)">'+(g.deadline||'-')+'</td></tr>';
  }).join('');
}

function renderCoach() {
  const el = document.getElementById('coach-content');
  if (!el) return;
  const pct = getCompletionPct();
  const undone = state.goals.filter(g => g.current/g.target < 1);
  let msg = '안녕하세요! ';
  if (pct===100) msg += '오늘 루틴을 모두 완료하셨어요! 대단합니다! 🎉';
  else if (pct>=60) msg += '오늘 '+pct+'% 달성 중이에요. 조금만 더! 💪';
  else msg += '오늘 루틴을 시작해 보세요!';
  if (state.streak>0) msg += ' <strong>'+state.streak+'일 연속</strong> 달성 중!';
  const strategies = {daily:'오늘 내 달성!',weekly:'이번 주 안에 달성해 보세요.',monthly:'이달 안에 달성해 보세요.',quarterly:'꾸준히 진행해 보세요.',yearly:'지금 시작이 중요합니다.'};
  el.innerHTML = '<div class="coach-box"><div class="coach-header"><div class="coach-avatar"><i class="ti ti-robot"></i></div><div><div class="coach-name">AI 코치</div></div></div><div class="coach-msg">'+msg+'</div>'
    +undone.slice(0,3).map(g=>'<div class="coach-tip"><i class="ti ti-bulb"></i> '+g.name+': '+(strategies[g.period]||'')+'</div>').join('')+'</div>'
    +'<div class="section-title"><i class="ti ti-heart"></i> 독려 메시지</div>'
    +'<div class="encourage-item"><div class="encourage-icon" style="background:var(--coral-bg)"><i class="ti ti-flame" style="color:var(--coral)"></i></div><div style="font-size:13px;line-height:1.55">작은 습관이 모여 큰 변화를 만듭니다. '+(state.streak||0)+'일 연속 달성 중인 당신이 자랑스러워요!</div></div>'
    +'<div class="encourage-item"><div class="encourage-icon" style="background:var(--green-bg)"><i class="ti ti-heart" style="color:var(--green)"></i></div><div style="font-size:13px;line-height:1.55">오늘 하루도 어제보다 조금 더 나은 내가 되고 있습니다!</div></div>';
}

function renderAlerts() {
  const el = document.getElementById('alert-list');
  if (!el) return;
  const ts = {warning:{icon:'ti-alert-triangle',color:'amber'},info:{icon:'ti-info-circle',color:'blue'},danger:{icon:'ti-alert-circle',color:'coral'},success:{icon:'ti-circle-check',color:'green'}};
  const all = [...state.alerts.filter(a=>!a.read),...state.alerts.filter(a=>a.read)];
  el.innerHTML = !all.length ? '<div style="text-align:center;color:var(--t3);padding:40px">알림이 없습니다</div>'
    : all.map(a => {
        const s = ts[a.type]||ts.info;
        return '<div class="notif-item '+(a.read?'read':'')+'"><div class="notif-icon" style="background:var(--'+s.color+'-bg)"><i class="ti '+s.icon+'" style="color:var(--'+s.color+')"></i></div><div class="notif-body"><div class="notif-title">'+a.title+'</div><div class="notif-msg">'+a.msg+'</div><div class="notif-time">'+a.time+'</div></div>'
          +(!a.read?'<button class="btn-outline" style="font-size:11px;align-self:flex-start" onclick="markRead('+a.id+')">읽음</button>':'')+'</div>';
      }).join('');
  updateAlertBadge();
}

function renderSettings() {
  const el = document.getElementById('settings-content');
  if (!el) return;
  const activeTab = window._settingsTab || 's-routine';
  const tabs = [{id:'s-routine',label:'루틴',icon:'ti-layout-list'},{id:'s-goals',label:'목표',icon:'ti-trophy'},{id:'s-general',label:'일반',icon:'ti-settings'}];
  const catColor = {건강:'green',학습:'blue',재정:'amber',관계:'coral',자기계발:'purple',업무:'teal',감사은혜:'pink'};
  const pl = {daily:'일간',weekly:'주간',monthly:'월간',quarterly:'분기',yearly:'연간'};
  const pc = {daily:'blue',weekly:'teal',monthly:'purple',quarterly:'amber',yearly:'coral'};
  let body = '';
  if (activeTab==='s-routine') {
    body = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div style="font-weight:500">루틴 ('+state.tasks.length+'개)</div><button class="btn-primary" onclick="openModal(\'task\')"><i class="ti ti-plus"></i> 추가</button></div>'
      + state.tasks.slice().sort((a,b)=>a.time.localeCompare(b.time)).map(t => {
          const cc = catColor[t.cat]||'blue';
          return '<div class="task-item"><div class="task-body"><div class="task-name">'+t.name+'</div><div class="task-meta"><span class="badge '+cc+'" style="font-size:10px;padding:1px 6px">'+t.cat+'</span> '+t.time+'</div></div><div class="task-actions"><button class="btn-icon" onclick="openEditTask('+t.id+')"><i class="ti ti-edit" style="font-size:14px"></i></button><button class="btn-icon" onclick="deleteTask('+t.id+')"><i class="ti ti-trash" style="font-size:14px"></i></button></div></div>';
        }).join('');
  } else if (activeTab==='s-goals') {
    body = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div style="font-weight:500">목표 ('+state.goals.length+'개)</div><button class="btn-primary" onclick="openModal(\'goal\')"><i class="ti ti-plus"></i> 추가</button></div>'
      + state.goals.map(g => {
          const pct = Math.min(100,Math.round(g.current/g.target*100));
          return '<div class="goal-row"><div class="goal-header"><div style="flex:1"><span class="badge '+(pc[g.period]||'blue')+'" style="font-size:10px">'+pl[g.period]+'</span> <span style="font-weight:500">'+g.name+'</span></div><div class="goal-actions"><span style="font-size:13px;font-weight:500;color:var(--amber)">'+pct+'%</span><button class="btn-icon" onclick="openProgress('+g.id+')"><i class="ti ti-edit" style="font-size:14px"></i></button><button class="btn-icon" onclick="deleteGoal('+g.id+')"><i class="ti ti-trash" style="font-size:14px"></i></button></div></div><div class="goal-sub">'+g.current+'/'+g.target+g.unit+'</div><div class="progress-bar" style="height:5px"><div class="progress-fill" style="width:'+pct+'%;background:var(--blue)"></div></div></div>';
        }).join('');
  } else {
    body = '<div class="card"><div class="card-title">연속 달성일 설정</div><div style="display:flex;gap:8px;margin-top:8px"><input id="streak-input" class="form-input" type="number" value="'+(state.streak||0)+'" min="0" style="width:100px"/><button class="btn-primary" onclick="saveStreak()">저장</button></div></div>'
      +'<div class="card"><div class="card-title" style="color:var(--red)">오늘 루틴 초기화</div><div style="font-size:13px;color:var(--t2);margin:8px 0">오늘 완료 상태를 초기화합니다</div><button class="btn-outline" style="border-color:var(--red);color:var(--red)" onclick="resetTodayTasks()"><i class="ti ti-refresh"></i> 초기화</button></div>'
      +'<div class="card"><div class="card-title">로그인 정보</div><div style="font-size:13px;color:var(--t2);margin-top:8px">'+(currentUser?currentUser.email:'')+'</div><button class="btn-outline" style="margin-top:10px" onclick="signOut()"><i class="ti ti-logout"></i> 로그아웃</button></div>';
  }
  el.innerHTML = '<div class="tag-row" style="margin-bottom:14px">'+tabs.map(t=>'<button class="period-tag '+(activeTab===t.id?'active':'')+'" onclick="window._settingsTab=\''+t.id+'\';renderSettings()"><i class="ti '+t.icon+'" style="font-size:12px;margin-right:3px"></i>'+t.label+'</button>').join('')+'</div>'+body;
}

window.saveStreak = function() {
  const v = parseInt(document.getElementById('streak-input').value)||0;
  state.streak = v; saveData(); updateSidebar(); renderSettings();
};

window.resetTodayTasks = function() {
  if (!confirm('초기화할까요?')) return;
  state.tasks.forEach(t => t.done = false);
  saveData(); renderRoutineSections(); renderSettings();
};

window.markRead = function(id) {
  const a = state.alerts.find(a => a.id===id);
  if (a) { a.read=true; saveData(); }
  renderAlerts();
};

window.clearAlerts = function() {
  state.alerts.forEach(a => a.read=true);
  saveData(); renderAlerts();
};

function addAlert(type, title, msg) {
  state.alerts.unshift({id:state.nextId++,type,title,msg,time:'방금',read:false});
  saveData(); updateAlertBadge();
}

function updateAlertBadge() {
  const badge = document.getElementById('alert-badge');
  if (!badge) return;
  const n = state.alerts.filter(a => !a.read).length;
  badge.textContent = n > 0 ? n : '';
  badge.style.display = n > 0 ? '' : 'none';
}

window.openModal = function(type) {
  document.getElementById('modal-'+type).classList.add('open');
  setTimeout(() => { const el = document.querySelector('#modal-'+type+' .form-input'); if(el) el.focus(); }, 80);
};

window.closeModal = function(type) {
  document.getElementById('modal-'+type).classList.remove('open');
};

window.addTask = function() {
  const name = document.getElementById('task-name').value.trim();
  if (!name) return;
  const time = document.getElementById('task-time').value;
  const h = parseInt(time.split(':')[0]);
  const period = h < 9 ? 'morning' : h < 18 ? 'daytime' : 'evening';
  state.tasks.push({id:state.nextId++,name,time,period,done:false,cat:document.getElementById('task-cat').value,memo:document.getElementById('task-memo').value.trim()});
  saveData(); closeModal('task');
  document.getElementById('task-name').value='';
  document.getElementById('task-memo').value='';
  renderRoutineSections();
  if (document.getElementById('page-settings').classList.contains('active')) renderSettings();
};

window.addGoal = function() {
  const name = document.getElementById('goal-name').value.trim();
  if (!name) return;
  state.goals.push({id:state.nextId++,name,period:document.getElementById('goal-period').value,target:parseFloat(document.getElementById('goal-target').value)||1,current:0,unit:document.getElementById('goal-unit').value.trim()||'개',cat:document.getElementById('goal-cat').value,deadline:document.getElementById('goal-deadline').value});
  saveData(); closeModal('goal');
  ['goal-name','goal-target','goal-unit','goal-deadline'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  renderGoals();
  addAlert('info','새 목표 추가됨','\''+name+'\' 목표가 추가되었습니다!');
};

window.openProgress = function(id) {
  progressTargetId = id;
  const g = state.goals.find(g => g.id===id);
  if (!g) return;
  document.getElementById('progress-goal-name').textContent = g.name;
  document.getElementById('progress-goal-info').textContent = '현재: '+g.current+g.unit+' / 목표: '+g.target+g.unit;
  document.getElementById('progress-val').value = g.current;
  openModal('progress');
};

window.saveProgress = function() {
  if (!progressTargetId) return;
  const g = state.goals.find(g => g.id===progressTargetId);
  if (!g) return;
  const val = parseFloat(document.getElementById('progress-val').value);
  if (isNaN(val)||val<0) return;
  if (val >= g.target && g.current < g.target) addAlert('success','목표 달성! 🎉','\''+g.name+'\' 목표를 달성했습니다!');
  g.current = val;
  saveData(); closeModal('progress');
  renderGoals(); renderStats();
};

window.renderCoach = renderCoach;
window.renderSettings = renderSettings;
window.setPeriod = setPeriod;
window.signOut = signOut;
window.signInWithGoogle = signInWithGoogle;

document.addEventListener('keydown', e => {
  if (e.key==='Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id.replace('modal-','')));
});
