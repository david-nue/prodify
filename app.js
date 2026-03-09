// Force clear old broken SW caches
if('serviceWorker' in navigator){
  navigator.serviceWorker.getRegistrations().then(regs=>{
    regs.forEach(r=>{
      r.update(); // check for new SW version immediately
    });
  });
  // If SW cache version mismatch, clear all caches
  caches.keys().then(keys=>{
    keys.forEach(k=>{ if(!k.includes('v56')) caches.delete(k); });
  });
}




// ── Canvas drag-to-pan (mouse + touch) ──
document.addEventListener('DOMContentLoaded', function(){
  const scroll = document.getElementById('canvas-scroll');
  const cvs    = document.getElementById('canvas');
  if(!scroll || !cvs) return;

  let active = false, startX, startY, scrollX, scrollY;

  function isWidget(t){
    return t.closest('.widget') || t.closest('.wtray') || t.closest('.canvas-topbar');
  }

  // MOUSE
  cvs.addEventListener('mousedown', function(e){
    if(isWidget(e.target)) return;
    if(e.button !== 0) return;
    active = true;
    startX = e.clientX;
    startY = e.clientY;
    scrollX = scroll.scrollLeft;
    scrollY = scroll.scrollTop;
    cvs.style.cursor = 'grabbing';
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e){
    if(!active) return;
    scroll.scrollLeft = scrollX - (e.clientX - startX);
    scroll.scrollTop  = scrollY - (e.clientY - startY);
  });
  document.addEventListener('mouseup', function(){
    if(!active) return;
    active = false;
    cvs.style.cursor = 'grab';
  });

  // ── ZOOM STATE ──
  let _scale = 1;
  const MIN_SCALE = 0.3, MAX_SCALE = 2.5;

  function applyZoom(newScale, originX, originY){
    // originX/Y are coordinates relative to scroll viewport
    const prevScale = _scale;
    _scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
    // Adjust scroll so zoom centres on the origin point
    const ratio = _scale / prevScale;
    scroll.scrollLeft = (scroll.scrollLeft + originX) * ratio - originX;
    scroll.scrollTop  = (scroll.scrollTop  + originY) * ratio - originY;
    cvs.style.transformOrigin = '0 0';
    cvs.style.transform = `scale(${_scale})`;
    // Keep scroll container aware of scaled size
    cvs.style.width  = (2400 * _scale) + 'px';
    cvs.style.height = (1800 * _scale) + 'px';
  }

  // ── SCROLL WHEEL ZOOM (desktop) — always zoom, even over widgets ──
  scroll.addEventListener('wheel', function(e){
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = scroll.getBoundingClientRect();
    const ox = e.clientX - rect.left;
    const oy = e.clientY - rect.top;
    applyZoom(_scale * delta, ox, oy);
  }, {passive:false});

  // ── TOUCH (tablet) — single finger pan, two finger pinch zoom ──
  let _pinching = false, _pinchDist0 = 0, _pinchScale0 = 1;

  function pinchDist(touches){
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx*dx + dy*dy);
  }
  function pinchMid(touches, rect){
    return {
      x: ((touches[0].clientX + touches[1].clientX) / 2) - rect.left,
      y: ((touches[0].clientY + touches[1].clientY) / 2) - rect.top
    };
  }

  cvs.addEventListener('touchstart', function(e){
    if(e.touches.length === 2){
      _pinching = true;
      active = false;
      _pinchDist0 = pinchDist(e.touches);
      _pinchScale0 = _scale;
      e.preventDefault();
      return;
    }
    if(isWidget(e.target)) return;
    if(e.touches.length === 1){
      const t = e.touches[0];
      active = true;
      startX = t.clientX;
      startY = t.clientY;
      scrollX = scroll.scrollLeft;
      scrollY = scroll.scrollTop;
    }
    e.preventDefault();
  },{passive:false});

  cvs.addEventListener('touchmove', function(e){
    if(_pinching && e.touches.length === 2){
      const dist = pinchDist(e.touches);
      const rect = scroll.getBoundingClientRect();
      const mid  = pinchMid(e.touches, rect);
      applyZoom(_pinchScale0 * (dist / _pinchDist0), mid.x, mid.y);
      e.preventDefault();
      return;
    }
    if(!active || e.touches.length !== 1) return;
    const t = e.touches[0];
    scroll.scrollLeft = scrollX - (t.clientX - startX);
    scroll.scrollTop  = scrollY - (t.clientY - startY);
    e.preventDefault();
  },{passive:false});

  cvs.addEventListener('touchend', function(e){
    if(e.touches.length < 2) _pinching = false;
    if(e.touches.length === 0) active = false;
  });
  cvs.addEventListener('touchcancel', function(){ active = false; _pinching = false; });
});



function togglePw(inputId,btn){
  const inp=document.getElementById(inputId);if(!inp)return;
  const show=inp.type==='password';
  inp.type=show?'text':'password';
  btn.innerHTML=show?'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>':'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
}


// ═══════════════════════════════════════
// SUPABASE CONFIG — paste your credentials here
// ═══════════════════════════════════════
const SB_URL = 'https://kvezrezhicjlhycghucr.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2ZXpyZXpoaWNqbGh5Y2dodWNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzMxMTMsImV4cCI6MjA4ODQ0OTExM30.-Gb6LHePwJ0yK54e0POijp_6qVwg1gqtiAj3pN8sKF8';

let sb = null;
let sbReady = false;

function initSupabase(){
  if(!SB_URL || !SB_KEY){ sbReady=false; return; }
  try{
    if(typeof supabase === 'undefined' || !supabase.createClient){
      console.warn('[Prodify] Supabase library not loaded, using local storage.');
      sbReady=false; return;
    }
    sb = supabase.createClient(SB_URL.trim(), SB_KEY.trim(), {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    sbReady = true;
    if(typeof cu !== 'undefined' && cu) setTimeout(()=>startRealtimeSync(cu), 0);
  }catch(e){
    console.warn('[Prodify] Supabase init failed, using local storage.',e);
    sbReady = false;
  }
}

// ── SUPABASE AUTH HELPERS ──
async function sbSignUp(email, password){
  const {data,error} = await sb.auth.signUp({email, password});
  if(error) return {error};
  return {user: data.user};
}
async function sbSignIn(email, password){
  const {data,error} = await sb.auth.signInWithPassword({email, password});
  if(error) return {error};
  return {user: data.user, session: data.session};
}
async function sbSignOut(){
  await sb.auth.signOut();
}
async function sbGetSession(){
  const {data} = await sb.auth.getSession();
  return data.session;
}

// ── GLOBAL TOOLTIP ──
(function(){
  const tip=document.getElementById('g-tip');
  if(!tip)return;
  document.addEventListener('mouseover',e=>{
    const wb=e.target.closest('.wb');
    if(!wb)return;
    const t=wb.querySelector('.wbtip');
    if(!t)return;
    const rect=wb.getBoundingClientRect();
    tip.textContent=t.textContent.trim();
    tip.style.opacity='0';tip.style.display='block';
    tip.style.left=(rect.right+10)+'px';
    tip.style.top=(rect.top+rect.height/2-tip.offsetHeight/2)+'px';
    tip.style.opacity='1';
  });
  document.addEventListener('mouseout',e=>{
    const wb=e.target.closest('.wb');
    if(!wb)return;
    if(!wb.contains(e.relatedTarget)){tip.style.opacity='0';setTimeout(()=>{if(tip.style.opacity==='0')tip.style.display='none';},120);}
  });
})();

// Supabase is loaded via <script> in index.html before app.js
// Initialize immediately — no dynamic loading needed
// (Supabase initialized after state variables below)

// DB helpers — all async, fall back to local silently
// All reads/writes use the Supabase Auth session (JWT) for RLS
async function dbGetUser(username){
  if(!sbReady) return null;
  try{
    const {data,error}=await sb.from('users').select('*').eq('username',username).single();
    if(error)return null;
    return data;
  }catch(e){return null;}
}
async function dbCreateUser(username,passHash,displayName,authId,email){
  if(!sbReady) return false;
  try{
    const {error}=await sb.from('users').insert({
      username, pass_hash:passHash, display_name:displayName||'',
      email:email||'', auth_id:authId||null,
      tasks:'[]',journal:'[]',subjects:'[]',cal_evs:'[]',
      widgets:'[]',notes:'{}',prefs:'{}',joined_at:new Date().toISOString()
    });
    if(error){console.error('[Prodify] dbCreateUser error:',error.message);}
    return !error;
  }catch(e){return false;}
}
async function dbSaveUser(username,data){
  if(!sbReady) return;
  _lastSaveTs = Date.now();
  try{
    const prefsToSave = Object.assign({}, data.prefs||{});
    delete prefsToSave.avatarPhoto;
    const {error:saveErr} = await sb.from('users').update({
      pass_hash:data.passHash,
      display_name:data.displayName||'',
      tasks:JSON.stringify(data.tasks||[]),
      journal:JSON.stringify(data.journal||[]),
      subjects:JSON.stringify(data.subjects||[]),
      cal_evs:JSON.stringify(data.calEvs||[]),
      widgets:JSON.stringify(data.widgets||[]),
      notes:JSON.stringify(data.notes||{}),
      prefs:JSON.stringify(prefsToSave),
    }).eq('username', username);
    if(saveErr){console.error('[Prodify] Save error:',saveErr.message);}
    else{console.log('[Prodify] Saved OK');}
  }catch(e){console.error('[Prodify] Supabase save FAILED:',e?.message||e);}
}
async function dbDeleteUser(username){
  if(!sbReady) return;
  try{ await sb.from('users').delete().eq('username',username); }catch(e){}
}
async function dbSetAuthId(username,authId,email){
  if(!sbReady) return;
  try{ await sb.from('users').update({auth_id:authId,email}).eq('username',username); }catch(e){}
}

// ── REALTIME SYNC ──
let _realtimeChannel = null;
let _lastSaveTs = 0;

function startRealtimeSync(username){
  if(!sbReady || !sb || !username) return;
  // Remove existing channel
  if(_realtimeChannel){try{sb.removeChannel(_realtimeChannel);}catch(e){}_realtimeChannel=null;}
  _realtimeChannel = sb
    .channel('prodify-user-'+username)
    .on('postgres_changes',{
      event:'UPDATE',
      schema:'public',
      table:'users',
      filter:'username=eq.'+username
    }, payload=>{
      // Only block if WE just saved (echo prevention)
      if(Date.now()-_lastSaveTs < 2000) return;
      applyRemoteData(payload.new);
    })
    .subscribe(status=>{
      });
}

function stopRealtimeSync(){
  if(_realtimeChannel && sb){try{sb.removeChannel(_realtimeChannel);}catch(e){}}
  _realtimeChannel=null;
}

function applyRemoteData(row){
  if(!row||!cu) return;
  try{
    const d = acc[cu] || {};
    // Parse and apply each data field
    if(row.tasks)       { tasks    = JSON.parse(row.tasks);    d.tasks    = tasks;    }
    if(row.journal)     { journal  = JSON.parse(row.journal);  d.journal  = journal;  }
    if(row.subjects)    { subjects = JSON.parse(row.subjects); d.subjects = subjects; }
    if(row.cal_evs)     { calEvs   = JSON.parse(row.cal_evs);  d.calEvs   = calEvs;   }
    if(row.widgets)     { widgets  = JSON.parse(row.widgets);  d.widgets  = widgets;  }
    if(row.notes)       { notes    = JSON.parse(row.notes);    d.notes    = notes;    }
    if(row.prefs){
      const rp=JSON.parse(row.prefs);
      // Don't overwrite local avatar photo to avoid flicker
      const localPhoto=prefs.avatarPhoto;
      prefs=rp;
      if(localPhoto&&!rp.avatarPhoto) prefs.avatarPhoto=localPhoto;
      d.prefs=prefs;
    }
    acc[cu]=d;
    LS.s('pd1_acc',acc);
    // Re-render everything
    renderAllTaskW();
    renderCanvas();
    updateAllStatsW(); updateFixedStats();
    if(typeof renderSubFull==='function') renderSubFull();
    if(typeof renderAllSubW==='function') renderAllSubW();
    if(typeof renderCal==='function') renderCal();
    if(typeof renderWidgets==='function') renderWidgets();
    if(typeof mobRenderTasks==='function') mobRenderTasks();
    if(typeof mobRenderProjects==='function') mobRenderProjects();
    if(typeof mobRenderHome==='function') mobRenderHome();
    if(typeof mobRenderJournal==='function') mobRenderJournal();
    if(typeof applyDark==='function') applyDark(prefs.dark);
  }catch(e){ console.error('[Prodify] applyRemoteData error',e); }
}

// ═══════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════
const QQ=[
  {t:"The secret of getting ahead is getting started.",a:"Mark Twain"},
  {t:"Focus on being productive instead of being busy.",a:"Tim Ferriss"},
  {t:"It always seems impossible until it's done.",a:"Nelson Mandela"},
  {t:"You don't have to be great to start, but you have to start to be great.",a:"Zig Ziglar"},
  {t:"Hard work beats talent when talent doesn't work hard.",a:"Tim Notke"},
  {t:"The expert in anything was once a beginner.",a:"Helen Hayes"},
  {t:"Believe you can and you're halfway there.",a:"Theodore Roosevelt"},
  {t:"Do something today that your future self will thank you for.",a:"Sean Patrick Flanery"},
  {t:"Success is the sum of small efforts, repeated day in and day out.",a:"Robert Collier"},
  {t:"The key is not to prioritize what's on your schedule, but to schedule your priorities.",a:"Stephen Covey"},
  {t:"Either you run the day or the day runs you.",a:"Jim Rohn"},
  {t:"Done is better than perfect.",a:"Sheryl Sandberg"},
];
const MLAB=[
  {e:'😄',l:'Great'},
  {e:'🙂',l:'Good'},
  {e:'😐',l:'Okay'},
  {e:'😔',l:'Low'},
  {e:'😴',l:'Tired'},
  {e:'😤',l:'Stressed'},
  {e:'😰',l:'Anxious'},
  {e:'🔥',l:'Pumped'},
  {e:'🧘',l:'Calm'},
  {e:'😤',l:'Frustrated'},
  {e:'🥰',l:'In Love'},
];
const PRIORITY_ORDER={high:0,medium:1,low:2,undefined:3};
let qIdx=Math.floor(Math.random()*QQ.length);

// ═══════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════
const LS={
  g:(k,d=null)=>{try{const v=localStorage.getItem(k);return v!==null?JSON.parse(v):d;}catch(e){return d;}},
  s:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}},
  d:(k)=>localStorage.removeItem(k),
};

// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════
let acc=LS.g('pd1_acc',{}), cu=LS.g('pd1_cur',null);
initSupabase();
let tasks=[],journal=[],subjects=[],calEvs=[],widgets=[],notes={};
let prefs={dark:false};
let dragTaskId=null, calOff=0, nextZ=10;
let _selTask=null;
let curMood=0;
// per-widget timer state (not persisted)
const TMS={};
const TMODES=[{l:'Pomodoro',s:25*60,locked:true},{l:'Short',s:5*60,locked:true},{l:'Long',s:15*60,locked:true},{l:'Custom',s:20*60,locked:false}];

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
const $=id=>document.getElementById(id);
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function hp(p){let h=0;for(let i=0;i<p.length;i++){h=((h<<5)-h)+p.charCodeAt(i);h|=0;}return h.toString(16);}
function fe(id,m){const e=$(id);e.textContent=m;e.style.display=m?'block':'none';}
function safePhotoSrc(photo){if(!photo)return null;if(!photo.startsWith('data:image/'))return null;return photo;}

