import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyCn54iAiLh7FEirtptogba5SUQkfTquYrE",
  authDomain: "kyu-sik-s-planner.firebaseapp.com",
  projectId: "kyu-sik-s-planner",
  storageBucket: "kyu-sik-s-planner.firebasestorage.app",
  messagingSenderId: "203411344275",
  appId: "1:203411344275:web:b537d3a270e7be644fb666",
  measurementId: "G-N9SW1ZF9T4"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

let currentUser = null;
let unsubscribe = null;

// Google 로그인
window.signInWithGoogle = async function() {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch(e) {
    alert('로그인 실패: ' + e.message);
  }
};

// 로그아웃
window.signOut = async function() {
  if (unsubscribe) unsubscribe();
  await fbSignOut(auth);
};

// Firebase 저장
async function saveToFirebase() {
  if (!currentUser) return;
  state.lastSaved = Date.now();
  const ref = doc(db, 'users', currentUser.uid);
  await setDoc(ref, state);
}

// Firebase 불러오기
async function loadFromFirebase() {
  if (!currentUser) return;
  const ref = doc(db, 'users', currentUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const saved = snap.data();
    state = {...state, ...saved};
    const today = new Date().toDateString();
    if (state.lastReset !== today) {
      state.tasks.forEach(t => t.done = false);
      state.lastReset = today;
      await saveToFirebase();
    }
  } else {
    await saveToFirebase();
  }
}

// 실시간 동기화 수신
function listenFirebase() {
  if (!currentUser) return;
  const ref = doc(db, 'users', currentUser.uid);
  unsubscribe = onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const saved = snap.data();
      if (saved.lastSaved !== state.lastSaved) {
        state = {...state, ...saved};
        renderAll();
      }
    }
  });
}

// 인증 상태 감지
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    window._currentUid = user.uid;
    const loginArea = document.getElementById('firebase-login-area');
    if (loginArea) {
      loginArea.innerHTML = '<button onclick="window._copyUid()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:inherit;padding:0;text-decoration:underline dotted;">' + (user.displayName || user.email) + ' \uD83D\uDD17</button>';
    }
    window._copyUid = function() {
      var uid = window._currentUid;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(uid).then(function() { alert('PC 동기화 ID 복사완료!\n\nPC앱 클라우드 동기화 버튼 누르고 붙여넣기!\n\nID: ' + uid); });
      } else {
        alert('PC 동기화 ID:\n' + uid);
      }
    };
    document.getElementById('page-login').classList.remove('active');
    document.getElementById('page-today').classList.add('active');
    await loadFromFirebase();
    listenFirebase();
    renderAll();
    setupEvents();
  } else {
    currentUser = null;
    const loginArea = document.getElementById('firebase-login-area');
    if (loginArea) loginArea.innerHTML = '';
    document.getElementById('page-login').classList.add('active');
    document.querySelectorAll('.page:not(#page-login)').forEach(p => p.classList.remove('active'));
  }
});

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
    {id:6,name:'사이드 프로젝트 론칭',period:'yearly',target:1,current:0,unit:'개',cat:'업무',deadline:''},
  ],
  alerts: [
    {id:1,type:'warning',title:'주간 목표 미달성 위험',msg:'이번 주 운동 목표(5회) 중 3회 완료.',time:'방금',read:false},
    {id:2,type:'info',title:'월간 독서 목표 리마인더',msg:'이번 달이 6일 남았습니다.',time:'오전 9:00',read:false},
    {id:3,type:'danger',title:'분기 저축 목표 경고',msg:'현재 38% 달성.',time:'오전 8:00',read:false},
    {id:4,type:'success',title:'7일 연속 달성!',msg:'일주일 연속으로 루틴을 달성했습니다!',time:'어제',read:true},
  ],
  streak: 7,
  weekHistory: {0:88,1:74,2:67,3:92,4:85,5:70},
  nextId: 20,
  lastReset: new Date().toDateString(),
};

let state = JSON.parse(JSON.stringify(DEFAULT_DATA));
let currentFilter = 'all';
let currentPeriod = 'all';
let progressTargetId = null;
let editTaskId = null;
let editGoalId = null;
const isElectron = !!window.electronAPI;

async function init() {
  if (isElectron) {
    const saved = await window.electronAPI.loadData();
    if (saved) {
      state = saved;
      const today = new Date().toDateString();
      if (state.lastReset !== today) {
        state.tasks.forEach(t => t.done = false);
        state.lastReset = today;
        await saveData();
      }
    }
  } else {
    const saved = localStorage.getItem('planner-data');
    if (saved) { try { state = JSON.parse(saved); } catch(e) {} }
  }
  renderAll();
  setupEvents();
  // Firebase는 onAuthStateChanged에서 처리
  checkMorningAlerts();
  setInterval(periodicCheck, 60000);
}






async function saveData() {
  state.lastSaved = Date.now();
  showSaveStatus();
  await saveToFirebase();
}

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
  // 일정 필터
  document.querySelectorAll('[data-efilter]').forEach(function(tag) {
    tag.addEventListener('click', function() {
      document.querySelectorAll('[data-efilter]').forEach(function(t){ t.classList.remove('active'); });
      tag.classList.add('active');
      currentEventFilter = tag.dataset.efilter;
      renderEvents();
    });
  });

  // 일정 추가 모달 오픈시 오늘 날짜 기본값
  const eventModal = document.getElementById('modal-event');
  if (eventModal) {
    const observer = new MutationObserver(function() {
      if (eventModal.classList.contains('open')) setDefaultEventDate();
    });
    observer.observe(eventModal, {attributes: true, attributeFilter: ['class']});
  }

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
  const renders = {goals:renderGoals, schedule:function(){switchScheduleView('events');setupEventFilters();}, stats:renderStats, coach:renderCoach, alerts:renderAlerts, settings:renderSettings};
  if (renders[tab]) renders[tab]();
}

function renderAll() {
  const now = new Date();
  const days = ['일','월','화','수','목','금','토'];
  document.getElementById('today-date').textContent = now.getFullYear()+'년 '+(now.getMonth()+1)+'월 '+now.getDate()+'일 '+days[now.getDay()]+'요일';
  renderWeekGrid();
  renderRoutineSections();
  updateSidebar();
}

function renderWeekGrid() {
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
    html += '<div class="week-day '+(isToday?'today':'')+'"><div class="week-day-name">'+dayNames[i]+'</div><div class="week-day-num">'+d.getDate()+'</div><div class="week-dots"><span class="week-dot" style="background:'+(isToday?'rgba(255,255,255,.5)':dc)+'"></span><span class="week-dot" style="background:'+(isToday?'rgba(255,255,255,.3)':dc)+'"></span><span class="week-dot" style="background:'+(isToday?'rgba(255,255,255,.2)':dc)+'"></span></div></div>';
  }
  document.getElementById('week-grid').innerHTML = html;
}

