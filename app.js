import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// ?끸쁾???ш린??Firebase ?ㅼ젙???낅젰?섏꽭???끸쁾??const firebaseConfig = {
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
    {id:1,name:'湲곗긽 諛?臾?????,time:'06:00',period:'morning',done:false,cat:'嫄닿컯',memo:''},
    {id:2,name:'紐낆긽 10遺?,time:'06:10',period:'morning',done:false,cat:'?먭린怨꾨컻',memo:''},
    {id:3,name:'?ㅽ듃?덉묶 15遺?,time:'06:30',period:'morning',done:false,cat:'嫄닿컯',memo:''},
    {id:4,name:'?곸뼱 ?⑥뼱 20媛?,time:'07:00',period:'morning',done:false,cat:'?숈뒿',memo:'?⑥뼱?????쒖슜'},
    {id:5,name:'?낅Т ?곗꽑?쒖쐞 ?뺣━',time:'09:00',period:'daytime',done:false,cat:'?낅Т',memo:''},
    {id:6,name:'?먯떖 ??10遺??곗콉',time:'13:00',period:'daytime',done:false,cat:'嫄닿컯',memo:''},
    {id:7,name:'?낆꽌 30遺?,time:'20:00',period:'evening',done:false,cat:'?숈뒿',memo:''},
    {id:8,name:'?쇨린 ?곌린',time:'22:00',period:'evening',done:false,cat:'?먭린怨꾨컻',memo:'媛먯궗????3媛吏'},
  ],
  goals: [
    {id:1,name:'?섎（ 臾?2L 留덉떆湲?,period:'daily',target:2,current:0,unit:'L',cat:'嫄닿컯',deadline:'留ㅼ씪'},
    {id:2,name:'二?5???대룞',period:'weekly',target:5,current:3,unit:'??,cat:'嫄닿컯',deadline:''},
    {id:3,name:'?곸뼱 梨?3沅??쎄린',period:'monthly',target:3,current:1,unit:'沅?,cat:'?숈뒿',deadline:''},
    {id:4,name:'鍮꾩긽湲?200留뚯썝 紐⑥쑝湲?,period:'quarterly',target:200,current:76,unit:'留뚯썝',cat:'?ъ젙',deadline:''},
    {id:5,name:'?먭꺽利?2媛?痍⑤뱷',period:'yearly',target:2,current:0,unit:'媛?,cat:'?먭린怨꾨컻',deadline:''},
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

// ?? ?몄쬆 ??
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch(e) {
    alert('濡쒓렇???ㅽ뙣: ' + e.message);
  }
}

export async function signOut() {
  if (unsubscribe) unsubscribe();
  await fbSignOut(auth);
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    document.getElementById('user-info').textContent = user.displayName || user.email;
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
  if (el) { el.textContent = '??λ맖 ??; setTimeout(() => el.textContent = '', 2000); }
}

// ?? ?대깽????
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
  const days = ['??,'??,'??,'??,'紐?,'湲?,'??];
  const el = document.getElementById('today-date');
  if (el) el.textContent = now.getFullYear()+'??'+(now.getMonth()+1)+'??'+now.getDate()+'??'+days[now.getDay()]+'?붿씪';
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
  const dayNames = ['??,'??,'??,'紐?,'湲?,'??,'??];
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
    morning:{label:'?꾩묠 猷⑦떞',icon:'ti-sunrise',badgeClass:'blue',time:'06:00-09:00'},
    daytime:{label:'??猷⑦떞',icon:'ti-sun',badgeClass:'amber',time:'09:00-18:00'},
    evening:{label:'???猷⑦떞',icon:'ti-moon',badgeClass:'purple',time:'18:00-23:00'},
  };
  const catColor = {嫄닿컯:'green',?숈뒿:'blue',?ъ젙:'amber',愿怨?'coral',?먭린怨꾨컻:'purple',?낅Т:'teal',媛먯궗???'pink'};
  let html = '';
  periods.forEach(p => {
    const pi = info[p];
    const tasks = state.tasks.filter(t => t.period === p).sort((a,b) => a.time.localeCompare(b.time));
    html += '<div class="section-title"><i class="ti '+pi.icon+'"></i> '+pi.label+' <span class="badge '+pi.badgeClass+'">'+pi.time+'</span></div>';
    if (!tasks.length) {
      html += '<div style="font-size:13px;color:var(--t3);padding:12px 0;text-align:center">???쒓컙???猷⑦떞???놁뒿?덈떎</div>';
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
  if (!confirm('??猷⑦떞????젣?좉퉴??')) return;
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
  if (!editTaskId || !confirm('??젣?좉퉴??')) return;
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
  if (el) el.textContent = done+'/'+state.tasks.length+' ?꾨즺';
  updateSidebar();
}

function updateSidebar() {
  const pct = getCompletionPct();
  const p = document.getElementById('sb-pct'); if (p) p.textContent = pct+'%';
  const b = document.getElementById('sb-bar'); if (b) b.style.width = pct+'%';
  const s = document.getElementById('sb-streak'); if (s) s.textContent = (state.streak||0)+'??;
}

// ?? 紐⑺몴 ??
function setPeriod(p) {
  currentPeriod = p;
  document.querySelectorAll('.period-tag').forEach(tag => tag.classList.toggle('active', tag.dataset.period === p));
  renderGoals();
}

function renderGoals() {
  const el = document.getElementById('goals-list');
  if (!el) return;
  const filtered = currentPeriod === 'all' ? state.goals : state.goals.filter(g => g.period === currentPeriod);
  const pl = {daily:'?쇨컙',weekly:'二쇨컙',monthly:'?붽컙',quarterly:'遺꾧린',yearly:'?곌컙'};
  const pc = {daily:'blue',weekly:'teal',monthly:'purple',quarterly:'amber',yearly:'coral'};
  const cf = {blue:'var(--blue)',teal:'var(--teal)',purple:'var(--purple)',amber:'var(--amber)',coral:'var(--coral)'};
  if (!filtered.length) {
    el.innerHTML = '<div style="text-align:center;color:var(--t3);padding:40px;font-size:13px">紐⑺몴媛 ?놁뒿?덈떎<br><button class="btn-primary" style="margin-top:12px" onclick="openModal(\'goal\')">紐⑺몴 異붽?</button></div>';
    return;
  }
  el.innerHTML = filtered.map(g => {
    const pct = Math.min(100, Math.round(g.current/g.target*100));
    const col = pc[g.period] || 'blue';
    const pctCol = pct>=80?'var(--green)':pct>=50?'var(--amber)':'var(--coral)';
    return '<div class="goal-row">'
      +'<div class="goal-header"><div style="flex:1;min-width:0"><span class="badge '+col+'" style="margin-bottom:4px;display:inline-flex">'+pl[g.period]+'</span><div class="goal-name">'+g.name+'</div></div>'
      +'<div class="goal-actions"><span style="font-size:14px;font-weight:500;color:'+pctCol+'">'+pct+'%</span>'
      +'<button class="btn-icon" onclick="openProgress('+g.id+')" title="?낅뜲?댄듃"><i class="ti ti-edit" style="font-size:14px"></i></button>'
      +'<button class="btn-icon" onclick="deleteGoal('+g.id+')" title="??젣"><i class="ti ti-trash" style="font-size:14px"></i></button>'
      +'</div></div>'
      +'<div class="goal-sub">'+g.current+' / '+g.target+g.unit+(g.deadline?' 쨌 '+g.deadline:'')+'</div>'
      +'<div class="progress-bar" style="height:6px"><div class="progress-fill" style="width:'+pct+'%;background:'+cf[col]+'"></div></div>'
      +'</div>';
  }).join('');
}

window.deleteGoal = function(id) {
  if (!confirm('??紐⑺몴瑜???젣?좉퉴??')) return;
  state.goals = state.goals.filter(g => g.id !== id);
  saveData(); renderGoals();
};

function renderTimeline() {
  const el = document.getElementById('timeline-list');
  if (!el) return;
  const sorted = state.tasks.slice().sort((a,b) => a.time.localeCompare(b.time));
  const catColor = {嫄닿컯:'green',?숈뒿:'blue',?ъ젙:'amber',愿怨?'coral',?먭린怨꾨컻:'purple',?낅Т:'teal',媛먯궗???'pink'};
  const pk = {morning:'?꾩묠',daytime:'??,evening:'???};
  el.innerHTML = !sorted.length ? '<div style="text-align:center;color:var(--t3);padding:40px">?깅줉??猷⑦떞???놁뒿?덈떎</div>'
    : sorted.map((t,i) => '<div class="timeline-block">'
        +'<div class="tl-time">'+t.time+'</div>'
        +'<div class="tl-dot-col"><div class="tl-dot '+(t.done?'done':'')+'"></div>'+(i<sorted.length-1?'<div class="tl-line"></div>':'')+'</div>'
        +'<div class="tl-card"><div class="tl-card-title">'+t.name+(t.done?' <span style="color:var(--green);font-size:11px">?꾨즺</span>':'')+'</div>'
        +'<div class="tl-card-sub"><span class="badge '+(catColor[t.cat]||'blue')+'" style="font-size:10px;padding:1px 6px">'+t.cat+'</span> 쨌 '+pk[t.period]+(t.memo?' 쨌 '+t.memo:'')+'</div></div></div>'
      ).join('');
}

function renderStats() {
  const done = state.tasks.filter(t => t.done).length;
  const todayPct = state.tasks.length ? Math.round(done/state.tasks.length*100) : 0;
  const wv = Object.values(state.weekHistory).filter(v => v > 0);
  const weekAvg = wv.length ? Math.round(wv.reduce((a,b)=>a+b,0)/wv.length) : 0;
  const el = document.getElementById('stat-metrics');
  if (el) el.innerHTML = [
    {label:'?ㅻ뒛 ?ъ꽦瑜?,val:todayPct+'%'},
    {label:'二쇨컙 ?됯퇏',val:weekAvg+'%'},
  ].map(m => '<div class="metric"><div class="metric-label">'+m.label+'</div><div class="metric-val">'+m.val+'</div></div>').join('');
  const cats = ['嫄닿컯','?숈뒿','?ъ젙','?먭린怨꾨컻','?낅Т','媛먯궗???];
  const catFills = {嫄닿컯:'var(--green)',?숈뒿:'var(--blue)',?ъ젙:'var(--amber)',?먭린怨꾨컻:'var(--purple)',?낅Т:'var(--teal)',媛먯궗???'var(--pink)'};
  const cc = document.getElementById('cat-chart');
  if (cc) cc.innerHTML = cats.map(c => {
    const gs = state.goals.filter(g => g.cat === c);
    const v = gs.length ? Math.round(gs.reduce((s,g)=>s+Math.min(100,g.current/g.target*100),0)/gs.length) : 0;
    return '<div class="chart-row"><div class="chart-label">'+c+'</div><div class="chart-bg"><div class="chart-fill" style="width:'+v+'%;background:'+catFills[c]+'"></div></div><div class="chart-val">'+v+'%</div></div>';
  }).join('');
  const dayNames = ['??,'??,'??,'紐?,'湲?,'??,'??];
  const wc = document.getElementById('week-chart');
  if (wc) wc.innerHTML = dayNames.map((d,i) => {
    const v = state.weekHistory[i] || 0;
    return '<div class="chart-row"><div class="chart-label">'+d+'</div><div class="chart-bg"><div class="chart-fill" style="width:'+v+'%;background:var(--blue)"></div></div><div class="chart-val">'+(v?v+'%':'-')+'</div></div>';
  }).join('');
  const pl = {daily:'?쇨컙',weekly:'二쇨컙',monthly:'?붽컙',quarterly:'遺꾧린',yearly:'?곌컙'};
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
  let msg = '?덈뀞?섏꽭?? ';
  if (pct===100) msg += '?ㅻ뒛 猷⑦떞??紐⑤몢 ?꾨즺?섏뀲?댁슂! ??⑦빀?덈떎! ?럦';
  else if (pct>=60) msg += '?ㅻ뒛 '+pct+'% ?ъ꽦 以묒씠?먯슂. 議곌툑留??? ?뮞';
  else msg += '?ㅻ뒛 猷⑦떞???쒖옉??蹂댁꽭??';
  if (state.streak>0) msg += ' <strong>'+state.streak+'???곗냽</strong> ?ъ꽦 以?';
  const strategies = {daily:'?ㅻ뒛 ???ъ꽦!',weekly:'?대쾲 二??덉뿉 ?ъ꽦??蹂댁꽭??',monthly:'?대떖 ?덉뿉 ?ъ꽦??蹂댁꽭??',quarterly:'袁몄???吏꾪뻾??蹂댁꽭??',yearly:'吏湲??쒖옉??以묒슂?⑸땲??'};
  el.innerHTML = '<div class="coach-box"><div class="coach-header"><div class="coach-avatar"><i class="ti ti-robot"></i></div><div><div class="coach-name">AI 肄붿튂</div></div></div><div class="coach-msg">'+msg+'</div>'
    +undone.slice(0,3).map(g=>'<div class="coach-tip"><i class="ti ti-bulb"></i> '+g.name+': '+(strategies[g.period]||'')+'</div>').join('')+'</div>'
    +'<div class="section-title"><i class="ti ti-heart"></i> ?낅젮 硫붿떆吏</div>'
    +'<div class="encourage-item"><div class="encourage-icon" style="background:var(--coral-bg)"><i class="ti ti-flame" style="color:var(--coral)"></i></div><div style="font-size:13px;line-height:1.55">?묒? ?듦???紐⑥뿬 ??蹂?붾? 留뚮벊?덈떎. '+(state.streak||0)+'???곗냽 ?ъ꽦 以묒씤 ?뱀떊???먮옉?ㅻ윭?뚯슂!</div></div>'
    +'<div class="encourage-item"><div class="encourage-icon" style="background:var(--green-bg)"><i class="ti ti-heart" style="color:var(--green)"></i></div><div style="font-size:13px;line-height:1.55">?ㅻ뒛 ?섎（???댁젣蹂대떎 議곌툑 ???섏? ?닿? ?섍퀬 ?덉뒿?덈떎!</div></div>';
}

function renderAlerts() {
  const el = document.getElementById('alert-list');
  if (!el) return;
  const ts = {warning:{icon:'ti-alert-triangle',color:'amber'},info:{icon:'ti-info-circle',color:'blue'},danger:{icon:'ti-alert-circle',color:'coral'},success:{icon:'ti-circle-check',color:'green'}};
  const all = [...state.alerts.filter(a=>!a.read),...state.alerts.filter(a=>a.read)];
  el.innerHTML = !all.length ? '<div style="text-align:center;color:var(--t3);padding:40px">?뚮┝???놁뒿?덈떎</div>'
    : all.map(a => {
        const s = ts[a.type]||ts.info;
        return '<div class="notif-item '+(a.read?'read':'')+'"><div class="notif-icon" style="background:var(--'+s.color+'-bg)"><i class="ti '+s.icon+'" style="color:var(--'+s.color+')"></i></div><div class="notif-body"><div class="notif-title">'+a.title+'</div><div class="notif-msg">'+a.msg+'</div><div class="notif-time">'+a.time+'</div></div>'
          +(!a.read?'<button class="btn-outline" style="font-size:11px;align-self:flex-start" onclick="markRead('+a.id+')">?쎌쓬</button>':'')+'</div>';
      }).join('');
  updateAlertBadge();
}

function renderSettings() {
  const el = document.getElementById('settings-content');
  if (!el) return;
  const activeTab = window._settingsTab || 's-routine';
  const tabs = [{id:'s-routine',label:'猷⑦떞',icon:'ti-layout-list'},{id:'s-goals',label:'紐⑺몴',icon:'ti-trophy'},{id:'s-general',label:'?쇰컲',icon:'ti-settings'}];
  const catColor = {嫄닿컯:'green',?숈뒿:'blue',?ъ젙:'amber',愿怨?'coral',?먭린怨꾨컻:'purple',?낅Т:'teal',媛먯궗???'pink'};
  const pl = {daily:'?쇨컙',weekly:'二쇨컙',monthly:'?붽컙',quarterly:'遺꾧린',yearly:'?곌컙'};
  const pc = {daily:'blue',weekly:'teal',monthly:'purple',quarterly:'amber',yearly:'coral'};
  let body = '';
  if (activeTab==='s-routine') {
    body = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div style="font-weight:500">猷⑦떞 ('+state.tasks.length+'媛?</div><button class="btn-primary" onclick="openModal(\'task\')"><i class="ti ti-plus"></i> 異붽?</button></div>'
      + state.tasks.slice().sort((a,b)=>a.time.localeCompare(b.time)).map(t => {
          const cc = catColor[t.cat]||'blue';
          return '<div class="task-item"><div class="task-body"><div class="task-name">'+t.name+'</div><div class="task-meta"><span class="badge '+cc+'" style="font-size:10px;padding:1px 6px">'+t.cat+'</span> '+t.time+'</div></div><div class="task-actions"><button class="btn-icon" onclick="openEditTask('+t.id+')"><i class="ti ti-edit" style="font-size:14px"></i></button><button class="btn-icon" onclick="deleteTask('+t.id+')"><i class="ti ti-trash" style="font-size:14px"></i></button></div></div>';
        }).join('');
  } else if (activeTab==='s-goals') {
    body = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div style="font-weight:500">紐⑺몴 ('+state.goals.length+'媛?</div><button class="btn-primary" onclick="openModal(\'goal\')"><i class="ti ti-plus"></i> 異붽?</button></div>'
      + state.goals.map(g => {
          const pct = Math.min(100,Math.round(g.current/g.target*100));
          return '<div class="goal-row"><div class="goal-header"><div style="flex:1"><span class="badge '+(pc[g.period]||'blue')+'" style="font-size:10px">'+pl[g.period]+'</span> <span style="font-weight:500">'+g.name+'</span></div><div class="goal-actions"><span style="font-size:13px;font-weight:500;color:var(--amber)">'+pct+'%</span><button class="btn-icon" onclick="openProgress('+g.id+')"><i class="ti ti-edit" style="font-size:14px"></i></button><button class="btn-icon" onclick="deleteGoal('+g.id+')"><i class="ti ti-trash" style="font-size:14px"></i></button></div></div><div class="goal-sub">'+g.current+'/'+g.target+g.unit+'</div><div class="progress-bar" style="height:5px"><div class="progress-fill" style="width:'+pct+'%;background:var(--blue)"></div></div></div>';
        }).join('');
  } else {
    body = '<div class="card"><div class="card-title">?곗냽 ?ъ꽦???ㅼ젙</div><div style="display:flex;gap:8px;margin-top:8px"><input id="streak-input" class="form-input" type="number" value="'+(state.streak||0)+'" min="0" style="width:100px"/><button class="btn-primary" onclick="saveStreak()">???/button></div></div>'
      +'<div class="card"><div class="card-title" style="color:var(--red)">?ㅻ뒛 猷⑦떞 珥덇린??/div><div style="font-size:13px;color:var(--t2);margin:8px 0">?ㅻ뒛 ?꾨즺 ?곹깭瑜?珥덇린?뷀빀?덈떎</div><button class="btn-outline" style="border-color:var(--red);color:var(--red)" onclick="resetTodayTasks()"><i class="ti ti-refresh"></i> 珥덇린??/button></div>'
      +'<div class="card"><div class="card-title">濡쒓렇???뺣낫</div><div style="font-size:13px;color:var(--t2);margin-top:8px">'+(currentUser?currentUser.email:'')+'</div><button class="btn-outline" style="margin-top:10px" onclick="signOut()"><i class="ti ti-logout"></i> 濡쒓렇?꾩썐</button></div>';
  }
  el.innerHTML = '<div class="tag-row" style="margin-bottom:14px">'+tabs.map(t=>'<button class="period-tag '+(activeTab===t.id?'active':'')+'" onclick="window._settingsTab=\''+t.id+'\';renderSettings()"><i class="ti '+t.icon+'" style="font-size:12px;margin-right:3px"></i>'+t.label+'</button>').join('')+'</div>'+body;
}

window.saveStreak = function() {
  const v = parseInt(document.getElementById('streak-input').value)||0;
  state.streak = v; saveData(); updateSidebar(); renderSettings();
};

window.resetTodayTasks = function() {
  if (!confirm('珥덇린?뷀븷源뚯슂?')) return;
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
  state.alerts.unshift({id:state.nextId++,type,title,msg,time:'諛⑷툑',read:false});
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
  state.goals.push({id:state.nextId++,name,period:document.getElementById('goal-period').value,target:parseFloat(document.getElementById('goal-target').value)||1,current:0,unit:document.getElementById('goal-unit').value.trim()||'媛?,cat:document.getElementById('goal-cat').value,deadline:document.getElementById('goal-deadline').value});
  saveData(); closeModal('goal');
  ['goal-name','goal-target','goal-unit','goal-deadline'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  renderGoals();
  addAlert('info','??紐⑺몴 異붽???,'\''+name+'\' 紐⑺몴媛 異붽??섏뿀?듬땲??');
};

window.openProgress = function(id) {
  progressTargetId = id;
  const g = state.goals.find(g => g.id===id);
  if (!g) return;
  document.getElementById('progress-goal-name').textContent = g.name;
  document.getElementById('progress-goal-info').textContent = '?꾩옱: '+g.current+g.unit+' / 紐⑺몴: '+g.target+g.unit;
  document.getElementById('progress-val').value = g.current;
  openModal('progress');
};

window.saveProgress = function() {
  if (!progressTargetId) return;
  const g = state.goals.find(g => g.id===progressTargetId);
  if (!g) return;
  const val = parseFloat(document.getElementById('progress-val').value);
  if (isNaN(val)||val<0) return;
  if (val >= g.target && g.current < g.target) addAlert('success','紐⑺몴 ?ъ꽦! ?럦','\''+g.name+'\' 紐⑺몴瑜??ъ꽦?덉뒿?덈떎!');
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