// ── RATE LIMITING ──
const _loginAttempts={};
const MAX_ATTEMPTS=5;
const LOCKOUT_MS=15*60*1000;
function checkRateLimit(username){
  const key=username.toLowerCase(),now=Date.now();
  if(!_loginAttempts[key])_loginAttempts[key]={count:0,lockedUntil:0};
  const entry=_loginAttempts[key];
  if(entry.lockedUntil>now){const mins=Math.ceil((entry.lockedUntil-now)/60000);return `Too many attempts. Try again in ${mins} minute${mins>1?'s':''}.`;}
  return null;
}
function recordLoginFailure(username){
  const key=username.toLowerCase();
  if(!_loginAttempts[key])_loginAttempts[key]={count:0,lockedUntil:0};
  _loginAttempts[key].count++;
  if(_loginAttempts[key].count>=MAX_ATTEMPTS){_loginAttempts[key].lockedUntil=Date.now()+LOCKOUT_MS;_loginAttempts[key].count=0;}
}
function clearLoginAttempts(username){delete _loginAttempts[username.toLowerCase()];}
function ce(...ids){ids.forEach(id=>fe(id,''));}
function fmtSec(s){const m=Math.floor(s/60),sc=s%60;return `${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`;}

// ═══════════════════════════════════════
// SCREENS & PAGES
// ═══════════════════════════════════════
function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('off',s.id!==id));
  // on mobile, mob-app replaces the desktop #app content
  const mobApp=document.getElementById('mob-app');
  if(mobApp&&isMobile()){
    if(id==='app'){mobApp.style.display='flex';}
    else{mobApp.style.display='none';}
  }
}

function goPg(id,btn){
  document.querySelectorAll('.pg').forEach(p=>p.classList.toggle('off',p.id!=='pg-'+id));
  document.querySelectorAll('.sbb').forEach(b=>b.classList.toggle('act',b.dataset&&b.dataset.p===id));
  if(id==='canvas'){renderFixedQuote();if(isMobile())renderMobileCanvas();}
  if(id==='profile')renderProfile();
  if(id==='calendar')renderFullCal();
  if(id==='settings')renderSettings();
  if(id==='subjects')renderSubFull();
  LS.s('pd1_pg',id);
}

// ── MOBILE HELPERS ──
function isMobile(){return window.innerWidth<=600;}
function setTab(id){
  document.querySelectorAll('.btab').forEach(b=>b.classList.toggle('act',b.id==='bt-'+id));
}

// Widget picker sheet
function toggleMobilePicker(){
  const overlay=document.getElementById('mob-picker-overlay');
  const picker=document.getElementById('mob-picker');
  const icon=document.getElementById('fab-icon');
  const isOpen=picker.classList.contains('open');
  overlay.classList.toggle('open',!isOpen);
  picker.classList.toggle('open',!isOpen);
  icon.style.transform=isOpen?'rotate(0deg)':'rotate(45deg)';
  icon.style.transition='transform .2s';
}
function closeMobilePicker(){
  document.getElementById('mob-picker-overlay').classList.remove('open');
  document.getElementById('mob-picker').classList.remove('open');
  const icon=document.getElementById('fab-icon');
  if(icon){icon.style.transform='rotate(0deg)';}
}

// ══════════════════════════════════════
// MOBILE APP — full-screen pages
// ══════════════════════════════════════
let _mobPage = 'home';
let _mobCalOff = 0;
let _mobSelDay = null;
let _mobTaskTab = 'todo';
let _mobMood = 0;

// Timer state (standalone, independent of desktop)
let _mobTimerMode = 0;
let _mobTimerSec = 25*60;
let _mobTimerCustom=[25*60,5*60,15*60,20*60];
let _mobTimerRunning = false;
let _mobTimerIv = null;
let _mobTimerSessions = 0;
let _mobTimerAlarmActive = false;
// Sync mobile custom times with desktop TMS['mob'] when a widget exists
function _syncMobCustom(){
  const ts=TMS['mob']||Object.values(TMS)[0];
  if(ts&&ts.custom){
    _mobTimerCustom[3]=ts.custom[3]; // sync custom slot
  }
}
const MOB_TMODES = [{l:'Pomodoro',s:25*60,locked:true},{l:'Short Break',s:5*60,locked:true},{l:'Long Break',s:15*60,locked:true},{l:'Custom',s:20*60,locked:false}];

function isMobile(){return window.innerWidth<=600;}

function mobGoPage(page){
  if(!isMobile())return;
  // deactivate current
  const cur = document.getElementById('mpg-'+_mobPage);
  if(cur)cur.classList.remove('active');
  const curBtn = document.getElementById('mnb-'+_mobPage);
  if(curBtn)curBtn.classList.remove('act');
  _mobPage = page;
  // activate new
  const next = document.getElementById('mpg-'+page);
  if(next)next.classList.add('active');
  const nextBtn = document.getElementById('mnb-'+page);
  if(nextBtn)nextBtn.classList.add('act');
  // render page content
  if(page==='home')mobRenderHome();
  else if(page==='tasks')mobRenderTasks();
  else if(page==='journal')mobRenderJournal();
  else if(page==='projects')mobRenderProjects();
  else if(page==='calendar')mobRenderCalendar();
  else if(page==='profile')mobRenderProfile();
  else if(page==='settings')mobRenderSettings();
  LS.s('pd1_mobpg',page);
}

// ── HOME ──
function mobRenderHome(){
  // greeting
  const nm = document.getElementById('mob-greet-name');
  const firstName=(acc[cu]?.displayName||'').split(' ')[0]||cu||'there';
  if(nm) nm.textContent = 'Hey, '+firstName+' 👋';
  const dt = document.getElementById('mob-greet-date');
  if(dt) dt.textContent = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  // quote
  const q = QQ[qIdx];
  const qt = document.getElementById('mob-qt');
  const qa = document.getElementById('mob-qa');
  if(qt&&q) qt.textContent = '“'+q.t+'”';
  if(qa&&q) qa.textContent = '— '+q.a;
  // stats
  const done = tasks.filter(t=>t.col==='done').length;
  const el = (id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  const hi = tasks.filter(t=>t.priority==='high'&&t.col!=='done').length;
  el('mst-tasks',tasks.length);
  el('mst-done',done);
  el('mst-hi',hi);
  el('mst-journal',journal.length);
  el('mst-proj',subjects.length);
  // today events
  const today = new Date().toISOString().slice(0,10);
  const todayEvs = calEvs.filter(e=>e.date===today);
  const evEl = document.getElementById('mob-today-evs');
  if(evEl){
    if(!todayEvs.length){
      evEl.innerHTML='<div class="mob-ev-row"><span style="font-size:12px;color:var(--ink4);">No events today</span></div>';
    } else {
      evEl.innerHTML = todayEvs.map(ev=>`
        <div class="mob-ev-row">
          <div class="mob-ev-dot" style="background:${ev.subColor||'var(--a2)'}"></div>
          <div class="mob-ev-title">${esc(ev.title)}</div>
        </div>`).join('');
    }
  }
  // pending tasks (show up to 5 non-done)
  const pending = sortByPriority(tasks.filter(t=>t.col!=='done')).slice(0,5);
  const taskEl = document.getElementById('mob-home-tasks');
  const taskHd = document.getElementById('mob-tasks-hd-lbl');
  const pendingCount = tasks.filter(t=>t.col!=='done').length;
  if(taskHd) taskHd.textContent = `Tasks (${pendingCount} pending)`;
  if(taskEl){
    if(!tasks.length){
      taskEl.innerHTML='<div style="padding:20px;text-align:center;color:var(--ink3);font-size:13px;font-weight:600;">No tasks yet</div>';
    } else if(!pending.length){
      taskEl.innerHTML='<div class="mob-task-row"><span style="font-size:12px;color:var(--a2);font-weight:700;">🎉 All tasks done!</span></div>';
    } else {
      taskEl.innerHTML = pending.map(t=>`
        <div class="mob-task-row" onclick="mobGoPage('tasks')">
          <div class="mob-task-chk${t.col==='done'?' done':''}"></div>
          <div class="mob-task-txt${t.col==='done'?' done':''}">${esc(t.text)}</div>
          <span class="mob-task-pri mob-task-pri-${t.priority||'low'}">${(t.priority||'low').toUpperCase()}</span>
        </div>`).join('');
    }
  }
  // last journal entry
  const jSec = document.getElementById('mob-last-journal-sec');
  const jEl = document.getElementById('mob-last-journal');
  if(jSec&&jEl){
    if(journal.length){
      const last = journal[0];
      const m = MLAB[last.mood]||MLAB[0];
      jSec.style.display='';
      jEl.innerHTML=`<div style="padding:14px 16px;">
        <div class="mob-je-hd">
          <span class="mob-je-emoji">${m.e}</span>
          <span class="mob-je-mood">${m.l}</span>
          <span class="mob-je-date">${last.date}</span>
        </div>
        <div class="mob-je-text">${esc(last.text)}</div>
      </div>`;
    } else {
      jSec.style.display='none';
    }
  }
}

// ── TASKS ──
function mobTaskTab(tab){_mobTaskTab=tab;mobRenderTasks();}
function mobRenderTasks(){
  const list=document.getElementById('mob-tasks-list');
  if(!list)return;
  if(!tasks.length){
    list.innerHTML='<div class="mob-tasks-empty">No tasks yet<br><span style="font-size:11px;">Tap Add to create your first task</span></div>';
    return;
  }
  const cols=[
    {key:'todo',label:'To Do',color:'#B87333'},
    {key:'inprog',label:'In Progress',color:'var(--a2)'},
    {key:'done',label:'Done',color:'var(--ink3)'},
  ];
  let html='';
  cols.forEach(({key,label,color})=>{
    const colTasks=sortByPriority(tasks.filter(t=>t.col===key));
    html+=`<div class="mob-kcol">
      <div class="mob-kcol-hd" style="color:${color}">
        <span>${label}</span><span class="mob-kcol-cnt">${colTasks.length}</span>
      </div>`;
    html+=`<div class="mob-kcol-cards" 
      ondragover="event.preventDefault();this.classList.add('dov')"
      ondragleave="event.relatedTarget&&!this.contains(event.relatedTarget)?this.classList.remove('dov'):null"
      ondrop="mobKDrop(event,'${key}');this.classList.remove('dov')">`;
    if(!colTasks.length){
      html+=`<div class="mob-kcol-empty">Empty</div>`;
    } else {
      colTasks.forEach(t=>{
        const priBg=t.priority==='high'?'var(--rl)':t.priority==='medium'?'var(--aml)':'';
        const priColor=t.priority==='high'?'var(--red)':t.priority==='medium'?'var(--amb)':'';
        html+=`<div class="mob-kcard" draggable="true"
          ondragstart="mobKDragStart(event,${t.id})"
          ondragend="mobKDragEnd()"
          ontouchstart="mobKTouchStart(event,${t.id})"
          ontouchmove="mobKTouchMove(event)"
          ontouchend="mobKTouchEnd(event)">
          <div class="mob-kcard-body">
            <div class="mob-kcard-text${t.col==='done'?' done':''}">${esc(t.text)}</div>
            <div class="mob-kcard-meta">
              ${t.priority&&t.priority!=='low'?`<span class="mob-kcard-pri" style="background:${priBg};color:${priColor}">${t.priority==='high'?'High':'Med'}</span>`:''}
              <span class="mob-kcard-date">${t.date||''}</span>
            </div>
          </div>
          <button class="mob-kcard-del" onclick="event.stopPropagation();mobDelTask(${t.id})">&#x2715;</button>
        </div>`;
      });
    }
    html+='</div>';
    html+='</div>';
  });
  list.innerHTML=html;
}
function mobMoveTask(id,dir){
  const t=tasks.find(x=>x.id===id);if(!t)return;
  const order=['todo','inprog','done'];
  const idx=order.indexOf(t.col);
  if(dir==='next'&&idx<2)t.col=order[idx+1];
  else if(dir==='prev'&&idx>0)t.col=order[idx-1];
  persist();mobRenderTasks();mobRenderHome();updateFixedStats();updateAllStatsW();renderAllTaskW();
}
let _mobKDragId=null;
let _mobKTouchId=null,_mobKTouchEl=null,_mobKClone=null;
function mobKDragStart(e,id){_mobKDragId=id;e.dataTransfer.effectAllowed='move';}
function mobKDragEnd(){_mobKDragId=null;document.querySelectorAll('.mob-kcol-cards').forEach(d=>d.classList.remove('dov'));}
function mobKDrop(e,col){
  e.preventDefault();
  document.querySelectorAll('.mob-kcol-cards').forEach(d=>d.classList.remove('dov'));
  if(_mobKDragId===null)return;
  const t=tasks.find(x=>x.id===_mobKDragId);
  if(t&&t.col!==col){t.col=col;persist();mobRenderTasks();mobRenderHome();updateFixedStats();updateAllStatsW();renderAllTaskW();}
  _mobKDragId=null;
}
function mobKTouchStart(e,id){
  _mobKTouchId=id;
  _mobKTouchEl=e.currentTarget;
  // create floating clone
  const rect=_mobKTouchEl.getBoundingClientRect();
  _mobKClone=_mobKTouchEl.cloneNode(true);
  _mobKClone.style.cssText=`position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;opacity:.85;z-index:9999;pointer-events:none;box-shadow:0 8px 24px rgba(0,0,0,.2);border-radius:10px;`;
  document.body.appendChild(_mobKClone);
  _mobKTouchEl.style.opacity='0.3';
}
function mobKTouchMove(e){
  if(!_mobKTouchId||!_mobKClone)return;
  e.preventDefault();
  const t=e.touches[0];
  _mobKClone.style.left=(t.clientX-80)+'px';
  _mobKClone.style.top=(t.clientY-30)+'px';
  // highlight target column
  document.querySelectorAll('.mob-kcol-cards').forEach(d=>d.classList.remove('dov'));
  const under=document.elementFromPoint(t.clientX,t.clientY);
  const col=under?.closest('.mob-kcol-cards');
  if(col)col.classList.add('dov');
}
function mobKTouchEnd(e){
  if(!_mobKTouchId)return;
  const t=e.changedTouches[0];
  if(_mobKClone){_mobKClone.remove();_mobKClone=null;}
  if(_mobKTouchEl)_mobKTouchEl.style.opacity='';
  document.querySelectorAll('.mob-kcol-cards').forEach(d=>d.classList.remove('dov'));
  const under=document.elementFromPoint(t.clientX,t.clientY);
  const colEl=under?.closest('[ondrop]');
  if(colEl){
    const onDrop=colEl.getAttribute('ondrop');
    const m=onDrop?.match(/'([^']+)'\)/);
    if(m){
      const col=m[1];
      const task=tasks.find(x=>x.id===_mobKTouchId);
      if(task&&task.col!==col){task.col=col;persist();mobRenderTasks();mobRenderHome();updateFixedStats();updateAllStatsW();renderAllTaskW();}
    }
  }
  _mobKTouchId=null;_mobKTouchEl=null;
}
function mobToggleTask(id){
  const t=tasks.find(x=>x.id===id);if(!t)return;
  const order=['todo','inprog','done'];
  t.col=order[(order.indexOf(t.col)+1)%order.length];
  persist();mobRenderTasks();mobRenderHome();updateFixedStats();updateAllStatsW();renderAllTaskW();renderFullCal&&renderFullCal();
}
function mobDelTask(id){
  tasks=tasks.filter(t=>t.id!==id);
  persist();mobRenderTasks();mobRenderHome();updateFixedStats();updateAllStatsW();renderAllTaskW();
}
function openMobAddTask(){
  const modal=document.getElementById('mob-add-modal');
  if(modal){modal.classList.add('open');setTimeout(()=>document.getElementById('mob-add-task-input')?.focus(),100);}
}
function closeMobAddTask(){
  const modal=document.getElementById('mob-add-modal');
  if(modal)modal.classList.remove('open');
}
function mobSubmitTask(){
  const inp=document.getElementById('mob-add-task-input');
  const t=inp?.value.trim();if(!t)return;
  const pri=document.getElementById('mob-add-task-pri')?.value||'medium';
  const col=document.getElementById('mob-add-task-col')?.value||'todo';
  tasks.unshift({id:Date.now(),text:t,priority:pri,col,date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})});
  persist();
  if(inp)inp.value='';
  closeMobAddTask();
  mobRenderTasks();mobRenderHome();
  updateFixedStats();updateAllStatsW();renderAllTaskW();
}