function renderRoutineSections() {
  const periods = currentFilter === 'all' ? ['morning','daytime','evening'] : [currentFilter];
  const info = {
    morning:{label:'아침 루틴',icon:'ti-sunrise',badgeClass:'blue',time:'06:00 - 09:00'},
    daytime:{label:'낮 루틴',icon:'ti-sun',badgeClass:'amber',time:'09:00 - 18:00'},
    evening:{label:'저녁 루틴',icon:'ti-moon',badgeClass:'purple',time:'18:00 - 23:00'},
  };
  const catColor = {건강:'green',학습:'blue',재정:'amber',관계:'coral',자기계발:'purple',업무:'teal'};
  let html = '';
  periods.forEach(function(p) {
    const pi = info[p];
    const tasks = state.tasks.filter(function(t){return t.period===p;}).sort(function(a,b){return a.time.localeCompare(b.time);});
    html += '<div class="section-title"><i class="ti '+pi.icon+'"></i> '+pi.label+' <span class="badge '+pi.badgeClass+'">'+pi.time+'</span></div>';
    if (!tasks.length) {
      html += '<div style="font-size:13px;color:var(--t3);padding:12px 0;text-align:center">이 시간대에 루틴이 없습니다</div>';
    } else {
      tasks.forEach(function(t) {
        const cc = catColor[t.cat] || 'blue';
        html += '<div class="task-item '+(t.done?'done':'')+'" onclick="toggleTask('+t.id+')">'
          +'<div class="task-check">'+(t.done?'<i class="ti ti-check" style="font-size:10px"></i>':'')+'</div>'
          +'<div class="task-body">'
          +'<div class="task-name">'+t.name+'</div>'
          +'<div class="task-meta"><span class="badge '+cc+'" style="font-size:10px;padding:1px 7px">'+t.cat+'</span>'+(t.memo?' <span style="font-size:11px;color:var(--t3)">'+t.memo+'</span>':'')+'</div>'
          +'</div>'
          +'<div class="task-time">'+t.time+'</div>'
          +'<div class="task-actions">'
          +'<button class="btn-icon" onclick="event.stopPropagation();openEditTask('+t.id+')" title="수정" style="margin-right:4px"><i class="ti ti-edit" style="font-size:13px"></i></button>'
          +'<button class="btn-icon" onclick="event.stopPropagation();deleteTask('+t.id+')" title="삭제"><i class="ti ti-trash" style="font-size:13px"></i></button>'
          +'</div>'
          +'</div>';
      });
    }
  });
  document.getElementById('routine-sections').innerHTML = html;
  updateProgress();
}

function toggleTask(id) {
  const t = state.tasks.find(function(t){return t.id===id;});
  if (t) t.done = !t.done;
  const dayOfWeek = (new Date().getDay() + 6) % 7;
  state.weekHistory[dayOfWeek] = getCompletionPct();
  saveData();
  renderRoutineSections();
  updateSidebar();
  if (getCompletionPct() === 100) {
    addAlert('success','오늘 루틴 100% 달성!','모든 루틴을 완료했습니다!','방금');
    sendNotif('Kyu Sik Planner','오늘 루틴을 모두 완료했습니다!');
  }
}

function deleteTask(id) {
  if (!confirm('이 루틴을 삭제할까요?')) return;
  state.tasks = state.tasks.filter(function(t){return t.id!==id;});
  saveData(); renderRoutineSections();
}

function getCompletionPct() {
  if (!state.tasks.length) return 0;
  return Math.round(state.tasks.filter(function(t){return t.done;}).length / state.tasks.length * 100);
}

function updateProgress() {
  const done = state.tasks.filter(function(t){return t.done;}).length;
  document.getElementById('done-count').textContent = done+'/'+state.tasks.length+' 완료';
  updateSidebar();
}

function updateSidebar() {
  const pct = getCompletionPct();
  document.getElementById('sb-pct').textContent = pct + '%';
  document.getElementById('sb-bar').style.width = pct + '%';
  document.getElementById('sb-streak').textContent = (state.streak || 0) + '일';
}

function openEditTask(id) {
  editTaskId = id;
  const t = state.tasks.find(function(t){return t.id===id;});
  if (!t) return;
  document.getElementById('edit-task-name').value = t.name;
  document.getElementById('edit-task-time').value = t.time;
  document.getElementById('edit-task-memo').value = t.memo || '';
  const s = document.getElementById('edit-task-cat');
  for (let i = 0; i < s.options.length; i++) {
    if (s.options[i].text === t.cat) { s.selectedIndex = i; break; }
  }
  openModal('edit-task');
}

function saveEditTask() {
  if (!editTaskId) return;
  const t = state.tasks.find(function(t){return t.id===editTaskId;});
  if (!t) return;
  const name = document.getElementById('edit-task-name').value.trim();
  if (!name) { document.getElementById('edit-task-name').focus(); return; }
  t.name = name;
  t.time = document.getElementById('edit-task-time').value;
  t.cat = document.getElementById('edit-task-cat').value;
  t.memo = document.getElementById('edit-task-memo').value.trim();
  const h = parseInt(t.time.split(':')[0]);
  t.period = h < 9 ? 'morning' : h < 18 ? 'daytime' : 'evening';
  saveData();
  closeModal('edit-task');
  renderRoutineSections();
  if (document.getElementById('page-schedule').classList.contains('active')) renderTimeline();
  if (document.getElementById('page-settings').classList.contains('active')) renderSettings();
}

function deleteTaskFromEdit() {
  if (!editTaskId) return;
  if (!confirm('이 루틴을 삭제할까요?')) return;
  state.tasks = state.tasks.filter(function(t){return t.id!==editTaskId;});
  saveData();
  closeModal('edit-task');
  renderRoutineSections();
  if (document.getElementById('page-settings').classList.contains('active')) renderSettings();
}

function setPeriod(p) {
  currentPeriod = p;
  document.querySelectorAll('.period-tag').forEach(function(tag){tag.classList.toggle('active', tag.dataset.period===p);});
  renderGoals();
}

