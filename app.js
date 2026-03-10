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





// ── CUSTOM CONFIRM ──
let _confirmResolve = null;
function appConfirm(msg, sub='', okLabel='Delete'){
  return new Promise(res=>{
    _confirmResolve = res;
    const mo = document.getElementById('mo-confirm');
    const msgEl = document.getElementById('mo-confirm-msg');
    const subEl = document.getElementById('mo-confirm-sub');
    const okBtn = document.getElementById('mo-confirm-ok');
    if(msgEl) msgEl.textContent = msg;
    if(subEl){ subEl.textContent = sub; subEl.style.display = sub ? '' : 'none'; }
    if(okBtn) okBtn.textContent = okLabel;
    if(mo){ mo.style.display='flex'; }
  });
}
function confirmResolve(val){
  const mo = document.getElementById('mo-confirm');
  if(mo) mo.style.display='none';
  if(_confirmResolve){ _confirmResolve(val); _confirmResolve=null; }
}
// Close on backdrop click
document.addEventListener('click', function(e){
  const mo = document.getElementById('mo-confirm');
  if(mo && e.target === mo) confirmResolve(false);
});

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
  window._canvasScale = 1; // exposed for drag/resize coordinate math
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
    window._canvasScale = _scale;
    // Keep scroll container aware of scaled size
    cvs.style.width  = (2400 * _scale) + 'px';
    cvs.style.height = (1800 * _scale) + 'px';
  }

  // ── SCROLL WHEEL ZOOM (desktop) — zoom on bg, scroll on widgets ──
  scroll.addEventListener('wheel', function(e){
    // If hovering over a scrollable widget body, let it scroll naturally
    const widgetBody = e.target.closest('.wbody, .twbody, .jwlist, .swbody, .stgrid, .cwdays, .tmbody, .notebody');
    if(widgetBody){
      // Only intercept if the widget body itself is not scrollable (no overflow)
      const isScrollable = widgetBody.scrollHeight > widgetBody.clientHeight || widgetBody.scrollWidth > widgetBody.clientWidth;
      if(isScrollable){
        // Let the widget handle its own scroll — don't zoom
        return;
      }
    }
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

// ── AVATAR UPLOAD TO SUPABASE STORAGE ──
async function uploadAvatarToStorage(file){
  if(!sbReady||!cu) return null;
  try{
    // Ensure auth session is active before uploading
    const {data:{session}} = await sb.auth.getSession();
    if(!session){
      const {data:refreshed} = await sb.auth.refreshSession();
      if(!refreshed?.session){console.error('[Prodify] No auth session for upload');return null;}
    }
    const ext = (file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
    const path = cu+'/avatar.'+(ext||'jpg');
    const {error:upErr} = await sb.storage.from('avatars').upload(path, file, {
      upsert: true,
      cacheControl: '3600',
      contentType: file.type||'image/jpeg'
    });
    if(upErr){console.error('[Prodify] Avatar upload error:',upErr.message);return null;}
    // Add cache-busting timestamp so browsers reload the new photo
    const {data} = sb.storage.from('avatars').getPublicUrl(path);
    const url = data?.publicUrl;
    return url ? url+'?t='+Date.now() : null;
  }catch(e){console.error('[Prodify] Avatar upload failed:',e);return null;}
}
async function saveAvatarUrl(url){
  if(!sbReady||!cu) return;
  try{
    await sb.from('users').update({avatar_url:url}).eq('username',cu);
  }catch(e){console.error('[Prodify] saveAvatarUrl error:',e);}
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
    delete prefsToSave.avatarUrl;
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
      avatar_url:data.prefs?.avatarUrl||null,
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
      prefs=rp;
      d.prefs=prefs;
    }
    // Always sync avatar_url from DB — this is how photo changes propagate across devices
    if(row.avatar_url){
      prefs.avatarUrl=row.avatar_url;
      if(d.prefs) d.prefs.avatarUrl=row.avatar_url;
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
    if(typeof pomRenderHistory==='function') pomRenderHistory();
    // Apply avatar across all elements
    applyAvatar();
    if(typeof mobUpdateAvatar==='function') mobUpdateAvatar();
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
let _jwSearch={},_mobJSearch='';
const HABIT_MAX_FREE=3;
const HABIT_EMOJIS=['✔️','❌','💪','📚','🏃','💧','🧘','🥗','😴','🎯','✍️','🌿'];
let prefs={dark:false};

// ── POMODORO HISTORY ──
function pomTodayKey(){ return new Date().toISOString().slice(0,10); }
function pomRecordSession(){
  if(!prefs.pomHistory) prefs.pomHistory={};
  const k=pomTodayKey();
  prefs.pomHistory[k]=(prefs.pomHistory[k]||0)+1;
  if(cu){ acc[cu].prefs=prefs; LS.s('pd1_acc',acc); if(sbReady)dbSaveUser(cu,acc[cu]); }
  pomRenderHistory();
}
function pomGetToday(){ return (prefs.pomHistory||{})[pomTodayKey()]||0; }
function pomGetWeek(){
  const h=prefs.pomHistory||{};
  let total=0;
  for(let i=0;i<7;i++){
    const d=new Date(); d.setDate(d.getDate()-i);
    total+=(h[d.toISOString().slice(0,10)]||0);
  }
  return total;
}
function pomGetWeekData(){
  const h=prefs.pomHistory||{}, days=[];
  for(let i=6;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    const k=d.toISOString().slice(0,10);
    days.push({label:d.toLocaleDateString('en-US',{weekday:'short'}),count:h[k]||0,today:i===0});
  }
  return days;
}
async function clearPomHistory(){
  if(!await appConfirm('Clear session history?','This will erase all your pomodoro session data.','Clear'))return;
  prefs.pomHistory={};
  if(cu){acc[cu].prefs=prefs;LS.s('pd1_acc',acc);if(sbReady)dbSaveUser(cu,acc[cu]);}
  pomRenderHistory();
}
function pomRenderHistory(){
  ['mob-pom-history','dsk-pom-history'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    const today=pomGetToday(), week=pomGetWeek();
    const days=pomGetWeekData();
    const max=Math.max(...days.map(d=>d.count),1);
    el.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div>
          <div style="font-size:26px;font-weight:800;letter-spacing:-1px;color:var(--ink);line-height:1;">${today}</div>
          <div style="font-size:11px;color:var(--ink3);font-weight:600;margin-top:1px;">today</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:26px;font-weight:800;letter-spacing:-1px;color:var(--ink);line-height:1;">${week}</div>
          <div style="font-size:11px;color:var(--ink3);font-weight:600;margin-top:1px;">this week</div>
        </div>
      </div>
      <div style="display:flex;align-items:flex-end;gap:6px;height:52px;">
        ${days.map(d=>`
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="width:100%;border-radius:4px;background:${d.today?'var(--a2)':'var(--a2)'};opacity:${d.count?1:.18};height:${Math.max(d.count/max*40,d.count?6:4)}px;transition:height .3s;min-height:${d.count?6:4}px;"></div>
            <div style="font-size:9px;font-weight:700;color:${d.today?'var(--a2)':'var(--ink4)'};text-transform:uppercase;">${d.label}</div>
          </div>
        `).join('')}
      </div>
    `;
  });
  // also update focus overlay if open
  if(typeof _focusRenderHistory==='function')_focusRenderHistory();
}
let dragTaskId=null, calOff=0, nextZ=10;
let _selTask=null;
let curMood=0;
// per-widget timer state (not persisted)
const TMS={};
const TMODES=[{l:'Pomodoro',s:25*60,locked:true},{l:'Custom',s:20*60,locked:false}];

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
function fmtSec(s){
  const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60;
  if(h>0)return `${h}:${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`;
}
function parseTimeInput(raw){
  const parts=raw.split(':');
  if(parts.length===3)return (parseInt(parts[0])||0)*3600+(parseInt(parts[1])||0)*60+(parseInt(parts[2])||0);
  if(parts.length===2)return (parseInt(parts[0])||0)*60+(parseInt(parts[1])||0);
  return (parseInt(raw)||0)*60;
}

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
let _mobTimerCustom=[25*60,20*60];
let _mobTimerLastSet=[25*60,20*60]; // tracks last confirmed time per mode for reset
let _mobTimerRunning = false;
let _mobTimerIv = null;
let _mobTimerSessions = 0;
let _mobTimerAlarmActive = false;
// Sync mobile custom times with desktop TMS['mob'] when a widget exists
function _syncMobCustom(){
  const ts=TMS['mob']||Object.values(TMS)[0];
  if(ts&&ts.custom){
    _mobTimerCustom[1]=ts.custom[1]; // sync custom slot
  }
}
const MOB_TMODES = [{l:'Pomodoro',s:25*60,locked:true},{l:'Custom',s:20*60,locked:false}];


function mobGoPage(page){
  if(!isMobile())return;
  if(page===_mobPage)return;
  // fade out current
  const cur = document.getElementById('mpg-'+_mobPage);
  if(cur)cur.classList.remove('active');
  const curBtn = document.getElementById('mnb-'+_mobPage);
  if(curBtn)curBtn.classList.remove('act');
  _mobPage = page;
  const nextBtn = document.getElementById('mnb-'+page);
  if(nextBtn)nextBtn.classList.add('act');
  // render content first, then fade in after a frame
  if(page==='home')mobRenderHome();
  else if(page==='tasks')mobRenderTasks();
  else if(page==='journal')mobRenderJournal();
  else if(page==='projects')mobRenderProjects();
  else if(page==='calendar')mobRenderCalendar();
  else if(page==='profile')mobRenderProfile();
  else if(page==='settings')mobRenderSettings();
  else if(page==='timer')pomRenderHistory();
  else if(page==='habits'){renderHabits('mob-habit-page-list');renderHabitAddForm('mob-habit-page-form');}
  else if(page==='feedback'){_fbType='general';_fbStar=0;setFbType('general');setTimeout(initFbStars,50);}
  requestAnimationFrame(()=>{
    const next = document.getElementById('mpg-'+page);
    if(next)next.classList.add('active');
  });
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
  const pending = sortByDue(tasks.filter(t=>t.col!=='done')).slice(0,5);
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
    const colTasks=sortByDue(tasks.filter(t=>t.col===key));
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
        const due=taskDueInfo(t);
        const dueTag=due?`<span class="mob-kcard-pri" style="background:${due.bg};color:${due.color};border:1px solid ${due.border};">${due.label}</span>`:'';
        const isOverdue=due?.label==='Overdue';
        html+=`<div class="mob-kcard${isOverdue?' tc-overdue':''}" draggable="true"
          ondragstart="mobKDragStart(event,${t.id})"
          ondragend="mobKDragEnd()"
          ontouchstart="mobKTouchStart(event,${t.id})"
          ontouchmove="mobKTouchMove(event)"
          ontouchend="mobKTouchEnd(event)">
          <div class="mob-kcard-body">
            <div class="mob-kcard-text${t.col==='done'?' done':''}">${esc(t.text)}</div>
            ${dueTag?`<div class="mob-kcard-meta" style="margin-top:4px;">${dueTag}</div>`:''}
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;flex-shrink:0;gap:4px;">
            <button class="mob-kcard-del" onclick="event.stopPropagation();mobDelTask(${t.id})">&#x2715;</button>
            ${t.date?`<span class="mob-kcard-date">${t.date}</span>`:''}
          </div>
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
async function mobDelTask(id){
  if(!await appConfirm('Delete this task?','This cannot be undone.'))return;
  tasks=tasks.filter(t=>t.id!==id);
  persist();mobRenderTasks();mobRenderHome();updateFixedStats();updateAllStatsW();renderAllTaskW();
}
// ── CUSTOM DATE PICKER ──
// ═══════════════════════════════════════
// DUE DATE PICKER
// ═══════════════════════════════════════
let _calViewYear=0,_calViewMonth=0,_dskCalWid=null,_dpSelected='',_dpCallback=null;
function calToday(){const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate());}
function calFmt(d){return d.toISOString().slice(0,10);}
function calDisplay(d){return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});}

function dpOpen(currentVal,onConfirm){
  let modal=document.getElementById('dp-modal');
  if(!modal){
    modal=document.createElement('div');
    modal.id='dp-modal';
    modal.style.cssText='position:fixed;inset:0;z-index:99999;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,0);transition:background .25s;pointer-events:none;';
    modal.innerHTML=`
      <div id="dp-sheet" style="position:relative;width:100%;max-width:440px;background:var(--surf);border-radius:24px 24px 0 0;padding:0 0 28px;box-shadow:0 -12px 48px rgba(0,0,0,.2);transform:translateY(100%);transition:transform .3s cubic-bezier(.32,.72,0,1);">
        <div style="width:40px;height:4px;border-radius:2px;background:var(--bdr);margin:14px auto 0;"></div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;">
          <span style="font-size:17px;font-weight:800;color:var(--ink);letter-spacing:-.4px;">Pick a date</span>
          <button onclick="dpClear()" style="background:none;border:none;font-size:12px;font-weight:700;color:var(--ink3);cursor:pointer;font-family:inherit;padding:6px 10px;border-radius:8px;transition:all .15s;" onmouseover="this.style.background='var(--rl)';this.style.color='var(--red)'" onmouseout="this.style.background='none';this.style.color='var(--ink3)'">Clear</button>
        </div>
        <div style="margin:0 16px;background:var(--surf2);border-radius:18px;border:1.5px solid var(--bdr);padding:16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
            <button id="dp-prev" onclick="dpNav(-1)" style="width:32px;height:32px;border-radius:10px;border:1.5px solid var(--bdr);background:var(--surf);cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;color:var(--ink);font-family:inherit;transition:all .15s;">‹</button>
            <span id="dp-month" style="font-size:14px;font-weight:800;color:var(--ink);letter-spacing:-.3px;"></span>
            <button onclick="dpNav(1)" style="width:32px;height:32px;border-radius:10px;border:1.5px solid var(--bdr);background:var(--surf);cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;color:var(--ink);font-family:inherit;transition:all .15s;">›</button>
          </div>
          <div id="dp-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;"></div>
        </div>
        <button id="dp-confirm" onclick="dpConfirm()" style="display:block;width:calc(100% - 32px);margin:14px 16px 0;background:var(--a2);color:#fff;border:none;border-radius:14px;padding:16px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;letter-spacing:-.2px;transition:background .15s;">Confirm</button>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',function(e){if(e.target===modal)dpClose();});
  }
  _dpSelected=currentVal||'';
  _dpCallback=onConfirm;
  const base=_dpSelected?new Date(_dpSelected+'T00:00:00'):calToday();
  _calViewYear=base.getFullYear();_calViewMonth=base.getMonth();
  dpRender();
  // show
  modal.style.pointerEvents='auto';
  requestAnimationFrame(()=>{
    modal.style.background='rgba(0,0,0,.5)';
    document.getElementById('dp-sheet').style.transform='translateY(0)';
  });
}

function dpRender(){
  const today=calToday();
  const first=new Date(_calViewYear,_calViewMonth,1);
  const last=new Date(_calViewYear,_calViewMonth+1,0);
  const prevOk=new Date(_calViewYear,_calViewMonth,1)>new Date(today.getFullYear(),today.getMonth(),1);
  document.getElementById('dp-month').textContent=first.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const prev=document.getElementById('dp-prev');
  if(prev){prev.disabled=!prevOk;prev.style.opacity=prevOk?'1':'0.2';prev.style.cursor=prevOk?'pointer':'default';}
  const sel=_dpSelected||'';
  let html='';
  ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(d=>{
    html+=`<div style="font-size:9px;font-weight:800;color:var(--ink4);text-align:center;padding:2px 0 8px;text-transform:uppercase;letter-spacing:.5px;">${d}</div>`;
  });
  for(let i=0;i<first.getDay();i++) html+=`<div></div>`;
  for(let d=1;d<=last.getDate();d++){
    const date=new Date(_calViewYear,_calViewMonth,d);
    const val=calFmt(date);
    const past=date<today,isSel=val===sel,isToday=val===calFmt(today);
    let bg='transparent',color='var(--ink)',border='none',fw='600',cursor='pointer',op='1';
    if(past){color='var(--ink4)';op='.3';cursor='default';}
    else if(isSel){bg='var(--a2)';color='#fff';fw='800';border='none';}
    else if(isToday){bg='var(--surf)';border='2px solid var(--a2)';color='var(--a2)';fw='800';}
    const click=past?'':`onclick="_dpPick('${val}')"`;
    html+=`<div ${click} style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:${fw};color:${color};background:${bg};border:${border};border-radius:10px;cursor:${cursor};opacity:${op};transition:all .12s;">${d}</div>`;
  }
  document.getElementById('dp-grid').innerHTML=html;
  const btn=document.getElementById('dp-confirm');
  if(btn)btn.textContent=sel?'Confirm — '+calDisplay(new Date(sel+'T00:00:00')):'Confirm';
}

function _dpPick(val){_dpSelected=val;dpRender();}
function dpNav(dir){
  _calViewMonth+=dir;
  if(_calViewMonth<0){_calViewMonth=11;_calViewYear--;}
  if(_calViewMonth>11){_calViewMonth=0;_calViewYear++;}
  dpRender();
}
function dpClear(){_dpSelected='';dpRender();}
function dpConfirm(){
  if(_dpCallback)_dpCallback(_dpSelected||null);
  dpClose();
}
function dpClose(){
  const modal=document.getElementById('dp-modal');
  const sheet=document.getElementById('dp-sheet');
  if(!modal)return;
  modal.style.background='rgba(0,0,0,0)';
  if(sheet)sheet.style.transform='translateY(100%)';
  modal.style.pointerEvents='none';
  _dpCallback=null;_dskCalWid=null;
}
function openDskDuePicker(wid){
  _dskCalWid=wid;
  const inp=$('twd-'+wid);
  dpOpen(inp?.value||'',function(val){
    const btn=$('twdb-'+wid);
    const lbl=$('twdb-lbl-'+wid);
    if(inp)inp.value=val||'';
    if(lbl)lbl.textContent=val?calDisplay(new Date(val+'T00:00:00')):'Due date';
    if(btn){
      if(val){btn.style.borderColor='var(--a2)';btn.style.color='var(--a2)';btn.style.background='var(--al)';btn.classList.add('active');}
      else{btn.style.borderColor='var(--bdr)';btn.style.color='var(--ink3)';btn.style.background='var(--surf)';btn.classList.remove('active');}
    }
  });
}
function openDuePicker(wid){openDskDuePicker(wid);}
function onDueChange(wid){}
function openMobDuePicker(){
  const inp=document.getElementById('mob-add-task-due');
  dpOpen(inp?.value||'',function(val){
    if(inp)inp.value=val||'';
    const lbl=document.getElementById('mob-due-lbl');
    const btn=document.getElementById('mob-due-pick-btn');
    const icon=document.getElementById('mob-due-icon-wrap');
    if(lbl){
      lbl.textContent=val?calDisplay(new Date(val+'T00:00:00')):'Choose a date';
      lbl.style.color=val?'var(--a2)':'var(--ink3)';
      lbl.style.fontWeight=val?'700':'600';
    }
    if(btn){btn.style.borderColor=val?'var(--a2)':'var(--bdr)';btn.style.background=val?'var(--al)':'var(--surf2)';}
    if(icon){
      icon.style.background=val?'var(--a2)':'var(--surf)';
      icon.style.borderColor=val?'var(--a2)':'var(--bdr)';
      const svg=icon.querySelector('svg');
      if(svg)svg.setAttribute('stroke',val?'#fff':'var(--ink3)');
    }
  });
}
function mobSetDue(preset){
  const d=calToday();
  if(preset==='none'){
    const inp=document.getElementById('mob-add-task-due');if(inp)inp.value='';
    const lbl=document.getElementById('mob-due-selected-lbl2');if(lbl)lbl.textContent='Choose a date';
    const btn=document.querySelector('.mob-due-pick-btn');if(btn)btn.classList.remove('active');
    return;
  }
  if(preset==='tomorrow')d.setDate(d.getDate()+1);
  else if(preset==='week')d.setDate(d.getDate()+7);
  const val=calFmt(d);
  const inp=document.getElementById('mob-add-task-due');if(inp)inp.value=val;
  const lbl=document.getElementById('mob-due-selected-lbl2');if(lbl)lbl.textContent=calDisplay(d);
  const btn=document.querySelector('.mob-due-pick-btn');if(btn)btn.classList.add('active');
}
function mobDueReset(){
  const inp=document.getElementById('mob-add-task-due');if(inp)inp.value='';
  const lbl=document.getElementById('mob-due-lbl');
  const btn=document.getElementById('mob-due-pick-btn');
  const icon=document.getElementById('mob-due-icon-wrap');
  if(lbl){lbl.textContent='Choose a date';lbl.style.color='var(--ink3)';lbl.style.fontWeight='600';}
  if(btn){btn.style.borderColor='var(--bdr)';btn.style.background='var(--surf2)';}
  if(icon){icon.style.background='var(--surf)';icon.style.borderColor='var(--bdr)';const svg=icon.querySelector('svg');if(svg)svg.setAttribute('stroke','var(--ink3)');}
}



function openMobAddTask(){
  const modal=document.getElementById('mob-add-modal');
  if(modal){modal.classList.add('open');setTimeout(()=>document.getElementById('mob-add-task-input')?.focus(),100);}
  mobDueReset();
}
function closeMobAddTask(){
  const modal=document.getElementById('mob-add-modal');
  if(modal)modal.classList.remove('open');
  mobDueReset();
}
function mobSubmitTask(){
  const inp=document.getElementById('mob-add-task-input');
  const t=inp?.value.trim();if(!t)return;
  const due=document.getElementById('mob-add-task-due')?.value||'';
  tasks.unshift({id:Date.now(),text:t,col:'todo',date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'}),dueDate:due});
  persist();
  if(inp)inp.value='';
  const dueEl=document.getElementById('mob-add-task-due');if(dueEl)dueEl.value='';
  closeMobAddTask();
  mobRenderTasks();mobRenderHome();
  updateFixedStats();updateAllStatsW();renderAllTaskW();
}

// ── TIMER ──
function mobFmtSec(s){
  const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),ss=s%60;
  if(h>0)return `${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  return String(m).padStart(2,'0')+':'+String(ss).padStart(2,'0');
}
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
  _mobTimerSec=_mobTimerLastSet[m]||_mobTimerCustom[m]||MOB_TMODES[m].s;
  // show/hide session history and dots — only relevant for Pomodoro
  const hw=document.getElementById('mob-pom-history-wrap');
  const sw=document.getElementById('mob-timer-sessions');
  const isPomodoro=m===0;
  if(hw)hw.style.display=isPomodoro?'block':'none';
  if(sw)sw.style.display=isPomodoro?'flex':'none';
  mobTimerRender();
}
function mobTimerEdit(){
  if(_mobTimerRunning||MOB_TMODES[_mobTimerMode]?.locked)return;
  const t=document.getElementById('mob-timer-time'),i=document.getElementById('mob-timer-inputs');
  if(!t||!i)return;
  const inp=document.getElementById('mob-tminp');
  if(inp)inp.value=mobFmtSec(_mobTimerSec);
  t.classList.add('hide');i.classList.add('show');
  setTimeout(()=>{if(inp){inp.focus();inp.select();}},50);
}
function mobTimerConfirmEdit(){
  const inp=document.getElementById('mob-tminp');
  if(!inp)return;
  const total=parseTimeInput(inp.value.trim());
  if(total<1)return;
  _mobTimerCustom[_mobTimerMode]=total;
  _mobTimerLastSet[_mobTimerMode]=total;
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
    _mobTimerSec=_mobTimerLastSet[_mobTimerMode]||_mobTimerCustom[_mobTimerMode]||MOB_TMODES[_mobTimerMode].s;
    mobTimerRender();return;
  }
  if(_mobTimerRunning){
    clearInterval(_mobTimerIv);_mobTimerRunning=false;
  } else {
    if(_mobTimerSec<=0){_mobTimerSec=_mobTimerLastSet[_mobTimerMode]||_mobTimerCustom[_mobTimerMode]||MOB_TMODES[_mobTimerMode].s;}
    _mobTimerRunning=true;
    _mobTimerIv=setInterval(()=>{
      _mobTimerSec--;
      if(_mobTimerSec<=0){
        clearInterval(_mobTimerIv);_mobTimerRunning=false;
        _mobTimerSessions=(_mobTimerSessions+1)%5;
        _mobTimerSec=0;
        _mobTimerAlarmActive=true;
        if(_mobTimerMode===0) pomRecordSession();
        playAlarm();
      }
      mobTimerRender();
    },1000);
  }
  mobTimerRender();
}
function mobTimerReset(){
  clearInterval(_mobTimerIv);_mobTimerRunning=false;
  _mobTimerSec=_mobTimerLastSet[_mobTimerMode]||_mobTimerCustom[_mobTimerMode]||MOB_TMODES[_mobTimerMode].s;
  stopAlarm();_mobTimerAlarmActive=false;
  mobTimerRender();
}

// ── JOURNAL ──
function onMobJSearch(val){
  _mobJSearch=val.toLowerCase().trim();
  const clr=document.getElementById('mob-journal-search-clear');
  if(clr)clr.style.display=val?'block':'none';
  mobRenderJournal();
}
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
  const q=_mobJSearch||'';
  const filtered=q?journal.filter(j=>(j.text||'').toLowerCase().includes(q)||(j.date||'').toLowerCase().includes(q)):journal;
  if(!journal.length){
    list.innerHTML='<div class="mob-journal-empty">No entries yet.<br><span style="font-size:11px;">Write how your day is going above!</span></div>';
    return;
  }
  if(!filtered.length){
    list.innerHTML='<div class="mob-journal-empty">No entries match your search.</div>';
    return;
  }
  const hl=(txt)=>q?txt.replace(new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<mark style="background:var(--al);color:var(--a2);border-radius:2px;padding:0 1px;">$1</mark>'):txt;
  const mobJHdr=`<div style="display:flex;justify-content:space-between;align-items:center;padding:2px 4px 8px;"><span style="font-size:11px;color:var(--ink4);">${filtered.length}${q?' of '+journal.length:''} entr${journal.length>1?'ies':'y'}</span><button onclick="mobClrJournal()" style="background:none;border:none;font-size:11px;color:var(--ink4);cursor:pointer;padding:2px 6px;border-radius:6px;" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--ink4)'">Clear all</button></div>`;
  list.innerHTML=mobJHdr+filtered.map(j=>{
    const m=MLAB[j.mood]||MLAB[0];
    return`<div class="mob-journal-entry">
      <div class="mob-je-hd">
        <span class="mob-je-emoji">${m.e}</span>
        <span class="mob-je-mood">${m.l}</span>
        <span class="mob-je-date">${j.date}</span>
        <button class="mob-je-del" onclick="mobDelJournal(${j.id})">&#x2715;</button>
      </div>
      <div class="mob-je-text">${hl(esc(j.text))}</div>
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
async function mobDelJournal(id){
  if(!await appConfirm('Delete this journal entry?','This cannot be undone.'))return;
  journal=journal.filter(j=>j.id!==id);
  persist();mobRenderJournal();mobRenderHome();updateAllStatsW();updateFixedStats();
  if(typeof renderAllJournalW==='function')renderAllJournalW();
}
async function mobClrJournal(){
  if(!journal.length)return;
  if(!await appConfirm('Clear all '+journal.length+' journal entr'+(journal.length>1?'ies':'y')+'?','This cannot be undone.'))return;
  journal=[];persist();mobRenderJournal();mobRenderHome();updateAllStatsW();updateFixedStats();
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
async function mobDelProj(id){
  if(!await appConfirm('Delete this project?','All project data will be permanently removed.'))return;
  subjects=subjects.filter(s=>s.id!==id);persist();
  if(typeof renderSubFull==='function')renderSubFull();
  renderAllSubW();updateAllStatsW();updateFixedStats();mobRenderProjects();
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
  const d=acc[cu]||{};
  const displayName=d.displayName||d.display_name||'—';
  const nm=document.getElementById('mob-set-name');
  const un=document.getElementById('mob-set-un');
  if(nm)nm.textContent=displayName;
  if(un)un.textContent='@'+cu;
  const tog=document.getElementById('mob-tog-dk');
  if(tog)tog.classList.toggle('on',!!prefs.dark);
}

// ── PROFILE PAGE ──
function mobRenderProfile(){
  if(!cu)return;
  const d=acc[cu];if(!d)return;
  const nm=d.displayName||d.display_name||cu;
  const el=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  mobRenderProfileBio();
  renderActivity('mob-actbar','mob-act-streak',null);
  // Render profile avatar — use photo if available
  const pbavInner=document.getElementById('mob-pbav-inner');
  if(pbavInner){
    const photo=prefs.avatarUrl||prefs.avatarPhoto||null;
    if(photo){
      pbavInner.innerHTML=`<img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`;
    } else {
      pbavInner.textContent=nm[0].toUpperCase();
    }
  }
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
    if(!subjects.length){spl.innerHTML='<div style="font-size:12px;color:var(--ink4);padding:4px 0;">No projects yet</div>';}
    else spl.innerHTML=subjects.map(s=>`
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
  const nm=d.displayName||d.display_name||cu||'';
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
  const photo=prefs.avatarUrl||prefs.avatarPhoto||null;
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
  // Also update profile page avatar if visible
  const pbavInner=document.getElementById('mob-pbav-inner');
  if(pbavInner){
    if(photo){
      pbavInner.innerHTML=`<img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`;
    } else {
      pbavInner.textContent=letter;
    }
  }
}
async function mobAvatarUpload(e){
  const file=e.target.files[0];if(!file)return;
  const av=document.getElementById('mob-av');
  if(av)av.classList.remove('open');
  const url=await uploadAvatarToStorage(file);
  if(!url){alert('Photo upload failed. Please try again.');return;}
  prefs.avatarUrl=url;
  delete prefs.avatarPhoto;
  acc[cu].prefs=prefs;
  await saveAvatarUrl(url);
  persist();
  applyAvatar();
  mobUpdateAvatar();
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
    mobConfirmMsg.style.color='#ffffff';
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

    const siPrefs=JSON.parse(dbUser.prefs||'{}');
    if(dbUser.avatar_url) siPrefs.avatarUrl=dbUser.avatar_url;
    acc[u]={
      passHash:dbUser.pass_hash,
      displayName:dbUser.display_name||'',
      tasks:JSON.parse(dbUser.tasks||'[]'),
      journal:JSON.parse(dbUser.journal||'[]'),
      subjects:JSON.parse(dbUser.subjects||'[]'),
      calEvs:JSON.parse(dbUser.cal_evs||'[]'),
      widgets:JSON.parse(dbUser.widgets||'[]'),
      notes:JSON.parse(dbUser.notes||'{}'),
      prefs:siPrefs,
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
  // Only copy errors back — skip 'sue' since doSU sets the success message there
  // and we don't want to overwrite the mobile success message
  const desktopSue=$('sue');
  const isSuccess = desktopSue && desktopSue.style.display!=='none' && desktopSue.querySelector('button');
  if(!isSuccess){
    ['sue','see','spe','sp2e'].forEach((dk)=>{
      const de=$(dk),me=document.getElementById('mb-'+dk);
      if(de&&me&&de.style.display!=='none'){me.textContent=de.textContent;me.style.display='block';}
    });
  }
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
async function handlePhotoUpload(e){
  const file=e.target.files[0];if(!file)return;
  const url=await uploadAvatarToStorage(file);
  if(!url){alert('Photo upload failed. Please try again.');return;}
  prefs.avatarUrl=url;
  delete prefs.avatarPhoto;
  acc[cu].prefs=prefs;
  await saveAvatarUrl(url);
  persist();
  applyAvatar();
}
function applyAvatar(){
  const photo=prefs.avatarUrl||prefs.avatarPhoto||null;
  const nm=acc[cu]?.displayName||acc[cu]?.display_name||cu||'';
  const initials=nm.trim()?nm.trim()[0].toUpperCase():(cu?cu[0].toUpperCase():'U');
  const imgHtml=photo?`<img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`:'';
  ['sbavt','ddav','pbav'].forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    if(photo){el.innerHTML=imgHtml;}else{el.textContent=initials;}
  });
  const mobPbav=document.getElementById('mob-pbav-inner');
  if(mobPbav){if(photo){mobPbav.innerHTML=imgHtml;}else{mobPbav.textContent=initials;}}
  const mav=document.getElementById('mob-av-inner');
  if(mav){if(photo){mav.innerHTML=imgHtml;}else{mav.textContent=initials;}}
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
    const pulledPrefs=JSON.parse(dbUser.prefs||'{}');
    if(dbUser.avatar_url) pulledPrefs.avatarUrl=dbUser.avatar_url;
    acc[cu]={
      passHash:dbUser.pass_hash,
      displayName:dbUser.display_name||acc[cu]?.displayName||'',
      tasks:JSON.parse(dbUser.tasks||'[]'),
      journal:JSON.parse(dbUser.journal||'[]'),
      subjects:JSON.parse(dbUser.subjects||'[]'),
      calEvs:JSON.parse(dbUser.cal_evs||'[]'),
      widgets:JSON.parse(dbUser.widgets||'[]'),
      notes:JSON.parse(dbUser.notes||'{}'),
      prefs:pulledPrefs,
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
  // midnight habit reset check
  const lastDay=LS.g('pd1_habitday',null);
  const today=new Date().toISOString().slice(0,10);
  if(lastDay && lastDay!==today){
    // new day — completions auto-reset since we key by date
    // just re-render if on profile
  }
  LS.s('pd1_habitday',today);
  // re-render habits at midnight
  const now=new Date(), msToMidnight=(new Date(now.getFullYear(),now.getMonth(),now.getDate()+1)-now);
  setTimeout(()=>{
    renderHabits('habit-list'); renderHabits('mob-habit-list');
    renderHabitAddForm('habit-add-form'); renderHabitAddForm('mob-habit-add-form');
  }, msToMidnight);
  const d=acc[cu];
  tasks=d.tasks||[];journal=d.journal||[];subjects=d.subjects||[];
  calEvs=d.calEvs||[];widgets=d.widgets||[];notes=d.notes||{};prefs=d.prefs||{dark:false};
  // avatarUrl lives inside prefs — already set before launch() is called in doSI
  // just make sure it wasn't lost when prefs was reassigned above
  if(d.prefs?.avatarUrl) prefs.avatarUrl=d.prefs.avatarUrl;
  const nm=d.displayName||cu,av=nm[0].toUpperCase();
  $('ddnm').textContent=nm;$('ddun').textContent='@'+cu;
  applyAvatar();
  $('ev-d').value=new Date().toISOString().slice(0,10);
  applyTheme();show('app');goPg(LS.g('pd1_pg','canvas'),null);
  renderCanvas();
  renderFixedQuote();
  updateFixedStats();
  if(isMobile())setTimeout(()=>{initMobApp();mobUpdateAvatar();},100);
  startRealtime();
  startRealtimeSync(cu);
}

// ═══════════════════════════════════════
// PROFILE — BIO + SOCIAL + ACTIVITY
// ═══════════════════════════════════════
function openBioModal(){
  const p=prefs;
  const bi=$('bio-i');if(bi)bi.value=p.bio||'';
  ['github','web','twitter','linkedin'].forEach(k=>{
    const el=$('social-'+k);if(el)el.value=p['social_'+k]||'';
  });
  openMo('mo-bio');
}
function saveBio(){
  prefs.bio=$('bio-i')?.value.trim()||'';
  ['github','web','twitter','linkedin'].forEach(k=>{
    const val=$('social-'+k)?.value.trim()||'';
    if(val)prefs['social_'+k]=val;
    else delete prefs['social_'+k];
  });
  if(acc[cu])acc[cu].prefs=prefs;
  persist();
  renderProfileBio();
  mobRenderProfileBio();
  closeMo('mo-bio');
}
function renderProfileBio(){
  const bioEl=$('prof-bio');
  const socEl=$('prof-socials');
  if(bioEl) bioEl.textContent=prefs.bio||'No bio yet — click Edit to add one.';
  if(socEl) socEl.innerHTML=renderSocialLinks();
}
function mobRenderProfileBio(){
  const bioEl=$('mob-prof-bio');
  const socEl=$('mob-prof-socials');
  if(bioEl) bioEl.textContent=prefs.bio||'No bio yet — tap Edit to add one.';
  if(socEl) socEl.innerHTML=renderSocialLinks();
}
function renderSocialLinks(){
  const links=[];
  const map={github:'GitHub',web:'Website',twitter:'Twitter',linkedin:'LinkedIn'};
  Object.entries(map).forEach(([k,label])=>{
    const url=prefs['social_'+k];
    if(url)links.push(`<a href="${url}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;padding:5px 12px;background:var(--surf2);border:1.5px solid var(--bdr);border-radius:100px;font-size:11px;font-weight:600;color:var(--ink);text-decoration:none;">${label}</a>`);
  });
  return links.join('');
}

// ── Enhanced Activity Bar ──
function renderActivity(barId, streakId, legendId){
  const barEl=$(barId); if(!barEl)return;
  const today=new Date();

  // Build 30-day activity map
  const actMap={};
  journal.forEach(j=>{
    const ds=new Date(j.ts||j.id).toDateString();
    actMap[ds]=(actMap[ds]||0)+1;
  });
  tasks.filter(t=>t.col==='done').forEach(t=>{
    const ds=new Date(t.id).toDateString();
    actMap[ds]=(actMap[ds]||0)+1;
  });

  const maxVal=Math.max(1,...Object.values(actMap));

  // Color intensity levels based on activity count
  function cellColor(count){
    if(!count) return 'var(--bdr)';
    const lvl=count/maxVal;
    if(lvl<=0.25) return 'var(--al)';
    if(lvl<=0.5)  return 'var(--a2)';
    if(lvl<=0.75) return 'var(--a2)';
    return 'var(--a)';
  }
  function cellOpacity(count){
    if(!count) return '1';
    const lvl=count/maxVal;
    if(lvl<=0.25) return '0.4';
    if(lvl<=0.5)  return '0.65';
    if(lvl<=0.75) return '0.85';
    return '1';
  }

  // 30 squares in a single row, oldest left → today right
  let squares='';
  for(let i=29;i>=0;i--){
    const d=new Date(today);d.setDate(today.getDate()-i);
    const ds=d.toDateString();
    const count=actMap[ds]||0;
    const isToday=i===0;
    const label=d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
    const tip=`${label}${count?`: ${count} activit${count!==1?'ies':'y'}`:''}`;
    squares+=`<div title="${tip}" style="width:100%;aspect-ratio:1;border-radius:3px;background:${cellColor(count)};opacity:${cellOpacity(count)};${isToday?'outline:2px solid var(--a2);outline-offset:1px;':''};cursor:default;"></div>`;
  }

  let html=`<div style="overflow:hidden;"><div style="display:grid;grid-template-columns:repeat(30,1fr);gap:3px;">${squares}</div></div>`;
  html+=`<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
    <span style="font-size:10px;color:var(--ink4);">30 days ago</span>
    <div style="display:flex;align-items:center;gap:4px;">
      <span style="font-size:10px;color:var(--ink4);">Less</span>
      ${[0,0.3,0.6,1].map(v=>`<div style="width:8px;height:8px;border-radius:2px;background:${v?'var(--a2)':'var(--bdr)'};opacity:${v||1};"></div>`).join('')}
      <span style="font-size:10px;color:var(--ink4);">More</span>
    </div>
    <span style="font-size:10px;color:var(--ink4);">Today</span>
  </div>`;

  barEl.innerHTML=html;

  // Streak counter
  if(streakId){
    let streak=0;
    for(let i=0;i<=90;i++){
      const d=new Date(today);d.setDate(today.getDate()-i);
      const ds=d.toDateString();
      if(actMap[ds])streak++;else break;
    }
    const streakEl=$(streakId);
    if(streakEl) streakEl.textContent=streak>1?`${streak}-day streak`:streak===1?'Active today':'';
  }
}

// ═══════════════════════════════════════
// FEEDBACK
// ═══════════════════════════════════════
let _fbType='general', _fbStar=0;
function fbRate(n, containerId){
  _fbStar = n;
  ['fb-stars','dsk-fb-stars'].forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    el.querySelectorAll('.fbs').forEach(s => {
      s.classList.toggle('on', parseInt(s.dataset.v) <= n);
    });
  });
}
function initFbStars(){
  _fbStar = 0;
  document.querySelectorAll('.fbs').forEach(s => s.classList.remove('on'));
}
function setFbType(t){
  _fbType=t;
  ['gen','bug','idea'].forEach(k=>{
    const el=$('fb-type-'+k);if(el)el.classList.toggle('fbtype-act',('general'===t&&k==='gen')||t===k);
    const el2=$('dsk-fb-type-'+k);if(el2)el2.classList.toggle('fbtype-act',('general'===t&&k==='gen')||t===k);
  });
}
async function submitFeedback(isDesktop=false){
  const msgId=isDesktop?'dsk-fb-msg':'fb-msg';
  const msg=$(msgId)?.value.trim();
  if(!msg){alert('Please write a message before sending.');return;}
  const body={type:_fbType,rating:_fbStar,message:msg,user:cu,ts:new Date().toISOString()};
  const subject=encodeURIComponent(`[Prodify Feedback] ${_fbType} from ${cu}`);
  const emailBody=encodeURIComponent(`Type: ${_fbType}\nRating: ${_fbStar}/5\n\n${msg}`);
  window.open(`mailto:david@prodify.cc?subject=${subject}&body=${emailBody}`,'_blank');
  const succId=isDesktop?'dsk-fb-success':'fb-success';
  const succEl=$(succId);if(succEl){succEl.style.display='block';}
  if($(msgId))$(msgId).value='';
  _fbStar=0; initFbStars();
  setTimeout(()=>{if(succEl)succEl.style.display='none';if(isDesktop)closeMo('mo-feedback');},2500);
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
    prefs=cP;
    // Load avatar_url from DB column (source of truth)
    if(dbUser.avatar_url) prefs.avatarUrl = dbUser.avatar_url;
    acc[cu].prefs = prefs;
    // Always re-render with cloud data — no conditional check
    // Update name display and avatar with cloud data
    const nm2=acc[cu].displayName||cu;
    if($('ddnm'))$('ddnm').textContent=nm2;
    if($('ddun'))$('ddun').textContent='@'+cu;
    applyAvatar();
    if(typeof mobUpdateAvatar==='function') mobUpdateAvatar();
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
    if(isMobile()&&typeof mobRenderProfile==='function'&&_mobPage==='profile') mobRenderProfile();
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
function openMo(id){
  $(id).classList.add('open');
  if(id==='mo-feedback'){_fbType='general';_fbStar=0;setTimeout(initFbStars,50);}
}
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
  habits:{w:300,h:340,title:'Daily Habits'},
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

async function removeW(id){
  if(!await appConfirm('Remove this widget?','Your data is still saved — you can add it back anytime.','Remove'))return;
  widgets=widgets.filter(w=>w.id!==id);
  const el=$(id);if(el)el.remove();
  // stop timer and alarm if running
  if(TMS[id]){
    clearInterval(TMS[id].iv);
    if(TMS[id].alarmActive) stopAlarm();
    delete TMS[id];
  }
  persist();
}

function clearCanvas(){
  if(!confirm('Remove all widgets from the canvas? Your data is still saved.'))return;
  widgets.forEach(w=>{if(TMS[w.id]){clearInterval(TMS[w.id].iv);if(TMS[w.id].alarmActive)stopAlarm();delete TMS[w.id];}});
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
  el.dataset.type=w.type;
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
  else if(w.type==='habits')buildHabitW(body,w);
}


/* ── HABIT TRACKER ── */
function buildHabitW(body,w){
  body.style.cssText='display:flex;flex-direction:column;height:100%;overflow:hidden;';
  const wid=w.id;
  const emojiWrap=document.createElement('div');
  emojiWrap.id='wemoji-'+wid;
  emojiWrap.style.cssText='display:grid;grid-template-columns:repeat(12,1fr);gap:3px;margin-bottom:6px;';
  HABIT_EMOJIS.forEach(e=>{
    const btn=document.createElement('button');
    btn.dataset.emoji=e;
    btn.textContent=e;
    btn.style.cssText='aspect-ratio:1;width:100%;border-radius:6px;border:1.5px solid var(--bdr);background:var(--surf);cursor:pointer;font-size:clamp(10px,1.8vw,14px);transition:all .13s;';
    btn.onclick=function(){habitWSelectEmoji(this,wid);};
    emojiWrap.appendChild(btn);
  });
  emojiWrap._sel=HABIT_EMOJIS[0];
  // select first
  const firstBtn=emojiWrap.querySelector('[data-emoji]');
  if(firstBtn){firstBtn.style.background='var(--al)';firstBtn.style.borderColor='var(--a2)';}

  const inp=document.createElement('input');
  inp.id='hinp-'+wid;inp.type='text';inp.placeholder='New habit…';inp.maxLength=40;
  inp.style.cssText='flex:1;background:var(--surf2);border:1.5px solid var(--bdr);border-radius:8px;padding:6px 10px;font-size:12px;color:var(--ink);outline:none;font-family:inherit;';
  inp.onfocus=function(){this.style.borderColor='var(--a2)';};
  inp.onblur=function(){this.style.borderColor='var(--bdr)';};
  inp.onkeydown=function(e){if(e.key==='Enter')habitWSubmit(wid);};

  const addBtn=document.createElement('button');
  addBtn.textContent='+ Add';
  addBtn.style.cssText='background:var(--a2);color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;';
  addBtn.onclick=function(){habitWSubmit(wid);};

  const inputRow=document.createElement('div');
  inputRow.style.cssText='display:flex;gap:6px;';
  inputRow.appendChild(inp);inputRow.appendChild(addBtn);

  const footer=document.createElement('div');
  footer.style.cssText='padding:8px 10px;border-top:1px solid var(--bdr);flex-shrink:0;';
  footer.appendChild(emojiWrap);footer.appendChild(inputRow);

  const list=document.createElement('div');
  list.id='hlist-'+wid;list.style.cssText='display:flex;flex-direction:column;gap:6px;';
  const scroll=document.createElement('div');
  scroll.id='hwrap-'+wid;scroll.style.cssText='flex:1;overflow-y:auto;padding:10px 10px 4px;';
  scroll.appendChild(list);

  body.appendChild(scroll);body.appendChild(footer);
  renderHabitW(wid);
}
function renderHabitW(wid){
  const list=document.getElementById('hlist-'+wid);
  if(!list)return;
  const habits=habitGetAll();
  const total=habits.length, doneCount=habits.filter(h=>habitDoneToday(h.id)).length;
  if(!total){
    list.innerHTML=`<div style="text-align:center;padding:20px 10px;color:var(--ink4);font-size:12px;line-height:1.8;">
      <div style="font-size:24px;margin-bottom:6px;">🎯</div>
      Add habits to track below
    </div>`;
    return;
  }
  const pct=Math.round(doneCount/total*100);
  list.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
      <span style="font-size:10px;font-weight:700;color:var(--ink3);">TODAY — ${doneCount}/${total}</span>
      <span style="font-size:10px;font-weight:700;color:var(--a2);">${pct}%</span>
    </div>
    <div style="height:3px;background:var(--bdr);border-radius:2px;margin-bottom:8px;overflow:hidden;">
      <div style="height:100%;width:${pct}%;background:var(--a2);border-radius:2px;"></div>
    </div>
    ${habits.map(h=>{
      const done=habitDoneToday(h.id);
      const streak=habitStreak(h.id);
      return `<div style="display:flex;align-items:center;gap:8px;padding:7px 8px;background:${done?'var(--al)':'var(--surf2)'};border:1.5px solid ${done?'var(--a2)':'var(--bdr)'};border-radius:10px;transition:all .18s;">
        <button onclick="habitToggleW(${h.id},'${wid}')" style="width:28px;height:28px;border-radius:50%;border:2px solid ${done?'var(--a2)':'var(--bdr)'};background:transparent;display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;flex-shrink:0;transition:all .18s;">${done?'✔️':h.emoji}</button>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:600;color:${done?'var(--a2)':'var(--ink)'};${done?'text-decoration:line-through;':''};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(h.name)}</div>
          ${streak>0?`<div style="font-size:10px;color:var(--a2);">🔥 ${streak}d</div>`:''}
        </div>
        <button onclick="habitDeleteW(${h.id},'${wid}')" style="background:none;border:none;color:var(--ink4);cursor:pointer;font-size:11px;padding:2px 4px;border-radius:4px;flex-shrink:0;transition:all .15s;"
          onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--ink4)'">✕</button>
      </div>`;
    }).join('')}`;
}

function habitToggleW(id, wid){
  habitToggle(id);
  renderHabitW(wid);
  // also re-render all other habit widgets
  widgets.filter(w=>w.type==='habits'&&w.id!==wid).forEach(w=>renderHabitW(w.id));
}

async function habitDeleteW(id, wid){
  if(!await appConfirm('Delete this habit?','Your streak and history will be lost.'))return;
  prefs.habits=(prefs.habits||[]).filter(h=>h.id!==id);
  habitSave();
  renderHabitW(wid);
  widgets.filter(w=>w.type==='habits'&&w.id!==wid).forEach(w=>renderHabitW(w.id));
  renderHabits('habit-list'); renderHabits('mob-habit-list'); renderHabits('mob-habit-page-list');
}

function habitWSubmit(wid){
  const inp=document.getElementById('hinp-'+wid);
  if(!inp||!inp.value.trim())return;
  if((prefs.habits||[]).length>=HABIT_MAX_FREE){habitShowProGate();return;}
  prefs.habits=prefs.habits||[];
  prefs.habits.push({id:Date.now(),name:inp.value.trim(),emoji:'✔️',created:habitToday()});
  habitSave();
  inp.value='';
  renderHabitW(wid);
  widgets.filter(w=>w.type==='habits'&&w.id!==wid).forEach(w=>renderHabitW(w.id));
  renderHabits('habit-list'); renderHabits('mob-habit-list'); renderHabits('mob-habit-page-list');
}

// DRAG
function startDrag(e,id){
  e.preventDefault();
  const el=$(id);if(!el)return;
  const w=widgets.find(x=>x.id===id);if(!w)return;
  el.classList.add('wdrag');
  // Disable pointer events on other widgets during drag to prevent hit-test lag
  document.querySelectorAll('.widget').forEach(wd=>{if(wd.id!==id)wd.style.pointerEvents='none';});
  const scale = window._canvasScale||1;
  // Capture pointer for fast uninterrupted tracking
  try{if(e.pointerId!=null)el.setPointerCapture(e.pointerId);}catch(_){}
  // Convert initial mouse pos to canvas space
  const startX = e.clientX/scale - w.x;
  const startY = e.clientY/scale - w.y;
  const mm=e=>{
    w.x=Math.max(0, e.clientX/scale - startX);
    w.y=Math.max(0, e.clientY/scale - startY);
    el.style.left=w.x+'px';el.style.top=w.y+'px';
  };
  const mu=()=>{
    el.classList.remove('wdrag');
    document.querySelectorAll('.widget').forEach(wd=>wd.style.pointerEvents='');
    persist();
    el.removeEventListener('pointermove',mm);
    el.removeEventListener('pointerup',mu);
  };
  el.addEventListener('pointermove',mm);
  el.addEventListener('pointerup',mu);
}

// RESIZE
function startResize(e,id){
  e.preventDefault();e.stopPropagation();
  const el=$(id);if(!el)return;
  const w=widgets.find(x=>x.id===id);if(!w)return;
  el.classList.add('wresize');
  const scale = window._canvasScale||1;
  try{if(e.pointerId!=null)e.target.setPointerCapture(e.pointerId);}catch(_){}
  const startX=e.clientX/scale, startY=e.clientY/scale, startW=w.w, startH=w.h;
  const isTimer=w.type==='timer';
  const isHabit=w.type==='habits';
  const minW=isTimer?260:isHabit?340:200, maxW=99999;
  const minH=isTimer?400:isHabit?380:130, maxH=99999;
  const mm=e=>{
    w.w=Math.min(maxW,Math.max(minW,startW+(e.clientX/scale-startX)));
    w.h=Math.min(maxH,Math.max(minH,startH+(e.clientY/scale-startY)));
    el.style.width=w.w+'px';el.style.height=w.h+'px';
  };
  const mu=()=>{
    el.classList.remove('wresize');persist();
    e.target.releasePointerCapture&&e.target.releasePointerCapture(e.pointerId);
    el.removeEventListener('pointermove',mm);el.removeEventListener('pointerup',mu);
  };
  el.addEventListener('pointermove',mm);el.addEventListener('pointerup',mu);
}

// ═══════════════════════════════════════
// WIDGET BODIES
// ═══════════════════════════════════════

/* ── TASK BOARD ── */
function buildTaskW(body,w){
  body.style.display='flex';body.style.flexDirection='column';
  body.innerHTML=`
    <div style="display:flex;align-items:center;padding:8px 10px;gap:6px;border-bottom:1px solid var(--bdr);flex-shrink:0;background:var(--surf2);">
      <input class="twi" id="twi-${w.id}" type="text" placeholder="New task — Enter to add" onkeydown="if(event.key==='Enter')addTask('${w.id}')"/>
      <input type="date" id="twd-${w.id}" style="display:none;"/>
      <button id="twdb-${w.id}" onclick="openDskDuePicker('${w.id}')" style="flex-shrink:0;display:inline-flex;align-items:center;gap:4px;padding:6px 10px;background:var(--surf);border:1.5px solid var(--bdr);border-radius:8px;font-size:11px;font-weight:600;color:var(--ink3);cursor:pointer;font-family:inherit;white-space:nowrap;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 9h18M8 2v3M16 2v3"/></svg>
        <span id="twdb-lbl-${w.id}">Due date</span>
      </button>
      <button class="twbtn" onclick="addTask('${w.id}')">Add</button>
    </div>
    <div class="twcols">
      <div class="twcol"><div class="twchd"><div class="twchl"><div class="twdot" style="background:#B87333"></div>To Do</div><span class="twcnt" id="cn-todo-${w.id}">0</span></div><div class="twbody" id="col-todo-${w.id}" onclick="if(_selTask)_selTask=null,renderAllTaskW()" ondragover="dov(event,'todo','${w.id}')" ondragleave="dlv(event)" ondrop="drp(event,'todo')"></div></div>
      <div class="twcol"><div class="twchd"><div class="twchl"><div class="twdot" style="background:#3A7D5E"></div>In Progress</div><span class="twcnt" id="cn-inprog-${w.id}">0</span></div><div class="twbody" id="col-inprog-${w.id}" ondragover="dov(event,'inprog','${w.id}')" ondragleave="dlv(event)" ondrop="drp(event,'inprog')"></div></div>
      <div class="twcol"><div class="twchd"><div class="twchl"><div class="twdot" style="background:#1B4332"></div>Done</div><div style="display:flex;align-items:center;gap:6px;"><span class="twcnt" id="cn-done-${w.id}">0</span><button class="twbtn" style="padding:2px 7px;font-size:10px;opacity:0.7;" onclick="clrDoneTasks('${w.id}')" data-tip="Clear all done tasks">Clear</button></div></div><div class="twbody" id="col-done-${w.id}" ondragover="dov(event,'done','${w.id}')" ondragleave="dlv(event)" ondrop="drp(event,'done')"></div></div>
    </div>`;
  renderTaskCols(w.id);
}

// openDuePicker + onDueChange handled above
function addTask(wid){
  const inp=$('twi-'+wid);const t=inp.value.trim();if(!t){inp.focus();return;}
  const due=$('twd-'+wid)?.value||'';
  tasks.unshift({id:Date.now(),text:t,col:'todo',date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'}),dueDate:due});
  persist();renderAllTaskW();inp.value='';
  if($('twd-'+wid))$('twd-'+wid).value='';
  onDueChange(wid);
  inp.focus();
  updateAllStatsW();updateFixedStats();
}
function taskDueInfo(t){
  if(!t.dueDate)return null;
  const today=new Date(); today.setHours(0,0,0,0);
  const due=new Date(t.dueDate+'T00:00:00');
  const diff=Math.round((due-today)/(1000*60*60*24));
  const done=t.col==='done';
  // overdue: only if not done and past due
  if(diff<0&&!done){
    return{label:'Overdue',color:'var(--red)',bg:'var(--rl)',border:'rgba(220,38,38,0.3)',priority:0};
  }
  if(done)return null; // done tasks show nothing
  if(diff===0) return{label:'Today',    color:'var(--red)',bg:'var(--rl)',border:'rgba(220,38,38,0.3)',priority:1};
  if(diff===1) return{label:'Tomorrow', color:'var(--red)',bg:'var(--rl)',border:'rgba(220,38,38,0.3)',priority:2};
  if(diff<=7)  return{label:due.toLocaleDateString('en-US',{month:'short',day:'numeric'}),color:'#8a6500',bg:'rgba(245,183,0,0.15)',border:'rgba(245,183,0,0.45)',priority:3};
  return{label:due.toLocaleDateString('en-US',{month:'short',day:'numeric'}),color:'var(--a2)',bg:'rgba(58,125,94,0.12)',border:'rgba(58,125,94,0.3)',priority:4};
}
function sortByDue(arr){
  return arr.slice().sort((a,b)=>{
    const da=taskDueInfo(a), db=taskDueInfo(b);
    const pa=da?da.priority:5, pb=db?db.priority:5;
    if(pa!==pb)return pa-pb;
    if(a.dueDate&&b.dueDate)return a.dueDate.localeCompare(b.dueDate);
    return 0;
  });
}
function selTask(e,id){
  e.stopPropagation();
  _selTask=(_selTask===id)?null:id;
  renderAllTaskW();
}
async function delTask(id){if(!await appConfirm('Delete this task?','This cannot be undone.'))return;tasks=tasks.filter(t=>t.id!==id);_selTask=null;persist();renderAllTaskW();updateAllStatsW();updateFixedStats();}
function renderAllTaskW(){widgets.filter(w=>w.type==='tasks').forEach(w=>renderTaskCols(w.id));}
function sortByDueLegacy(arr){return sortByDue(arr);} // alias
function renderTaskCols(wid){
  if(!$('col-todo-'+wid))return;
  const cols={todo:[],inprog:[],done:[]};
  tasks.forEach(t=>{if(cols[t.col])cols[t.col].push(t);});
  Object.keys(cols).forEach(k=>{cols[k]=sortByDue(cols[k]);});
  ['todo','inprog','done'].forEach(c=>{
    const el=$('col-'+c+'-'+wid);if(!el)return;
    $('cn-'+c+'-'+wid).textContent=cols[c].length;
    if(!cols[c].length){el.innerHTML=`<div class="twempty"><div class="twempty-t">${{todo:'Nothing planned',inprog:'Nothing active',done:'Nothing yet'}[c]}</div></div>`;return;}
    el.innerHTML=cols[c].map(t=>{
      const due=taskDueInfo(t);
      const dueTag=due?`<span class="tag tl" style="background:${due.bg};color:${due.color};border:1px solid ${due.border};">${due.label}</span>`:'';
      const isOverdue=due?.label==='Overdue';
      return `<div class="tc${_selTask===t.id?' tc-selected':''}${isOverdue?' tc-overdue':''}" id="tc-${t.id}" draggable="true" ondragstart="dstart(event,${t.id})" ondragend="dend()" onclick="selTask(event,${t.id})" ontouchstart="tcTouchStart(event,${t.id})">
      <button class="tcdel" onclick="event.stopPropagation();delTask(${t.id})">&times;</button>
      <div class="tct" style="${t.col==='done'?'text-decoration:line-through;opacity:.5;':''}">${esc(t.text)}</div>
      <div class="tcf">${dueTag}<span class="tcd">${t.date}</span></div>
    </div>`;
    }).join('');
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
    <div class="jwsearch-wrap">
      <input class="jwsearch" id="jws-${w.id}" type="text" placeholder="Search entries…" oninput="onJwSearch('${w.id}',this.value)"/>
    </div>
    <div class="jwlist" id="jwl-${w.id}" style="flex:1;overflow-y:auto;"></div>
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
async function delJournal(id){if(!await appConfirm('Delete this journal entry?','This cannot be undone.'))return;journal=journal.filter(j=>j.id!==id);persist();renderAllJournalW();updateAllStatsW();updateFixedStats();}
function renderAllJournalW(){widgets.filter(w=>w.type==='journal').forEach(w=>renderJournalW(w.id));}
function onJwSearch(wid,val){_jwSearch[wid]=val.toLowerCase().trim();renderJournalW(wid);}
function renderJournalW(wid){
  const el=$('jwl-'+wid);if(!el)return;
  const q=_jwSearch[wid]||'';
  const filtered=q?journal.filter(j=>(j.text||'').toLowerCase().includes(q)||(j.date||'').toLowerCase().includes(q)):journal;
  if(!journal.length){el.innerHTML='<div class="jwempty">Your journal is empty.<br/>Write something below.</div>';return;}
  if(!filtered.length){el.innerHTML='<div class="jwempty">No entries match your search.</div>';return;}
  const hdr=`<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 2px 6px;"><span style="font-size:10px;color:var(--ink4);letter-spacing:0.04em;">${filtered.length} of ${journal.length} entr${journal.length>1?'ies':'y'}</span><button onclick="clrJournalW('${wid}')" style="background:none;border:none;font-size:10px;color:var(--ink4);cursor:pointer;padding:2px 4px;border-radius:4px;transition:color 0.15s;" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--ink4)'">Clear all</button></div>`;
  const hl=(txt)=>q?txt.replace(new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<mark style="background:var(--al);color:var(--a2);border-radius:2px;padding:0 1px;">$1</mark>'):txt;
  el.innerHTML=hdr+filtered.map(j=>{
    const m=MLAB[j.mood]||MLAB[0];
    return `<div class="jwje"><div class="jwjehd"><div class="jwm">${m.e}</div><span class="jwdt">${j.date} · ${m.l}</span><button class="jwdel" onclick="delJournal(${j.id})">&times;</button></div><div class="jwtx">${hl(esc(j.text))}</div></div>`;
  }).join('');
}

/* ── TIMER ── */
function buildTimerW(body,w){
  body.style.display='flex';body.style.flexDirection='column';
  if(!TMS[w.id])TMS[w.id]={mode:0,sec:25*60,running:false,iv:null,sessions:0,custom:[25*60,20*60]};
  const ts=TMS[w.id];
  if(!ts.custom||ts.custom.length<2)ts.custom=[25*60,20*60];
  ts.custom[0]=25*60; // lock pomodoro

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
          <div class="tm-inputhint">1:00:00 &nbsp;·&nbsp; MM:SS &nbsp;·&nbsp; Enter to set</div>
          <button class="tm-setbtn" onclick="tmConfirmEdit('${w.id}')">Set time</button>
        </div>
      </div>
      <div class="tmctrl">
        <button class="tm-resetbtn" data-tip="Reset" onclick="resetTimer('${w.id}')">↺</button>
        <button class="tm-startbtn ${ts.running?'stop':''}" id="tmbtn-${w.id}" onclick="timerBtn('${w.id}')" style="flex:1;">${ts.running?'Pause':'Start'}</button>
        <button class="focus-btn" onclick="enterFocusMode('${w.id}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
          Focus
        </button>
      </div>
      <div class="tmsess" id="tmsess-${w.id}" style="${ts.mode!==0?'display:none;':''}">
        ${Array.from({length:4},(_,i)=>`<div class="tmsd${i<ts.sessions?' dn':''}"></div>`).join('')}
      </div>
      <div id="dsk-pom-history-wrap-${w.id}" style="margin:8px 14px 14px;background:var(--surf2);border:1px solid var(--bdr);border-radius:12px;padding:12px 14px;${ts.mode!==0?'display:none;':''}">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:var(--ink3);margin-bottom:10px;">Session History</div>
        <div id="dsk-pom-history"></div>
      </div>
    </div>`;
  if(ts.running){clearInterval(ts.iv);ts.iv=setInterval(()=>tickTimer(w.id),1000);}
  pomRenderHistory();
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
  // Pre-fill with current time in H:MM:SS or MM:SS
  inp.value=fmtSec(ts.sec);
  timeEl.classList.add('hide');
  inpEl.classList.add('show');
  setTimeout(()=>{inp.focus();inp.select();},50);
}
function tmInputFmt(e){
  // Strip anything that isn't a digit or colon
  e.target.value=e.target.value.replace(/[^0-9:]/g,'');
}
function tmInputKey(e,wid){
  if(e.key==='Enter'){e.preventDefault();tmConfirmEdit(wid);}
  if(e.key==='Escape'){e.preventDefault();tmCancelEdit(wid);}
}
function tmConfirmEdit(wid){
  const ts=TMS[wid];if(!ts)return;
  const inp=$('tminp-'+wid);
  if(!inp)return;
  const total=parseTimeInput(inp.value.trim());
  if(total<1)return;
  ts.custom[ts.mode]=total;
  ts.sec=total;
  if(ts.mode===1){_mobTimerCustom[1]=total;_mobTimerSec=total;}
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
  // show/hide session history + dots based on mode
  const isPomodoro=m===0;
  const hw=document.getElementById('dsk-pom-history-wrap-'+wid);
  const sw=document.getElementById('tmsess-'+wid);
  if(hw)hw.style.display=isPomodoro?'':'none';
  if(sw)sw.style.display=isPomodoro?'':'none';
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
    if(ts.mode===0) pomRecordSession();
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
async function delSub(id){if(!await appConfirm('Delete this project?','All project data will be permanently removed.'))return;subjects=subjects.filter(s=>s.id!==id);persist();renderSubFull();renderAllSubW();updateAllStatsW();if(typeof mobRenderProjects==='function')mobRenderProjects();}
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
  const photo=prefs.avatarUrl||prefs.avatarPhoto||null;
  // Bio + social
  renderProfileBio();
  // Enhanced activity
  renderActivity('actbar','act-streak',null);
  const pbavEl=$('pbav');
  if(pbavEl){
    if(photo){
      pbavEl.innerHTML=`<img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0;"/><div class="pbav-overlay">📷 Change</div>`;
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

  if(!subjects.length){$('spllist').innerHTML='<span style="font-size:12px;color:var(--ink4)">No projects yet.</span>';}
  else $('spllist').innerHTML=subjects.map(s=>`<div class="splrow"><div class="spldot" style="background:${s.color}"></div><div class="splnm">${esc(s.name)}</div><div class="splg" style="color:${gradeC(s.progress)}">${s.progress}%</div></div>`).join('');
}

// ═══════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════
function renderSettings(){
  const d=acc[cu]||{};
  const displayName=d.displayName||d.display_name||'—';
  const el=document.getElementById('set-dn');if(el)el.textContent=displayName;
  const un=document.getElementById('set-un');if(un)un.textContent='@'+cu;
  const nmInput=$('nm-i');if(nmInput)nmInput.value=d.displayName||'';
  $('tog-dk').className='tog'+(prefs.dark?' on':'');
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
  if(sbReady)dbSaveUser(cu,acc[cu]);
  ['sbavt','ddav'].forEach(id=>{const e=$(id);if(e)e.textContent=n[0].toUpperCase();});
  const ddnm=$('ddnm');if(ddnm)ddnm.textContent=n;
  if($('pbnm'))$('pbnm').textContent=n;
  renderSettings();
  mobRenderSettings();
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
async function clrDoneTasks(wid){
  const done=tasks.filter(t=>t.col==='done');
  if(!done.length)return;
  if(!await appConfirm('Clear all '+done.length+' completed task'+(done.length>1?'s':'')+'?','This cannot be undone.'))return;
  tasks=tasks.filter(t=>t.col!=='done');
  persist();renderAllTaskW();updateAllStatsW();updateFixedStats();
  if(typeof mobRenderTasks==='function')mobRenderTasks();
  if(typeof mobRenderHome==='function')mobRenderHome();
}
async function clrJournalW(wid){
  if(!journal.length)return;
  if(!await appConfirm('Clear all '+journal.length+' journal entr'+(journal.length>1?'ies':'y')+'?','This cannot be undone.'))return;
  journal=[];persist();renderAllJournalW();updateAllStatsW();updateFixedStats();
  if(typeof mobRenderJournal==='function')mobRenderJournal();
  if(typeof mobRenderHome==='function')mobRenderHome();
}
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

// ═══════════════════════════════════════
// HABIT TRACKER
// ═══════════════════════════════════════


function habitToday(){ return new Date().toISOString().slice(0,10); }

function habitSave(){
  if(cu){ acc[cu].prefs=prefs; LS.s('pd1_acc',acc); if(typeof sbReady!=='undefined'&&sbReady) dbSaveUser(cu,acc[cu]); }
}

function habitGetAll(){ return prefs.habits||[]; }

function habitGetLog(){ return prefs.habitLog||{}; }

function habitDoneToday(id){
  const log=habitGetLog();
  return (log[habitToday()]||[]).includes(id);
}

function habitToggle(id){
  if(!prefs.habitLog) prefs.habitLog={};
  const key=habitToday();
  const arr=prefs.habitLog[key]||[];
  if(arr.includes(id)){
    prefs.habitLog[key]=arr.filter(x=>x!==id);
  } else {
    prefs.habitLog[key]=[...arr,id];
  }
  habitSave();
  renderHabits('habit-list');
  renderHabits('mob-habit-page-list');
  widgets.filter(w=>w.type==='habits').forEach(w=>renderHabitW(w.id));
}

function habitStreak(id){
  const log=habitGetLog();
  let streak=0, d=new Date();
  // if not done today, start checking from yesterday
  const todayKey=habitToday();
  if(!(log[todayKey]||[]).includes(id)) d.setDate(d.getDate()-1);
  for(let i=0;i<365;i++){
    const key=d.toISOString().slice(0,10);
    if((log[key]||[]).includes(id)){ streak++; d.setDate(d.getDate()-1); }
    else break;
  }
  return streak;
}

function habitActivityGrid(id){
  const log=habitGetLog();
  const days=[];
  const d=new Date();
  for(let i=27;i>=0;i--){
    const dd=new Date(d); dd.setDate(dd.getDate()-i);
    const key=dd.toISOString().slice(0,10);
    days.push((log[key]||[]).includes(id)?1:0);
  }
  return days;
}

function habitAdd(name, emoji){
  if(!prefs.habits) prefs.habits=[];
  if(prefs.habits.length>=HABIT_MAX_FREE){ habitShowProGate(); return; }
  if(!name.trim()) return;
  prefs.habits.push({id:Date.now(),name:name.trim(),emoji:emoji||'✅',created:habitToday()});
  habitSave();
  renderHabits('habit-list');
  renderHabits('mob-habit-list');
}

async function habitDelete(id){
  if(!await appConfirm('Delete this habit?','Your streak and history will be lost.')) return;
  prefs.habits=(prefs.habits||[]).filter(h=>h.id!==id);
  habitSave();
  renderHabits('habit-list');
  renderHabits('mob-habit-list');
}

function habitShowProGate(){
  // Simple inline alert for now — Pro system in Session 9
  const modal=document.createElement('div');
  modal.style.cssText='position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);backdrop-filter:blur(3px);';
  modal.innerHTML=`<div style="background:var(--surf);border-radius:20px;padding:28px 24px;max-width:320px;width:90%;text-align:center;box-shadow:0 12px 48px rgba(0,0,0,.2);">
    <div style="font-size:32px;margin-bottom:12px;">🔒</div>
    <div style="font-size:17px;font-weight:800;color:var(--ink);margin-bottom:8px;">Pro Feature</div>
    <div style="font-size:13px;color:var(--ink3);line-height:1.6;margin-bottom:20px;">Free plan includes up to 3 habits. Upgrade to Pro for unlimited habits.</div>
    <button onclick="this.closest('[style*=fixed]').remove()" style="width:100%;background:var(--a2);color:#fff;border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">Got it</button>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{ if(e.target===modal) modal.remove(); });
}

function renderHabits(containerId){
  const el=document.getElementById(containerId);
  if(!el) return;
  const habits=habitGetAll();
  const total=habits.length;
  const doneCount=habits.filter(h=>habitDoneToday(h.id)).length;

  if(!total){
    el.innerHTML=`<div style="background:var(--surf2);border:1.5px dashed var(--bdr);border-radius:14px;padding:20px;text-align:center;">
      <div style="font-size:28px;margin-bottom:8px;">🎯</div>
      <div style="font-size:13px;font-weight:700;color:var(--ink);margin-bottom:4px;">Build a daily routine</div>
      <div style="font-size:12px;color:var(--ink4);line-height:1.6;">Add habits below and check them off each day.<br>Streaks track how many days in a row you showed up.</div>
    </div>`;
    return;
  }

  // Progress bar header
  const pct=total?Math.round(doneCount/total*100):0;
  const headerHtml=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
    <span style="font-size:11px;font-weight:700;color:var(--ink3);">TODAY — ${doneCount}/${total} done</span>
    <span style="font-size:11px;font-weight:700;color:var(--a2);">${pct}%</span>
  </div>
  <div style="height:4px;background:var(--bdr);border-radius:2px;margin-bottom:12px;overflow:hidden;">
    <div style="height:100%;width:${pct}%;background:var(--a2);border-radius:2px;transition:width .3s;"></div>
  </div>`;

  const cardsHtml=habits.map(h=>{
    const done=habitDoneToday(h.id);
    const streak=habitStreak(h.id);
    const grid=habitActivityGrid(h.id);
    const gridHtml=grid.map(v=>`<div style="width:8px;height:8px;border-radius:2px;background:${v?'var(--a2)':'var(--bdr)'};flex-shrink:0;"></div>`).join('');
    return `<div style="display:flex;align-items:center;gap:12px;background:${done?'var(--al)':'var(--surf2)'};border:1.5px solid ${done?'var(--a2)':'var(--bdr)'};border-radius:14px;padding:12px 14px;transition:all .2s;">
      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
        <button onclick="habitToggle(${h.id})" title="${done?'Mark undone':'Mark done for today'}"
          style="width:38px;height:38px;border-radius:50%;border:2.5px solid ${done?'var(--a2)':'var(--bdr)'};background:transparent;display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;transition:all .18s;">${done?'✔️':h.emoji}</button>
        <button onclick="habitDelete(${h.id})" title="Delete habit"
          style="background:none;border:none;color:var(--ink4);cursor:pointer;font-size:13px;padding:4px 6px;border-radius:6px;transition:all .15s;"
          onmouseover="this.style.color='var(--red)';this.style.background='var(--rl)'"
          onmouseout="this.style.color='var(--ink4)';this.style.background='none'">✕</button>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:700;color:${done?'var(--a2)':'var(--ink)'};${done?'text-decoration:line-through;':''}">${esc(h.name)}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:4px;">
          <div style="display:flex;gap:2px;">${gridHtml}</div>
          <span style="font-size:10px;color:${streak>0?'var(--a2)':'var(--ink4)'};">${streak>0?'🔥 '+streak+'d':''}</span>
        </div>
      </div>
    </div>`;
  }).join('');

  el.innerHTML=headerHtml+cardsHtml;
}

function renderHabitAddForm(containerId){
  const el=document.getElementById(containerId);
  if(!el) return;
  const habits=habitGetAll();
  const atLimit=habits.length>=HABIT_MAX_FREE;

  const isPage=containerId.includes('page');
  el.innerHTML=`<div style="${isPage?'':'border-top:1px solid var(--bdr);'}padding-top:${isPage?'0':'12px'};margin-top:4px;">
    <div style="font-size:10px;font-weight:700;color:var(--ink4);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;">Add a new habit</div>
    <div style="display:grid;grid-template-columns:repeat(12,1fr);gap:4px;margin-bottom:10px;">
      ${HABIT_EMOJIS.map(e=>`<button onclick="habitSelectEmoji(this,'${containerId}')" data-emoji="${e}" style="aspect-ratio:1;width:100%;border-radius:8px;border:1.5px solid var(--bdr);background:var(--surf);cursor:pointer;font-size:clamp(12px,3.5vw,18px);transition:all .13s;" title="${e}">${e}</button>`).join('')}
    </div>
    <div style="display:flex;gap:8px;">
      <input id="${containerId}-inp" type="text" placeholder="e.g. Read 20 mins, Drink water…" maxlength="40"
        style="flex:1;background:var(--surf);border:1.5px solid var(--bdr);border-radius:10px;padding:9px 12px;font-size:13px;color:var(--ink);outline:none;font-family:inherit;"
        onfocus="this.style.borderColor='var(--a2)'" onblur="this.style.borderColor='var(--bdr)'"
        onkeydown="if(event.key==='Enter')habitSubmit('${containerId}')"/>
      <button onclick="habitSubmit('${containerId}')" style="background:${atLimit?'var(--bdr)':'var(--a2)'};color:${atLimit?'var(--ink3)':'#fff'};border:none;border-radius:10px;padding:9px 16px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;">
        ${atLimit?'🔒 Limit reached':'+ Add Habit'}
      </button>
    </div>
    ${atLimit?`<div style="font-size:11px;color:var(--ink3);margin-top:8px;text-align:center;">Free plan allows <b>${HABIT_MAX_FREE} habits</b> · <span style="color:var(--a2);font-weight:700;cursor:pointer;" onclick="habitShowProGate()">Upgrade to Pro for unlimited</span></div>`:'<div style="font-size:11px;color:var(--ink4);margin-top:6px;">Tap the circle on a habit card each day to mark it done and build your streak.</div>'}
  </div>`;

  const firstBtn=el.querySelector('[data-emoji]');
  if(firstBtn){firstBtn.style.background='var(--al)';firstBtn.style.borderColor='var(--a2)';}
  el._selectedEmoji=HABIT_EMOJIS[0];
}
function habitSelectEmoji(btn, containerId){
  const el=document.getElementById(containerId);
  el.querySelectorAll('[data-emoji]').forEach(b=>{ b.style.background='var(--surf)'; b.style.borderColor='var(--bdr)'; });
  btn.style.background='var(--al)'; btn.style.borderColor='var(--a2)';
  el._selectedEmoji=btn.dataset.emoji;
}

function habitSubmit(containerId){
  const inp=document.getElementById(containerId+'-inp');
  const el=document.getElementById(containerId);
  const emoji=el._selectedEmoji||'✅';
  habitAdd(inp?.value||'', emoji);
  renderHabitAddForm(containerId);
}


// ═══════════════════════════════════════════════════════════
// SESSION 6: FOCUS MODE
// ═══════════════════════════════════════════════════════════
let _focusWid=null, _focusIv=null;

function enterFocusMode(wid){
  _focusWid=wid;
  const overlay=document.getElementById('focus-overlay');
  const card=document.getElementById('focus-card');
  if(!overlay||!card)return;
  _focusBuild(wid,card);
  overlay.classList.add('open');
  document.body.classList.add('focus-mode');
  document.addEventListener('keydown',_focusKey);
}

function exitFocusMode(){
  const overlay=document.getElementById('focus-overlay');
  if(!overlay)return;
  overlay.classList.remove('open');
  document.body.classList.remove('focus-mode');
  document.removeEventListener('keydown',_focusKey);
  clearInterval(_focusIv);_focusIv=null;
  setTimeout(()=>{
    const card=document.getElementById('focus-card');
    if(card)card.innerHTML='';
  },300);
  if(_focusWid){
    const w=widgets.find(x=>x.id===_focusWid);
    if(w)fillWBody(w);
  }
  _focusWid=null;
}

function _focusKey(e){if(e.key==='Escape')exitFocusMode();}

function _focusBuild(wid,card){
  if(!TMS[wid])TMS[wid]={mode:0,sec:25*60,running:false,iv:null,sessions:0,custom:[25*60,20*60]};
  const ts=TMS[wid];
  const canEdit=TMODES[ts.mode]&&!TMODES[ts.mode].locked&&!ts.running;
  card.innerHTML=`
    <div style="text-align:center;margin-bottom:18px;">
      <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:var(--ink4);">Focus Mode</span>
    </div>
    <div class="tmmodes" style="margin-bottom:16px;">
      ${TMODES.map((m,i)=>`<button class="tmm${i===ts.mode?' on':''}" onclick="_focusModeSet('${wid}',${i})">${m.l}</button>`).join('')}
    </div>
    <div class="tmdis" style="margin-bottom:16px;">
      <div class="tmtime${canEdit?' tmtime-edit':''}" id="fc-time" style="font-size:clamp(56px,12vw,88px);letter-spacing:-4px;" onclick="_focusEditTime('${wid}')">${fmtSec(ts.sec)}</div>
      <div class="tminputs" id="fc-inputs">
        <input class="tm-timeinput" id="fc-inp" type="text" inputmode="numeric" placeholder="25:00"
          onkeydown="_focusInpKey(event,'${wid}')" oninput="tmInputFmt(event)" style="font-size:28px;text-align:center;"/>
        <div class="tm-inputhint">MM:SS or H:MM:SS · Enter to set</div>
        <button class="tm-setbtn" onclick="_focusConfirm('${wid}')">Set time</button>
      </div>
    </div>
    <div class="tmctrl" style="margin-bottom:16px;">
      <button class="tm-resetbtn" style="width:44px;height:44px;font-size:20px;" onclick="_focusReset('${wid}')">↺</button>
      <button class="tm-startbtn${ts.running?' stop':''}" id="fc-btn" style="flex:1;padding:13px 0;font-size:15px;" onclick="_focusToggle('${wid}')">${ts.running?'Pause':'Start'}</button>
    </div>
    <div class="tmsess" id="fc-sess" style="${ts.mode!==0?'display:none;':''}margin-bottom:14px;">
      ${Array.from({length:4},(_,i)=>`<div class="tmsd${i<ts.sessions?' dn':''}"></div>`).join('')}
    </div>
    <div id="fc-hist" style="${ts.mode!==0?'display:none;':''}background:var(--surf2);border:1px solid var(--bdr);border-radius:14px;padding:14px;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:var(--ink3);margin-bottom:10px;">Session History</div>
      <div id="fc-hist-inner"></div>
    </div>`;
  _focusRenderHistory();
  clearInterval(_focusIv);
  _focusIv=setInterval(()=>{
    const t=document.getElementById('fc-time');
    const b=document.getElementById('fc-btn');
    const s=document.getElementById('fc-sess');
    const cts=TMS[wid];
    if(!cts)return;
    if(t)t.textContent=fmtSec(cts.sec);
    if(b){b.textContent=cts.running?'Pause':'Start';b.classList.toggle('stop',cts.running);}
    if(s&&cts.mode===0)s.innerHTML=Array.from({length:4},(_,i)=>`<div class="tmsd${i<cts.sessions?' dn':''}"></div>`).join('');
  },250);
}

function _focusRenderHistory(){
  const el=document.getElementById('fc-hist-inner');
  if(!el)return;
  const today=pomGetToday(),week=pomGetWeek(),days=pomGetWeekData();
  const max=Math.max(...days.map(d=>d.count),1);
  el.innerHTML=`
    <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
      <div><div style="font-size:22px;font-weight:800;color:var(--ink);line-height:1;">${today}</div><div style="font-size:10px;color:var(--ink3);font-weight:600;">today</div></div>
      <div style="text-align:right;"><div style="font-size:22px;font-weight:800;color:var(--ink);line-height:1;">${week}</div><div style="font-size:10px;color:var(--ink3);font-weight:600;">this week</div></div>
    </div>
    <div style="display:flex;align-items:flex-end;gap:5px;height:44px;">
      ${days.map(d=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;">
        <div style="width:100%;border-radius:3px;background:var(--a2);opacity:${d.count?1:.18};height:${Math.max(d.count/max*34,d.count?5:3)}px;"></div>
        <div style="font-size:9px;font-weight:700;color:${d.today?'var(--a2)':'var(--ink4)'};text-transform:uppercase;">${d.label}</div>
      </div>`).join('')}
    </div>`;
}

function _focusModeSet(wid,m){setTMode(wid,m);const c=document.getElementById('focus-card');if(c)_focusBuild(wid,c);}
function _focusReset(wid){resetTimer(wid);const c=document.getElementById('focus-card');if(c)_focusBuild(wid,c);}
function _focusToggle(wid){
  timerBtn(wid);
  const b=document.getElementById('fc-btn');const ts=TMS[wid];
  if(b&&ts){b.textContent=ts.running?'Pause':'Start';b.classList.toggle('stop',ts.running);}
}
function _focusEditTime(wid){
  const ts=TMS[wid];if(!ts||TMODES[ts.mode]?.locked||ts.running)return;
  const t=document.getElementById('fc-time');
  const inp=document.getElementById('fc-inputs');
  const i=document.getElementById('fc-inp');
  if(!t||!inp||!i)return;
  i.value=fmtSec(ts.sec);
  t.classList.add('hide');inp.classList.add('show');
  setTimeout(()=>{i.focus();i.select();},50);
}
function _focusConfirm(wid){
  const i=document.getElementById('fc-inp');if(!i)return;
  const total=parseTimeInput(i.value.trim());if(total<1)return;
  const ts=TMS[wid];if(!ts)return;
  ts.custom[ts.mode]=total;ts.sec=total;
  const c=document.getElementById('focus-card');if(c)_focusBuild(wid,c);
}
function _focusInpKey(e,wid){
  if(e.key==='Enter'){e.preventDefault();_focusConfirm(wid);}
  if(e.key==='Escape'){
    const t=document.getElementById('fc-time');const inp=document.getElementById('fc-inputs');
    if(t)t.classList.remove('hide');if(inp)inp.classList.remove('show');
  }
}

// ── Mobile focus mode ──
function mobEnterFocus(){
  if(typeof _mobPage!=='undefined'&&_mobPage!=='timer')mobGoPage('timer');
  document.body.classList.add('mob-focus');
}
function mobExitFocus(){
  document.body.classList.remove('mob-focus');
}