// ── TIMER ──
function mobFmtSec(s){const m=Math.floor(s/60),ss=s%60;return String(m).padStart(2,'0')+':'+String(ss).padStart(2,'0');}
function mobTimerRender(){
  _syncMobCustom();
  const timeEl=document.getElementById('mob-timer-time');
  const startBtn=document.getElementById('mob-timer-start');
  if(timeEl&&!timeEl.classList.contains('hide'))timeEl.textContent=mobFmtSec(_mobTimerSec);
  // show/hide edit cursor based on mode
  if(timeEl)timeEl.classList.toggle('tmtime-edit',!MOB_TMODES[_mobTimerMode]?.locked&&!_mobTimerRunning);
  if(startBtn){
    if(_mobTimerAlarmActive){
      startBtn.textContent='Stop';
      startBtn.classList.add('stop');
    } else {
      startBtn.textContent=_mobTimerRunning?'Pause':'Start';
      startBtn.classList.toggle('stop',_mobTimerRunning);
    }
  }
  // mode buttons
  for(let i=0;i<MOB_TMODES.length;i++){
    const btn=document.getElementById('mmt-'+i);
    if(btn)btn.classList.toggle('on',i===_mobTimerMode);
  }
  // sessions
  const sessEl=document.getElementById('mob-timer-sessions');
  if(sessEl){
    sessEl.innerHTML=Array.from({length:4},(_,i)=>`<div class="mob-timer-dot${i<_mobTimerSessions?' done':''}"></div>`).join('');
  }
}
function mobSetMode(m){
  if(_mobTimerRunning)return;
  _mobTimerMode=m;
  _mobTimerSec=_mobTimerCustom[m]||MOB_TMODES[m].s;
  mobTimerRender();
}
function mobTimerEdit(){
  if(_mobTimerRunning||MOB_TMODES[_mobTimerMode]?.locked)return;
  const t=document.getElementById('mob-timer-time'),i=document.getElementById('mob-timer-inputs');
  if(!t||!i)return;
  const m=Math.floor(_mobTimerSec/60),s=_mobTimerSec%60;
  const inp=document.getElementById('mob-tminp');
  if(inp)inp.value=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  t.classList.add('hide');i.classList.add('show');
  setTimeout(()=>{if(inp){inp.focus();inp.select();}},50);
}
function mobTimerConfirmEdit(){
  const inp=document.getElementById('mob-tminp');
  if(!inp)return;
  const raw=inp.value.trim();
  let total=0;
  if(raw.includes(':')){const parts=raw.split(':');total=(parseInt(parts[0])||0)*60+(parseInt(parts[1])||0);}
  else{total=(parseInt(raw)||0)*60;}
  total=Math.max(10,total);
  _mobTimerCustom[_mobTimerMode]=total;
  _mobTimerSec=total;
  // Also sync to any desktop timer widget
  Object.values(TMS).forEach(ts=>{if(ts&&ts.custom)ts.custom[3]=total;});
  document.getElementById('mob-timer-time').classList.remove('hide');
  document.getElementById('mob-timer-inputs').classList.remove('show');
  mobTimerRender();
}
function mobTimerInputKey(e){
  if(e.key==='Enter'){e.preventDefault();mobTimerConfirmEdit();}
  if(e.key==='Escape'){e.preventDefault();
    document.getElementById('mob-timer-time').classList.remove('hide');
    document.getElementById('mob-timer-inputs').classList.remove('show');
  }
}
function mobTimerToggle(){
  if(_mobTimerAlarmActive){
    stopAlarm();_mobTimerAlarmActive=false;
    _mobTimerSec=_mobTimerCustom[_mobTimerMode]||MOB_TMODES[_mobTimerMode].s;
    mobTimerRender();return;
  }
  if(_mobTimerRunning){
    clearInterval(_mobTimerIv);_mobTimerRunning=false;
  } else {
    if(_mobTimerSec<=0){_mobTimerSec=_mobTimerCustom[_mobTimerMode]||MOB_TMODES[_mobTimerMode].s;}
    _mobTimerRunning=true;
    _mobTimerIv=setInterval(()=>{
      _mobTimerSec--;
      if(_mobTimerSec<=0){
        clearInterval(_mobTimerIv);_mobTimerRunning=false;
        _mobTimerSessions=(_mobTimerSessions+1)%5;
        _mobTimerSec=0;
        _mobTimerAlarmActive=true;
        playAlarm();
      }
      mobTimerRender();
    },1000);
  }
  mobTimerRender();
}
function mobTimerReset(){
  clearInterval(_mobTimerIv);_mobTimerRunning=false;
  _mobTimerSec=_mobTimerCustom[_mobTimerMode]||MOB_TMODES[_mobTimerMode].s;
  stopAlarm();_mobTimerAlarmActive=false;
  mobTimerRender();
}

// ── JOURNAL ──
function mobRenderJournal(){
  // mood buttons
  const moodsEl=document.getElementById('mob-jmoods');
  if(moodsEl){
    moodsEl.innerHTML=MLAB.map((m,i)=>`
      <button class="mob-jmood${i===_mobMood?' on':''}" onclick="mobPickMood(${i})">
        <span class="mob-jmood-e">${m.e}</span>
        <span class="mob-jmood-l">${m.l}</span>
      </button>`).join('');
  }
  // entries
  const list=document.getElementById('mob-journal-list');
  if(!list)return;
  if(!journal.length){
    list.innerHTML='<div class="mob-journal-empty">No entries yet.<br><span style="font-size:11px;">Write how your day is going above!</span></div>';
    return;
  }
  list.innerHTML=journal.map(j=>{
    const m=MLAB[j.mood]||MLAB[0];
    return`<div class="mob-journal-entry">
      <div class="mob-je-hd">
        <span class="mob-je-emoji">${m.e}</span>
        <span class="mob-je-mood">${m.l}</span>
        <span class="mob-je-date">${j.date}</span>
        <button class="mob-je-del" onclick="mobDelJournal(${j.id})">&#x2715;</button>
      </div>
      <div class="mob-je-text">${esc(j.text)}</div>
    </div>`;
  }).join('');
}
function mobPickMood(i){
  _mobMood=i;
  document.querySelectorAll('.mob-jmood').forEach((b,idx)=>b.classList.toggle('on',idx===i));
}
function mobSaveJournal(){
  const ta=document.getElementById('mob-jta');
  const text=ta?.value.trim();if(!text)return;
  const now=new Date();
  journal.unshift({
    id:Date.now(),text,mood:_mobMood,
    date:now.toLocaleDateString('en-US',{month:'short',day:'numeric'})
  });
  persist();
  if(ta)ta.value='';
  _mobMood=0;
  mobRenderJournal();
  mobRenderHome();
  updateAllStatsW();updateFixedStats();
  if(typeof renderAllJournalW==='function')renderAllJournalW();
}
function mobDelJournal(id){
  journal=journal.filter(j=>j.id!==id);
  persist();mobRenderJournal();mobRenderHome();updateAllStatsW();updateFixedStats();
  if(typeof renderAllJournalW==='function')renderAllJournalW();
}

// ── PROJECTS ──
function gradeLabel(p){if(p>=90)return'A+';if(p>=80)return'A';if(p>=70)return'B';if(p>=60)return'C';if(p>=50)return'D';return'F';}
function gradeColor(p){if(p>=70)return'var(--a2)';if(p>=50)return'var(--amb)';return'var(--red)';}
function mobRenderProjects(){
  const list=document.getElementById('mob-proj-list');if(!list)return;
  if(!subjects.length){
    list.innerHTML='<div class="mob-proj-empty" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:var(--ink3);font-size:14px;font-weight:600;pointer-events:none;">No projects yet.<br><span style="font-size:12px;font-weight:400;">Tap Add to create your first project</span></div>';
    return;
  }
  const statLabel={active:'Active',hold:'On Hold',done:'Completed'};
  const statClass={active:'st-active',hold:'st-hold',done:'st-done'};
  const now=new Date();now.setHours(0,0,0,0);
  list.innerHTML=subjects.map(s=>{
    const st=s.status||'active';
    const dueStr=s.due?new Date(s.due+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):'';
    const overdue=s.due&&st!=='done'&&new Date(s.due+'T00:00:00')<now;
    return `<div class="mob-proj-card">
      <div class="mob-proj-hd">
        <div style="flex:1;">
          <div class="mob-proj-name">${esc(s.name)}</div>
          ${s.desc?`<div class="mob-proj-desc" style="margin-top:3px;">${esc(s.desc)}</div>`:''}
        </div>
        <button class="mob-proj-del" onclick="mobDelProj(${s.id})">&#x2715;</button>
      </div>
      <div class="mob-proj-tags">
        <span class="subtag ${statClass[st]}">${statLabel[st]}</span>
        ${s.lead?`<span class="subtag">👤 ${esc(s.lead)}</span>`:''}
        ${dueStr?`<span class="subtag${overdue?' overdue':''}" style="${overdue?'color:var(--red);border-color:var(--red);':''}">📅 ${dueStr}</span>`:''}
      </div>
      <div class="mob-proj-bar-wrap">
        <div class="mob-proj-bar-bg"><div class="mob-proj-bar-fill" style="width:${s.progress}%"></div></div>
        <div class="mob-proj-pct">${s.progress}%</div>
      </div>
      <div class="mob-proj-prog-row">
        <div class="mob-proj-prog-btns">
          ${[0,25,50,75,100].map(v=>`<button class="mob-proj-pbt${s.progress===v?' act':''}" onclick="mobUpdProj(${s.id},${v})">${v}%</button>`).join('')}
        </div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
        <select class="fi" style="flex:1;font-size:12px;padding:6px 8px;" onchange="mobUpdProjStatus(${s.id},this.value)">
          <option value="active"${st==='active'?' selected':''}>Active</option>
          <option value="hold"${st==='hold'?' selected':''}>On Hold</option>
          <option value="done"${st==='done'?' selected':''}>Completed</option>
        </select>
      </div>
    </div>`;
  }).join('');
}
function mobUpdProjStatus(id,val){
  updProjStatus(id,val);
  setTimeout(()=>{mobRenderProjects();updateAllStatsW();updateFixedStats();},100);
}
function mobUpdProj(id,val){
  updGrade(id,val);
  setTimeout(()=>{mobRenderProjects();updateAllStatsW();updateFixedStats();},100);
}
function mobDelProj(id){
  if(!confirm('Delete this project?'))return;
  delSub(id);
  setTimeout(()=>{mobRenderProjects();updateAllStatsW();updateFixedStats();},100);
}

// ── CALENDAR ──
const MOB_DAY_NAMES=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
function mobGetWeek(off){
  const today=new Date();
  today.setDate(today.getDate()+off*7);
  const mon=new Date(today);
  mon.setDate(today.getDate()-((today.getDay()+6)%7));
  return Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d;});
}
function mobFdk(d){return d.toISOString().slice(0,10);}
function mobRenderCalendar(){
  const week=mobGetWeek(_mobCalOff);
  const todayKey=mobFdk(new Date());
  if(!_mobSelDay)_mobSelDay=todayKey;
  // week label
  const lbl=document.getElementById('mob-cal-week-lbl');
  if(lbl)lbl.textContent=week[0].toLocaleDateString('en-US',{month:'short',day:'numeric'})+' – '+week[6].toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  // day pills
  const daysEl=document.getElementById('mob-cal-days');
  if(daysEl){
    daysEl.innerHTML=week.map((d,i)=>{
      const k=mobFdk(d);
      const evCount=calEvs.filter(e=>e.date===k).length;
      const isToday=k===todayKey;
      const isSel=k===_mobSelDay;
      return`<div class="mob-cal-day${isToday?' today':''}${isSel?' sel':''}" onclick="mobSelDay('${k}')">
        <div class="mob-cal-day-name">${MOB_DAY_NAMES[i]}</div>
        <div class="mob-cal-day-num">${d.getDate()}</div>
        <div class="mob-cal-day-dots">${Array.from({length:Math.min(evCount,3)},()=>'<div class="mob-cal-day-dot"></div>').join('')}</div>
      </div>`;
    }).join('');
  }
  // selected day events
  mobRenderDayEvents();
}
function mobSelDay(key){
  _mobSelDay=key;
  mobRenderCalendar();
}
function mobCalShift(dir){
  _mobCalOff+=dir;
  mobRenderCalendar();
}
function mobRenderDayEvents(){
  const evEl=document.getElementById('mob-cal-events');if(!evEl)return;
  const k=_mobSelDay||mobFdk(new Date());
  const evs=calEvs.filter(e=>e.date===k);
  const d=new Date(k);
  const hdTxt=d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  let html=`<div class="mob-cal-date-hd">${hdTxt}</div>`;
  if(!evs.length){
    html+='<div class="mob-cal-empty">No events — add one below</div>';
  } else {
    html+=evs.map(ev=>`
      <div class="mob-cal-ev-card">
        <div class="mob-cal-ev-bar" style="background:${ev.subColor||'var(--a2)'}"></div>
        <div class="mob-cal-ev-title">${esc(ev.title)}</div>
        <button class="mob-cal-ev-del" onclick="mobDelCalEv(${ev.id})">&#x2715;</button>
      </div>`).join('');
  }
  evEl.innerHTML=html;
}
function mobAddCalEv(){
  const inp=document.getElementById('mob-cal-input');
  const title=inp?.value.trim();if(!title)return;
  const date=_mobSelDay||mobFdk(new Date());
  calEvs.push({id:Date.now(),title,date});
  persist();
  if(inp)inp.value='';
  mobRenderCalendar();
  mobRenderHome();
  widgets.forEach(w=>{if(w.type==='calendar')fillWBody(w);});
  if(typeof renderFullCal==='function')renderFullCal();
}
function mobDelCalEv(id){
  calEvs=calEvs.filter(e=>e.id!==id);
  persist();mobRenderCalendar();mobRenderHome();
  widgets.forEach(w=>{if(w.type==='calendar')fillWBody(w);});
  if(typeof renderFullCal==='function')renderFullCal();
}

// ── SETTINGS ──
function mobRenderSettings(){
  const nm=document.getElementById('mob-set-name');
  const un=document.getElementById('mob-set-un');
  if(nm&&cu)nm.textContent=cu.display_name||'—';
  if(un&&cu)un.textContent='@'+cu.username;
  const tog=document.getElementById('mob-tog-dk');
  if(tog)tog.classList.toggle('on',!!prefs.dark);
}

// ── PROFILE PAGE ──
function mobRenderProfile(){
  if(!cu)return;
  const d=acc[cu];if(!d)return;
  const nm=d.display_name||cu;
  const el=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  el('mob-pbav',nm[0].toUpperCase());
  el('mob-pbnm',nm);
  el('mob-pbun','@'+cu);
  el('mob-pbjn',d.joined_at?'Joined '+new Date(d.joined_at).toLocaleDateString('en-US',{month:'long',year:'numeric'}):'');
  const tot=tasks.length,dn=tasks.filter(t=>t.col==='done').length;
  el('mob-pp-tot',tot);el('mob-pp-dn',dn);
  el('mob-pp-rt',tot?Math.round(dn/tot*100)+'%':'—');
  // mood history
  const mh=document.getElementById('mob-mhist');
  if(mh){
    const counts=Array(MLAB.length).fill(0);
    journal.forEach(j=>counts[j.mood]=(counts[j.mood]||0)+1);
    mh.innerHTML=MLAB.map((m,i)=>counts[i]?`<span style="font-size:18px;" title="${m.l} ×${counts[i]}">${m.e}</span>`:'').join('');
    if(!journal.length)mh.innerHTML='<span style="font-size:12px;color:var(--ink4);">No entries yet</span>';
  }
  // project progress
  const spl=document.getElementById('mob-spllist');
  if(spl){
    if(!subjects.length){spl.innerHTML='<div style="font-size:12px;color:var(--ink4);padding:4px 0;">No projects yet</div>';return;}
    spl.innerHTML=subjects.map(s=>`
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:12px;font-weight:600;color:var(--ink);">${esc(s.name)}</span>
          <span style="font-size:12px;font-weight:700;color:var(--a2);">${s.progress}%</span>
        </div>
        <div style="height:6px;background:var(--bdr);border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${s.progress}%;background:${s.color||'var(--a2)'};border-radius:3px;"></div>
        </div>
      </div>`).join('');
  }
}