function renderGoals() {
  const filtered = currentPeriod === 'all' ? state.goals : state.goals.filter(function(g){return g.period===currentPeriod;});
  const pl = {daily:'일간',weekly:'주간',monthly:'월간',quarterly:'분기',yearly:'연간'};
  const pc = {daily:'blue',weekly:'teal',monthly:'purple',quarterly:'amber',yearly:'coral'};
  const cf = {blue:'var(--blue)',teal:'var(--teal)',purple:'var(--purple)',amber:'var(--amber)',coral:'var(--coral)'};
  if (!filtered.length) {
    document.getElementById('goals-list').innerHTML = '<div style="text-align:center;color:var(--t3);padding:40px;font-size:13px">이 주기에 설정된 목표가 없습니다.<br><button class="btn-primary" style="margin-top:12px" onclick="openModal(\'goal\')">목표 추가</button></div>';
    return;
  }
  document.getElementById('goals-list').innerHTML = filtered.map(function(g) {
    const pct = Math.min(100, Math.round(g.current/g.target*100));
    const col = pc[g.period] || 'blue';
    const pctCol = pct>=80?'var(--green)':pct>=50?'var(--amber)':'var(--coral)';
    return '<div class="goal-row">'
      +'<div class="goal-header">'
      +'<div style="display:flex;align-items:center;gap:8px;flex:1"><span class="badge '+col+'">'+pl[g.period]+'</span><span class="goal-name">'+g.name+'</span></div>'
      +'<div class="goal-actions">'
      +'<span style="font-size:14px;font-weight:500;color:'+pctCol+';min-width:38px;text-align:right">'+pct+'%</span>'
      +'<button class="btn-outline" style="font-size:11px;padding:4px 10px" onclick="openProgress('+g.id+')"><i class="ti ti-edit" style="font-size:12px"></i> 업데이트</button>'
      +'<button class="btn-icon" onclick="openEditGoal('+g.id+')" title="수정"><i class="ti ti-edit" style="font-size:13px"></i></button>'
      +'<button class="btn-icon" onclick="deleteGoal('+g.id+')" title="삭제"><i class="ti ti-trash" style="font-size:13px"></i></button>'
      +'</div></div>'
      +'<div class="goal-sub">'+g.current+' / '+g.target+g.unit+' 달성 · '+g.cat+(g.deadline?' · 마감: '+g.deadline:'')+'</div>'
      +'<div class="progress-bar" style="height:8px"><div class="progress-fill" style="width:'+pct+'%;background:'+cf[col]+'"></div></div>'
      +'</div>';
  }).join('');
}

function openEditGoal(id) {
  editGoalId = id;
  const g = state.goals.find(function(g){return g.id===id;});
  if (!g) return;
  document.getElementById('goal-name').value = g.name;
  document.getElementById('goal-period').value = g.period;
  document.getElementById('goal-cat').value = g.cat;
  document.getElementById('goal-target').value = g.target;
  document.getElementById('goal-unit').value = g.unit;
  document.getElementById('goal-deadline').value = g.deadline || '';
  const btn = document.querySelector('#modal-goal .btn-primary');
  btn.innerHTML = '<i class="ti ti-check"></i> 수정 저장';
  btn.onclick = saveEditGoal;
  openModal('goal');
}

function saveEditGoal() {
  if (!editGoalId) return;
  const g = state.goals.find(function(g){return g.id===editGoalId;});
  if (!g) return;
  const name = document.getElementById('goal-name').value.trim();
  if (!name) return;
  g.name = name;
  g.period = document.getElementById('goal-period').value;
  g.cat = document.getElementById('goal-cat').value;
  g.target = parseFloat(document.getElementById('goal-target').value)||1;
  g.unit = document.getElementById('goal-unit').value.trim()||'개';
  g.deadline = document.getElementById('goal-deadline').value;
  saveData();
  closeModal('goal');
  editGoalId = null;
  const btn = document.querySelector('#modal-goal .btn-primary');
  btn.innerHTML = '<i class="ti ti-plus"></i> 추가하기';
  btn.onclick = addGoal;
  renderGoals();
  if (document.getElementById('page-settings').classList.contains('active')) renderSettings();
}

function deleteGoal(id) {
  if (!confirm('이 목표를 삭제할까요?')) return;
  state.goals = state.goals.filter(function(g){return g.id!==id;});
  saveData(); renderGoals();
}

function renderTimeline() {
  const sorted = state.tasks.slice().sort(function(a,b){return a.time.localeCompare(b.time);});
  const catColor = {건강:'green',학습:'blue',재정:'amber',관계:'coral',자기계발:'purple',업무:'teal'};
  const pk = {morning:'아침',daytime:'낮',evening:'저녁'};
  document.getElementById('timeline-list').innerHTML = !sorted.length
    ? '<div style="text-align:center;color:var(--t3);padding:40px;font-size:13px">등록된 루틴이 없습니다</div>'
    : sorted.map(function(t,i){
        return '<div class="timeline-block">'
          +'<div class="tl-time">'+t.time+'</div>'
          +'<div class="tl-dot-col"><div class="tl-dot '+(t.done?'done':'')+'"></div>'+(i<sorted.length-1?'<div class="tl-line"></div>':'')+'</div>'
          +'<div class="tl-card">'
          +'<div class="tl-card-title">'+t.name+(t.done?' <span style="color:var(--green);font-size:11px">완료</span>':'')+'</div>'
          +'<div class="tl-card-sub"><span class="badge '+(catColor[t.cat]||'blue')+'" style="font-size:10px;padding:1px 7px">'+t.cat+'</span> · '+pk[t.period]+' 루틴'+(t.memo?' · '+t.memo:'')+'</div>'
          +'</div></div>';
      }).join('');
}

function renderStats() {
  const done = state.tasks.filter(function(t){return t.done;}).length;
  const todayPct = state.tasks.length ? Math.round(done/state.tasks.length*100) : 0;
  const wv = Object.values(state.weekHistory).filter(function(v){return v>0;});
  const weekAvg = wv.length ? Math.round(wv.reduce(function(a,b){return a+b;},0)/wv.length) : 0;
  const monthGs = state.goals.filter(function(g){return g.period==='monthly';});
  const monthAvg = monthGs.length ? Math.round(monthGs.reduce(function(s,g){return s+Math.min(100,g.current/g.target*100);},0)/monthGs.length) : 0;
  const yearGs = state.goals.filter(function(g){return g.period==='yearly';});
  const yearAvg = yearGs.length ? Math.round(yearGs.reduce(function(s,g){return s+Math.min(100,g.current/g.target*100);},0)/yearGs.length) : 0;
  document.getElementById('stat-metrics').innerHTML = [
    {label:'오늘 달성률',val:todayPct+'%'},
    {label:'주간 평균',val:weekAvg+'%'},
    {label:'월간 달성',val:monthAvg+'%'},
    {label:'연간 진척',val:yearAvg+'%'},
  ].map(function(m){return '<div class="metric"><div class="metric-label">'+m.label+'</div><div class="metric-val">'+m.val+'</div></div>';}).join('');
  const cats = ['건강','학습','재정','자기계발','업무'];
  const catFills = {건강:'var(--green)',학습:'var(--blue)',재정:'var(--amber)',자기계발:'var(--purple)',업무:'var(--teal)'};
  document.getElementById('cat-chart').innerHTML = cats.map(function(c){
    const gs = state.goals.filter(function(g){return g.cat===c;});
    const v = gs.length ? Math.round(gs.reduce(function(s,g){return s+Math.min(100,g.current/g.target*100);},0)/gs.length) : 0;
    return '<div class="chart-row"><div class="chart-label">'+c+'</div><div class="chart-bg"><div class="chart-fill" style="width:'+v+'%;background:'+catFills[c]+'"></div></div><div class="chart-val">'+v+'%</div></div>';
  }).join('');
  const dayNames = ['월','화','수','목','금','토','일'];
  document.getElementById('week-chart').innerHTML = dayNames.map(function(d,i){
    const v = state.weekHistory[i] || 0;
    return '<div class="chart-row"><div class="chart-label">'+d+'</div><div class="chart-bg"><div class="chart-fill" style="width:'+v+'%;background:var(--blue)"></div></div><div class="chart-val">'+(v?v+'%':'-')+'</div></div>';
  }).join('');
  const pl = {daily:'일간',weekly:'주간',monthly:'월간',quarterly:'분기',yearly:'연간'};
  const pc = {daily:'blue',weekly:'teal',monthly:'purple',quarterly:'amber',yearly:'coral'};
  document.getElementById('stat-table').innerHTML = state.goals.map(function(g){
    const pct = Math.min(100,Math.round(g.current/g.target*100));
    const pctCol = pct>=80?'var(--green)':pct>=50?'var(--amber)':'var(--coral)';
    return '<tr><td>'+g.name+'</td><td><span class="badge '+(pc[g.period]||'blue')+'">'+pl[g.period]+'</span></td><td style="font-weight:500;color:'+pctCol+'">'+pct+'%</td><td style="color:var(--t2)">'+g.current+'/'+g.target+g.unit+'</td><td style="color:var(--t2)">'+(g.deadline||'-')+'</td><td><button class="btn-icon" onclick="openProgress('+g.id+')"><i class="ti ti-edit" style="font-size:12px"></i></button></td></tr>';
  }).join('');
}

function renderCoach() {
  const undone = state.goals.filter(function(g){return g.current/g.target<1;});
  const pct = getCompletionPct();
  let mainMsg = '안녕하세요! ';
  if (pct===100) mainMsg += '오늘 루틴을 모두 완료하셨군요! 정말 대단합니다!';
  else if (pct>=60) mainMsg += '오늘 '+pct+'% 달성 중이에요. 조금만 더 힘내세요!';
  else if (pct>0) mainMsg += '오늘 '+pct+'% 완료. 아직 시간이 있어요!';
  else mainMsg += '오늘 루틴을 아직 시작하지 않으셨네요. 지금 시작해 보세요!';
  if (state.streak > 0) mainMsg += ' <strong>'+state.streak+'일 연속 달성</strong> 중이에요!';
  const pl = {daily:'일간',weekly:'주간',monthly:'월간',quarterly:'분기',yearly:'연간'};
  const pc = {daily:'blue',weekly:'teal',monthly:'purple',quarterly:'amber',yearly:'coral'};
  const strategies = {daily:'오늘 내 달성해야 합니다.',weekly:'이번 주 남은 날들에 분산해서 달성해 보세요.',monthly:'이달 남은 날 동안 매일 조금씩.',quarterly:'꾸준한 노력이 필요합니다.',yearly:'지금 시작하는 것이 중요합니다.'};
  document.getElementById('coach-content').innerHTML =
    '<div class="coach-box"><div class="coach-header"><div class="coach-avatar"><i class="ti ti-robot"></i></div><div><div class="coach-name">AI 코치</div><div style="font-size:11px;color:var(--blue)">오늘 '+new Date().getHours()+'시 분석</div></div></div><div class="coach-msg">'+mainMsg+'</div>'
    +undone.slice(0,3).map(function(g){return '<div class="coach-tip"><i class="ti ti-bulb"></i> <span>'+g.name+': '+(strategies[g.period]||'계속 진행해 보세요')+'</span></div>';}).join('')
    +'</div>'
    +'<div class="section-title"><i class="ti ti-target"></i> 미달성 목표 달성 가이드</div>'
    +(!undone.length ? '<div style="color:var(--green);font-size:13px;padding:12px">모든 목표가 달성 중이에요!</div>'
      : undone.map(function(g){
          const pct2=Math.min(100,Math.round(g.current/g.target*100));
          return '<div class="goal-row" style="margin-bottom:10px"><div class="goal-header"><div style="display:flex;align-items:center;gap:8px"><span class="badge '+(pc[g.period]||'blue')+'">'+pl[g.period]+'</span><span style="font-size:13px;font-weight:500">'+g.name+'</span></div><span style="font-size:13px;font-weight:500;color:var(--amber)">'+pct2+'%</span></div><div style="font-size:12px;color:var(--t2);margin:6px 0">'+(strategies[g.period]||'')+'</div><div class="progress-bar" style="height:6px"><div class="progress-fill amber" style="width:'+pct2+'%"></div></div></div>';
        }).join(''))
    +'<div class="section-title"><i class="ti ti-heart"></i> 독려 메시지</div>'
    +'<div class="encourage-item"><div class="encourage-icon" style="background:var(--coral-bg)"><i class="ti ti-flame" style="color:var(--coral)"></i></div><div style="font-size:13px;color:var(--t1);line-height:1.55">작은 습관이 모여 큰 변화를 만듭니다. '+(state.streak||0)+'일 연속 달성 중인 당신이 자랑스러워요!</div></div>'
    +'<div class="encourage-item"><div class="encourage-icon" style="background:var(--amber-bg)"><i class="ti ti-trophy" style="color:var(--amber)"></i></div><div style="font-size:13px;color:var(--t1);line-height:1.55">목표를 세우고 실천하는 것만으로도 대부분의 사람보다 앞서 있습니다.</div></div>'
    +'<div class="encourage-item"><div class="encourage-icon" style="background:var(--green-bg)"><i class="ti ti-heart" style="color:var(--green)"></i></div><div style="font-size:13px;color:var(--t1);line-height:1.55">오늘 하루도 어제보다 조금 더 나은 내가 되고 있습니다. 계속 나아가세요!</div></div>';
}