// ── AVATAR DROPDOWN ──
function toggleMobAv(e){
  e.stopPropagation();
  const av=document.getElementById('mob-av');
  av.classList.toggle('open');
}
document.addEventListener('click',function(e){
  const av=document.getElementById('mob-av');
  if(av&&!av.contains(e.target))av.classList.remove('open');
});
function mobAvatarGo(page){
  const av=document.getElementById('mob-av');
  if(av)av.classList.remove('open');
  mobGoPage(page);
}
function mobUpdateAvatar(){
  if(!cu)return;
  const d=acc[cu];if(!d)return;
  const nm=d.display_name||cu;
  const letter=nm[0].toUpperCase();
  // top-right avatar
  const avLetter=document.getElementById('mob-av-inner');
  const avImg=document.getElementById('mob-av-img');
  const avHdLetter=document.getElementById('mob-av-hd-letter');
  const avHdImg=document.getElementById('mob-av-hd-img');
  const avHdName=document.getElementById('mob-av-hd-name');
  const avHdUser=document.getElementById('mob-av-hd-user');
  if(avHdName)avHdName.textContent=nm;
  if(avHdUser)avHdUser.textContent='@'+cu;
  const photo=prefs.avatarPhoto||null;
  if(photo){
    if(avLetter)avLetter.style.display='none';
    if(avImg){avImg.src=photo;avImg.style.display='block';}
    if(avHdLetter)avHdLetter.style.display='none';
    if(avHdImg){avHdImg.src=photo;avHdImg.style.display='block';}
  } else {
    if(avLetter){avLetter.textContent=letter;avLetter.style.display='';}
    if(avImg)avImg.style.display='none';
    if(avHdLetter){avHdLetter.textContent=letter;avHdLetter.style.display='';}
    if(avHdImg)avHdImg.style.display='none';
  }
}
function mobAvatarUpload(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=function(ev){
    prefs.avatarPhoto=ev.target.result;
    persist();
    mobUpdateAvatar();
    // also sync desktop avatar if possible
    const sbavt=document.getElementById('sbavt');
    const ddav=document.getElementById('ddav');
    if(sbavt)sbavt.innerHTML=safePhotoSrc(prefs.avatarPhoto)?`<img src="${safePhotoSrc(prefs.avatarPhoto)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;"/>`:'';
    if(ddav)ddav.innerHTML=safePhotoSrc(prefs.avatarPhoto)?`<img src="${safePhotoSrc(prefs.avatarPhoto)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;"/>`:'';
  };
  reader.readAsDataURL(file);
  const av=document.getElementById('mob-av');
  if(av)av.classList.remove('open');
}

// ── INIT ──
function initMobApp(){
  if(!isMobile())return;
  mobUpdateAvatar();
  mobRenderHome();
  mobTimerRender();
  mobRenderJournal();
  const savedPg=LS.g('pd1_mobpg','home');
  if(savedPg&&savedPg!=='home')mobGoPage(savedPg);
}

// Stub out old functions so desktop code doesn't break
function toggleMobilePicker(){}
function closeMobilePicker(){}
function addMobileWidget(){}
function removeMobileWidget(){}
function renderMobileCanvas(){}
function toggleMobEdit(){}

// Sync data changes to mobile if visible
function mobSyncIfVisible(){
  if(!isMobile())return;
  if(_mobPage==='home')mobRenderHome();
  else if(_mobPage==='tasks')mobRenderTasks();
  else if(_mobPage==='journal')mobRenderJournal();
  else if(_mobPage==='projects')mobRenderProjects();
  else if(_mobPage==='calendar')mobRenderCalendar();
  else if(_mobPage==='profile')mobRenderProfile();
}

// AUTH
// ═══════════════════════════════════════
function showAuth(tab){
  try{
    $('aq').textContent='\u201c'+QQ[qIdx].t+'\u201d';
    $('ac').textContent='— '+QQ[qIdx].a;
    show('sa');swtab(tab);
    if(typeof mobSwtab==='function')mobSwtab(tab);
  }catch(e){
    console.error('[Prodify] showAuth error:',e);
    show('sa');swtab(tab);
  }
}
function swtab(t){
  $('fsu').style.display=t==='su'?'block':'none';
  $('fsi').style.display=t==='si'?'block':'none';
  $('tsu').classList.toggle('act',t==='su');
  $('tsi').classList.toggle('act',t==='si');
}
async function doSU(){
  const u=$('su-u').value.trim().toLowerCase();
  const e=($('su-e')||{value:''}).value.trim();
  const p=$('su-p').value,p2=$('su-p2').value;
  ce('sue','see','spe','sp2e');let ok=true;
  if(!u||u.length<3){fe('sue','Minimum 3 characters.');ok=false;}
  if(!/^[a-z0-9_]+$/.test(u)){fe('sue','Letters, numbers, and underscores only.');ok=false;}
  if(!e||!e.includes('@')){fe('see','A valid email address is required.');ok=false;}
  if(!p||p.length<8){fe('spe','Minimum 8 characters.');ok=false;}
  if(p!==p2){fe('sp2e','Passwords do not match.');ok=false;}
  if(!ok)return;
  if(!sbReady){fe('sue','Sync unavailable, please try again.');return;}
  const newUser={passHash:hp(p),displayName:'',tasks:[],journal:[],subjects:[],calEvs:[],widgets:[],notes:{},prefs:{dark:false},joined:Date.now()};
  if(sbReady){
    // Use RPC to check username + email availability before doing anything else
    // Both checks use SECURITY DEFINER so RLS cannot block them
    const {data:avail, error:availErr} = await sb.rpc('check_signup_availability', {
      p_username: u,
      p_email: e
    });
    if(availErr){fe('sue','Could not verify availability. Please try again.');return;}
    const result = avail && avail[0];
    if(result && result.username_taken){fe('sue','This username is already taken.');return;}
    if(result && result.email_taken){fe('see','An account with this email address already exists.');return;}
    // Create Supabase Auth account — only reached if username + email are both free
    const {user:authUser,error:authErr}=await sbSignUp(e,p);
    if(authErr){
      if(authErr.message.toLowerCase().includes('already registered')){
        fe('see','An account with this email address already exists.');
      } else {
        fe('spe','Password must include uppercase, lowercase, and a number.');
      }
      return;
    }
    const authId=authUser?.id||null;
    const createOk=await dbCreateUser(u,hp(p),'',authId,e);
    if(!createOk){
      fe('sue','Account could not be created. Please try again.');
      return;
    }
  }
  acc[u]=newUser;
  LS.s('pd1_acc',acc);
  cu=null;LS.d('pd1_cur');
  // Stay on signup tab — clear form and show success message
  ce('sue','see','spe','sp2e');
  ['su-u','su-e','su-p','su-p2'].forEach(id=>{const el=$(id);if(el)el.value='';});
  const confirmMsg=document.getElementById('sue');
  if(confirmMsg){
    confirmMsg.innerHTML='Account created! Check your email and click the confirmation link, then <button onclick="showAuth(\'si\')" style="background:none;border:none;color:var(--a2);font-weight:700;cursor:pointer;padding:0;font-size:inherit;text-decoration:underline;">sign in here</button>.';
    confirmMsg.style.display='block';
    confirmMsg.style.color='var(--ink)';
  }
  const mobConfirmMsg=document.getElementById('mb-sue');
  if(mobConfirmMsg){
    mobConfirmMsg.innerHTML='Account created! Check your email and click the confirmation link, then <button onclick="mobSwtab(\'si\')" style="background:none;border:none;color:var(--a2);font-weight:700;cursor:pointer;padding:0;font-size:inherit;text-decoration:underline;">sign in here</button>.';
    mobConfirmMsg.style.display='block';
    mobConfirmMsg.style.color='var(--ink)';
  }
}
async function doSI(){
  const u=$('si-u').value.trim().toLowerCase(),p=$('si-p').value;
  ce('sie','sipe');
  const rateLimitMsg=checkRateLimit(u);
  if(rateLimitMsg){fe('sie',rateLimitMsg);return;}
  if(!sbReady){fe('sie','Sync unavailable, try again.');return;}
  if(sbReady){
    // Use RPC to verify username + password server-side — works before Auth session exists
    const {data,error}=await sb.rpc('get_user_for_login',{p_username:u,p_pass_hash:hp(p)});
    const dbUser=data&&data[0]||null;
    if(!dbUser){
      recordLoginFailure(u);
      fe('sie','Invalid username or password.');return;
    }

    // ── Supabase Auth migration ──
    // If no auth_id, this is a legacy account — ask for email to migrate
    if(!dbUser.auth_id){
      _pendingLogin={u,p,dbUser};
      openMo('mo-migrate-email');
      setTimeout(()=>{const el=document.getElementById('migrate-email-input');if(el)el.focus();},300);
      return;
    }

    // Sign in via Supabase Auth so JWT is active for RLS
    if(dbUser.email){
      const {error:signInErr} = await sbSignIn(dbUser.email,p);
      if(signInErr){
        // Detect unconfirmed email — Supabase returns "Email not confirmed"
        const msg = signInErr.message||'';
        if(msg.toLowerCase().includes('email not confirmed') || msg.toLowerCase().includes('not confirmed')){
          fe('sie','Please confirm your email first — check your inbox and click the confirmation link.');
          return;
        }
        // Any other Auth error — credentials are wrong at the Auth level
        recordLoginFailure(u);
        fe('sie','Invalid username or password.');
        return;
      }
    }

    acc[u]={
      passHash:dbUser.pass_hash,
      displayName:dbUser.display_name||'',
      tasks:JSON.parse(dbUser.tasks||'[]'),
      journal:JSON.parse(dbUser.journal||'[]'),
      subjects:JSON.parse(dbUser.subjects||'[]'),
      calEvs:JSON.parse(dbUser.cal_evs||'[]'),
      widgets:JSON.parse(dbUser.widgets||'[]'),
      notes:JSON.parse(dbUser.notes||'{}'),
      prefs:JSON.parse(dbUser.prefs||'{}'),
      joined:new Date(dbUser.joined_at).getTime()||Date.now(),
    };
    LS.s('pd1_acc',acc);
  } else {
    if(!acc[u]||acc[u].passHash!==hp(p)){recordLoginFailure(u);fe('sie','Invalid username or password.');return;}
  }
  clearLoginAttempts(u);
  cu=u;LS.s('pd1_cur',u);
  startRealtimeSync(u);
  if(!acc[u].displayName||acc[u].displayName.trim()===''){show('sn');setTimeout(()=>$('nin').focus(),400);}
  else launch();
}

// Pending login state for migration flow
let _pendingLogin=null;

async function submitMigrateEmail(){
  const emailEl=document.getElementById('migrate-email-input');
  const errEl=document.getElementById('migrate-email-err');
  const okBtn=document.getElementById('migrate-ok-btn');
  const email=emailEl?emailEl.value.trim():'';
  if(errEl)errEl.textContent='';
  if(!email||!email.includes('@')){if(errEl)errEl.textContent='Please enter a valid email.';return;}
  if(!_pendingLogin){if(errEl)errEl.textContent='Session expired — please sign in again.';return;}
  const {u,p,dbUser}=_pendingLogin;

  // Disable button while working
  if(okBtn){okBtn.disabled=true;okBtn.textContent='Saving...';}

  try{
    // Step 1: Create Supabase Auth account
    const {user:authUser,error:authErr}=await sbSignUp(email,p);
    if(authErr&&!authErr.message.includes('already registered')&&!authErr.message.includes('User already registered')){
      if(errEl)errEl.textContent='Password must include uppercase, lowercase, and a number.';
      if(okBtn){okBtn.disabled=false;okBtn.textContent='Save & continue';}
      return;
    }

    // Step 2: Get auth_id — from signup or by signing in if already exists
    let authId=authUser?.id;
    if(!authId){
      const {user:siUser,error:siErr}=await sbSignIn(email,p);
      if(siErr){if(errEl)errEl.textContent='Sign in error: '+siErr.message;if(okBtn){okBtn.disabled=false;okBtn.textContent='Save & continue';}return;}
      authId=siUser?.id;
    }
    if(!authId){if(errEl)errEl.textContent='Could not get account ID. Try again.';if(okBtn){okBtn.disabled=false;okBtn.textContent='Save & continue';}return;}

    // Step 3: Write auth_id + email via RPC (security definer — verified by pass_hash)
    const {error:rpcErr}=await sb.rpc('set_auth_id_for_user',{
      p_username:u,
      p_pass_hash:hp(p),
      p_auth_id:authId,
      p_email:email
    });
    if(rpcErr){if(errEl)errEl.textContent='Save error: '+rpcErr.message;if(okBtn){okBtn.disabled=false;okBtn.textContent='Save & continue';}return;}

    // Step 4: Sign in so JWT is active for all future RLS checks
    await sbSignIn(email,p).catch(()=>{});

    closeMo('mo-migrate-email');
    _pendingLogin=null;

    acc[u]={
      passHash:dbUser.pass_hash,
      displayName:dbUser.display_name||'',
      tasks:JSON.parse(dbUser.tasks||'[]'),
      journal:JSON.parse(dbUser.journal||'[]'),
      subjects:JSON.parse(dbUser.subjects||'[]'),
      calEvs:JSON.parse(dbUser.cal_evs||'[]'),
      widgets:JSON.parse(dbUser.widgets||'[]'),
      notes:JSON.parse(dbUser.notes||'{}'),
      prefs:JSON.parse(dbUser.prefs||'{}'),
      joined:new Date(dbUser.joined_at).getTime()||Date.now(),
    };
    LS.s('pd1_acc',acc);
    cu=u;LS.s('pd1_cur',u);
    startRealtimeSync(u);
    if(!acc[u].displayName||acc[u].displayName.trim()===''){show('sn');setTimeout(()=>$('nin').focus(),400);}
    else launch();
  }catch(e){
    if(errEl)errEl.textContent='Unexpected error: '+(e?.message||e);
    if(okBtn){okBtn.disabled=false;okBtn.textContent='Save & continue';}
  }
}
function doName(){
  const n=$('nin').value.trim();if(!n)return;
  acc[cu].displayName=n;LS.s('pd1_acc',acc);
  if(sbReady)dbSaveUser(cu,acc[cu]);
  launch();
}
// ── MOBILE AUTH helpers ──
function mobSwtab(t){
  document.getElementById('mb-fsu').style.display=t==='su'?'block':'none';
  document.getElementById('mb-fsi').style.display=t==='si'?'block':'none';
  document.getElementById('mb-tsu').classList.toggle('active',t==='su');
  document.getElementById('mb-tsi').classList.toggle('active',t==='si');
  // sync desktop tabs too so doSU/doSI read the right fields
  swtab(t);
}
function mobShowErr(id,msg){const e=document.getElementById(id);if(e){e.textContent=msg;e.style.display='block';}}
function mobClearErr(...ids){ids.forEach(id=>{const e=document.getElementById(id);if(e){e.textContent='';e.style.display='none';}});}
async function mobDoSU(){
  const u=document.getElementById('mb-su-u').value.trim().toLowerCase();
  const e=(document.getElementById('mb-su-e')||{value:''}).value.trim();
  const p=document.getElementById('mb-su-p').value;
  const p2=document.getElementById('mb-su-p2').value;
  mobClearErr('mb-sue','mb-see','mb-spe','mb-sp2e');
  let ok=true;
  if(!u||u.length<3){mobShowErr('mb-sue','Minimum 3 characters.');ok=false;}
  if(ok&&!/^[a-z0-9_]+$/.test(u)){mobShowErr('mb-sue','Letters, numbers, and underscores only.');ok=false;}
  if(!e||!e.includes('@')){mobShowErr('mb-see','A valid email address is required.');ok=false;}
  if(!p||p.length<8){mobShowErr('mb-spe','Minimum 8 characters.');ok=false;}
  if(p!==p2){mobShowErr('mb-sp2e','Passwords do not match.');ok=false;}
  if(!ok)return;
  // Check username + email availability before calling doSU
  if(sbReady){
    const {data:avail,error:availErr}=await sb.rpc('check_signup_availability',{p_username:u,p_email:e});
    if(availErr){mobShowErr('mb-sue','Could not verify availability. Please try again.');return;}
    const result=avail&&avail[0];
    if(result&&result.username_taken){mobShowErr('mb-sue','This username is already taken.');return;}
    if(result&&result.email_taken){mobShowErr('mb-see','An account with this email address already exists.');return;}
  }
  // mirror to desktop fields for shared logic
  $('su-u').value=u;
  const suE=document.getElementById('su-e');if(suE)suE.value=e;
  $('su-p').value=p;$('su-p2').value=p2;
  await doSU();
  // copy any errors back — map desktop field IDs to mobile field IDs
  ['sue','see','spe','sp2e'].forEach((dk)=>{
    const de=$(dk),me=document.getElementById('mb-'+dk);
    if(de&&me&&de.style.display!=='none'){me.textContent=de.textContent;me.style.display='block';}
  });
}
async function mobDoSI(){
  const u=document.getElementById('mb-si-u').value.trim().toLowerCase();
  const p=document.getElementById('mb-si-p').value;
  mobClearErr('mb-sie','mb-sipe');
  $('si-u').value=u;$('si-p').value=p;
  await doSI();
  ['sie','sipe'].forEach(dk=>{
    const de=$(dk),me=document.getElementById('mb-'+dk);
    if(de&&me&&de.style.display!=='none'){me.textContent=de.textContent;me.style.display='block';}
  });
}
// sync showAuth to also switch mobile tabs
const _origShowAuth=typeof showAuth==='function'?showAuth:null;