function renderAlerts() {
  const ts = {warning:{icon:'ti-alert-triangle',color:'amber'},info:{icon:'ti-info-circle',color:'blue'},danger:{icon:'ti-alert-circle',color:'coral'},success:{icon:'ti-circle-check',color:'green'}};
  const all = state.alerts.filter(function(a){return !a.read;}).concat(state.alerts.filter(function(a){return a.read;}));
  document.getElementById('alert-list').innerHTML = !all.length
    ? '<div style="text-align:center;color:var(--t3);padding:40px;font-size:13px">새 알림이 없습니다</div>'
    : all.map(function(a){
        const s = ts[a.type]||ts.info;
        return '<div class="notif-item '+(a.read?'read':'')+'"><div class="notif-icon" style="background:var(--'+s.color+'-bg)"><i class="ti '+s.icon+'" style="color:var(--'+s.color+')"></i></div><div class="notif-body"><div class="notif-title">'+a.title+'</div><div class="notif-msg">'+a.msg+'</div><div class="notif-time">'+a.time+'</div></div>'
          +(!a.read?'<button class="btn-outline" style="font-size:11px;align-self:flex-start;white-space:nowrap" onclick="markRead('+a.id+')">읽음</button>':'')
          +'</div>';
      }).join('');
  updateAlertBadge();
}

function renderSettings() {
  const activeTab = window._settingsTab || 's-routine';
  const tabs = [
    {id:'s-routine',label:'루틴 관리',icon:'ti-layout-list'},
    {id:'s-goals',label:'목표 관리',icon:'ti-trophy'},
    {id:'s-general',label:'일반 설정',icon:'ti-settings'},
  ];
  const tabHtml = tabs.map(function(t){
    return '<button class="period-tag '+(activeTab===t.id?'active':'')+'" onclick="window._settingsTab=\''+t.id+'\';renderSettings()" style="font-size:13px;padding:6px 16px"><i class="ti '+t.icon+'" style="font-size:13px;margin-right:4px"></i>'+t.label+'</button>';
  }).join('');
  let bodyHtml = '';
  const catColor = {건강:'green',학습:'blue',재정:'amber',관계:'coral',자기계발:'purple',업무:'teal'};
  const pl = {daily:'일간',weekly:'주간',monthly:'월간',quarterly:'분기',yearly:'연간'};
  const pc = {daily:'blue',weekly:'teal',monthly:'purple',quarterly:'amber',yearly:'coral'};
  if (activeTab === 's-routine') {
    bodyHtml = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><div style="font-size:14px;font-weight:500;color:var(--t1)">루틴 목록 ('+state.tasks.length+'개)</div><button class="btn-primary" onclick="openModal(\'task\')"><i class="ti ti-plus"></i> 루틴 추가</button></div>'
      +'<div style="overflow-x:auto"><table class="stat-table"><thead><tr><th>이름</th><th>시간</th><th>카테고리</th><th>메모</th><th>상태</th><th>작업</th></tr></thead><tbody>'
      +state.tasks.slice().sort(function(a,b){return a.time.localeCompare(b.time);}).map(function(t){
        const cc = catColor[t.cat]||'blue';
        const pk = {morning:'아침',daytime:'낮',evening:'저녁'}[t.period];
        return '<tr><td style="font-weight:500">'+t.name+'</td><td>'+t.time+' <span style="font-size:11px;color:var(--t3)">('+pk+')</span></td><td><span class="badge '+cc+'" style="font-size:11px">'+t.cat+'</span></td><td style="color:var(--t2);font-size:12px">'+(t.memo||'-')+'</td><td>'+(t.done?'<span class="badge green" style="font-size:11px">완료</span>':'<span style="font-size:11px;color:var(--t3)">미완료</span>')+'</td><td style="white-space:nowrap"><button class="btn-icon" onclick="openEditTask('+t.id+')" title="수정" style="margin-right:4px"><i class="ti ti-edit" style="font-size:13px"></i></button><button class="btn-icon" onclick="deleteTask('+t.id+')" title="삭제"><i class="ti ti-trash" style="font-size:13px"></i></button></td></tr>';
      }).join('')
      +'</tbody></table></div>';
  } else if (activeTab === 's-goals') {
    bodyHtml = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><div style="font-size:14px;font-weight:500;color:var(--t1)">목표 목록 ('+state.goals.length+'개)</div><button class="btn-primary" onclick="openModal(\'goal\')"><i class="ti ti-plus"></i> 목표 추가</button></div>'
      +'<div style="overflow-x:auto"><table class="stat-table"><thead><tr><th>목표명</th><th>주기</th><th>목표치</th><th>달성량</th><th>달성률</th><th>마감</th><th>작업</th></tr></thead><tbody>'
      +state.goals.map(function(g){
        const pct = Math.min(100,Math.round(g.current/g.target*100));
        const pctCol = pct>=80?'var(--green)':pct>=50?'var(--amber)':'var(--coral)';
        return '<tr><td style="font-weight:500">'+g.name+'</td><td><span class="badge '+(pc[g.period]||'blue')+'" style="font-size:11px">'+pl[g.period]+'</span></td><td>'+g.target+g.unit+'</td><td>'+g.current+g.unit+'</td><td style="font-weight:500;color:'+pctCol+'">'+pct+'%</td><td style="font-size:12px;color:var(--t2)">'+(g.deadline||'-')+'</td><td style="white-space:nowrap"><button class="btn-icon" onclick="openEditGoal('+g.id+')" title="수정" style="margin-right:4px"><i class="ti ti-edit" style="font-size:13px"></i></button><button class="btn-icon" onclick="deleteGoal('+g.id+')" title="삭제"><i class="ti ti-trash" style="font-size:13px"></i></button></td></tr>';
      }).join('')
      +'</tbody></table></div>';
  } else {
    const pct = getCompletionPct();
    bodyHtml = '<div class="grid-2" style="margin-bottom:16px"><div class="metric"><div class="metric-label">총 루틴 수</div><div class="metric-val">'+state.tasks.length+'개</div></div><div class="metric"><div class="metric-label">총 목표 수</div><div class="metric-val">'+state.goals.length+'개</div></div><div class="metric"><div class="metric-label">오늘 달성률</div><div class="metric-val" style="color:var(--green)">'+pct+'%</div></div><div class="metric"><div class="metric-label">연속 달성</div><div class="metric-val" style="color:var(--amber)">'+(state.streak||0)+'일</div></div></div>'
      +'<div class="card" style="margin-bottom:12px"><div class="card-title">연속 달성일 수동 설정</div><div style="display:flex;gap:10px;align-items:center;margin-top:8px"><input id="streak-input" class="form-input" type="number" value="'+(state.streak||0)+'" min="0" style="width:120px" /><button class="btn-primary" onclick="saveStreak()"><i class="ti ti-check"></i> 저장</button></div></div>'
      +'<div class="card" style="margin-bottom:12px"><div class="card-title" style="color:var(--red)">오늘 루틴 초기화</div><div style="font-size:13px;color:var(--t2);margin:8px 0">루틴의 오늘 완료 상태를 초기화합니다</div><button class="btn-outline" style="border-color:var(--red);color:var(--red)" onclick="resetTodayTasks()"><i class="ti ti-refresh"></i> 초기화</button></div>'
      +'<div class="card"><div class="card-title">데이터 저장 위치</div><div style="font-size:12px;color:var(--t2);margin-top:6px;font-family:monospace;background:var(--bg2);padding:8px;border-radius:6px">%APPDATA%\\life-planner\\planner-data.json</div></div>';
  }
  document.getElementById('settings-content').innerHTML = '<div class="tag-row" style="margin-bottom:16px">'+tabHtml+'</div>'+bodyHtml;
}

function saveStreak() {
  const val = parseInt(document.getElementById('streak-input').value)||0;
  state.streak = val;
  saveData(); updateSidebar(); renderSettings();
}

function resetTodayTasks() {
  if (!confirm('오늘 루틴 완료 상태를 초기화할까요?')) return;
  state.tasks.forEach(function(t){t.done=false;});
  saveData(); renderRoutineSections(); renderSettings();
}

function markRead(id) {
  const a = state.alerts.find(function(a){return a.id===id;});
  if (a) { a.read=true; saveData(); }
  renderAlerts();
}

function clearAlerts() {
  state.alerts.forEach(function(a){a.read=true;});
  saveData(); renderAlerts();
}

function addAlert(type, title, msg, time) {
  state.alerts.unshift({id:state.nextId++,type:type,title:title,msg:msg,time:time||'방금',read:false});
  saveData(); updateAlertBadge();
}

function updateAlertBadge() {
  const badge = document.getElementById('alert-badge');
  const n = state.alerts.filter(function(a){return !a.read;}).length;
  badge.textContent = n > 0 ? n : '';
  badge.style.display = n > 0 ? '' : 'none';
}

function openModal(type) {
  document.getElementById('modal-'+type).classList.add('open');
  setTimeout(function(){const el=document.querySelector('#modal-'+type+' .form-input');if(el)el.focus();},80);
}

function closeModal(type) {
  document.getElementById('modal-'+type).classList.remove('open');
  if (type==='goal') {
    editGoalId = null;
    const btn = document.querySelector('#modal-goal .btn-primary');
    if (btn) { btn.innerHTML='<i class="ti ti-plus"></i> 추가하기'; btn.onclick=addGoal; }
  }
}

function addTask() {
  const name = document.getElementById('task-name').value.trim();
  if (!name) { document.getElementById('task-name').focus(); return; }
  const time = document.getElementById('task-time').value;
  const h = parseInt(time.split(':')[0]);
  const period = h < 9 ? 'morning' : h < 18 ? 'daytime' : 'evening';
  const cat = document.getElementById('task-cat').value;
  const memo = document.getElementById('task-memo').value.trim();
  state.tasks.push({id:state.nextId++,name:name,time:time,period:period,done:false,cat:cat,memo:memo});
  saveData(); closeModal('task');
  document.getElementById('task-name').value='';
  document.getElementById('task-memo').value='';
  renderRoutineSections();
  if (document.getElementById('page-settings').classList.contains('active')) renderSettings();
}

function addGoal() {
  const name = document.getElementById('goal-name').value.trim();
  if (!name) { document.getElementById('goal-name').focus(); return; }
  const period = document.getElementById('goal-period').value;
  const cat = document.getElementById('goal-cat').value;
  const target = parseFloat(document.getElementById('goal-target').value)||1;
  const unit = document.getElementById('goal-unit').value.trim()||'개';
  const deadline = document.getElementById('goal-deadline').value;
  state.goals.push({id:state.nextId++,name:name,period:period,target:target,current:0,unit:unit,cat:cat,deadline:deadline});
  saveData(); closeModal('goal');
  ['goal-name','goal-target','goal-unit','goal-deadline'].forEach(function(id){const el=document.getElementById(id);if(el)el.value='';});
  if (document.getElementById('page-goals').classList.contains('active')) renderGoals();
  if (document.getElementById('page-settings').classList.contains('active')) renderSettings();
  addAlert('info','새 목표 추가됨','\''+name+'\' 목표가 추가되었습니다. 화이팅!');
}

function openProgress(id) {
  progressTargetId = id;
  const g = state.goals.find(function(g){return g.id===id;});
  if (!g) return;
  document.getElementById('progress-goal-name').textContent = g.name;
  document.getElementById('progress-goal-info').textContent = '현재: '+g.current+g.unit+' / 목표: '+g.target+g.unit;
  document.getElementById('progress-val').value = g.current;
  openModal('progress');
}

function saveProgress() {
  if (!progressTargetId) return;
  const g = state.goals.find(function(g){return g.id===progressTargetId;});
  if (!g) return;
  const val = parseFloat(document.getElementById('progress-val').value);
  if (isNaN(val)||val<0) return;
  const wasDone = g.current >= g.target;
  g.current = val;
  if (!wasDone && val >= g.target) {
    addAlert('success','목표 달성!','\''+g.name+'\' 목표를 달성했습니다!');
    sendNotif('목표 달성!','\''+g.name+'\' 목표를 달성했습니다!');
  }
  saveData(); closeModal('progress');
  if (document.getElementById('page-goals').classList.contains('active')) renderGoals();
  if (document.getElementById('page-stats').classList.contains('active')) renderStats();
  if (document.getElementById('page-settings').classList.contains('active')) renderSettings();
}

function sendNotif(title, body) {
  if (isElectron) window.electronAPI.sendNotification({title:title,body:body});
  else if ('Notification' in window && Notification.permission==='granted') new Notification(title,{body:body});
}

function checkMorningAlerts() {
  const h = new Date().getHours();
  if (h>=7&&h<=9&&getCompletionPct()===0) addAlert('info','좋은 아침입니다!','오늘의 루틴을 시작해 보세요!');
}

function periodicCheck() {
  checkEventAlarms();
  const h = new Date().getHours(), m = new Date().getMinutes();
  if (m===0) {
    const hm = {9:'오전 업무 루틴을 확인하세요!',13:'점심 후 10분 산책 시간입니다',18:'저녁 루틴을 시작할 시간이에요',21:'독서 30분 & 일기 쓰기 시간입니다'};
    if (hm[h]) sendNotif('Kyu Sik Planner',hm[h]);
  }
}