// ── PHOTO UPLOAD ──
function handlePhotoUpload(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    prefs.avatarPhoto=ev.target.result;
    persist();
    applyAvatar();
  };
  reader.readAsDataURL(file);
}
function applyAvatar(){
  const photo=prefs.avatarPhoto;
  const nm=acc[cu]?.displayName||cu||'';const initials=nm.trim()?nm.trim()[0].toUpperCase():(cu?cu[0].toUpperCase():'?');
  ['sbavt','ddav','pbav'].forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    const safe=safePhotoSrc(photo);
    if(safe){
      el.innerHTML=`<img src="${safe}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`;
    } else {
      el.textContent=initials;
    }
  });
  // mobile avatars
  const mobPbav=document.getElementById('mob-pbav-inner');
  if(mobPbav){
    const safe=safePhotoSrc(photo);
    if(safe){mobPbav.innerHTML=`<img src="${safe}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`;}
    else{mobPbav.textContent=initials;}
  }
  const mav=document.getElementById('mob-av-inner');
  if(mav){
    const safe=safePhotoSrc(photo);
    if(safe){mav.innerHTML=`<img src="${safe}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`;}
    else{mav.textContent=initials;}
  }
}

// ── ALARM ──
let _alarmIv=null,_alarmTimeout=null,_alarmCtx=null;
function _singleBeep(freq,dur,vol){
  if(!_alarmCtx)return;
  const t=_alarmCtx.currentTime;
  const o=_alarmCtx.createOscillator();
  const g=_alarmCtx.createGain();
  o.connect(g);g.connect(_alarmCtx.destination);
  o.type='sine';o.frequency.value=freq;
  g.gain.setValueAtTime(vol,t);
  g.gain.linearRampToValueAtTime(0,t+dur);
  o.start(t);o.stop(t+dur);
}
function playAlarm(){
  stopAlarm();
  try{
    const AC=window.AudioContext||window.webkitAudioContext;
    _alarmCtx=new AC();
    _alarmCtx.resume();
    const pattern=[880,1100,880,1320];
    let step=0;
    const tick=()=>{_singleBeep(pattern[step%pattern.length],0.18,0.6);step++;};
    tick();
    _alarmIv=setInterval(tick,300);
    _alarmTimeout=setTimeout(stopAlarm,30000);
  }catch(e){console.error('alarm',e);}
}
function stopAlarm(){
  if(_alarmIv){clearInterval(_alarmIv);_alarmIv=null;}
  if(_alarmTimeout){clearTimeout(_alarmTimeout);_alarmTimeout=null;}
  if(_alarmCtx){try{_alarmCtx.close();}catch(e){}_alarmCtx=null;}
}

function doSO(){
  stopRealtimeSync();
  if(sbReady)sbSignOut().catch(()=>{});
  LS.d('pd1_cur');cu=null;closeDD();
  const mobApp=document.getElementById('mob-app');
  if(mobApp)mobApp.style.display='none';
  show('sl');
}

// ═══════════════════════════════════════
// LAUNCH
// ═══════════════════════════════════════
// ── CROSS-DEVICE SYNC ──
// Pull from cloud when tab becomes visible (user switching devices)
// Never poll — polling caused data deletion
async function pullFromCloud(){
  if(!sbReady||!cu)return;
  try{
    const dbUser=await dbGetUser(cu);
    if(!dbUser){doSO();return;}
    const oldWidgetIds=widgets.map(x=>x.id).sort().join(',');
    acc[cu]={
      passHash:dbUser.pass_hash,
      displayName:dbUser.display_name||acc[cu]?.displayName||'',
      tasks:JSON.parse(dbUser.tasks||'[]'),
      journal:JSON.parse(dbUser.journal||'[]'),
      subjects:JSON.parse(dbUser.subjects||'[]'),
      calEvs:JSON.parse(dbUser.cal_evs||'[]'),
      widgets:JSON.parse(dbUser.widgets||'[]'),
      notes:JSON.parse(dbUser.notes||'{}'),
      prefs:JSON.parse(dbUser.prefs||'{}'),
      joined:acc[cu]?.joined||Date.now(),
    };
    LS.s('pd1_acc',acc);
    tasks=acc[cu].tasks;journal=acc[cu].journal;subjects=acc[cu].subjects;
    calEvs=acc[cu].calEvs;widgets=acc[cu].widgets;notes=acc[cu].notes;prefs=acc[cu].prefs;
    const newWidgetIds=widgets.map(x=>x.id).sort().join(',');
    if(oldWidgetIds!==newWidgetIds){
      renderCanvas();
    } else {
      renderAllTaskW();renderAllJournalW();renderAllSubW();
      renderFullCal();widgets.forEach(w=>fillWBody(w));
    }
    updateAllStatsW();updateFixedStats();
    if(typeof mobSyncIfVisible==='function')mobSyncIfVisible();
  }catch(e){}
}

let _hiddenAt=0;
function startRealtime(){
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden'){
      _hiddenAt=Date.now();
    } else if(document.visibilityState==='visible'){
      // Only pull if we've been away for more than 10 seconds
      // (means user likely switched device and came back)
      if(_hiddenAt&&Date.now()-_hiddenAt>10000)pullFromCloud();
    }
  });
}

function launch(){
  const d=acc[cu];
  tasks=d.tasks||[];journal=d.journal||[];subjects=d.subjects||[];
  calEvs=d.calEvs||[];widgets=d.widgets||[];notes=d.notes||{};prefs=d.prefs||{dark:false};
  const nm=d.displayName||cu,av=nm[0].toUpperCase();
  $('ddnm').textContent=nm;$('ddun').textContent='@'+cu;
  setTimeout(applyAvatar,50);
  $('ev-d').value=new Date().toISOString().slice(0,10);
  applyTheme();show('app');goPg(LS.g('pd1_pg','canvas'),null);
  renderCanvas();
  renderFixedQuote();
  updateFixedStats();
  if(isMobile())setTimeout(initMobApp,100);
  startRealtime();
  startRealtimeSync(cu);
}
// Boot: load local first, sync cloud silently after
(async function boot(){
  const u=LS.g('pd1_cur',null);
  if(!u){show('sl');return;}
  cu=u;
  if(!acc[u]){acc[u]={tasks:[],journal:[],subjects:[],calEvs:[],widgets:[],notes:{},prefs:{dark:false},displayName:'',passHash:''};}
  // Always launch immediately from localStorage — single render, no flicker
  launch();
  // Then silently sync from Supabase in background
  try{
    if(!sbReady) return; // no Supabase — stay on local data, don't sign out
    // Restore Auth session — critical for RLS to work on page refresh
    const {data:{session}} = await sb.auth.getSession();
    if(!session){
      // No session in memory — try refreshing from stored token
      const {data:refreshed,error:refreshErr} = await sb.auth.refreshSession();
      if(refreshErr||!refreshed?.session){
        // Session truly expired — stay on local data rather than kicking to landing
        console.warn('[Prodify] Session expired, staying on local data');
        return;
      }
    }
    const dbUser=await dbGetUser(cu);
    if(!dbUser){doSO();return;}
    // Always trust cloud — cloud is source of truth on refresh
    const loc=acc[cu]||{};
    const cT=JSON.parse(dbUser.tasks||'[]');
    const cJ=JSON.parse(dbUser.journal||'[]');
    const cS=JSON.parse(dbUser.subjects||'[]');
    const cC=JSON.parse(dbUser.cal_evs||'[]');
    const cW=JSON.parse(dbUser.widgets||'[]');
    const cN=JSON.parse(dbUser.notes||'{}');
    const cP=JSON.parse(dbUser.prefs||'{}');
    acc[cu]={passHash:dbUser.pass_hash,displayName:dbUser.display_name||loc.displayName||'',
      tasks:cT,journal:cJ,subjects:cS,calEvs:cC,widgets:cW,notes:cN,prefs:cP,joined:loc.joined||Date.now()};
    LS.s('pd1_acc',acc);
    tasks=cT;journal=cJ;subjects=cS;calEvs=cC;widgets=cW;notes=cN;
    // Restore avatarPhoto from localStorage since we don't save it to cloud
    const localAvatar = loc.prefs?.avatarPhoto || null;
    prefs=cP;
    if(localAvatar) prefs.avatarPhoto = localAvatar;
    acc[cu].prefs = prefs;
    // Always re-render with cloud data — no conditional check
    // Update name display and avatar with cloud data
    const nm2=acc[cu].displayName||cu;
    if($('ddnm'))$('ddnm').textContent=nm2;
    if($('ddun'))$('ddun').textContent='@'+cu;
    applyAvatar();
    applyTheme();
    renderCanvas();
    renderFixedQuote();
    updateFixedStats();
    updateAllStatsW();
    renderAllTaskW();
    if(typeof renderAllJournalW==='function') renderAllJournalW();
    if(typeof renderAllSubW==='function') renderAllSubW();
    if(typeof renderFullCal==='function') renderFullCal();
    if(typeof mobSyncIfVisible==='function') mobSyncIfVisible();
  }catch(e){console.warn('[Prodify] cloud sync failed',e);}
  startRealtime();
  startRealtimeSync(cu);
})();

// ═══════════════════════════════════════
// PERSIST
// ═══════════════════════════════════════
function persist(){
  if(!cu)return;
  const d=acc[cu];
  d.tasks=tasks;d.journal=journal;d.subjects=subjects;d.calEvs=calEvs;
  d.widgets=widgets;d.notes=notes;d.prefs=prefs;
  LS.s('pd1_acc',acc);
  dbSaveUser(cu,d);
  if(typeof mobSyncIfVisible==='function')mobSyncIfVisible();
}

// ═══════════════════════════════════════
// DROPDOWN
// ═══════════════════════════════════════
function toggleDD(){
  const av=$('sbav'), dd=$('sbdd');
  if(!av||!dd)return;
  const isOpen=dd.classList.contains('dd-open');
  if(isOpen){closeDD();return;}
  // Teleport to body once to escape sidebar stacking context
  if(dd.parentElement!==document.body) document.body.appendChild(dd);
  const r=av.getBoundingClientRect();
  dd.style.position='fixed';
  dd.style.left=(r.right+8)+'px';
  dd.style.bottom=(window.innerHeight-r.bottom)+'px';
  dd.style.width='220px';
  dd.style.zIndex='9999';
  dd.style.opacity='1';
  dd.style.transform='none';
  dd.style.pointerEvents='all';
  dd.classList.add('dd-open');
}
function closeDD(){
  const dd=$('sbdd');
  if(dd){dd.style.opacity='0';dd.style.pointerEvents='none';dd.classList.remove('dd-open');}
}
document.addEventListener('click',e=>{
  if(!e.target.closest('#sbav')&&!e.target.closest('#sbdd')) closeDD();
});

// ═══════════════════════════════════════
// MODALS
// ═══════════════════════════════════════
function openMo(id){$(id).classList.add('open');}
function closeMo(id){$(id).classList.remove('open');}

// ═══════════════════════════════════════
// DARK MODE
// ═══════════════════════════════════════
function applyTheme(){
  document.documentElement.setAttribute('data-dark',prefs.dark?'1':'');
  const t=$('tog-dk');if(t)t.className='tog'+(prefs.dark?' on':'');
}
function togDark(btn){prefs.dark=!prefs.dark;persist();applyTheme();}

// ═══════════════════════════════════════
// FIXED QUOTE + STATS BAR
// ═══════════════════════════════════════
function renderFixedQuote(){
  qIdx=(qIdx+1)%QQ.length;
  const q=QQ[qIdx];
  const qt=$('ctb-qt'),qa=$('ctb-qa');
  if(qt)qt.textContent='\u201c'+q.t+'\u201d';
  if(qa)qa.textContent='— '+q.a;
}
function nextQuoteFixed(){
  renderFixedQuote();
}
function updateFixedStats(){
  const tot=tasks.length,dn=tasks.filter(t=>t.col==='done').length,ip=tasks.filter(t=>t.col==='inprog').length,hi=tasks.filter(t=>t.priority==='high'&&t.col!=='done').length;
  const e=id=>{const el=$(id);if(el)el.textContent=id==='cs-tot'?tot:id==='cs-dn'?dn:id==='cs-ip'?ip:id==='cs-hi'?hi:journal.length;};
  ['cs-tot','cs-dn','cs-ip','cs-hi','cs-jn'].forEach(e);
  const s=$('cs-tot');if(s)s.textContent=tot;
  const d=$('cs-dn');if(d)d.textContent=dn;
  const i=$('cs-ip');if(i)i.textContent=ip;
  const h=$('cs-hi');if(h)h.textContent=hi;
  const j=$('cs-jn');if(j)j.textContent=journal.length;
  const mhi=document.getElementById('mst-hi');if(mhi)mhi.textContent=hi;
}

// ═══════════════════════════════════════
// WIDGET CANVAS — core drag/resize
// ═══════════════════════════════════════
const WD={
  tasks:{w:580,h:340,title:'Task Board'},
  journal:{w:300,h:360,title:'Journal'},
  timer:{w:320,h:400,title:'Focus Timer'},
  note:{w:240,h:220,title:'Note'},
  stats:{w:320,h:200,title:'Stats'},
  subjects:{w:300,h:260,title:'Project Progress'},
  quote:{w:280,h:160,title:'Quote'},
  calendar:{w:540,h:290,title:'Calendar'},
};