document.addEventListener('keydown', function(e){
  if (e.key==='Escape') document.querySelectorAll('.modal-overlay.open').forEach(function(m){closeModal(m.id.replace('modal-',''));});
});

if (!isElectron&&'Notification'in window&&Notification.permission==='default') Notification.requestPermission();

init();

/* ══════════════════════════════════════
   일정 관리 (비정기 일정)
══════════════════════════════════════ */

let currentEventFilter = 'upcoming';
let editEventId = null;
let scheduleView = 'events';

// 일정 탭 전환
function switchScheduleView(view) {
  scheduleView = view;
  if (view === 'timeline') {
    document.getElementById('event-list').style.display = 'none';
    document.getElementById('event-filter-row').style.display = 'none';
    document.getElementById('timeline-list').style.display = '';
    document.getElementById('btn-view-timeline').innerHTML = '<i class="ti ti-calendar-event"></i> 일정 목록';
    document.getElementById('btn-view-timeline').onclick = function(){ switchScheduleView('events'); };
    renderTimeline();
  } else {
    document.getElementById('event-list').style.display = '';
    document.getElementById('event-filter-row').style.display = 'flex';
    document.getElementById('timeline-list').style.display = 'none';
    document.getElementById('btn-view-timeline').innerHTML = '<i class="ti ti-layout-list"></i> 루틴 타임라인';
    document.getElementById('btn-view-timeline').onclick = function(){ switchScheduleView('timeline'); };
    renderEvents();
  }
}

// 일정 필터 이벤트 설정
function setupEventFilters() {
  document.querySelectorAll('[data-efilter]').forEach(function(tag) {
    tag.addEventListener('click', function() {
      document.querySelectorAll('[data-efilter]').forEach(function(t){ t.classList.remove('active'); });
      tag.classList.add('active');
      currentEventFilter = tag.dataset.efilter;
      renderEvents();
    });
  });
}

// 일정 렌더링
function renderEvents() {
  const el = document.getElementById('event-list');
  if (!el) return;
  const now = new Date();
  const todayStr = now.toDateString();
  let events = (state.events || []).slice().sort(function(a,b){ return new Date(a.date+' '+a.time) - new Date(b.date+' '+b.time); });

  if (currentEventFilter === 'upcoming') {
    events = events.filter(function(e){ return !e.done && new Date(e.date+' '+e.time) >= now; });
  } else if (currentEventFilter === 'today') {
    events = events.filter(function(e){ return new Date(e.date).toDateString() === todayStr; });
  } else if (currentEventFilter === 'done') {
    events = events.filter(function(e){ return e.done; });
  }

  if (!events.length) {
    el.innerHTML = '<div style="text-align:center;color:var(--t3);padding:40px;font-size:13px">'
      +(currentEventFilter==='upcoming'?'예정된 일정이 없습니다':currentEventFilter==='today'?'오늘 일정이 없습니다':'일정이 없습니다')
      +'<br><button class="btn-primary" style="margin-top:12px" onclick="openModal(\'event\')"><i class="ti ti-plus"></i> 일정 추가</button></div>';
    return;
  }

  const catColor = {업무:'teal',개인:'blue',건강:'green',가족:'coral',친구:'purple',재정:'amber',학습:'blue',기타:'gray'};
  let html = '';
  let lastDate = '';

  events.forEach(function(e) {
    const eventDate = new Date(e.date + ' ' + (e.time||'00:00'));
    const dateStr = new Date(e.date).toLocaleDateString('ko-KR', {month:'long',day:'numeric',weekday:'short'});
    const isPast = eventDate < now && !e.done;
    const isToday = new Date(e.date).toDateString() === todayStr;

    if (dateStr !== lastDate) {
      html += '<div style="font-size:12px;font-weight:500;color:var(--t2);margin:'+(lastDate?'20px':'8px')+' 0 8px;padding-bottom:6px;border-bottom:0.5px solid var(--border)">'
        +(isToday?'<span class="badge blue" style="margin-right:6px">오늘</span>':'')+dateStr+'</div>';
      lastDate = dateStr;
    }

    const alarmLabels = (e.alarms||[]).map(function(a){
      return a===1440?'1일전':a===180?'3시간전':a===60?'1시간전':a===30?'30분전':'정시';
    }).join(', ');

    const cc = catColor[e.cat] || 'blue';
    html += '<div class="event-item '+(e.done?'done':'')+(isPast?' past':'')+'" onclick="openEditEvent('+e.id+')">'
      +'<div class="event-left">'
      +'<div class="event-time">'+(e.time||'종일')+'</div>'
      +'<div class="event-alarm-badge">'+(alarmLabels?'<i class="ti ti-bell" style="font-size:10px;color:var(--amber)"></i>':'')+'</div>'
      +'</div>'
      +'<div class="event-body">'
      +'<div class="event-title '+(e.done?'done-text':isPast?'past-text':'')+'">'+(isPast?'<i class="ti ti-clock" style="font-size:11px;color:var(--coral)"></i> ':'')+e.title+'</div>'
      +'<div class="event-meta">'
      +'<span class="badge '+cc+'" style="font-size:10px;padding:1px 7px">'+e.cat+'</span>'
      +(e.memo?'<span style="font-size:11px;color:var(--t3)">'+e.memo+'</span>':'')
      +(alarmLabels?'<span style="font-size:10px;color:var(--amber)"><i class="ti ti-bell" style="font-size:10px"></i> '+alarmLabels+'</span>':'')
      +'</div>'
      +'</div>'
      +'<div class="event-actions">'
      +'<button class="btn-icon" onclick="event.stopPropagation();toggleEventDone('+e.id+')" title="'+(e.done?'미완료':'완료')+'" style="margin-right:2px">'
      +'<i class="ti '+(e.done?'ti-rotate-clockwise':'ti-circle-check')+'" style="font-size:14px;color:'+(e.done?'var(--t3)':'var(--green)')+'"></i></button>'
      +'<button class="btn-icon" onclick="event.stopPropagation();deleteEvent('+e.id+')" title="삭제">'
      +'<i class="ti ti-trash" style="font-size:14px"></i></button>'
      +'</div>'
      +'</div>';
  });
  el.innerHTML = html;
}

function toggleEventDone(id) {
  const e = (state.events||[]).find(function(e){ return e.id===id; });
  if (e) { e.done = !e.done; saveData(); renderEvents(); }
}

function deleteEvent(id) {
  if (!confirm('이 일정을 삭제할까요?')) return;
  state.events = (state.events||[]).filter(function(e){ return e.id!==id; });
  saveData(); renderEvents();
}