function addW(type,opts={}){
  // Single-instance rule: only notes can have multiples
  if(type!=='note'){
    const existing=widgets.find(w=>w.type===type);
    if(existing){
      // Flash/focus the existing widget
      const el=$(existing.id);
      if(el){bringToFront(existing.id);el.style.outline='2px solid var(--a2)';setTimeout(()=>el.style.outline='',800);}
      if(isMobile())closeMobilePicker();
      return;
    }
  }
  if(isMobile()){
    addMobileWidget(type);
    closeMobilePicker();
    return;
  }
  const def=WD[type]||{w:300,h:240,title:type};
  const wrap=$('canvas-wrap')||document.querySelector('.canvas-wrap');
  const sx=wrap?wrap.scrollLeft:0,sy=wrap?wrap.scrollTop:0;
  const cw=wrap?wrap.clientWidth:800,ch=wrap?wrap.clientHeight:600;
  let x,y;
  if(opts.x!==undefined){x=opts.x;}
  else{
    // Cascade from top-left: each widget offset slightly from previous
    const count=widgets.length;
    const pad=20, step=28;
    x=sx+pad+(count*step);
    y=sy+pad+(count*step);
    // Keep within viewport
    if(x+def.w>sx+cw-pad)x=sx+pad;
    if(y+def.h>sy+ch-pad)y=sy+pad;
  }
  if(opts.y!==undefined)y=opts.y;
  const id='w'+Date.now().toString(36);
  const ent={id,type,x:Math.round(x),y:Math.round(y),w:opts.w||def.w,h:opts.h||def.h,title:opts.title||def.title,z:nextZ++,noteId:opts.noteId||null};
  if(type==='note'&&!ent.noteId){ent.noteId=id;notes[id]={title:'',content:''};}
  widgets.push(ent);persist();
  buildWidgetEl(ent);
}

function removeW(id){
  widgets=widgets.filter(w=>w.id!==id);
  const el=$(id);if(el)el.remove();
  // stop timer if running
  if(TMS[id]){clearInterval(TMS[id].iv);delete TMS[id];}
  persist();
}

function clearCanvas(){
  if(!confirm('Remove all widgets from the canvas? Your data is still saved.'))return;
  widgets.forEach(w=>{if(TMS[w.id]){clearInterval(TMS[w.id].iv);delete TMS[w.id];}});
  widgets=[];persist();$('canvas').innerHTML='';
}

function renderCanvas(){
  $('canvas').innerHTML='';
  nextZ=10;
  if(widgets.length){
    const mz=widgets.reduce((m,w)=>Math.max(m,w.z||10),10);
    nextZ=mz+1;
  }
  widgets.forEach(w=>buildWidgetEl(w));
}

function setWidgetColor(id,color){
  const w=widgets.find(x=>x.id===id);if(!w)return;
  w.color=color;persist();
  const el=document.getElementById(id);if(!el)return;
  el.style.borderColor=color;
  const wh=document.getElementById('wh-'+id);
  if(wh)wh.style.borderBottomColor=color;
}
function bringToFront(id){
  const w=widgets.find(x=>x.id===id);if(!w)return;
  w.z=nextZ++;$(id).style.zIndex=w.z;persist();
}

function buildWidgetEl(w){
  const canvas=$('canvas');
  const el=document.createElement('div');
  el.className='widget';el.id=w.id;
  el.style.cssText=`left:${w.x}px;top:${w.y}px;width:${w.w}px;height:${w.h}px;z-index:${w.z||10};`;
  const wcolor=w.color||'';
  el.style.borderColor=wcolor||'';
  if(wcolor)el.querySelector&&(el.style.setProperty('--wc',wcolor));
  el.innerHTML=`
    <div class="whead" id="wh-${w.id}" style="${wcolor?'border-bottom-color:'+wcolor+';':''}">
      <span class="whtit">${esc(w.title)}</span>
      <input type="color" class="wcolor-pick" value="${wcolor||'#3A7D5E'}" data-tip="Widget color" onchange="setWidgetColor('${w.id}',this.value)" onclick="event.stopPropagation()"/>
      <button class="wclose" onclick="removeW('${w.id}')" data-tip="Remove">&#x2715;</button>
    </div>
    <div class="wbody" id="wb-${w.id}"></div>
    <div class="wrsz" onpointerdown="startResize(event,'${w.id}')">
      <svg viewBox="0 0 8 8"><path d="M7 1L1 7"/><path d="M7 4L4 7"/></svg>
    </div>`;
  canvas.appendChild(el);
  // drag handle
  el.querySelector('.whead').addEventListener('mousedown',e=>{
    if(e.target.classList.contains('wclose'))return;
    startDrag(e,w.id);
  });
  el.addEventListener('mousedown',()=>bringToFront(w.id),true);
  // fill body
  fillWBody(w);
}

function fillWBody(w){
  const body=$('wb-'+w.id);if(!body)return;
  body.innerHTML='';
  if(w.type==='tasks')buildTaskW(body,w);
  else if(w.type==='journal')buildJournalW(body,w);
  else if(w.type==='timer')buildTimerW(body,w);
  else if(w.type==='note')buildNoteW(body,w);
  else if(w.type==='stats')buildStatsW(body,w);
  else if(w.type==='subjects')buildSubjectsW(body,w);
  else if(w.type==='quote')buildQuoteW(body,w);
  else if(w.type==='calendar')buildCalW(body,w);
}

// DRAG
function startDrag(e,id){
  e.preventDefault();
  const el=$(id);if(!el)return;
  const w=widgets.find(x=>x.id===id);if(!w)return;
  el.classList.add('wdrag');
  // Capture pointer on the source element so move events keep firing even if finger moves fast
  try{if(e.pointerId!=null)e.target.setPointerCapture(e.pointerId);}catch(_){}
  const startX=e.clientX-w.x,startY=e.clientY-w.y;
  const mm=e=>{
    w.x=Math.max(0,e.clientX-startX);w.y=Math.max(0,e.clientY-startY);
    el.style.left=w.x+'px';el.style.top=w.y+'px';
  };
  const mu=()=>{
    el.classList.remove('wdrag');persist();
    document.removeEventListener('pointermove',mm);document.removeEventListener('pointerup',mu);
  };
  document.addEventListener('pointermove',mm);document.addEventListener('pointerup',mu);
}

// RESIZE
function startResize(e,id){
  e.preventDefault();e.stopPropagation();
  const el=$(id);if(!el)return;
  const w=widgets.find(x=>x.id===id);if(!w)return;
  el.classList.add('wresize');
  try{if(e.pointerId!=null)e.target.setPointerCapture(e.pointerId);}catch(_){}
  const startX=e.clientX,startY=e.clientY,startW=w.w,startH=w.h;
  const isTimer=w.type==='timer';
  const minW=isTimer?280:200, maxW=99999;
  const minH=isTimer?300:130, maxH=99999;
  const mm=e=>{
    w.w=Math.min(maxW,Math.max(minW,startW+(e.clientX-startX)));
    w.h=Math.min(maxH,Math.max(minH,startH+(e.clientY-startY)));
    el.style.width=w.w+'px';el.style.height=w.h+'px';
  };
  const mu=()=>{
    el.classList.remove('wresize');persist();
    document.removeEventListener('pointermove',mm);document.removeEventListener('pointerup',mu);
  };
  document.addEventListener('pointermove',mm);document.addEventListener('pointerup',mu);
}

// ═══════════════════════════════════════
// WIDGET BODIES
// ═══════════════════════════════════════

/* ── TASK BOARD ── */
function buildTaskW(body,w){
  body.style.display='flex';body.style.flexDirection='column';
  body.innerHTML=`
    <div class="twadd">
      <input class="twi" id="twi-${w.id}" type="text" placeholder="New task — Enter to add" onkeydown="if(event.key==='Enter')addTask('${w.id}')"/>
      <select class="twsel" id="twp-${w.id}"><option value="low">Low</option><option value="medium" selected>Med</option><option value="high">High</option></select>
      <select class="twsel" id="twc-${w.id}"><option value="todo">To Do</option><option value="inprog">In Progress</option><option value="done">Done</option></select>
      <button class="twbtn" onclick="addTask('${w.id}')">Add</button>
    </div>
    <div class="twcols">
      <div class="twcol"><div class="twchd"><div class="twchl"><div class="twdot" style="background:#B87333"></div>To Do</div><span class="twcnt" id="cn-todo-${w.id}">0</span></div><div class="twbody" id="col-todo-${w.id}" onclick="if(_selTask)_selTask=null,renderAllTaskW()" ondragover="dov(event,'todo','${w.id}')" ondragleave="dlv(event)" ondrop="drp(event,'todo')"></div></div>
      <div class="twcol"><div class="twchd"><div class="twchl"><div class="twdot" style="background:#3A7D5E"></div>In Progress</div><span class="twcnt" id="cn-inprog-${w.id}">0</span></div><div class="twbody" id="col-inprog-${w.id}" ondragover="dov(event,'inprog','${w.id}')" ondragleave="dlv(event)" ondrop="drp(event,'inprog')"></div></div>
      <div class="twcol"><div class="twchd"><div class="twchl"><div class="twdot" style="background:#1B4332"></div>Done</div><span class="twcnt" id="cn-done-${w.id}">0</span></div><div class="twbody" id="col-done-${w.id}" ondragover="dov(event,'done','${w.id}')" ondragleave="dlv(event)" ondrop="drp(event,'done')"></div></div>
    </div>`;
  renderTaskCols(w.id);
}

function addTask(wid){
  const inp=$('twi-'+wid);const t=inp.value.trim();if(!t){inp.focus();return;}
  tasks.unshift({id:Date.now(),text:t,priority:$('twp-'+wid).value,col:$('twc-'+wid).value,date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})});
  persist();renderAllTaskW();inp.value='';inp.focus();
  updateAllStatsW();updateFixedStats();
}
function selTask(e,id){
  e.stopPropagation();
  _selTask=(_selTask===id)?null:id;
  renderAllTaskW();
}
function delTask(id){tasks=tasks.filter(t=>t.id!==id);_selTask=null;persist();renderAllTaskW();updateAllStatsW();updateFixedStats();}
function renderAllTaskW(){widgets.filter(w=>w.type==='tasks').forEach(w=>renderTaskCols(w.id));}
function sortByPriority(arr){return arr.slice().sort((a,b)=>(PRIORITY_ORDER[a.priority]??3)-(PRIORITY_ORDER[b.priority]??3));}
function renderTaskCols(wid){
  if(!$('col-todo-'+wid))return;
  const cols={todo:[],inprog:[],done:[]};
  tasks.forEach(t=>{if(cols[t.col])cols[t.col].push(t);});
  Object.keys(cols).forEach(k=>{cols[k]=sortByPriority(cols[k]);});
  ['todo','inprog','done'].forEach(c=>{
    const el=$('col-'+c+'-'+wid);if(!el)return;
    $('cn-'+c+'-'+wid).textContent=cols[c].length;
    if(!cols[c].length){el.innerHTML=`<div class="twempty"><div class="twempty-t">${{todo:'Nothing planned',inprog:'Nothing active',done:'Nothing yet'}[c]}</div></div>`;return;}
    el.innerHTML=cols[c].map(t=>`<div class="tc${_selTask===t.id?' tc-selected':''}" id="tc-${t.id}" draggable="true" ondragstart="dstart(event,${t.id})" ondragend="dend()" onclick="selTask(event,${t.id})" ontouchstart="tcTouchStart(event,${t.id})">
      <button class="tcdel" onclick="event.stopPropagation();delTask(${t.id})">&times;</button>
      <div class="tct" style="${t.col==='done'?'text-decoration:line-through;opacity:.5;':''}">${esc(t.text)}</div>
      <div class="tcf"><span class="tag ${t.priority==='high'?'th':t.priority==='medium'?'tm':'tl'}">${t.priority}</span><span class="tcd">${t.date}</span></div>
    </div>`).join('');
  });
}
function dstart(e,id){dragTaskId=id;e.dataTransfer.effectAllowed='move';setTimeout(()=>{const el=$('tc-'+id);if(el)el.classList.add('dragging');},0);}
function dend(){dragTaskId=null;document.querySelectorAll('.tc').forEach(e=>e.classList.remove('dragging'));document.querySelectorAll('.twbody').forEach(e=>e.classList.remove('dov'));}
// Touch drag for mobile tasks
let _touchDragId=null,_touchDragEl=null,_touchClone=null,_tcDragActive=false,_tcDragClone=null,_tcDragStartX=0,_tcDragStartY=0;
// Task card touch — tap to select, drag if selected
function tcTouchStart(e,id){
  if(_selTask!==id){
    // First tap: just select, don't drag
    return;
  }
  // Already selected: start drag
  const el=$('tc-'+id);
  if(!el)return;
  const touch=e.touches[0];
  _tcDragActive=true;
  _touchDragId=id;
  _touchDragEl=el;
  _tcDragStartX=touch.clientX;
  _tcDragStartY=touch.clientY;
  // Clone
  const rect=el.getBoundingClientRect();
  _tcDragClone=el.cloneNode(true);
  _tcDragClone.className='tc-drag-clone';
  _tcDragClone.style.width=rect.width+'px';
  _tcDragClone.style.left=(touch.clientX-rect.width/2)+'px';
  _tcDragClone.style.top=(touch.clientY-rect.height/2)+'px';
  document.body.appendChild(_tcDragClone);
  el.style.opacity='0.3';
  e.preventDefault();
  e.stopPropagation();
}
function touchDragStart(e,id){}
function touchDragMove(e){
  if(!_tcDragActive||!_touchDragId)return;
  e.preventDefault();
  const t=e.touches[0];
  if(_tcDragClone){
    _tcDragClone.style.left=(t.clientX-parseInt(_tcDragClone.style.width)/2)+'px';
    _tcDragClone.style.top=(t.clientY-30)+'px';
  }
  if(_tcDragClone)_tcDragClone.style.display='none';
  const target=document.elementFromPoint(t.clientX,t.clientY);
  if(_tcDragClone)_tcDragClone.style.display='';
  const col=target?.closest('.twbody');
  document.querySelectorAll('.twbody').forEach(b=>b.classList.remove('dov'));
  if(col)col.classList.add('dov');
}
function touchDragEnd(e){
  if(!_tcDragActive)return;
  if(_tcDragClone){_tcDragClone.remove();_tcDragClone=null;}
  if(_touchDragEl)_touchDragEl.style.opacity='';
  const t=e.changedTouches[0];
  const target=document.elementFromPoint(t.clientX,t.clientY);
  const colEl=target?.closest('.twbody');
  if(colEl&&_touchDragId){
    const col=colEl.id.replace(/^col-/,'').replace(/-[^-]+$/,'');
    const task=tasks.find(x=>x.id===_touchDragId);
    if(task&&task.col!==col){task.col=col;persist();renderAllTaskW();updateAllStatsW();updateFixedStats();}
  }
  document.querySelectorAll('.twbody').forEach(b=>b.classList.remove('dov'));
  _tcDragActive=false;_touchDragId=null;_touchDragEl=null;_selTask=null;
  renderAllTaskW();
}
document.addEventListener('touchmove',function(e){if(_tcDragActive)touchDragMove(e);},{passive:false});
document.addEventListener('touchend',function(e){if(_tcDragActive)touchDragEnd(e);});
function dov(e,col,wid){e.preventDefault();document.querySelectorAll('.twbody').forEach(e=>e.classList.remove('dov'));$('col-'+col+'-'+wid).classList.add('dov');}
function dlv(e){if(!e.currentTarget.contains(e.relatedTarget))e.currentTarget.classList.remove('dov');}
function drp(e,col){e.preventDefault();document.querySelectorAll('.twbody').forEach(e=>e.classList.remove('dov'));if(dragTaskId===null)return;const t=tasks.find(x=>x.id===dragTaskId);if(t&&t.col!==col){t.col=col;persist();renderAllTaskW();updateAllStatsW();updateFixedStats();}dragTaskId=null;}

/* ── JOURNAL ── */
function buildJournalW(body,w){
  body.style.display='flex';body.style.flexDirection='column';
  body.innerHTML=`
    <div class="jwlist" id="jwl-${w.id}"></div>
    <div class="jwadd">
      <textarea class="jwta" id="jwta-${w.id}" rows="2" placeholder="How's your day?"></textarea>
      <div class="jwfoot">
        <div class="jwemoji-wrap" id="jwew-${w.id}">
          <button class="jwemoji-btn" id="jweb-${w.id}" onclick="toggleMoodPicker('${w.id}')" data-tip="Mood">${MLAB[0].e}</button>
          <div class="jwmsel" id="jwms-${w.id}">
            ${MLAB.map((m,i)=>`<button class="jwmo${i===0?' on':''}" data-m="${i}" data-tip="${m.l}" onclick="pickMood(${i},'${w.id}')">${m.e}</button>`).join('')}
          </div>
        </div>
        <button class="twbtn" style="padding:5px 11px;font-size:11px;flex-shrink:0;" onclick="addJournal('${w.id}')">Save</button>
      </div>
    </div>`;
  renderJournalW(w.id);
}
function pickMood(m,wid){
  curMood=m;
  document.querySelectorAll(`#jwms-${wid} .jwmo`).forEach(b=>b.classList.toggle('on',+b.dataset.m===m));
  const eb=$('jweb-'+wid);if(eb)eb.textContent=MLAB[m].e;
  toggleMoodPicker(wid,false);
}
function toggleMoodPicker(wid,force){
  const ms=$('jwms-'+wid);if(!ms)return;
  const open=force!==undefined?force:!ms.classList.contains('open');
  ms.classList.toggle('open',open);
}
function addJournal(wid){
  const el=$('jwta-'+wid);const t=el.value.trim();if(!t){el.focus();return;}
  journal.unshift({id:Date.now(),text:t,mood:curMood,date:new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}),ts:Date.now()});
  persist();renderAllJournalW();updateAllStatsW();updateFixedStats();el.value='';
}
function delJournal(id){journal=journal.filter(j=>j.id!==id);persist();renderAllJournalW();updateAllStatsW();updateFixedStats();}
function renderAllJournalW(){widgets.filter(w=>w.type==='journal').forEach(w=>renderJournalW(w.id));}
function renderJournalW(wid){
  const el=$('jwl-'+wid);if(!el)return;
  if(!journal.length){el.innerHTML='<div class="jwempty">Your journal is empty.<br/>Write something below.</div>';return;}
  el.innerHTML=journal.map(j=>{
    const m=MLAB[j.mood]||MLAB[0];
    return `<div class="jwje"><div class="jwjehd"><div class="jwm">${m.e}</div><span class="jwdt">${j.date} · ${m.l}</span><button class="jwdel" onclick="delJournal(${j.id})">&times;</button></div><div class="jwtx">${esc(j.text)}</div></div>`;
  }).join('');
}