function addEvent() {
  const title = document.getElementById('event-title').value.trim();
  if (!title) { document.getElementById('event-title').focus(); return; }
  const date = document.getElementById('event-date').value;
  if (!date) { document.getElementById('event-date').focus(); return; }
  const alarms = [];
  [['alarm-1d',1440],['alarm-3h',180],['alarm-1h',60],['alarm-30m',30],['alarm-0',0]].forEach(function(pair){
    if (document.getElementById(pair[0]).checked) alarms.push(pair[1]);
  });
  const ev = {
    id: state.nextId++,
    title: title,
    date: date,
    time: document.getElementById('event-time').value,
    cat: document.getElementById('event-cat').value,
    memo: document.getElementById('event-memo').value.trim(),
    alarms: alarms,
    done: false,
    notified: []
  };
  if (!state.events) state.events = [];
  state.events.push(ev);
  saveData();
  closeModal('event');
  document.getElementById('event-title').value = '';
  document.getElementById('event-memo').value = '';
  document.getElementById('event-date').value = '';
  document.getElementById('event-time').value = '';
  document.getElementById('alarm-1h').checked = true;
  ['alarm-1d','alarm-3h','alarm-30m','alarm-0'].forEach(function(id){ document.getElementById(id).checked = false; });
  addAlert('info','일정 추가됨','\''+ev.title+'\' 일정이 등록되었습니다. ('+date+')');
  renderEvents();
}

function openEditEvent(id) {
  editEventId = id;
  const e = (state.events||[]).find(function(e){ return e.id===id; });
  if (!e) return;
  document.getElementById('edit-event-title').value = e.title;
  document.getElementById('edit-event-date').value = e.date;
  document.getElementById('edit-event-time').value = e.time||'';
  document.getElementById('edit-event-memo').value = e.memo||'';
  const catEl = document.getElementById('edit-event-cat');
  for (let i=0; i<catEl.options.length; i++) {
    if (catEl.options[i].text === e.cat) { catEl.selectedIndex=i; break; }
  }
  [['edit-alarm-1d',1440],['edit-alarm-3h',180],['edit-alarm-1h',60],['edit-alarm-30m',30],['edit-alarm-0',0]].forEach(function(pair){
    document.getElementById(pair[0]).checked = (e.alarms||[]).includes(pair[1]);
  });
  openModal('edit-event');
}

function saveEditEvent() {
  if (!editEventId) return;
  const e = (state.events||[]).find(function(e){ return e.id===editEventId; });
  if (!e) return;
  const title = document.getElementById('edit-event-title').value.trim();
  if (!title) return;
  e.title = title;
  e.date = document.getElementById('edit-event-date').value;
  e.time = document.getElementById('edit-event-time').value;
  e.cat = document.getElementById('edit-event-cat').value;
  e.memo = document.getElementById('edit-event-memo').value.trim();
  const alarms = [];
  [['edit-alarm-1d',1440],['edit-alarm-3h',180],['edit-alarm-1h',60],['edit-alarm-30m',30],['edit-alarm-0',0]].forEach(function(pair){
    if (document.getElementById(pair[0]).checked) alarms.push(pair[1]);
  });
  e.alarms = alarms;
  e.notified = [];
  saveData();
  closeModal('edit-event');
  renderEvents();
}

function deleteEventFromEdit() {
  if (!editEventId || !confirm('삭제할까요?')) return;
  state.events = (state.events||[]).filter(function(e){ return e.id!==editEventId; });
  saveData();
  closeModal('edit-event');
  renderEvents();
}

// 일정 알림 체크 (1분마다)
function checkEventAlarms() {
  if (!state.events) return;
  const now = new Date();
  state.events.forEach(function(e) {
    if (e.done) return;
    const eventTime = new Date(e.date + ' ' + (e.time||'00:00'));
    const diffMin = Math.round((eventTime - now) / 60000);
    (e.alarms||[]).forEach(function(alarmMin) {
      const key = e.id + '_' + alarmMin;
      if (!e.notified) e.notified = [];
      if (e.notified.includes(key)) return;
      if (Math.abs(diffMin - alarmMin) <= 1) {
        e.notified.push(key);
        const whenStr = alarmMin===1440?'내일':alarmMin===180?'3시간 후':alarmMin===60?'1시간 후':alarmMin===30?'30분 후':'지금';
        const msg = '\''+e.title+'\' 일정이 '+whenStr+' 시작합니다!'+(e.memo?' ('+e.memo+')':'');
        sendNotif('일정 알림', msg);
        addAlert('warning','일정 알림', msg);
        showEventPopup(e, whenStr);
        saveData();
      }
    });
  });
}

// 팝업 알림
function showEventPopup(e, whenStr) {
  const existing = document.getElementById('event-popup');
  if (existing) existing.remove();
  const popup = document.createElement('div');
  popup.id = 'event-popup';
  popup.style.cssText = 'position:fixed;top:20px;right:20px;background:var(--bg);border:0.5px solid var(--border2);border-radius:var(--radius-lg);padding:16px 20px;z-index:9999;min-width:280px;max-width:360px;box-shadow:0 8px 32px rgba(0,0,0,.15)';
  popup.innerHTML = '<div style="display:flex;align-items:flex-start;gap:12px">'
    +'<div style="background:var(--amber-bg);width:36px;height:36px;border-radius:var(--radius);display:flex;align-items:center;justify-content:center;flex-shrink:0">'
    +'<i class="ti ti-bell" style="font-size:18px;color:var(--amber)"></i></div>'
    +'<div style="flex:1">'
    +'<div style="font-size:13px;font-weight:500;color:var(--t1);margin-bottom:4px">일정 알림</div>'
    +'<div style="font-size:13px;color:var(--t1)">'+e.title+'</div>'
    +'<div style="font-size:12px;color:var(--amber);margin-top:3px">'+whenStr+' 시작</div>'
    +(e.memo?'<div style="font-size:11px;color:var(--t2);margin-top:2px">'+e.memo+'</div>':'')
    +'</div>'
    +'<button onclick="document.getElementById(\'event-popup\').remove()" style="border:none;background:transparent;color:var(--t3);cursor:pointer;font-size:16px;padding:0">×</button>'
    +'</div>';
  document.body.appendChild(popup);
  setTimeout(function(){ if(document.getElementById('event-popup')) document.getElementById('event-popup').remove(); }, 10000);
}

// 오늘 날짜 기본값 설정
function setDefaultEventDate() {
  const today = new Date().toISOString().split('T')[0];
  const el = document.getElementById('event-date');
  if (el && !el.value) el.value = today;
}