/* ── TIMER ── */
function buildTimerW(body,w){
  body.style.display='flex';body.style.flexDirection='column';
  if(!TMS[w.id])TMS[w.id]={mode:0,sec:25*60,running:false,iv:null,sessions:0,custom:[25*60,5*60,15*60,20*60]};
  const ts=TMS[w.id];
  if(!ts.custom||ts.custom.length<4)ts.custom=[25*60,5*60,15*60,20*60];
  // restore locked modes
  ts.custom[0]=25*60;ts.custom[1]=5*60;ts.custom[2]=15*60;

  const canEdit=TMODES[ts.mode]&&!TMODES[ts.mode].locked;
  body.innerHTML=`
    <div class="tmbody">
      <div class="tmmodes">
        ${TMODES.map((m,i)=>`<button class="tmm${i===ts.mode?' on':''}" onclick="setTMode('${w.id}',${i})">${m.l}</button>`).join('')}
      </div>
      <div class="tmdis">
        <div class="tmtime${canEdit?' tmtime-edit':''}" id="tmtime-${w.id}" onclick="tmStartEdit('${w.id}')">${fmtSec(ts.sec)}</div>
        <div class="tminputs" id="tminputs-${w.id}">
          <input class="tm-timeinput" id="tminp-${w.id}" type="text" inputmode="numeric" placeholder="25:00"
            onkeydown="tmInputKey(event,'${w.id}')" oninput="tmInputFmt(event)"/>
          <div class="tm-inputhint">MM:SS &nbsp;·&nbsp; Enter to set &nbsp;·&nbsp; Esc to cancel</div>
          <button class="tm-setbtn" onclick="tmConfirmEdit('${w.id}')">Set time</button>
        </div>
      </div>
      <div class="tmctrl">
        <button class="tm-resetbtn" data-tip="Reset" onclick="resetTimer('${w.id}')">↺</button>
        <button class="tm-startbtn ${ts.running?'stop':''}" id="tmbtn-${w.id}" onclick="timerBtn('${w.id}')">${ts.running?'Pause':'Start'}</button>
      </div>
      <div class="tmsess" id="tmsess-${w.id}">
        ${Array.from({length:4},(_,i)=>`<div class="tmsd${i<ts.sessions?' dn':''}"></div>`).join('')}
      </div>
    </div>`;
  if(ts.running){clearInterval(ts.iv);ts.iv=setInterval(()=>tickTimer(w.id),1000);}
}
function scaleTimer(wid,ww,wh){
  // No-op: timer now fills its container via CSS flex, no scale transform needed
}
function tmStartEdit(wid){
  const ts=TMS[wid];if(!ts)return;
  if(TMODES[ts.mode]?.locked||ts.running)return;
  const timeEl=$('tmtime-'+wid);
  const inpEl=$('tminputs-'+wid);
  const inp=$('tminp-'+wid);
  if(!timeEl||!inpEl||!inp)return;
  // Pre-fill with current MM:SS
  const m=Math.floor(ts.sec/60);
  const s=ts.sec%60;
  inp.value=(m>0?String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'):String(s).padStart(2,'0'));
  timeEl.classList.add('hide');
  inpEl.classList.add('show');
  setTimeout(()=>{inp.focus();inp.select();},50);
}
function tmInputFmt(e){
  // Auto-insert colon after 2 digits
  let v=e.target.value.replace(/[^0-9:]/g,'');
  const digits=v.replace(/:/g,'');
  if(digits.length>=3&&!v.includes(':'))v=digits.slice(0,-2)+':'+digits.slice(-2);
  e.target.value=v;
}
function tmInputKey(e,wid){
  if(e.key==='Enter'){e.preventDefault();tmConfirmEdit(wid);}
  if(e.key==='Escape'){e.preventDefault();tmCancelEdit(wid);}
}
function tmConfirmEdit(wid){
  const ts=TMS[wid];if(!ts)return;
  const inp=$('tminp-'+wid);
  if(!inp)return;
  const raw=inp.value.trim();
  let total=0;
  if(raw.includes(':')){
    const parts=raw.split(':');
    total=(parseInt(parts[0])||0)*60+(parseInt(parts[1])||0);
  } else {
    total=(parseInt(raw)||0)*60;
  }
  total=Math.max(10,total);
  ts.custom[ts.mode]=total;
  ts.sec=total;
  if(ts.mode===3){_mobTimerCustom[3]=total;_mobTimerSec=total;}
  tmCancelEdit(wid);
  const w=widgets.find(x=>x.id===wid);if(w)fillWBody(w);
}
function tmCancelEdit(wid){
  const timeEl=$('tmtime-'+wid);
  const inpEl=$('tminputs-'+wid);
  if(timeEl)timeEl.classList.remove('hide');
  if(inpEl)inpEl.classList.remove('show');
}
function setTMode(wid,m){
  const ts=TMS[wid];if(!ts)return;
  if(ts.running){clearInterval(ts.iv);ts.running=false;}
  ts.mode=m;ts.sec=ts.custom[m];
  // mobile widget: rebuild body directly
  const mobBody=document.getElementById('mwb-'+wid);
  if(mobBody){
    const fakeW={id:wid,type:'timer'};
    buildTimerW(mobBody,fakeW);
    return;
  }
  const w=widgets.find(x=>x.id===wid);if(w)fillWBody(w);
}
function timerBtn(wid){
  const ts=TMS[wid];if(!ts)return;
  if(ts.alarmActive){
    stopAlarm();
    ts.alarmActive=false;
    ts.sec=ts.custom[ts.mode];
    const b=$('tmbtn-'+wid);if(b){b.textContent='Start';b.classList.remove('stop');}
    const tEl=$('tmtime-'+wid);if(tEl)tEl.textContent=fmtSec(ts.sec);
    return;
  }
  toggleTimer(wid);
}
function toggleTimer(wid){
  const ts=TMS[wid];if(!ts)return;
  if(ts.running){
    clearInterval(ts.iv);ts.running=false;
    const b=$('tmbtn-'+wid);if(b){b.textContent='Start';b.classList.remove('stop');}
  } else {
    if(ts.sec<=0){ts.sec=ts.custom[ts.mode];}
    ts.running=true;
    ts.iv=setInterval(()=>tickTimer(wid),1000);
    const b=$('tmbtn-'+wid);if(b){b.textContent='Pause';b.classList.add('stop');}
  }
}
function tickTimer(wid){
  const ts=TMS[wid];if(!ts)return;
  ts.sec--;
  const tEl=$('tmtime-'+wid);if(tEl)tEl.textContent=fmtSec(ts.sec);
  if(ts.sec<=0){
    clearInterval(ts.iv);ts.running=false;ts.sessions=(ts.sessions+1)%5;
    ts.alarmActive=true;
    playAlarm();
    const btn=$('tmbtn-'+wid);
    if(btn){btn.textContent='Stop';btn.classList.add('stop');}
    const sessEl=$('tmsess-'+wid);
    if(sessEl){sessEl.innerHTML=Array.from({length:4},(_,i)=>`<div class="tmsd${i<ts.sessions?' dn':''}"></div>`).join('');}
  }
}
function resetTimer(wid){
  const ts=TMS[wid];if(!ts)return;
  clearInterval(ts.iv);ts.running=false;ts.sec=ts.custom[ts.mode];
  stopAlarm();
  const mobBody=document.getElementById('mwb-'+wid);
  if(mobBody){buildTimerW(mobBody,{id:wid,type:'timer'});return;}
  const w=widgets.find(x=>x.id===wid);if(w)fillWBody(w);
}

/* ── NOTE ── */
function buildNoteW(body,w){
  body.style.display='flex';body.style.flexDirection='column';
  const nid=w.noteId||w.id;
  if(!notes[nid])notes[nid]={title:'',content:''};
  const n=notes[nid];
  body.innerHTML=`<div class="notebody">
    <input class="notetitl" placeholder="Note title..." value="${esc(n.title)}" oninput="saveNote('${nid}','title',this.value)"/>
    <textarea class="noteta" placeholder="Start writing..."  oninput="saveNote('${nid}','content',this.value)">${esc(n.content)}</textarea>
  </div>`;
}
let _noteTimer=null;
function saveNote(nid,field,val){
  if(!notes[nid])notes[nid]={title:'',content:''};
  notes[nid][field]=val;
  // debounce — don't persist on every keystroke (would rebuild DOM and lose focus)
  clearTimeout(_noteTimer);
  _noteTimer=setTimeout(()=>persistSilent(),800);
}
function persistSilent(){
  if(!cu)return;
  const d=acc[cu];
  d.tasks=tasks;d.journal=journal;d.subjects=subjects;d.calEvs=calEvs;
  d.widgets=widgets;d.notes=notes;d.prefs=prefs;
  LS.s('pd1_acc',acc);
  dbSaveUser(cu,d);
}

/* ── STATS ── */
function buildStatsW(body,w){
  body.style.display='flex';body.style.flexDirection='column';
  body.innerHTML=`<div class="stgrid" id="stg-${w.id}"></div>`;
  updateStatsW(w.id);
}
function updateAllStatsW(){widgets.filter(w=>w.type==='stats').forEach(w=>updateStatsW(w.id));}
function updateStatsW(wid){
  const el=$('stg-'+wid);if(!el)return;
  const tot=tasks.length,dn=tasks.filter(t=>t.col==='done').length,pr=tasks.filter(t=>t.col==='inprog').length,hi=tasks.filter(t=>t.priority==='high'&&t.col!=='done').length;
  el.innerHTML=`
    <div class="stcard"><div class="stv">${tot}</div><div class="stl">Total Tasks</div></div>
    <div class="stcard"><div class="stv">${dn}</div><div class="stl">Completed</div><div class="sts">${tot?Math.round(dn/tot*100)+'%':'—'}</div></div>
    <div class="stcard"><div class="stv">${pr}</div><div class="stl">In Progress</div></div>
    <div class="stcard"><div class="stv">${hi}</div><div class="stl">High Priority</div><div class="sts${hi?' r':''}">${hi?hi+' pending':'All clear'}</div></div>
    <div class="stcard"><div class="stv">${journal.length}</div><div class="stl">Journal Entries</div></div>
    <div class="stcard"><div class="stv">${subjects.length}</div><div class="stl">Projects</div></div>`;
}

/* ── SUBJECTS ── */
function buildSubjectsW(body,w){
  body.style.display='flex';body.style.flexDirection='column';
  body.innerHTML=`<div class="swbody" id="swb-${w.id}"></div>`;
  renderSubW(w.id);
}
function renderAllSubW(){widgets.filter(w=>w.type==='subjects').forEach(w=>renderSubW(w.id));}
function gradeC(g){return g>=90?'#2A5C44':g>=75?'#9A6818':g>=60?'#B87333':'#B83030';}
function gradeL(g){return g>=90?'A':g>=80?'B':g>=70?'C':g>=60?'D':'F';}
function renderSubW(wid){
  const el=$('swb-'+wid);if(!el)return;
  if(!subjects.length){el.innerHTML='<div class="swempty">No projects yet.<br/>Add them from the sidebar.</div>';return;}
  el.innerHTML=subjects.map(s=>`<div class="swrow"><div class="swdot" style="background:${s.color}"></div><div class="swname">${esc(s.name)}</div><div class="swbar"><div class="swfill" style="width:${s.progress}%;background:${s.color}"></div></div><div class="swg" style="color:${gradeC(s.progress)}">${s.progress}%</div></div>`).join('');
}

/* ── CALENDAR WIDGET ── */
function buildCalW(body,w){
  body.style.display='flex';body.style.flexDirection='column';
  const days=getWeekDays(calOff),tok=fdk(new Date());
  const first=days[0],last=days[6];
  const lbl=first.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' – '+last.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  body.innerHTML=`
    <div class="cwhead">
      <div style="display:flex;align-items:center;gap:5px;">
        <button class="cwib" onclick="shiftCalW(-1,'${w.id}')"><svg viewBox="0 0 9 9"><path d="M7 2L3 4.5 7 7"/></svg></button>
        <span class="cwlbl" id="cwlbl-${w.id}">${lbl}</span>
        <button class="cwib" onclick="shiftCalW(1,'${w.id}')"><svg viewBox="0 0 9 9"><path d="M2 2l4 2.5L2 7"/></svg></button>
      </div>
      <button class="cwib" onclick="openMo('mo-ev')" data-tip="Add event" style="width:auto;padding:0 7px;font-size:11px;font-weight:700;color:var(--a2);">+</button>
    </div>
    <div class="cwdays" id="cwdays-${w.id}"></div>`;
  renderCalW(w.id);
}
function shiftCalW(dir,wid){calOff+=dir;widgets.forEach(w=>{if(w.type==='calendar')fillWBody(w);});renderFullCal();}
function renderCalW(wid){
  const el=$('cwdays-'+wid);if(!el)return;
  const days=getWeekDays(calOff),tok=fdk(new Date());
  const dn=['M','T','W','T','F','S','S'];
  el.innerHTML=days.map((d,i)=>{
    const k=fdk(d),isT=k===tok;
    const evs=calEvs.filter(e=>e.date===k);
    return `<div class="cwd${isT?' tod':''}">
      <div class="cwdn">${dn[i]}</div><div class="cwdnum">${d.getDate()}</div>
      <div style="display:flex;flex-direction:column;gap:2px;overflow-y:auto;max-height:calc(100% - 32px);">${evs.map(ev=>`<div class="cwev" style="background:${ev.subColor||'var(--warm)'};color:${ev.subColor?'#fff':'var(--ink)'}" onclick="if(confirm('Delete?'))delEv(${ev.id})">${esc(ev.title)}</div>`).join('')}</div>
      <div class="cwaddbtn" onclick="$('ev-d').value='${k}';openMo('mo-ev')">+</div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════
// FULL PAGE — SUBJECTS
// ═══════════════════════════════════════
function renderSubFull(){
  const g=$('subgrid');if(!g)return;
  if(!subjects.length){
    g.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--ink3);font-size:13px;font-weight:600;">No projects yet — click + Add Project to start.</div>`;
    return;
  }
  const statLabel={active:'Active',hold:'On Hold',done:'Completed'};
  const statClass={active:'st-active',hold:'st-hold',done:'st-done'};
  const now=new Date();now.setHours(0,0,0,0);
  g.innerHTML=subjects.map(s=>{
    const st=s.status||'active';
    const dueStr=s.due?new Date(s.due+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'';
    const overdue=s.due&&st!=='done'&&new Date(s.due+'T00:00:00')<now;
    return `<div class="subcard">
      <div class="subbody">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
          <div class="subname">${esc(s.name)}</div>
          <span class="subtag ${statClass[st]}">${statLabel[st]}</span>
        </div>
        ${s.desc?`<div class="subdesc">${esc(s.desc)}</div>`:''}
        ${s.lead?`<div class="subteach">👤 ${esc(s.lead)}</div>`:''}
        <div style="margin-top:4px;">
          <div class="subprog-row" style="margin-bottom:6px;">
            <div class="subbar" style="flex:1;"><div class="subbarfill" style="width:${s.progress}%"></div></div>
            <span class="subpct">${s.progress}%</span>
            <input type="number" class="subgin" min="0" max="100" value="${s.progress}"
              onchange="updGrade(${s.id},this.value)"
              onfocus="this.style.borderColor='var(--a2)'"
              onblur="this.style.borderColor='var(--bdr)'"/>
          </div>
        </div>
      </div>
      <div class="subfoot">
        <span class="subdue${overdue?' overdue':''}">${dueStr?'Due: '+dueStr:''}</span>
        <div style="display:flex;gap:6px;">
          <select class="subgin" style="max-width:none;width:auto;" onchange="updProjStatus(${s.id},this.value)">
            <option value="active"${st==='active'?' selected':''}>Active</option>
            <option value="hold"${st==='hold'?' selected':''}>On Hold</option>
            <option value="done"${st==='done'?' selected':''}>Completed</option>
          </select>
          <button class="bol bsm" onclick="delSub(${s.id})">Remove</button>
        </div>
      </div>
    </div>`;
  }).join('');
}
function addSub(){
  const name=$('sn-i').value.trim();if(!name)return;
  subjects.push({id:Date.now(),name,
    desc:$('sdesc-i').value.trim(),
    lead:$('st-i').value.trim(),
    due:$('sdue-i').value,
    status:$('sstat-i').value||'active',
    progress:Math.min(100,Math.max(0,parseFloat($('sg-i').value)||0)),
    color:'var(--a2)',created:Date.now()});
  persist();renderSubFull();renderAllSubW();updateAllStatsW();closeMo('mo-sub');
  ['sn-i','sdesc-i','st-i','sdue-i','sg-i'].forEach(id=>{const el=$(id);if(el)el.value='';});
  $('sstat-i').value='active';
}
function delSub(id){subjects=subjects.filter(s=>s.id!==id);persist();renderSubFull();renderAllSubW();updateAllStatsW();}
function updProjStatus(id,val){
  const s=subjects.find(x=>x.id===id);if(!s)return;
  s.status=val;if(val==='done')s.progress=100;
  persist();renderSubFull();renderAllSubW();
}
function updGrade(id,val){const s=subjects.find(x=>x.id===id);if(s){s.progress=Math.min(100,Math.max(0,parseFloat(val)||0));persist();renderSubFull();renderAllSubW();}}

// ═══════════════════════════════════════
// FULL PAGE — CALENDAR
// ═══════════════════════════════════════
function getWeekDays(off=0){
  const now=new Date(),day=now.getDay(),mon=new Date(now);
  mon.setDate(now.getDate()-((day+6)%7)+off*7);
  return Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d;});
}
function fdk(d){return d.toISOString().slice(0,10);}
function shiftW(dir){calOff+=dir;renderFullCal();widgets.forEach(w=>{if(w.type==='calendar')fillWBody(w);});}
function updateEvSubSel(){
  const sel=$('ev-s');if(!sel)return;
  sel.innerHTML='<option value="">None</option>'+subjects.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
}
function addEv(){
  const t=$('ev-t').value.trim(),d=$('ev-d').value;if(!t||!d)return;
  const sid=$('ev-s').value,sub=subjects.find(s=>s.id==sid);
  calEvs.push({id:Date.now(),title:t,date:d,subName:sub?sub.name:'',subColor:sub?sub.color:''});
  persist();renderFullCal();widgets.forEach(w=>{if(w.type==='calendar')fillWBody(w);});
  closeMo('mo-ev');$('ev-t').value='';
}
function delEv(id){calEvs=calEvs.filter(e=>e.id!==id);persist();renderFullCal();widgets.forEach(w=>{if(w.type==='calendar')fillWBody(w);});}
function renderFullCal(){
  const days=getWeekDays(calOff),tok=fdk(new Date());
  const f=days[0],l=days[6];
  const wlbl=$('calwlbl');
  if(wlbl)wlbl.textContent=f.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' – '+l.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const g=$('calgridfull');if(!g)return;
  const dn=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  g.innerHTML=days.map((d,i)=>{
    const k=fdk(d),isT=k===tok,evs=calEvs.filter(e=>e.date===k);
    return `<div class="calday${isT?' today':''}">
      <div class="caldayhd"><div class="caldayname">${dn[i]}</div><div class="caldaynum">${d.getDate()}</div></div>
      <div class="caldaybody">
        ${evs.map(ev=>`<div class="calev" style="background:${ev.subColor||'var(--warm)'};color:${ev.subColor?'#fff':'var(--ink)'}" onclick="if(confirm('Delete this event?'))delEv(${ev.id})">${esc(ev.title)}${ev.subName?`<div style="font-size:10px;opacity:.7">${esc(ev.subName)}</div>`:''}</div>`).join('')}
        <div class="caladdbtn" onclick="$('ev-d').value='${k}';openMo('mo-ev')">+</div>
      </div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════
function renderProfile(){
  const d=acc[cu],nm=d.displayName||cu;
  const photo=prefs.avatarPhoto;
  const pbavEl=$('pbav');
  if(pbavEl){
    const safe=safePhotoSrc(photo);
    if(safe){
      pbavEl.innerHTML=`<img src="${safe}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0;"/><div class="pbav-overlay">📷 Change</div>`;
    } else {
      pbavEl.innerHTML=esc(nm[0].toUpperCase())+'<div class="pbav-overlay">📷 Change</div>';
    }
  }
  $('pbnm').textContent=nm;$('pbun').textContent='@'+cu;
  $('pbjn').textContent='Joined '+new Date(d.joined||Date.now()).toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const tot=tasks.length,dn=tasks.filter(t=>t.col==='done').length;
  $('pp-tot').textContent=tot;$('pp-dn').textContent=dn;$('pp-rt').textContent=tot?Math.round(dn/tot*100)+'%':'—';
  const mc=Array(MLAB.length).fill(0);journal.forEach(j=>{if(mc[j.mood]!==undefined)mc[j.mood]++;});
  $('mhist').innerHTML=MLAB.map((m,i)=>mc[i]?`<div class="mhi">${m.e} ${m.l}<span class="mhicnt">${mc[i]}</span></div>`:'').join('')||'<span style="font-size:12px;color:var(--ink4)">No entries yet.</span>';
  const today=new Date();
  const jds=new Set(journal.map(j=>new Date(j.ts||j.id).toDateString()));
  const tds=new Set(tasks.map(t=>new Date(t.id).toDateString()));
  let bh='';for(let i=29;i>=0;i--){const d2=new Date(today);d2.setDate(today.getDate()-i);const ds=d2.toDateString();bh+=`<div class="abd${jds.has(ds)||tds.has(ds)?' has':''}${i===0?' tod':''}" title="${d2.toLocaleDateString()}"></div>`;}
  $('actbar').innerHTML=bh;
  if(!subjects.length){$('spllist').innerHTML='<span style="font-size:12px;color:var(--ink4)">No projects yet.</span>';return;}
  $('spllist').innerHTML=subjects.map(s=>`<div class="splrow"><div class="spldot" style="background:${s.color}"></div><div class="splnm">${esc(s.name)}</div><div class="splg" style="color:${gradeC(s.progress)}">${s.progress}%</div></div>`).join('');
}

// ═══════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════
function renderSettings(){
  const d=acc[cu];
  $('set-un').textContent='@'+cu;
  $('nm-i').value=d.displayName||'';
  $('tog-dk').className='tog'+(prefs.dark?' on':'');
  // Supabase status
  const dot=$('sb-dot'),status=$('sb-status');
  const setupRow=$('sb-setup-row'),sqlRow=$('sb-sql-row');
  if(sbReady){
    if(dot){dot.style.background='#3A7D5E';}
    if(status)status.textContent='Connected — data syncs to Supabase';
    if(setupRow)setupRow.style.display='none';
    if(sqlRow)sqlRow.style.display='none';
  } else {
    if(dot){dot.style.background='#B83030';}
    if(status)status.textContent='Not connected — using local storage only';
    if(setupRow)setupRow.style.display='flex';
    if(sqlRow)sqlRow.style.display='flex';
  }
}
function copySql(){
  const sql=$('sb-sql');if(!sql)return;
  navigator.clipboard.writeText(sql.textContent).then(()=>{
    sql.style.borderColor='var(--a2)';
    setTimeout(()=>{sql.style.borderColor='var(--bdr)';},1200);
  });
}
function saveName(){
  const n=$('nm-i').value.trim();if(!n)return;
  acc[cu].displayName=n;LS.s('pd1_acc',acc);
  ['sbavt','ddav'].forEach(id=>$(id).textContent=n[0].toUpperCase());
  $('ddnm').textContent=n;
  if($('pbnm'))$('pbnm').textContent=n;
  closeMo('mo-nm');
}
function chgPw(){
  const c=$('pw-c').value,nw=$('pw-n').value,nw2=$('pw-n2').value;
  ce('pw-ce','pw-n2e');
  if(acc[cu].passHash!==hp(c)){fe('pw-ce','Incorrect current password.');return;}
  if(nw.length<8){fe('pw-n2e','Min 8 characters.');return;}
  if(nw!==nw2){fe('pw-n2e','Passwords do not match.');return;}
  acc[cu].passHash=hp(nw);LS.s('pd1_acc',acc);
  ['pw-c','pw-n','pw-n2'].forEach(id=>$(id).value='');
  closeMo('mo-pw');alert('Password updated.');
}
function clrTasks(){if(!confirm('Delete all tasks?'))return;tasks=[];persist();renderAllTaskW();updateAllStatsW();updateFixedStats();}
function clrJournal(){if(!confirm('Delete all journal entries?'))return;journal=[];persist();renderAllJournalW();updateAllStatsW();updateFixedStats();}
function clrSubjects(){if(!confirm('Delete all projects??'))return;subjects=[];persist();renderSubFull();renderAllSubW();updateAllStatsW();}
async function delAcc(){
  if(!confirm('Permanently delete your account and ALL data? This cannot be undone.'))return;
  dbDeleteUser(cu);
  delete acc[cu];LS.s('pd1_acc',acc);LS.d('pd1_cur');cu=null;show('sl');
}

// ── PWA INSTALL ──
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  deferredPrompt=e;
  const btn=document.getElementById('install-btn');
  if(btn)btn.classList.add('visible');
});
window.addEventListener('appinstalled',()=>{
  deferredPrompt=null;
  const btn=document.getElementById('install-btn');
  if(btn)btn.classList.remove('visible');
});
function triggerInstall(){
  if(deferredPrompt){
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(()=>{deferredPrompt=null;});
  }
}
// Show iOS hint on Safari iOS (no beforeinstallprompt support)
const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
const isInStandalone=window.navigator.standalone===true;
if(isIOS&&!isInStandalone){
  const hint=document.getElementById('install-ios');
  if(hint)hint.classList.add('visible');
}

// ── GLOBAL TOOLTIP POSITIONER ──
(function(){
  let tipEl = null, currentTarget = null, hideTimer = null;

  function getTip(){
    if(!tipEl){
      tipEl = document.createElement('div');
      tipEl.id = 'g-tip';
      tipEl.style.cssText = [
        'position:fixed','background:#1A1714','color:#F3F1EC',
        'border-radius:6px','padding:5px 10px','font-size:11px','font-weight:700',
        'white-space:nowrap','pointer-events:none','z-index:9999',
        'box-shadow:0 4px 18px rgba(26,23,20,.18)',
        'opacity:0','transition:opacity .12s','display:none'
      ].join(';');
      document.body.appendChild(tipEl);
    }
    return tipEl;
  }

  function show(text, el){
    clearTimeout(hideTimer);
    currentTarget = el;
    const t = getTip();
    t.textContent = text;
    t.style.display = 'block';
    t.style.opacity = '0';
    requestAnimationFrame(()=>{
      const r = el.getBoundingClientRect();
      const th = t.offsetHeight, tw = t.offsetWidth;
      let top = r.top + r.height/2 - th/2;
      let left = r.right + 8;
      if(top < 6) top = 6;
      if(top + th > window.innerHeight - 6) top = window.innerHeight - th - 6;
      if(left + tw > window.innerWidth - 6) left = r.left - tw - 8;
      t.style.top = top + 'px';
      t.style.left = left + 'px';
      t.style.opacity = '1';
    });
  }

  function hide(){
    const t = getTip();
    t.style.opacity = '0';
    hideTimer = setTimeout(()=>{ t.style.display='none'; currentTarget=null; }, 150);
  }

  function getTooltipTarget(e){
    // .sbb (sidebar nav) and .wb (widget tray)
    const sbb = e.target.closest('.sbb,.wb');
    if(sbb) return { el: sbb, text: (sbb.querySelector('.sbtip,.wbtip')||{textContent:''}).textContent.trim() || sbb.getAttribute('data-tip') };
    // any element with data-tip inside #app (not mobile)
    const dt = e.target.closest('[data-tip]');
    if(dt && !dt.closest('.mob-app')) return { el: dt, text: dt.getAttribute('data-tip') };
    return null;
  }

  document.addEventListener('mouseover', function(e){
    const match = getTooltipTarget(e);
    if(match && match.text) show(match.text, match.el);
    else if(!e.target.closest('#g-tip')) { /* moving between non-tip elements */ }
  });

  document.addEventListener('mouseout', function(e){
    const match = getTooltipTarget(e);
    if(match){
      // Only hide if we're actually leaving the button (not entering a child)
      if(!match.el.contains(e.relatedTarget)) hide();
    }
  });

  // Suppress inline .sbtip and .wbtip — we handle them above
  const style = document.createElement('style');
  style.textContent = '.sbtip,.wbtip{display:none!important;}';
  document.head.appendChild(style);
})();
