// ══════════════════════════════════════════════════════
// GUEST MODE (mobile)
// ══════════════════════════════════════════════════════
window._guestMode = window._guestMode || false;

const MOB_GUEST_TASKS = [
  {id:'g1',text:'Finish project proposal',title:'Finish project proposal',col:'todo',date:'Today',dueDate:'',recurring:'none',priority:'high'},
  {id:'g2',text:'Review pull requests',title:'Review pull requests',col:'inprog',date:'Today',dueDate:'',recurring:'none'},
  {id:'g3',text:'Send weekly update email',title:'Send weekly update email',col:'todo',date:'Today',dueDate:'',recurring:'none'},
  {id:'g4',text:'Update documentation',title:'Update documentation',col:'done',date:'Yesterday',dueDate:'',recurring:'none'},
  {id:'g5',text:'Morning run',title:'Morning run',col:'done',date:'Yesterday',dueDate:'',recurring:'daily'},
];
const MOB_GUEST_JOURNAL = [
  {id:'gj1',content:'Focused well today. Got through most of my task list and feeling good about the project direction.',text:'Focused well today. Got through most of my task list and feeling good about the project direction.',mood:'😊',date:'Mon, Mar 18',ts:Date.now()-86400000},
  {id:'gj2',content:'Had a slow start but picked up momentum after lunch. Need to prioritize better tomorrow.',text:'Had a slow start but picked up momentum after lunch. Need to prioritize better tomorrow.',mood:'😐',date:'Sun, Mar 17',ts:Date.now()-172800000},
];
const MOB_GUEST_NOTES = [
  {id:'gn1',title:'Ideas for Q2',content:'- Redesign onboarding flow\n- Add keyboard shortcuts\n- Weekly digest email',updated:Date.now()-3600000},
  {id:'gn2',title:'Meeting notes',content:'Discussed roadmap priorities. Next steps: finalize scope by Friday.',updated:Date.now()-7200000},
];
const MOB_GUEST_PREFS = {
  habits:[],
  habitLog:{},
  accent:'green',theme:'light',
};
const MOB_GUEST_EVENTS = [
  {id:'ge1',title:'Team standup',date:new Date().toISOString().slice(0,10),color:'#3A7D5E',timeStart:'09:00',timeEnd:'09:30',yearly:false},
  {id:'ge2',title:'Project review',date:new Date().toISOString().slice(0,10),color:'#3B82F6',timeStart:'14:00',timeEnd:'15:00',yearly:false},
];

let _mobGuestFreeWrites = {task: 0, journal: 0, note: 0};

function mobGuestWriteGuard(type){
  if(!window._guestMode) return false;
  if(type && _mobGuestFreeWrites[type] === 0){
    _mobGuestFreeWrites[type]++;
    return false; // first action free
  }
  mobGuestGuard();
  return true;
}

function _showMobGuestTooltip(){
  if(!window._guestMode) return;
  if(document.getElementById('mob-guest-tip')) return;
  const tip = document.createElement('div');
  tip.id = 'mob-guest-tip';
  tip.style.cssText = [
    'position:fixed',
    'bottom:130px',
    'left:0',
    'right:0',
    'margin:0 auto',
    'width:fit-content',
    'max-width:90vw',
    'z-index:7500',
    'background:rgba(30,25,20,0.88)',
    'backdrop-filter:blur(12px)',
    '-webkit-backdrop-filter:blur(12px)',
    'color:rgba(255,255,255,0.9)',
    'font-size:12px',
    'font-weight:600',
    'padding:10px 20px',
    'border-radius:100px',
    'border:1px solid rgba(255,255,255,0.1)',
    'box-shadow:0 4px 24px rgba(0,0,0,0.15)',
    'white-space:nowrap',
    'pointer-events:none',
    'animation:fadeIn .4s ease both',
  ].join(';');
  tip.textContent = '✦ Add a task · Write a journal entry · Track a habit';
  document.body.appendChild(tip);
  setTimeout(()=>{ if(tip){ tip.style.transition='opacity .5s'; tip.style.opacity='0'; setTimeout(()=>tip.remove(),500); } }, 5000);
}

function mobEnterGuestMode(){
  // Guard re-entry
  if(window._guestMode){ showScreen('app'); goPg('home'); return; }
  window._guestMode = true;
  const gd = {
    tasks: [],
    journal: [],
    notes: [],
    prefs: JSON.parse(JSON.stringify(MOB_GUEST_PREFS)),
    calEvs: [],
    subjects:[],widgets:[],
    displayName:'Guest',username:'guest',email:'',avatarUrl:'',
  };
  acc['__guest__'] = gd;
  cu = '__guest__';
  showScreen('app');
  goPg('home');
  const b = document.getElementById('mob-guest-banner');
  if(b) b.style.display='flex';
  document.body.classList.add('guest-active');
  _mobGuestFreeWrites = {task: 0, journal: 0, note: 0};
  if(typeof renderAll==='function') renderAll();
  setTimeout(_showMobGuestTooltip, 1000);
}

function mobGuestGuard(){
  if(!window._guestMode) return false;
  const sheet = document.getElementById('sh-guest-gate');
  const overlay = document.getElementById('sh-overlay');
  if(sheet) sheet.classList.add('open');
  if(overlay) overlay.classList.add('open');
  return true;
}

async function _mobGsiDoGoogle(){
  // Remove exit-intent listener so OAuth redirect doesn't trigger "Leave site?"
  if(window._guestBeforeUnload){
    window.removeEventListener('beforeunload', window._guestBeforeUnload);
    window._guestBeforeUnload = null;
  }
  closeSheets();
  await doGoogleAuth();
}

async function _mobGsiDoMagic(){
  const emailEl = document.getElementById('mob-gsi-email');
  const errEl = document.getElementById('mob-gsi-magic-err');
  const btn = document.getElementById('mob-gsi-btn');
  if(!emailEl) return;
  const email = emailEl.value.trim();
  if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    if(errEl){ errEl.textContent='Please enter a valid email address.'; errEl.style.display='block'; }
    return;
  }
  if(errEl) errEl.style.display='none';
  if(btn){ btn.disabled=true; btn.textContent='Sending…'; }
  try {
    const { error } = await sb.auth.signInWithOtp({
      email,
      options:{ emailRedirectTo: window.location.origin + window.location.pathname }
    });
    if(error) throw error;
    document.getElementById('mob-gsi-form').style.display='none';
    document.getElementById('mob-gsi-sent').style.display='block';
    const sentEl = document.getElementById('mob-gsi-sent-email');
    if(sentEl) sentEl.textContent = email;
  } catch(e){
    if(btn){ btn.disabled=false; btn.textContent='Continue with Email'; }
    if(errEl){ errEl.textContent = e.message||'Something went wrong. Please try again.'; errEl.style.display='block'; }
  }
}

function mobGuestGateSignIn(){
  // Save guest data before sign-in
  const d = acc['__guest__'] || {};
  window._pendingGuestData = {
    tasks: JSON.parse(JSON.stringify(d.tasks||[])),
    journal: JSON.parse(JSON.stringify(d.journal||[])),
    notes: JSON.parse(JSON.stringify(d.notes||[])),
    prefs: JSON.parse(JSON.stringify(d.prefs||{})),
    calEvs: JSON.parse(JSON.stringify(d.calEvs||[])),
  };
  // Persist to sessionStorage so it survives magic link redirect
  try { sessionStorage.setItem('pd1_guest_data', JSON.stringify(window._pendingGuestData)); } catch(e) {}
  // Close any open sheets
  closeSheets();
  // Show the inline sign-in sheet over the app (no redirect)
  const sheet = document.getElementById('sh-guest-signin');
  const overlay = document.getElementById('sh-overlay');
  if(sheet) sheet.classList.add('open');
  if(overlay) overlay.classList.add('open');
}

function mobExitGuestMode(){
  appConfirm('Exit preview?', 'Your preview data will be cleared. Sign in instead to save your work.', 'Exit preview').then(ok => {
    if(!ok) return;
    window._guestMode = false;
    window._pendingGuestData = null;
    try { sessionStorage.removeItem('pd1_guest_data'); } catch(e) {}
    cu = null;
    const tip = document.getElementById('mob-guest-tip');
    if(tip) tip.remove();
    document.getElementById('mob-guest-banner') && (document.getElementById('mob-guest-banner').style.display='none');
    document.body.classList.remove('guest-active');
    showScreen('login');
  });
}

// ══════════════════════════════════════════════
// SUPABASE — same credentials as desktop
// ══════════════════════════════════════════════
const SB_URL = 'https://kvezrezhicjlhycghucr.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2ZXpyZXpoaWNqbGh5Y2dodWNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzMxMTMsImV4cCI6MjA4ODQ0OTExM30.-Gb6LHePwJ0yK54e0POijp_6qVwg1gqtiAj3pN8sKF8';
let sb, sbReady = false;
try {
  sb = supabase.createClient(SB_URL, SB_KEY, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }});
  sbReady = true;
} catch(e){ console.warn('[Prodify Mobile] Supabase init failed', e); }

// Offline banner
function _setOfflineBanner(show){
  const b=document.getElementById('offline-banner');
  const btn=document.getElementById('btn-google');
  if(b) b.style.display=show?'block':'none';
  if(btn) btn.disabled=show;
}
window.addEventListener('online', ()=>_setOfflineBanner(false));
window.addEventListener('offline',()=>_setOfflineBanner(true));
if(!navigator.onLine) _setOfflineBanner(true);

// ══════════════════════════════════════════════
// STORAGE (same keys as desktop)
// ══════════════════════════════════════════════
const LS = {
  g:(k,d=null)=>{try{const v=localStorage.getItem(k);return v!==null?JSON.parse(v):d;}catch(e){return d;}},
  s:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}},
  d:(k)=>localStorage.removeItem(k),
};

let acc = LS.g('pd1_acc',{});
let cu  = LS.g('pd1_cur', null);

// Restore guest data that survived a magic link redirect
(function(){
  try {
    const raw = sessionStorage.getItem('pd1_guest_data');
    if(raw) { window._pendingGuestData = JSON.parse(raw); }
  } catch(e) {}
})();

function getD(){
  if(cu && acc[cu]){
    if(acc[cu].tasks)   acc[cu].tasks   = normalizeTasks(acc[cu].tasks);
    if(acc[cu].journal) acc[cu].journal = normalizeJournal(acc[cu].journal);
    return acc[cu];
  }
  return {tasks:[],journal:[],subjects:[],calEvs:[],widgets:[],notes:[],prefs:{},displayName:''};
}
function getP(){ return getD().prefs || {}; }
function getTasks(){ return getD().tasks || []; }
function getJournal(){ return getD().journal || []; }
function getCalEvs(){ return getD().calEvs || []; }
function getNotes(){ return migrateNotes(getD().notes); }
function saveNotes(arr){ if(window._guestMode) return; const d=getD(); d.notes=arr; if(cu) acc[cu]=d; saveAll(); }

let _saveTimer=null;
let _lastSaveTs=0;
let _realtimeChannel=null;
let _pendingGoogleSession=null; // holds authUser/email/googleName while username picker is open

function saveAll(){
  if(window._guestMode) return;
  if(!cu) return;
  acc[cu]=getD();
  acc[cu]._localTs=Date.now();
  LS.s('pd1_acc',acc);
  // Immediate async cloud sync — no debounce for real-time feel
  // Use a timer only to coalesce rapid successive changes (e.g. typing)
  clearTimeout(_saveTimer);
  _saveTimer=setTimeout(async()=>{
    if(!sbReady||!cu) return;
    const d=acc[cu]; if(!d) return;
    try{
      await sb.from('users').update({
        display_name: d.displayName||'',
        tasks:JSON.stringify(d.tasks||[]),
        journal:JSON.stringify(d.journal||[]),
        cal_evs:JSON.stringify(d.calEvs||[]),
        subjects:JSON.stringify(d.subjects||[]),
        widgets:JSON.stringify(d.widgets||[]),
        notes:JSON.stringify(d.notes||[]),
        prefs:JSON.stringify(d.prefs||{}),
      }).eq('username',cu);
      _lastSaveTs=Date.now();
      acc[cu]._localTs=_lastSaveTs;
      LS.s('pd1_acc',acc);
      try{ localStorage.setItem('pd1_lastSaveTs', String(_lastSaveTs)); }catch(e){}
    }catch(e){ /* silent — localStorage is source of truth */ }
  },50);
}

// Apply data received from cloud (realtime or pull)
function applyRemoteData(row){
  if(!row||!cu) return;
  const d=acc[cu]||{};
  if(row.display_name != null && row.display_name !== '') d.displayName=row.display_name;
  if(row.tasks    !=null){ try{d.tasks    =normalizeTasks(JSON.parse(row.tasks));   }catch(e){} }
  if(row.journal  !=null){ try{d.journal  =normalizeJournal(JSON.parse(row.journal)); }catch(e){} }
  if(row.subjects !=null){ try{d.subjects =JSON.parse(row.subjects);}catch(e){} }
  if(row.cal_evs  !=null){ try{d.calEvs   =JSON.parse(row.cal_evs); }catch(e){} }
  if(row.widgets  !=null){ try{d.widgets  =JSON.parse(row.widgets);  }catch(e){} }
  if(row.notes    !=null){ try{d.notes    =migrateNotes(JSON.parse(row.notes));   }catch(e){} }
  if(row.prefs    !=null){ try{
    const rp=JSON.parse(row.prefs);
    if(row.avatar_url) rp.avatarUrl=row.avatar_url;
    d.prefs=rp;
  }catch(e){} }
  // Keep _localTs as-is — zeroing it would allow future remotes to overwrite local changes
  acc[cu]=d;
  LS.s('pd1_acc',acc);
  renderAll();
  applySettings();
}

// Pull latest data from cloud
async function pullFromCloud(){
  if(!sbReady||!cu) return;
  const localTs=(acc[cu]||{})._localTs||0;
  if(localTs>0 && Date.now()-localTs<3000) return; // local change too recent — matches desktop threshold
  try{
    const {data,error}=await sb.from('users').select('display_name,tasks,journal,subjects,cal_evs,notes,prefs,widgets,avatar_url').eq('username',cu).single();
    if(error||!data) return;
    // Re-check after async fetch
    const localTs2=(acc[cu]||{})._localTs||0;
    if(localTs2>0 && localTs2>_lastSaveTs) return;
    applyRemoteData(data);
  }catch(e){}
}

// Realtime sync — listen for changes made on desktop
function startRealtimeSync(username){
  if(!sbReady||!sb||!username) return;
  if(_realtimeChannel){ try{sb.removeChannel(_realtimeChannel);}catch(e){} _realtimeChannel=null; }
  _realtimeChannel=sb.channel('prodify-user-'+username)
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'users',filter:'username=eq.'+username},
      payload=>{
        if(Date.now()-_lastSaveTs<2000) return; // ignore echo from our own save — matches desktop
        const localTs=(acc[cu]||{})._localTs||0;
        if(localTs>0 && localTs>_lastSaveTs) return; // local is newer
        applyRemoteData(payload.new);
      })
    .subscribe();
}

// Visibility-based pull — when returning to app after 10+ seconds away
let _hiddenAt=0;
let _visListenerAdded=false;
function startVisibilitySync(){
  if(_visListenerAdded) return;
  _visListenerAdded=true;
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden'){
      _hiddenAt=Date.now();
    } else if(document.visibilityState==='visible'){
      if(_hiddenAt && Date.now()-_hiddenAt>3000) pullFromCloud();
    }
  });
}

function uid(){ return Math.random().toString(36).slice(2,9)+Date.now().toString(36); }

function normalizeTasks(arr){
  return (arr||[]).map(t=>{
    if(!t.title && t.text)  t.title = t.text;
    if(!t.text  && t.title) t.text  = t.title;
    if(t.id !== undefined) t.id = String(t.id);
    return t;
  });
}

function normalizeJournal(arr){
  return (arr||[]).map(j=>{
    if(j.id !== undefined) j.id = String(j.id);
    // Ensure both text and content exist
    if(!j.content && j.text)    j.content = j.text;
    if(!j.text    && j.content) j.text    = j.content;
    return j;
  });
}
function migrateNotes(raw){
  if(!raw) return [];
  if(Array.isArray(raw)) return raw;
  if(typeof raw === 'object'){
    const entries=Object.values(raw).filter(v=>v&&typeof v==='object');
    if(!entries.length) return [];
    return entries.map(e=>({
      id:'n'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),
      title:e.title||'',
      content:e.content||'',
      updated:Date.now()
    }));
  }
  return [];
}
function toDay(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

const QUOTES=[
  {t:"The secret of getting ahead is getting started.",a:"Mark Twain"},
  {t:"Focus on being productive instead of being busy.",a:"Tim Ferriss"},
  {t:"Done is better than perfect.",a:"Sheryl Sandberg"},
  {t:"Either you run the day or the day runs you.",a:"Jim Rohn"},
  {t:"Hard work beats talent when talent doesn't work hard.",a:"Tim Notke"},
  {t:"Success is the sum of small efforts, repeated day in and day out.",a:"Robert Collier"},
];
const ACCENTS={
  //          light: [--a,       --a2,      --al  ]   dark: [--a,       --a2,      --al  ]
  green: { l:['#2A5C44','#3A7D5E','#EBF4EF'], d:['#3A7D5E','#4A9D74','#172A20'] },
  blue:  { l:['#1E4A7C','#2563EB','#EBF0FF'], d:['#2563EB','#3B82F6','#0F1E3A'] },
  purple:{ l:['#4A2C6E','#7C3AED','#F0EBFF'], d:['#7C3AED','#9B6EF3','#1E1030'] },
  rose:  { l:['#7C1D2C','#E11D48','#FDEEF1'], d:['#E11D48','#F43F5E','#2A0F16'] },
  amber: { l:['#7A4A00','#D97706','#FBF2E1'], d:['#D97706','#F59E0B','#2A1E08'] },
  teal:  { l:['#0F4C4C','#0D9488','#E0F5F3'], d:['#0D9488','#14B8A6','#0A2826'] },
};

// ══════════════════════════════════════════════
// SCREEN SWITCHING
// ══════════════════════════════════════════════
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active');});
  const el=document.getElementById('screen-'+id);
  if(el){ el.style.animation='none'; el.classList.add('active'); void el.offsetWidth; el.style.animation=''; }
  // Always dismiss loading screen once a real screen is shown
  // (loading screen removed — transition is now instant)
}

// ══════════════════════════════════════════════
// GOOGLE AUTH — matches desktop doGoogleAuth()
// ══════════════════════════════════════════════
async function doMobMagicLink(){
  const emailEl = document.getElementById('mob-magic-email');
  const errEl   = document.getElementById('mob-magic-err');
  const btn     = document.getElementById('mob-magic-btn');
  const email   = emailEl?.value.trim() || '';

  if(errEl){ errEl.style.display='none'; errEl.textContent=''; }

  if(!email || !email.includes('@')){
    if(errEl){ errEl.textContent='Please enter a valid email address.'; errEl.style.display='block'; }
    return;
  }

  if(btn){ btn.disabled=true; btn.textContent='Sending…'; }

  try{
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'https://prodify.cc' }
    });
    if(error) throw error;

    // Show success state
    document.getElementById('mob-magic-form').style.display='none';
    const sentEl = document.getElementById('mob-magic-sent');
    const sentEmail = document.getElementById('mob-magic-sent-email');
    if(sentEl) sentEl.style.display='block';
    if(sentEmail) sentEmail.textContent=email;

  }catch(err){
    if(errEl){ errEl.textContent=err.message||'Could not send link. Please try again.'; errEl.style.display='block'; }
    if(btn){ btn.disabled=false; btn.textContent='Continue with Email'; }
  }
}

async function doGoogleAuth(){
  const btn=document.getElementById('btn-google');
  const err=document.getElementById('login-err');
  err.textContent='';
  btn.disabled=true; btn.textContent='Opening Google…';
  try{
    if(!sbReady) throw new Error('Connection unavailable. Try again.');
    const {error}=await sb.auth.signInWithOAuth({
      provider:'google',
      options:{ redirectTo: window.location.href.split('?')[0].split('#')[0] }
    });
    if(error) throw error;
    // Page will redirect — no further code runs
  }catch(e){
    btn.disabled=false;
    btn.innerHTML=`<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.33 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.67 14.62 48 24 48z"/></svg> Continue with Google`;
    const isNetworkErr=!navigator.onLine||e.message==='Connection unavailable. Try again.'||e.message?.toLowerCase().includes('fetch');
    if(isNetworkErr){ _setOfflineBanner(true); }
    else { err.textContent = e.message || 'Sign-in failed. Please try again.'; }
  }
}

// Handle OAuth redirect back — matches desktop handleGoogleCallback()
async function handleGoogleCallback(){
  if(!sbReady) return false;
  try{
    const {data,error}=await sb.auth.getSession();
    if(error||!data.session) return false;
    const session=data.session;
    // Clean URL
    if(window.location.hash.includes('access_token')||window.location.search.includes('code=')){
      window.history.replaceState({},document.title,window.location.pathname);
    }
    const authUser=session.user;
    const email=authUser.email||'';
    const googleName=authUser.user_metadata?.full_name||authUser.user_metadata?.name||'';

    // Look up existing Prodify user
    let existingUser=null;
    try{
      const {data:rpcRows,error:rpcErr}=await sb.rpc('get_user_by_email',{p_email:email});
      if(!rpcErr&&rpcRows&&rpcRows[0]) existingUser=rpcRows[0];
      else{
        const {data:directRow}=await sb.from('users').select('*').eq('email',email).maybeSingle();
        if(directRow) existingUser=directRow;
      }
    }catch(e){ console.warn('[Prodify Mobile] Email lookup error',e); }

    if(existingUser){
      const u=existingUser.username;
      cu=u; LS.s('pd1_cur',u);
      if(email && acc[u]) acc[u].email=email;

      // Respect _localTs — if local is fresher than last known cloud save, keep local
      const loc=acc[u]||{};
      const localTs=loc._localTs||0;
      // _lastSaveTs persisted across reloads in localStorage
      const persistedSaveTs=parseInt(localStorage.getItem('pd1_lastSaveTs')||'0',10)||0;
      _lastSaveTs=Math.max(_lastSaveTs,persistedSaveTs);
      const trustLocal=localTs>0 && localTs>=_lastSaveTs && Object.keys(loc).length>3;

      const cP=JSON.parse(existingUser.prefs||'{}');
      if(existingUser.avatar_url) cP.avatarUrl=existingUser.avatar_url;

      if(trustLocal){
        // Local is fresher — keep it, patch in auth fields
        acc[u]=Object.assign({},loc,{
          passHash:existingUser.pass_hash||loc.passHash||'',
          displayName:existingUser.display_name||loc.displayName||'',
          joined:new Date(existingUser.joined_at).getTime()||loc.joined||Date.now(),
        });
      } else {
        // Cloud is source of truth
        acc[u]={
          passHash:existingUser.pass_hash||'',
          displayName:existingUser.display_name||googleName||'',
          tasks:JSON.parse(existingUser.tasks||'[]'),
          journal:JSON.parse(existingUser.journal||'[]'),
          subjects:JSON.parse(existingUser.subjects||'[]'),
          calEvs:JSON.parse(existingUser.cal_evs||'[]'),
          widgets:JSON.parse(existingUser.widgets||'[]'),
          notes:JSON.parse(existingUser.notes||'[]'),
          prefs:cP,
          joined:new Date(existingUser.joined_at).getTime()||Date.now(),
          _localTs:0,
        };
      }
      LS.s('pd1_acc',acc);
      startRealtimeSync(u);
      if(!acc[u].displayName||acc[u].displayName.trim()===''){
        startOnboarding(googleName);
      } else {
        // Device check before launching
        const deviceAllowed = await checkAndRegisterDevice(u);
        if(!deviceAllowed){ showMobMultiDeviceBlock(); return true; }
        launch();
      }
    } else {
      // New Google user — show username picker (matches desktop flow)
      _pendingGoogleSession = { authUser, email, googleName };
      _showMobUsernamePicker();
    }
    return true;
  }catch(e){ console.error('[Prodify Mobile] handleGoogleCallback error',e); return false; }
}

// ── MOBILE USERNAME PICKER for new Google users ──

function _showMobUsernamePicker() {
  const { googleName, email } = _pendingGoogleSession || {};
  // Build a simple fullscreen picker over the login screen
  let picker = document.getElementById('mob-username-picker');
  if (!picker) {
    picker = document.createElement('div');
    picker.id = 'mob-username-picker';
    picker.style.cssText = 'position:fixed;inset:0;z-index:99999;background:var(--color-bg,#fff);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 28px;';
    picker.innerHTML = `
      <div style="font-size:22px;font-weight:800;color:var(--ink,#111);margin-bottom:8px;">Pick a username</div>
      <div style="font-size:14px;color:var(--ink3,#888);margin-bottom:28px;text-align:center;">This is your Prodify handle. You can't change it later.</div>
      <input id="mob-gu-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
        placeholder="e.g. alex_work" maxlength="30"
        style="width:100%;border:1.5px solid var(--bdr,#ddd);border-radius:14px;padding:14px 16px;font-size:16px;font-family:inherit;color:var(--ink,#111);background:var(--surf2,#f5f5f5);outline:none;box-sizing:border-box;margin-bottom:8px;"
        oninput="mobGuValidate(this)"
        onkeydown="if(event.key==='Enter')mobDoGoogleUsername()" />
      <div id="mob-gu-err" style="font-size:12px;color:#E53E3E;min-height:18px;margin-bottom:16px;align-self:flex-start;"></div>
      <button onclick="mobDoGoogleUsername()" id="mob-gu-btn"
        style="width:100%;background:var(--a2,#3A7D5E);color:#fff;border:none;border-radius:14px;padding:16px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;">
        Create my workspace
      </button>
      <div style="font-size:11px;color:var(--ink4,#aaa);margin-top:14px;">Letters, numbers, and underscores only · Min 3 characters</div>
    `;
    const root = document.getElementById('mobile-app-root') || document.body;
    root.appendChild(picker);
  }
  // Pre-fill suggestion from Google name
  const suggestion = (googleName?.split(' ')[0] || email?.split('@')[0] || '')
    .toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 20);
  const inp = document.getElementById('mob-gu-input');
  if (inp && suggestion.length >= 3) inp.value = suggestion;
  picker.style.display = 'flex';
  setTimeout(() => inp && inp.focus(), 300);
}

function mobGuValidate(inp) {
  const val = inp.value.trim().toLowerCase();
  const err = document.getElementById('mob-gu-err');
  if (!err) return;
  if (val.length > 0 && val.length < 3) err.textContent = 'Minimum 3 characters.';
  else if (val.length > 0 && !/^[a-z0-9_]+$/.test(val)) err.textContent = 'Letters, numbers, and underscores only.';
  else err.textContent = '';
}

async function mobDoGoogleUsername() {
  const inp = document.getElementById('mob-gu-input');
  const err = document.getElementById('mob-gu-err');
  const btn = document.getElementById('mob-gu-btn');
  const u = (inp?.value || '').trim().toLowerCase();

  if (err) err.textContent = '';
  if (!u || u.length < 3) { if (err) err.textContent = 'Minimum 3 characters.'; return; }
  if (!/^[a-z0-9_]+$/.test(u)) { if (err) err.textContent = 'Letters, numbers, and underscores only.'; return; }
  if (!_pendingGoogleSession) { if (err) err.textContent = 'Session expired. Please sign in again.'; return; }

  if (btn) { btn.textContent = 'Creating workspace…'; btn.disabled = true; }

  try {
    const { authUser, email, googleName } = _pendingGoogleSession;
    // Check username availability
    const { data: avail, error: availErr } = await sb.rpc('check_signup_availability', { p_username: u, p_email: email });
    if (availErr) throw new Error('Could not verify availability. Please try again.');
    const result = avail && avail[0];
    if (result && result.username_taken) { if (err) err.textContent = 'This username is already taken.'; if (btn) { btn.textContent = 'Create my workspace'; btn.disabled = false; } return; }

    const displayName = googleName || u;
    await sb.from('users').insert({
      username: u, pass_hash: '', display_name: displayName,
      email, auth_id: authUser.id,
      tasks: '[]', journal: '[]', subjects: '[]', cal_evs: '[]',
      widgets: '[]', notes: '[]', prefs: '{}',
      joined_at: new Date().toISOString()
    });

    acc[u] = { passHash: '', displayName, tasks: [], journal: [], subjects: [], calEvs: [], widgets: [], notes: {}, prefs: { dark: false }, joined: Date.now() };
    LS.s('pd1_acc', acc);
    cu = u; LS.s('pd1_cur', u);
    _pendingGoogleSession = null;

    // Hide picker
    const picker = document.getElementById('mob-username-picker');
    if (picker) picker.style.display = 'none';

    startRealtimeSync(u);
    startOnboarding(displayName);
  } catch(e) {
    if (btn) { btn.textContent = 'Create my workspace'; btn.disabled = false; }
    if (err) err.textContent = e.message || 'Something went wrong. Try again.';
  }
}

// ══════════════════════════════════════════════
// DROPDOWN
// ══════════════════════════════════════════════
function toggleDD(){
  const av = document.getElementById('tb-avatar');
  av.classList.toggle('open');
}
function closeDD(){
  document.getElementById('tb-avatar')?.classList.remove('open');
}
function ddGo(page){
  closeDD();
  goPg(page);
}
document.addEventListener('click', e => {
  const av = document.getElementById('tb-avatar');
  if(av && !av.contains(e.target)) closeDD();
});
function doSignOut(){
  closeDD();
  appConfirm('Sign out?','You will be returned to the login screen.','Sign out').then(async ok=>{
    if(!ok) return;
    const _cu=cu;
    // Flush any pending debounced save — do a final cloud save BEFORE signing out
    // sbSignOut() kills the JWT immediately so any in-flight saves after that fail RLS
    if(_saveTimer){ clearTimeout(_saveTimer); _saveTimer=null; }
    if(_cu && sbReady && acc[_cu]){
      const d=acc[_cu];
      d._localTs=Date.now();
      LS.s('pd1_acc',acc);
      try{ localStorage.setItem('pd1_lastSaveTs',String(d._localTs)); }catch(e){}
      try{
        await sb.from('users').update({
          display_name:d.displayName||'',
          tasks:JSON.stringify(d.tasks||[]),
          journal:JSON.stringify(d.journal||[]),
          cal_evs:JSON.stringify(d.calEvs||[]),
          subjects:JSON.stringify(d.subjects||[]),
          widgets:JSON.stringify(d.widgets||[]),
          notes:JSON.stringify(d.notes||[]),
          prefs:JSON.stringify(d.prefs||{}),
        }).eq('username',_cu);
      }catch(e){}
    }
    if(sbReady){ unregisterDevice(_cu).catch(()=>{}); sb.auth.signOut().catch(()=>{}); }
    if(_realtimeChannel && sb){ try{sb.removeChannel(_realtimeChannel);}catch(e){} _realtimeChannel=null; }
    LS.d('pd1_cur'); cu=null;
    showScreen('login');
  });
}

// ══════════════════════════════════════════════
// ONBOARDING
// ══════════════════════════════════════════════
let _obColor='green', _obUseCase='', _obTheme='light';

function startOnboarding(prefillName=''){
  _obColor='green'; _obUseCase=''; _obTheme='light';
  obApplyAccent('green');
  const ni=document.getElementById('ob-name');
  if(ni) ni.value=prefillName;
  // Reset panels
  document.querySelectorAll('.ob-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('mob-ob-0').classList.add('active');
  obSetProgress(0);
  showScreen('onboarding');
}

function obApplyAccent(key){
  // Use same logic as applyAccentCSS
  applyAccentCSS(key);
}

function obSetProgress(step){
  const fill=document.getElementById('ob-fill');
  const lbl=document.getElementById('ob-prog-lbl');
  const steps=5;
  if(fill) fill.style.width=((step+1)/steps*100)+'%';
  if(lbl) lbl.textContent='Step '+(step+1)+' of '+steps;
}

function obGo(step){
  document.querySelectorAll('.ob-panel').forEach(p=>p.classList.remove('active'));
  const next=document.getElementById('mob-ob-'+step);
  if(next){ next.classList.add('active'); const inp=next.querySelector('input'); if(inp) setTimeout(()=>inp.focus(),80); }
  obSetProgress(Math.min(step,4));
  // Hide progress on last step
  const prog=document.querySelector('.ob-progress');
  if(prog) prog.style.opacity=step>=5?'0':'1';
}

function obPickUC(btn,key){
  _obUseCase=key;
  document.querySelectorAll('.ob-uc-card').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}
function obPickColor(btn,key){
  _obColor=key;
  document.querySelectorAll('.ob-color-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  obApplyAccent(key);
}
function obPickTheme(btn,mode){
  _obTheme=mode;
  document.querySelectorAll('.ob-theme-card').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}

function obNext(step){
  if(step===0){
    const n=document.getElementById('ob-name').value.trim();
    if(!n){ document.getElementById('ob-name').focus(); return; }
    if(cu){ acc[cu].displayName=n; saveAll(); }
    const dt=document.getElementById('mob-ob-done-title');
    if(dt) dt.textContent="You're all set, "+n.split(' ')[0]+'!';
    obGo(1);
  } else if(step===1){
    if(_obUseCase && cu){ if(!acc[cu].prefs) acc[cu].prefs={}; acc[cu].prefs.useCase=_obUseCase; saveAll(); }
    obGo(2);
  } else if(step===2){
    if(cu){ if(!acc[cu].prefs) acc[cu].prefs={}; acc[cu].prefs.accentKey=_obColor; acc[cu].prefs.accentColor=_obColor; saveAll(); }
    obGo(3);
  } else if(step===3){
    if(cu){ if(!acc[cu].prefs) acc[cu].prefs={}; acc[cu].prefs.dark=(_obTheme==='dark'); saveAll(); }
    obGo(4);
  } else if(step===4){
    obGo(5);
  }
}

async function obFinish(){
  if(cu){
    // Merge guest data if signed in from preview mode
    if(window._pendingGuestData){
      const gd = window._pendingGuestData;
      window._pendingGuestData = null;
      try { sessionStorage.removeItem('pd1_guest_data'); } catch(e) {}
      if(gd.tasks && gd.tasks.length) acc[cu].tasks = gd.tasks;
      if(gd.journal && gd.journal.length) acc[cu].journal = gd.journal;
      if(gd.notes && gd.notes.length) acc[cu].notes = gd.notes;
      if(gd.calEvs && gd.calEvs.length) acc[cu].calEvs = gd.calEvs;
      if(gd.prefs && gd.prefs.habitLog) acc[cu].prefs = Object.assign(acc[cu].prefs||{}, {habitLog: gd.prefs.habitLog});
    }
    acc[cu].onboarded=true;
    const d=acc[cu];
    acc[cu]=d;
    LS.s('pd1_acc',acc);
    // Save ALL fields to cloud — matches desktop dbSaveUser behaviour
    if(sbReady){
      try{
        await sb.from('users').update({
          display_name:d.displayName||'',
          tasks:JSON.stringify(d.tasks||[]),
          journal:JSON.stringify(d.journal||[]),
          subjects:JSON.stringify(d.subjects||[]),
          cal_evs:JSON.stringify(d.calEvs||[]),
          widgets:JSON.stringify(d.widgets||[]),
          notes:JSON.stringify(d.notes||[]),
          prefs:JSON.stringify(d.prefs||{}),
        }).eq('username',cu);
        _lastSaveTs=Date.now();
        acc[cu]._localTs=_lastSaveTs;
        LS.s('pd1_acc',acc);
        try{ localStorage.setItem('pd1_lastSaveTs',String(_lastSaveTs)); }catch(e){}
      }catch(e){}
    }
    // Send welcome email — fire and forget
    sendWelcomeEmail(d.displayName);
  }
  launch();
}

// ═══════════════════════════════════════
// RESEND EMAIL (mobile)
// ═══════════════════════════════════════
const RESEND_KEY = 're_8LVswgy6_6Nzp3bMZe73DDnEkLtTBW8Qn';
const RESEND_FROM = 'Prodify <hello@mail.prodify.cc>';
const RESEND_REPLY = 'prodifysupport@gmail.com';

async function resendEmail(to, subject, html){
  try{
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM, reply_to: RESEND_REPLY, to, subject, html }),
    });
    const data = await res.json();
    console.log('[Resend]', res.status, JSON.stringify(data));
    return res.ok;
  } catch(e){ console.error('[Resend] error:', e); return false; }
}

function _emailHtmlWrap(bodyContent, previewText=''){
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Prodify</title></head><body style="margin:0;padding:0;background:#F7F5F2;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;">'+(previewText?'<div style="display:none;max-height:0;overflow:hidden;">'+previewText+'</div>':'')+'<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F2;padding:40px 16px;"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;"><tr><td style="padding-bottom:28px;text-align:center;"><span style="font-size:32px;font-weight:900;letter-spacing:-1.5px;color:#1A1714;">Pro</span><span style="font-size:32px;font-weight:900;letter-spacing:-1.5px;color:#3A7D5E;">dify</span></td></tr><tr><td style="background:#ffffff;border-radius:20px;padding:40px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">'+bodyContent+'</td></tr><tr><td style="padding:24px 0 8px;text-align:center;"><p style="margin:0;font-size:12px;color:#B0A898;line-height:1.6;">© 2026 Prodify · Built by David N.<br/><a href="https://prodify.cc" style="color:#3A7D5E;text-decoration:none;">prodify.cc</a> · <a href="https://prodify.cc/privacy.html" style="color:#B0A898;text-decoration:none;">Privacy</a></p></td></tr></table></td></tr></table></body></html>';
}

async function sendWelcomeEmail(name){
  try{
    const {data}=await sb.auth.getUser();
    const email=data?.user?.email||'';
    if(!email) return;
    const body=`<h1 style="font-size:22px;font-weight:800;color:#1A1714;margin:0 0 12px;letter-spacing:-.4px;">Welcome, ${name||'there'}! 👋</h1><p style="font-size:15px;color:#5A5450;line-height:1.7;margin:0 0 20px;">Your workspace is ready. Here's how to get started:</p><div style="background:#F5F3EF;border-radius:12px;padding:20px;margin-bottom:24px;"><div style="margin-bottom:12px;font-size:14px;color:#1A1714;"><span style="margin-right:8px;">✅</span><b>Add your first task</b></div><div style="margin-bottom:12px;font-size:14px;color:#1A1714;"><span style="margin-right:8px;">🔥</span><b>Build a streak</b> — open Prodify daily</div><div style="margin-bottom:12px;font-size:14px;color:#1A1714;"><span style="margin-right:8px;">📓</span><b>Write a journal entry</b></div><div style="font-size:14px;color:#1A1714;"><span style="margin-right:8px;">🎯</span><b>Track a habit</b></div></div><a href="https://prodify.cc" style="display:block;background:#3A7D5E;color:#fff;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:700;">Open my workspace</a>`;
    resendEmail(email,`Welcome to Prodify, ${name||'there'}!`,_emailHtmlWrap(body));
  }catch(e){}
}

async function maybeSendWeeklySummary(){
  if(!cu||window._guestMode) return;
  const today=new Date();
  if(today.getDay()!==0) return;
  const weekKey=`pd1_weekly_${today.toISOString().slice(0,10)}`;
  try{ if(localStorage.getItem(weekKey)) return; localStorage.setItem(weekKey,'1'); }catch(e){ return; }
  try{
    const {data}=await sb.auth.getUser();
    const email=data?.user?.email||'';
    if(!email) return;
    const d=getD();
    const name=(d.displayName||cu||'there').split(' ')[0];
    const streak=getAppStreak();
    const sv=streakVisual(streak);
    const completedTasks=(d.tasks||[]).filter(t=>t.col==='done').length;
    const weekAgo=new Date(Date.now()-7*86400000).toISOString().slice(0,10);
    const journalCount=(d.journal||[]).filter(j=>(j.date||'')>=weekAgo).length;
    const upcoming=(d.calEvs||[]).filter(e=>e.date>=today.toISOString().slice(0,10)).sort((a,b)=>a.date>b.date?1:-1).slice(0,3);
    const upcomingHtml=upcoming.length?upcoming.map(e=>`<div style="padding:10px 14px;background:#F5F3EF;border-radius:8px;margin-bottom:8px;font-size:13px;color:#1A1714;"><b>${e.title}</b>${e.timeStart?` <span style="color:#9C978F;">· ${e.timeStart}</span>`:''} <span style="color:#9C978F;">· ${e.date}</span></div>`).join(''):'<p style="font-size:13px;color:#9C978F;margin:0;">No upcoming events.</p>';
    const body=`<p style="font-size:15px;color:#5A5450;margin:0 0 24px;">Hey ${name}, here's your week in review:</p><div style="display:flex;gap:12px;margin-bottom:28px;"><div style="flex:1;background:#F5F3EF;border-radius:12px;padding:16px;text-align:center;"><div style="font-size:32px;font-weight:900;color:#1A1714;">${completedTasks}</div><div style="font-size:11px;font-weight:700;color:#9C978F;margin-top:4px;">TASKS DONE</div></div><div style="flex:1;background:#F5F3EF;border-radius:12px;padding:16px;text-align:center;"><div style="font-size:32px;font-weight:900;color:#1A1714;">${journalCount}</div><div style="font-size:11px;font-weight:700;color:#9C978F;margin-top:4px;">ENTRIES</div></div><div style="flex:1;background:#F5F3EF;border-radius:12px;padding:16px;text-align:center;"><div style="font-size:32px;font-weight:900;color:#1A1714;">${streak}</div><div style="font-size:11px;font-weight:700;color:#9C978F;margin-top:4px;">${sv.icon} STREAK</div></div></div>${upcoming.length?`<div style="margin-bottom:24px;"><div style="font-size:12px;font-weight:700;color:#9C978F;letter-spacing:.8px;margin-bottom:10px;">COMING UP</div>${upcomingHtml}</div>`:''}<a href="https://prodify.cc" style="display:block;background:#3A7D5E;color:#fff;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:700;margin-bottom:16px;">Open Prodify</a><p style="font-size:12px;color:#9C978F;text-align:center;margin:0;">Have a great week ahead.</p>`;
    resendEmail(email,`Your Prodify week in review, ${name} 📊`,_emailHtmlWrap(body));
  }catch(e){}
}

// ══════════════════════════════════════════════
// LAUNCH
// ══════════════════════════════════════════════
function launch(){
  // Merge guest data if signed in from preview mode
  if(window._pendingGuestData && cu){
    const gd = window._pendingGuestData;
    window._pendingGuestData = null;
    try { sessionStorage.removeItem('pd1_guest_data'); } catch(e) {}
    const d = acc[cu] || {};
    if(gd.tasks && gd.tasks.length) d.tasks = [...gd.tasks, ...(d.tasks||[])];
    if(gd.journal && gd.journal.length) d.journal = [...gd.journal, ...(d.journal||[])];
    if(gd.notes && gd.notes.length) d.notes = [...gd.notes, ...(d.notes||[])];
    if(gd.calEvs && gd.calEvs.length) d.calEvs = [...gd.calEvs, ...(d.calEvs||[])];
    acc[cu] = d;
    LS.s('pd1_acc', acc);
    if(sbReady) saveAll();
  }
  // Clear guest mode if still active
  if(window._guestMode){
    window._guestMode = false;
    const b = document.getElementById('mob-guest-banner');
    if(b) b.style.display='none';
    document.body.classList.remove('guest-active');
  }
  applySettings();
  scheduleRecurringCheck(); // reset daily/weekly tasks — matches desktop
  renderAll();
  showScreen('app');
  goPg('home');
  if(isPro()) backupSnapshotToday();
  checkWaitlist();
  renderMobileProBadge();
  // Weekly summary email — delayed so it doesn't block app load
  setTimeout(maybeSendWeeklySummary, 2000);
  // Start cloud sync
  if(cu){
    startRealtimeSync(cu);
    startVisibilitySync();
  }
}

// ── RECURRING TASK RESET (mirrors desktop scheduleRecurringCheck) ──
function checkRecurringReset(){
  const today = new Date().toISOString().slice(0, 10);
  const d = getD();
  const p = d.prefs || {};
  const lastReset = p.lastRecurringReset || '';
  if (lastReset === today) return;
  let changed = false;
  (d.tasks || []).forEach(t => {
    if (!t.recurring || t.recurring === 'none') return;
    if (t.col !== 'done') return;
    if (t.recurring === 'daily') {
      t.col = 'todo'; changed = true;
    } else if (t.recurring === 'weekly') {
      const lastDate = lastReset ? new Date(lastReset) : null;
      const now = new Date();
      const weekStart = dd => { const c = new Date(dd); c.setDate(c.getDate() - c.getDay()); return c.toISOString().slice(0, 10); };
      if (!lastDate || weekStart(lastDate) !== weekStart(now)) { t.col = 'todo'; changed = true; }
    }
  });
  p.lastRecurringReset = today;
  d.prefs = p;
  if (cu) acc[cu] = d;
  if (changed) { saveAll(); renderTasks(); renderHome(); }
  else { LS.s('pd1_acc', acc); } // still stamp the reset date so we don't re-check today
}

function scheduleRecurringCheck(){
  checkRecurringReset();
  const now = new Date();
  const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
  setTimeout(() => { checkRecurringReset(); scheduleRecurringCheck(); }, msUntilMidnight);
}

// ══════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════
function applySettings(){
  const p=getP();
  if(p.dark){ document.documentElement.setAttribute('data-dark','1'); const t=document.getElementById('toggle-dark'); if(t) t.classList.add('on'); }
  else { document.documentElement.removeAttribute('data-dark'); }
  applyAccentCSS(p.accentColor||p.accentKey||'green');
  const name = getD().displayName || (cu && cu!=='__mobile__' ? cu : 'You') || 'You';
  const username = (cu && cu!=='__mobile__') ? '@'+cu : '';
  // Topbar avatar
  const avText = document.getElementById('tb-avatar-text');
  const avImg  = document.getElementById('tb-avatar');
  if(p.avatarUrl){
    if(avText) avText.style.display='none';
    // inject img if not present
    let img = avImg?.querySelector('img.av-photo');
    if(!img && avImg){ img=document.createElement('img'); img.className='av-photo'; img.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%;'; avImg.appendChild(img); }
    if(img) img.src = p.avatarUrl;
  } else {
    if(avText){ avText.style.display=''; avText.textContent=name[0].toUpperCase(); }
  }
  // Dropdown header
  const ddAvEl = document.getElementById('dd-av');
  const ddNm   = document.getElementById('dd-nm');
  const ddUn   = document.getElementById('dd-un');
  if(ddAvEl){
    if(p.avatarUrl){ ddAvEl.innerHTML=`<img src="${p.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`; }
    else { ddAvEl.textContent=name[0].toUpperCase(); }
  }
  if(ddNm) ddNm.textContent = name;
  if(ddUn) ddUn.textContent = username;
  // Settings page
  const snv=document.getElementById('set-name-val'); if(snv) snv.textContent=name;
}
function applyAccentCSS(k){
  const entry=ACCENTS[k]||ACCENTS.green;
  const isDark=document.documentElement.getAttribute('data-dark')==='1';
  const c=isDark?(entry.d||entry.l):entry.l;
  document.documentElement.style.setProperty('--a',c[0]);
  document.documentElement.style.setProperty('--a2',c[1]);
  document.documentElement.style.setProperty('--al',c[2]);
  document.querySelectorAll('.acc-sw').forEach(s=>s.classList.remove('active'));
  const sw=document.getElementById('sw-'+k); if(sw) sw.classList.add('active');
}
function setAccent(k){
  const p=getP(); p.accentKey=k; p.accentColor=k; if(cu) acc[cu].prefs=p; saveAll(); applyAccentCSS(k);
  // Update selected state on swatches immediately
  document.querySelectorAll('#mob-accent-presets .accent-swatch').forEach(s=>{
    s.classList.toggle('selected', s.dataset.key===k);
  });
}
function toggleDark(el){
  el.classList.toggle('on');
  const on=el.classList.contains('on');
  const p=getP(); p.dark=on; if(cu) acc[cu].prefs=p; saveAll();
  if(on) document.documentElement.setAttribute('data-dark','1'); else document.documentElement.removeAttribute('data-dark');
  applyAccentCSS(p.accentColor||p.accentKey||'green');
}
function saveName(){
  const v=document.getElementById('name-inp').value.trim(); if(!v) return;
  if(cu){ acc[cu].displayName=v; saveAll(); }
  applySettings(); closeSheets(); toast('Name saved!');
}
function exportData(){
  const b=new Blob([JSON.stringify(getD(),null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='prodify-export.json'; a.click(); toast('Exported!');
}
function clearAll(){
  appConfirm('Clear all data?','This will erase all your tasks, journal entries, habits and events. This cannot be undone.','Clear').then(ok=>{
    if(!ok) return;
    if(cu){ const d=getD(); d.tasks=[]; d.journal=[]; d.calEvs=[]; d.subjects=[]; d.notes=[]; if(d.prefs){d.prefs.habits=[];d.prefs.habitLog={};d.prefs.pomHistory={};}
    acc[cu]=d; saveAll(); }
    // Small delay ensures acc is fully written before re-rendering
    setTimeout(()=>{
      renderAll();
      // Reset journal textarea
      const ta=document.getElementById('jwta-mob'); if(ta){ta.value='';ta.style.height='';}
      _jwEditId=null;
    }, 50);
    toast('All data cleared');
  });
}

// ══════════════════════════════════════════════
// APP NAVIGATION
// ══════════════════════════════════════════════
const SUB_PAGES=['settings'];
function goPg(id){
  if(window._guestMode && (id==='profile'||id==='settings')){ mobGuestGuard(); return; }
  _track('page_view', { page: id });
  // Close AI planner panel when navigating
  const aipPanel = document.getElementById('mob-aip-panel');
  if(aipPanel && aipPanel.style.display === 'flex'){
    aipPanel.style.opacity = '0';
    aipPanel.style.transform = 'translateY(16px) scale(.98)';
    setTimeout(()=>{ aipPanel.style.display = 'none'; }, 200);
  }
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  // settings, calendar, profile have mob- prefix to avoid desktop ID conflicts
  const pgId = (id==='settings'||id==='calendar'||id==='profile') ? 'mob-pg-'+id : 'pg-'+id;
  const pg=document.getElementById(pgId); if(pg) pg.classList.add('active');
  const nav=document.querySelector('.bottom-nav');
  const SUB=['settings','profile'];
  if(!SUB.includes(id)){
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    const map={home:'nav-home',tasks:'nav-tasks',habits:'nav-habits',calendar:'nav-calendar',journal:'nav-journal',timer:'nav-timer',notes:'nav-notes'};
    const nb=document.getElementById(map[id]); if(nb) nb.classList.add('active');
    if(nav) nav.style.display='';
  } else {
    if(nav) nav.style.display='none';
  }
  if(id==='calendar') renderSchedule();

  if(id==='habits') renderHabitsList();
  if(id==='journal') renderJournalList();
  if(id==='notes') renderNotesList();
  if(id==='timer'){ mobSetTMode(_mobTMode); }
  if(id==='settings') renderSettingsPage();
  if(id==='profile') renderMobProfile();
  // Show FAB on notes and projects pages
  const notesFab=document.getElementById('notes-fab');
  if(notesFab) notesFab.style.display=(id==='notes')?'flex':'none';
  // Show/hide journal compose box with the page transition
  const jwadd=document.querySelector('.jwadd');
  if(jwadd){
    if(id==='journal'){
      jwadd.classList.remove('hidden');
    } else {
      jwadd.classList.add('hidden');
    }
  }
}
function renderMobProfile(){
  const d=getD(), nm=d.displayName||cu||'User';
  const photo=getP().avatarUrl||getP().avatarPhoto||null;
  const av=document.getElementById('mob-pbav');
  if(av){
    if(photo) av.innerHTML=`<img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0;"/>`;
    else av.textContent=nm[0]?.toUpperCase()||'U';
  }
  const nm2=document.getElementById('mob-pbnm'); if(nm2) nm2.textContent=nm;
  const un=document.getElementById('mob-pbun'); if(un) un.textContent='@'+(cu||'');
  const jn=document.getElementById('mob-pbjn'); if(jn) jn.textContent='Joined '+new Date(d.joined||Date.now()).toLocaleDateString('en-US',{month:'long',year:'numeric'});
}
function openAIPlanner(){
  if(!isPro()){ showUpgradeModal('AI Daily Planner'); return; }
  const panel = document.getElementById('mob-aip-panel');
  const body  = document.getElementById('mob-aip-body');
  if (!panel) return;
  const isOpen = panel.style.display === 'flex';
  if (isOpen) {
    // Just hide — keep chat history intact
    panel.style.opacity = '0';
    panel.style.transform = 'translateY(12px) scale(.97)';
    setTimeout(() => { panel.style.display = 'none'; }, 200);
  } else {
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    requestAnimationFrame(() => {
      panel.style.opacity = '1';
      panel.style.transform = 'none';
    });
    // Only render if not already rendered — preserves chat history
    if (body && !body.querySelector('.aip-chat-wrap')) {
      renderAIPlanner('mob-aip-body', true);
    }
  }
}

function shuffleQuote(){
  const q=QUOTES[Math.floor(Math.random()*QUOTES.length)];
  const qt=document.getElementById('hqt'); const qa=document.getElementById('hqa');
  if(qt){ qt.style.opacity='0'; setTimeout(()=>{ qt.textContent='"'+q.t+'"'; qt.style.opacity='1'; },180); }
  if(qa){ qa.style.opacity='0'; setTimeout(()=>{ qa.textContent='— '+q.a; qa.style.opacity='1'; },180); }
}

// ══════════════════════════════════════════════
// HOME
// ══════════════════════════════════════════════
function renderHome(){
  const h=new Date().getHours();
  const greet=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
  const name=getD().displayName||(cu&&cu!=='__mobile__'?cu:'there')||'there';
  const greetEl=document.getElementById('home-greet');
  const dateEl=document.getElementById('home-date');
  if(greetEl) greetEl.textContent=greet+', '+name+'!';
  if(dateEl) dateEl.textContent=new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});

  const today=toDay();
  const tasks=getTasks();
  const incompleteTasks=tasks.filter(t=>t.col!=='done');
  const doneTasks=tasks.filter(t=>t.col==='done').length;
  const habits=getP().habits||[];
  const log=getP().habitLog||{};
  const doneHabits=habits.filter(hb=>(log[today]||[]).map(Number).includes(+hb.id)).length;

  // ── MOMENTUM STRIP ──
  const momEl=document.getElementById('home-momentum');
  if(momEl){
    const parts=[];
    // Today's tasks: only due today + recurring (daily/weekly)
    const todayTasks=tasks.filter(t=>{
      if(t.dueDate===today) return true;
      if(t.recurring==='daily'||t.recurring==='weekly') return true;
      return false;
    });
    const todayTasksDone=todayTasks.filter(t=>t.col==='done').length;
    if(todayTasks.length) parts.push(`${todayTasksDone}/${todayTasks.length} tasks`);
    if(habits.length) parts.push(`${doneHabits}/${habits.length} habits`);
    // Use today's tasks for progress bar instead of all tasks
    const total2=(todayTasks.length)+(habits.length);
    const done2=todayTasksDone+doneHabits;
    // Overall progress
    const total2_=total2||0, done2_=done2||0;
    const pct=total2_>0?Math.round(done2_/total2_*100):0;
    momEl.innerHTML=`
      <div class="home-mom-stats">${parts.join(' · ')||'Nothing tracked yet'}</div>
      ${total2_>0?`<div class="home-mom-bar"><div class="home-mom-fill" style="width:${pct}%"></div></div>`:''}`;
  }

  // ── HABIT RINGS ──
  const metaEl=document.getElementById('home-habit-meta');
  if(metaEl) metaEl.textContent=habits.length?`${doneHabits}/${habits.length} done`:'';
  const ringsEl=document.getElementById('home-habit-rings');
  if(ringsEl){
    if(!habits.length){
      ringsEl.innerHTML=`<div class="home-habit-empty" onclick="goPg('habits')">No habits yet · <span style="color:var(--a2);font-weight:700;">Add one</span></div>`;
    } else {
      ringsEl.innerHTML=habits.map(hb=>{
        const done=(log[today]||[]).map(Number).includes(+hb.id);
        const emoji=hb.emoji||'✦';
        return `<button class="home-habit-ring${done?' done':''}" onclick="mobToggleHabitHome('${hb.id}')" title="${esc(hb.name)}">
          <div class="home-habit-ring-inner">${done?'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M3 8l4 4 6-7"/></svg>':emoji}</div>
          <div class="home-habit-ring-name">${esc(hb.name.length>8?hb.name.slice(0,7)+'…':hb.name)}</div>
        </button>`;
      }).join('');
    }
  }

  // ── JOURNAL PROMPT ──
  const journal=getD().journal||[];
  const todayEntry=journal.find(j=>j.date&&j.date.includes(new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})));
  const promptEl=document.getElementById('home-journal-prompt');
  if(promptEl){
    if(!todayEntry){
      const prompts=['How are you feeling today?','What are you grateful for?','What is your intention for today?','What is on your mind?'];
      const p=prompts[new Date().getDay()%prompts.length];
      promptEl.style.display='';
      promptEl.innerHTML=`<div class="home-journal-card" onclick="goPg('journal');setTimeout(()=>document.getElementById('jwta-mob')?.focus(),300)">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" style="width:14px;height:14px;flex-shrink:0;stroke:var(--a2)"><rect x="3" y="2" width="10" height="12" rx="1.5"/><path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3"/></svg>
        <span class="home-journal-prompt-text">${p}</span>
        <span style="font-size:11px;color:var(--a2);font-weight:700;flex-shrink:0;">Write →</span>
      </div>`;
    } else {
      promptEl.style.display='none';
    }
  }

  // ── STATS ROW ──
  const todayEvs=(getCalEvs()||[]).filter(e=>e.date===today);
  const pomToday=pomGetToday();
  const setNum=(id,n)=>{const el=document.getElementById(id);if(el)el.textContent=n;};
  setNum('hstat-tasks', incompleteTasks.length);
  setNum('hstat-events', todayEvs.length);
  setNum('hstat-sessions', pomToday);
  renderHomeStreak();

  // ── UPCOMING TASKS — due dates + recurring ──
  const in7=new Date(); in7.setDate(in7.getDate()+7);
  const in7key=in7.toISOString().slice(0,10);
  const tomorrowKey=new Date(new Date().setDate(new Date().getDate()+1)).toISOString().slice(0,10);
  const fmtDay=d=>d===today?'Today':d===tomorrowKey?'Tomorrow':new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});

  const taskItems=[];
  tasks.filter(t=>t.col!=='done'&&t.dueDate&&t.dueDate>=today&&t.dueDate<=in7key).forEach(t=>{
    taskItems.push({date:t.dueDate,title:t.title||t.text||'Task',type:'task',sub:fmtDay(t.dueDate)});
  });
  tasks.filter(t=>t.col!=='done'&&(t.recurring==='daily'||t.recurring==='weekly')).forEach(t=>{
    taskItems.push({date:today,title:t.title||t.text||'Task',type:'recurring',sub:t.recurring==='daily'?'Daily':'Weekly'});
  });
  taskItems.sort((a,b)=>a.date>b.date?1:-1);

  const taskEl=document.getElementById('home-upcoming-tasks');
  if(taskEl){
    if(!taskItems.length){
      taskEl.innerHTML=`<div class="gc-empty" style="padding:4px 0 8px;">No tasks due this week</div>`;
    } else {
      taskEl.innerHTML=taskItems.slice(0,5).map(item=>`
        <div class="home-ev-item" onclick="goPg('tasks')">
          <div class="home-ev-dot" style="background:var(--a2);border-radius:3px;"></div>
          <div class="home-ev-body">
            <div class="home-ev-title">${esc(item.title)}</div>
            <div class="home-ev-sub">${item.sub}</div>
          </div>
        </div>`).join('');
    }
  }

  // ── UPCOMING CALENDAR EVENTS ──
  const evItems=(getCalEvs()||[]).filter(e=>e.date>=today&&e.date<=in7key).sort((a,b)=>a.date>b.date?1:-1);
  const evEl=document.getElementById('home-events');
  if(evEl){
    if(!evItems.length){
      evEl.innerHTML=`<div class="gc-empty" style="padding:4px 0 8px;">No events this week</div>`;
    } else {
      evEl.innerHTML=evItems.slice(0,4).map(e=>{
        const timeLbl=e.timeStart?fmtTime(e.timeStart)+(e.timeEnd?' – '+fmtTime(e.timeEnd):''):'';
        return `<div class="home-ev-item" onclick="goPg('calendar')">
          <div class="home-ev-dot" style="background:${e.color||'var(--a2)'}"></div>
          <div class="home-ev-body">
            <div class="home-ev-title">${esc(e.title)}</div>
            <div class="home-ev-sub">${fmtDay(e.date)}${timeLbl?' · '+timeLbl:''}</div>
          </div>
        </div>`;
      }).join('');
    }
  }
}
function mobToggleHabitHome(id){
  // Toggle habit from home page ring
  const today=toDay();
  const p=getP();
  const log=p.habitLog||{};
  const dayLog=(log[today]||[]).map(Number);
  const idx=dayLog.indexOf(+id);
  if(idx===-1) dayLog.push(+id); else dayLog.splice(idx,1);
  log[today]=dayLog;
  p.habitLog=log;
  const d=getD(); d.prefs=p;
  if(cu) acc[cu]=d;
  saveAll();
  renderHome();
  renderHabitsList();
}


function calcStreak(){
  const habits=getP().habits||[];
  if(!habits.length) return 0;
  return Math.max(...habits.map(h=>habStreak(h.id)));
}

// ══════════════════════════════════════════════
// TASKS
// ══════════════════════════════════════════════
let _selTaskId = null;

function taskDueInfo(t){
  if(!t.dueDate) return null;
  const today=new Date(); today.setHours(0,0,0,0);
  const [y,m,d]=t.dueDate.split('-').map(Number);
  const due=new Date(y,m-1,d);
  const diff=Math.round((due-today)/(1000*60*60*24));
  if(t.col==='done') return null;
  if(diff<0)  return {label:'Overdue', cls:'ttag-due-overdue', urgent:true};
  if(diff===0) return {label:'Today',    cls:'ttag-due-today',   urgent:true};
  if(diff===1) return {label:'Tomorrow', cls:'ttag-due-today',   urgent:false};
  if(diff<=7)  return {label:due.toLocaleDateString('en-US',{month:'short',day:'numeric'}), cls:'ttag-due-soon', urgent:false};
  return {label:due.toLocaleDateString('en-US',{month:'short',day:'numeric'}), cls:'ttag-due-later', urgent:false};
}

// Sort: overdue first, then by due date, then undated
function sortTasks(arr){
  return [...arr].sort((a,b)=>{
    const da=taskDueInfo(a), db=taskDueInfo(b);
    if(da?.urgent && !db?.urgent) return -1;
    if(!da?.urgent && db?.urgent) return 1;
    if(a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if(a.dueDate && !b.dueDate) return -1;
    if(!a.dueDate && b.dueDate) return 1;
    return 0;
  });
}

function renderTasks(){
  const list=document.getElementById('task-list'); if(!list) return;
  const tasks=getTasks();
  if(!tasks.length){
    list.innerHTML='<div class="mob-es"><div class="mob-es-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg></div><div class="mob-es-title">All clear</div><div class="mob-es-sub">Tap + to add your first task</div></div>';
    return;
  }
  // show swipe hint once
  const hint=`<div class="swipe-hint">swipe left to go back &nbsp;·&nbsp; swipe right to advance</div>`;
  const groups=[
    {key:'todo',   label:'To Do',       dot:'#E8A838', tasks:sortTasks(tasks.filter(t=>t.col==='todo'&&!t.subjectId))},
    {key:'inprog', label:'In Progress',  dot:'#5B8DD9', tasks:sortTasks(tasks.filter(t=>t.col==='inprog'&&!t.subjectId))},
    {key:'done',   label:'Done',         dot:'var(--a2)', tasks:tasks.filter(t=>t.col==='done'&&!t.subjectId)},
  ].filter(g=>g.tasks.length>0);

  list.innerHTML = hint + groups.map(g=>`
    <div class="task-section">
      <div class="task-section-hd">
        <div class="task-section-dot" style="background:${g.dot};"></div>
        <div class="task-section-title">${g.label}</div>
        <div class="task-section-count">${g.tasks.length}</div>
        ${g.key==='done'?'<button class="task-section-clear" onclick="clearDoneTasks()">Clear</button>':''}
      </div>
      ${g.tasks.map(t=>taskCardHTML(t)).join('')}
    </div>
  `).join('');

  tasks.forEach(t=>initSwipe(t.id));
}

function taskCardHTML(t){
  const due=taskDueInfo(t);
  const recur=t.recurring&&t.recurring!=='none';
  const isDone=t.col==='done';
  const isInProg=t.col==='inprog';
  const title=esc(t.title||t.text||'');
  const dueTag=due?`<span class="ttag ${due.cls}">${due.label}</span>`:'';
  const recurTag=recur?`<span class="ttag ttag-recur">↺ ${t.recurring}</span>`:'';
  const addedDate=t.date?`<span class="tdate">${t.date}</span>`:'';
  const hasMeta=dueTag||recurTag;
  // swipe-right label: done tasks can't advance; in-progress shows Done+check; todo shows just check
  // swipe right = advance (disabled if done), swipe left = go back (disabled if todo)
  const isTodo=t.col==='todo';
  const swipeRightHTML=isDone
    ? ''
    : isInProg
      ? `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M20 6L9 17l-5-5"/></svg>Done`
      : `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M20 6L9 17l-5-5"/></svg>`;
  const swipeLeftHTML=isTodo
    ? ''
    : isInProg
      ? `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>To Do`
      : `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>In Progress`;
  return `<div class="task-item" id="ti-${t.id}">
    <div class="task-behind">
      ${!isDone?`<div class="swipe-l">${swipeRightHTML}</div>`:'<div class="swipe-l swipe-l-disabled"></div>'}
      ${!isTodo?`<div class="swipe-r swipe-r-back">${swipeLeftHTML}</div>`:'<div class="swipe-r swipe-r-disabled"></div>'}
    </div>
    <div class="task-front${due?.urgent?' overdue':''}" id="tf-${t.id}">
      <div class="tcheck${isDone?' done':''}">
        ${isDone?'<svg viewBox="0 0 16 16"><path d="M3 8l4 4 6-7"/></svg>':''}
      </div>
      <div class="tbody">
        <div class="tname${isDone?' done':''}">${title}</div>
        ${hasMeta?'<div class="tmeta">'+dueTag+recurTag+'</div>':''}
        ${addedDate}
      </div>
      <button class="task-del-btn" onclick="event.stopPropagation();deleteTaskDirect('${t.id}')" aria-label="Delete">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  </div>`;
}

function initSwipe(id){
  const front=document.getElementById('tf-'+id); if(!front) return;
  const clone=front.cloneNode(true); front.parentNode.replaceChild(clone,front);
  const el=document.getElementById('tf-'+id); if(!el) return;
  let sx=0,cx=0,sw=false,moved=false;

  function onStart(clientX){
    sx=clientX; sw=true; cx=0; moved=false;
    // Reveal the behind layer only while actively swiping
    const behind=el.closest('.task-item')?.querySelector('.task-behind');
    if(behind) behind.style.visibility='visible';
  }
  function onMove(clientX){
    if(!sw) return; moved=true;
    const d=getD();
    const t=(d.tasks||[]).find(x=>String(x.id)===String(id));
    const _isDone=t&&t.col==='done';
    const _isTodo=t&&t.col==='todo';
    // Only allow swipe in directions that are valid for this task state
    const raw=clientX-sx;
    const minX=_isDone?-82:(_isTodo?0:-82);  // no right-swipe if done, no left-swipe if todo
    const maxX=_isDone?0:82;                  // no right-swipe (advance) if done
    cx=Math.max(minX,Math.min(maxX,raw));
    el.style.transform=`translateX(${cx}px)`;
  }
  function onEnd(){
    if(!sw) return; sw=false;
    const d=getD();
    const t=(d.tasks||[]).find(x=>String(x.id)===String(id));
    if(!t){ el.style.transform=''; cx=0; return; }
    const isDone=t.col==='done';
    const isTodo=t.col==='todo';
    if(cx>60 && !isDone){
      // Advance: todo→inprog→done
      el.style.transform='';
      cycleTask(id);
    } else if(cx<-60 && !isTodo){
      // Go back: done→inprog→todo
      el.style.transform='';
      const cols=['todo','inprog','done'];
      const prev=cols[Math.max(0,cols.indexOf(t.col)-1)];
      t.col=prev;
      _selTaskId=null; if(cu) acc[cu]=d; saveAll(); renderTasks(); renderHome();
    } else { el.style.transform=''; }
    cx=0;
    // Hide behind layer again after swipe settles
    const behind=el.closest('.task-item')?.querySelector('.task-behind');
    if(behind) behind.style.visibility='hidden';
  }

  // touch
  el.addEventListener('touchstart',e=>onStart(e.touches[0].clientX),{passive:true});
  el.addEventListener('touchmove',e=>{ onMove(e.touches[0].clientX); if(e.cancelable)e.preventDefault(); },{passive:false});
  el.addEventListener('touchend',onEnd);
  // mouse (desktop)
  el.addEventListener('mousedown',e=>{ if(e.button!==0) return; onStart(e.clientX); el.style.userSelect='none'; });
  el.addEventListener('mousemove',e=>{ if(!sw) return; onMove(e.clientX); });
  el.addEventListener('mouseup',e=>{ el.style.userSelect=''; onEnd(); });
  el.addEventListener('mouseleave',e=>{ if(sw){ el.style.userSelect=''; el.style.transform=''; sw=false; cx=0; } });
}

function initProjTaskSwipe(taskId, subjId){
  const front=document.getElementById('ptf-'+taskId); if(!front) return;
  const clone=front.cloneNode(true); front.parentNode.replaceChild(clone,front);
  const el=document.getElementById('ptf-'+taskId); if(!el) return;
  let sx=0,cx=0,sw=false;

  function onStart(clientX){ sx=clientX; sw=true; cx=0; }
  function onMove(clientX){
    if(!sw) return;
    const d=getD();
    const t=(d.tasks||[]).find(x=>String(x.id)===String(taskId));
    const isDone=t&&t.col==='done';
    // Done: no swipe. Others: right-only (no delete)
    const raw=clientX-sx;
    cx=isDone?0:Math.max(0,Math.min(82,raw));
    el.style.transform=`translateX(${cx}px)`;
  }
  function onEnd(){
    if(!sw) return; sw=false;
    if(cx>60){
      el.style.transform='';
      const d=getD();
      const t=(d.tasks||[]).find(x=>String(x.id)===String(taskId));
      if(t&&t.col!=='done'){ const cols=['todo','inprog','done']; t.col=cols[(cols.indexOf(t.col)+1)%3]; }
      if(cu) acc[cu]=d; saveAll(); renderHome();
    } else {
      el.style.transform='';
    }
    cx=0;
  }

  el.addEventListener('touchstart',e=>onStart(e.touches[0].clientX),{passive:true});
  el.addEventListener('touchmove',e=>{ onMove(e.touches[0].clientX); if(e.cancelable)e.preventDefault(); },{passive:false});
  el.addEventListener('touchend',onEnd);
  el.addEventListener('mousedown',e=>{ if(e.button!==0)return; onStart(e.clientX); el.style.userSelect='none'; });
  el.addEventListener('mousemove',e=>{ if(!sw)return; onMove(e.clientX); });
  el.addEventListener('mouseup',()=>{ el.style.userSelect=''; onEnd(); });
  el.addEventListener('mouseleave',()=>{ if(sw){ el.style.userSelect=''; el.style.transform=''; sw=false; cx=0; } });
}

function saveTask(){
  
  const title=document.getElementById('task-inp')?.value?.trim(); if(!title) return;
  const col='todo';
  const dueDate=document.getElementById('task-due-val')?.value||null;
  const recurring=getActivePill('task-recur-pills')||'none';
  const d=getD(); d.tasks=d.tasks||[];
  d.tasks.unshift({
    id:uid(), title, text:title, col,
    dueDate: dueDate||null,
    recurring: recurring||'none',
    date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'}),
    created:Date.now()
  });
  if(cu) acc[cu]=d; saveAll(); renderTasks(); renderHome(); closeSheets();
  // Reset sheet
  document.getElementById('task-inp').value='';
  const dv=document.getElementById('task-due-val'); if(dv) dv.value='';
  const dl=document.getElementById('due-lbl'); if(dl){dl.textContent='Choose due date';dl.parentElement.style.color='';}
  const rp=document.querySelector('#task-recur-pills .pill[data-v="none"]'); if(rp) selPill(rp,'task-recur-pills');
  const recurPills=document.getElementById('task-recur-pills');
  if(recurPills){recurPills.style.opacity='';recurPills.style.pointerEvents='';}
  const dBtn=document.getElementById('due-btn');
  if(dBtn){dBtn.style.opacity='';dBtn.style.pointerEvents='';}
  toast('Task added!');
}

function onPickRepeat(val){
  const dv=document.getElementById('task-due-val');
  const dl=document.getElementById('due-lbl');
  const dBtn=document.getElementById('due-btn');
  if(val && val!=='none'){
    // Clear and disable due date
    if(dv) dv.value='';
    if(dl){dl.textContent='Choose due date';dl.parentElement.style.color='';}
    if(dBtn){dBtn.style.opacity='.35';dBtn.style.pointerEvents='none';}
  } else {
    // Re-enable due date
    if(dBtn){dBtn.style.opacity='';dBtn.style.pointerEvents='';}
  }
}

function toggleTaskDone(id){
  const front=document.getElementById('tf-'+id);
  if(front){ front.style.transition='opacity .25s,transform .25s'; front.style.opacity='0'; front.style.transform='translateX(8px)'; }
  setTimeout(()=>{
    const d=getD(); const t=(d.tasks||[]).find(t=>t.id===id); if(!t) return;
    t.col=t.col==='done'?'todo':'done';
    _selTaskId=null; if(cu) acc[cu]=d; saveAll(); renderTasks(); renderHome();
  },220);
}
function cycleTask(id){
  // animate the card before updating
  const front=document.getElementById('tf-'+id);
  if(front){ front.style.transition='opacity .25s,transform .25s'; front.style.opacity='0'; front.style.transform='translateX(8px)'; }
  setTimeout(()=>{
    const d=getD(); const t=(d.tasks||[]).find(t=>String(t.id)===String(id)); if(!t) return;
    const cols=['todo','inprog','done']; t.col=cols[(cols.indexOf(t.col)+1)%3];
    _selTaskId=null; if(cu) acc[cu]=d; saveAll(); renderTasks(); renderHome();
  },220);
}
function moveTaskCol(id,col){
  const d=getD(); const t=(d.tasks||[]).find(t=>String(t.id)===String(id)); if(!t) return;
  t.col=col; _selTaskId=null; if(cu) acc[cu]=d; saveAll(); renderTasks(); renderHome();
}
function deleteTask(id){
  appConfirm('Delete this task?','This cannot be undone.').then(ok=>{
    if(!ok) return;
    const d=getD(); d.tasks=(d.tasks||[]).filter(t=>String(t.id)!==String(id));
    _selTaskId=null; if(cu) acc[cu]=d; saveAll(); renderTasks(); renderHome();
  });
}
function deleteTaskDirect(id){
  appConfirm('Delete this task?','This cannot be undone.','Delete').then(ok=>{
    if(!ok) return;
    const d=getD(); d.tasks=(d.tasks||[]).filter(t=>String(t.id)!==String(id));
    _selTaskId=null; if(cu) acc[cu]=d; saveAll(); renderTasks(); renderHome();
  });
}
async function clearDoneTasks(){
  const done=getTasks().filter(t=>t.col==='done');
  if(!done.length) return;
  const ok=await appConfirm(`Clear ${done.length} completed task${done.length>1?'s':''}?`,'This cannot be undone.');
  if(!ok) return;
  const d=getD(); d.tasks=(d.tasks||[]).filter(t=>t.col!=='done');
  if(cu) acc[cu]=d; saveAll(); renderTasks(); renderHome();
}

// ── Due date picker ──
let _dpSel='',_dpYear=0,_dpMonth=0,_dpCallback=null;
function openDueDatePicker(){
  _dpOpenWith(document.getElementById('task-due-val')?.value||'', function(val){
    const dv=document.getElementById('task-due-val'); if(dv) dv.value=val||'';
    const dl=document.getElementById('due-lbl');
    const recurPills=document.getElementById('task-recur-pills');
    if(dl){
      if(val){
        const [y,m,d]=val.split('-').map(Number);
        dl.textContent=new Date(y,m-1,d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
        dl.parentElement.style.color='var(--a2)';
        // Reset repeat to none and disable repeat pills
        const rp=document.querySelector('#task-recur-pills .pill[data-v="none"]');
        if(rp) selPill(rp,'task-recur-pills');
        if(recurPills){recurPills.style.opacity='.35';recurPills.style.pointerEvents='none';}
      } else {
        dl.textContent='Choose due date';
        dl.parentElement.style.color='';
        // Re-enable repeat pills
        if(recurPills){recurPills.style.opacity='';recurPills.style.pointerEvents='';}
      }
    }
  });
}
function openProjDueDatePicker(){
  const cur=document.getElementById('mob-proj-due-val')?.value||'';
  _dpOpenWith(cur, function(val){
    const dv=document.getElementById('mob-proj-due-val'); if(dv) dv.value=val||'';
    const dl=document.getElementById('mob-proj-due-lbl');
    const dBtn=document.getElementById('mob-proj-due-btn');
    if(val){
      const [y,m,d]=val.split('-').map(Number);
      if(dl) dl.textContent=new Date(y,m-1,d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
      if(dBtn){dBtn.style.borderColor='var(--a2)';dBtn.style.background='var(--al)';dBtn.style.color='var(--a2)';}
    } else {
      if(dl) dl.textContent='Choose due date';
      if(dBtn){dBtn.style.borderColor='';dBtn.style.background='';dBtn.style.color='';}
    }
  });
}
function _dpOpenWith(cur, callback){
  const base=cur?new Date(cur+'T00:00:00'):new Date();
  _dpSel=cur;_dpYear=base.getFullYear();_dpMonth=base.getMonth();_dpCallback=callback;
  let modal=document.getElementById('dp-modal');
  if(!modal){
    modal=document.createElement('div');modal.id='dp-modal';
    modal.style.cssText='position:fixed;inset:0;z-index:500;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,0);transition:background .25s;pointer-events:none;';
    modal.innerHTML=`<div id="dp-sheet" style="width:100%;max-width:430px;background:var(--surf);border-radius:24px 24px 0 0;padding:0 0 32px;box-shadow:0 -12px 48px rgba(0,0,0,.2);transform:translateY(110%);transition:transform .3s cubic-bezier(.32,.72,0,1);">
      <div style="width:40px;height:4px;border-radius:2px;background:var(--bdr);margin:12px auto 0;"></div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px 10px;">
        <span style="font-size:16px;font-weight:800;color:var(--ink);">Pick a due date</span>
        <button onclick="_dpClear()" style="background:none;border:none;font-size:12px;font-weight:700;color:var(--ink3);cursor:pointer;font-family:inherit;padding:6px 10px;border-radius:8px;">Clear</button>
      </div>
      <div style="margin:0 16px;background:var(--surf2);border-radius:18px;border:1.5px solid var(--bdr);padding:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <button id="dp-prev" onclick="_dpNav(-1)" style="width:32px;height:32px;border-radius:10px;border:1.5px solid var(--bdr);background:var(--surf);cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;color:var(--ink);font-family:inherit;">&#x2039;</button>
          <span id="dp-month" style="font-size:14px;font-weight:800;color:var(--ink);"></span>
          <button onclick="_dpNav(1)" style="width:32px;height:32px;border-radius:10px;border:1.5px solid var(--bdr);background:var(--surf);cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;color:var(--ink);font-family:inherit;">&#x203a;</button>
        </div>
        <div id="dp-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;"></div>
      </div>
      <button id="dp-confirm-btn" onclick="_dpConfirm()" style="display:block;width:calc(100% - 32px);margin:14px 16px 0;background:var(--a2);color:#fff;border:none;border-radius:14px;padding:14px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;">Confirm</button>
    </div>`;
    modal.addEventListener('click',e=>{if(e.target===modal)_dpClose();});
    // Append to mobile-app-root so it renders within the correct stacking context
    const mRoot = document.getElementById('mobile-app-root') || document.body;
    mRoot.appendChild(modal);
  }
  _dpRender();
  modal.style.pointerEvents='auto';
  requestAnimationFrame(()=>{modal.style.background='rgba(0,0,0,.5)';document.getElementById('dp-sheet').style.transform='translateY(0)';});
}
function _dpRender(){
  const today=new Date();today.setHours(0,0,0,0);
  const first=new Date(_dpYear,_dpMonth,1);
  const last=new Date(_dpYear,_dpMonth+1,0);
  document.getElementById('dp-month').textContent=first.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  let html='';
  ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(d=>{html+=`<div style="font-size:9px;font-weight:800;color:var(--ink4);text-align:center;padding:2px 0 8px;text-transform:uppercase;">${d}</div>`;});
  for(let i=0;i<first.getDay();i++) html+='<div></div>';
  for(let d=1;d<=last.getDate();d++){
    const date=new Date(_dpYear,_dpMonth,d);
    // Use local date parts to avoid UTC offset shifting the date
    const y=_dpYear, m=String(_dpMonth+1).padStart(2,'0'), dd=String(d).padStart(2,'0');
    const val=`${y}-${m}-${dd}`;
    const past=date<today,isSel=val===_dpSel,isToday=val===toDay();
    let bg='transparent',color='var(--ink)',fw='500',op='1',cursor='pointer';
    if(past){color='var(--ink4)';op='.3';cursor='default';}
    else if(isSel){bg='var(--a2)';color='#fff';fw='800';}
    else if(isToday){bg='var(--surf)';color='var(--a2)';fw='800';}
    const click=past?'':`onclick="_dpPick('${val}')"`;
    html+=`<div ${click} style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:${fw};color:${color};background:${bg};border-radius:9px;cursor:${cursor};opacity:${op};">${d}</div>`;
  }
  document.getElementById('dp-grid').innerHTML=html;
  const btn=document.getElementById('dp-confirm-btn');
  if(btn) btn.textContent=_dpSel?'Confirm — '+_dpFmt(_dpSel):'Confirm';
}
function _dpFmt(val){
  // Parse YYYY-MM-DD without timezone conversion
  const [y,m,d]=val.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('en-US',{month:'short',day:'numeric'});
}
function _dpPick(v){_dpSel=v;_dpRender();}
function _dpNav(d){_dpMonth+=d;if(_dpMonth<0){_dpMonth=11;_dpYear--;}if(_dpMonth>11){_dpMonth=0;_dpYear++;}  _dpRender();}
function _dpClear(){_dpSel='';_dpRender();}
function _dpConfirm(){
  if(_dpCallback) _dpCallback(_dpSel||'');
  _dpClose();
}
function _dpClose(){
  const modal=document.getElementById('dp-modal');if(!modal)return;
  modal.style.background='rgba(0,0,0,0)';
  const sheet=document.getElementById('dp-sheet');if(sheet)sheet.style.transform='translateY(110%)';
  modal.style.pointerEvents='none';
}
// ══════════════════════════════════════════════
// JOURNAL
// ══════════════════════════════════════════════
// ══════════════════════════════════════════════
// JOURNAL
// ══════════════════════════════════════════════
const JOURNAL_PROMPTS=['What made you smile today?','What\'s one thing you\'re proud of this week?','What\'s been on your mind lately?','What\'s one thing you want to do differently tomorrow?','Who or what are you grateful for right now?','What\'s the biggest challenge you\'re facing?','What did you learn today?','How are you really feeling right now?','What would make tomorrow a great day?','What\'s something you\'ve been putting off?','Describe your energy level today and why.','What\'s one small win you had recently?'];
const JOURNAL_TEMPLATES=[
  {icon:'🌅',label:'Morning',text:'Today I intend to...\n\nOne thing I\'m looking forward to:\n\nMy focus for today is:'},
  {icon:'🌙',label:'Evening',text:'How today went...\n\nSomething I\'m proud of today:\n\nOne thing I\'d do differently:'},
  {icon:'🙏',label:'Gratitude',text:'Three things I\'m grateful for:\n1. \n2. \n3. \n\nWhy these matter to me:'},
  {icon:'🧠',label:'Dump',text:''}
];
const MLAB=[{e:'😄',l:'Great'},{e:'🙂',l:'Good'},{e:'😐',l:'Okay'},{e:'😔',l:'Low'},{e:'😴',l:'Tired'},{e:'😤',l:'Stressed'},{e:'😰',l:'Anxious'},{e:'🔥',l:'Pumped'},{e:'🧘',l:'Calm'},{e:'🥰',l:'In Love'}];
const MOOD_COLORS={0:'#2A7D5E',1:'#4A9D74',2:'#888888',3:'#5A7AAA',4:'#6B7280',5:'#C44040',6:'#DC2626',7:'#D97706',8:'#7A5EA8',9:'#E11D48'};
let _jwSearchQ='';
let _jwMood=0;
function jwToggleSearch(){
  const bar=document.getElementById('jw-search-bar');
  const btn=document.getElementById('jw-search-toggle');
  const inp=document.getElementById('jw-search-inp');
  const open=bar.style.display!=='none';
  bar.style.display=open?'none':'block';
  btn.classList.toggle('active',!open);
  if(!open){ setTimeout(()=>inp&&inp.focus(),50); }
  else { jwClearSearch(); }
}
function jwSearch(val){
  _jwSearchQ=val.toLowerCase().trim();
  const cl=document.getElementById('jw-search-clear');
  if(cl) cl.style.display=val?'flex':'none';
  renderJournalList();
}
function jwClearSearch(){
  _jwSearchQ='';
  const inp=document.getElementById('jw-search-inp');
  const cl=document.getElementById('jw-search-clear');
  if(inp) inp.value='';
  if(cl) cl.style.display='none';
  renderJournalList();
}

function renderJournalList(){
  const list=document.getElementById('journal-list');
  if(!list) return;
  const entries=getJournal();
  if(!entries.length){
    list.innerHTML=`<div class="mob-es"><div class="mob-es-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h6M8 15h4"/></svg></div><div class="mob-es-title">No entries yet</div><div class="mob-es-sub">Write your first entry below.</div></div>`;
    return;
  }
  const q=_jwSearchQ;
  const filtered=q?entries.filter(j=>(j.content||j.text||'').toLowerCase().includes(q)):entries;
  // hl must run on already-escaped text, using the escaped query to match correctly
  const escQ=q?esc(q).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'):'';
  const hl=txt=>escQ?txt.replace(new RegExp('('+escQ+')','gi'),'<mark style="background:var(--al);color:var(--a2);border-radius:2px;padding:0 1px;">$1</mark>'):txt;
  const hdr=`<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 2px 8px;"><span style="font-size:10px;color:var(--ink4);">${filtered.length} of ${entries.length} entr${entries.length>1?'ies':'y'}</span><button onclick="jwClearAll()" style="background:none;border:none;font-size:10px;color:var(--ink4);cursor:pointer;padding:2px 4px;border-radius:4px;" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--ink4)'">Clear all</button></div>`;
  if(!filtered.length){ list.innerHTML=hdr+`<div class="mob-es"><div class="mob-es-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h6M8 15h4"/></svg></div><div class="mob-es-title">No results</div><div class="mob-es-sub">No entries match your search.</div></div>`; return; }
  list.innerHTML=hdr+filtered.map(j=>{
    const m=MLAB[j.mood??0]||MLAB[0];
    const borderCol=MOOD_COLORS[j.mood??0]||'var(--a2)';
    const text=j.content||j.text||'';
    const preview=text.slice(0,160);
    const wc=text.trim().split(/\s+/).filter(Boolean).length;
    return `<div class="jwje" style="border-left-color:${borderCol};" data-id="${j.id}">
      <div class="jwjehd">
        <span class="jwm">${m.e}</span>
        <div style="flex:1;min-width:0;">
          <div class="jwdt">${fmtDate(j.date,true)}</div>
          <div class="jwmood-lbl">${m.l}</div>
        </div>
        <span class="jwwc">${wc}w</span>
        <button class="jwedit-mob" title="Edit" onclick="jwEdit('${j.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="jwdel" onclick="jwDel('${j.id}')">&times;</button>
      </div>
      <div class="jwtx">${hl(esc(preview))}${text.length>160?'…':''}</div>
    </div>`;
  }).join('');
}

let _jwEditId=null;

function jwEdit(id){
  const d=getD(); const entry=(d.journal||[]).find(e=>e.id==id); if(!entry) return;
  _jwEditId=id; _jwMood=entry.mood??0;
  const ta=document.getElementById('jwta-mob'); if(!ta) return;
  ta.value=entry.content||entry.text||'';
  jwAutoResize(ta);
  // update mood button
  jwPickMood(_jwMood);
  // scroll composer into view
  document.querySelector('.jwadd')?.scrollIntoView({behavior:'smooth',block:'nearest'});
  ta.focus();
  toast('Editing entry — tap Save to update');
}
function jwDel(id){
  appConfirm('Delete this entry?','This cannot be undone.').then(ok=>{
    if(!ok) return;
    const d=getD(); d.journal=(d.journal||[]).filter(e=>String(e.id)!==String(id));
    if(cu) acc[cu]=d; saveAll(); renderJournalList();
  });
}
function jwClearAll(){
  appConfirm('Delete all journal entries?','This cannot be undone.').then(ok=>{
    if(!ok) return;
    const d=getD(); d.journal=[];
    if(cu) acc[cu]=d; saveAll(); renderJournalList();
  });
}
function jwSave(){
  
  const ta=document.getElementById('jwta-mob'); if(!ta) return;
  const text=ta.value.trim(); if(!text) return;
  const d=getD(); d.journal=d.journal||[];
  if(_jwEditId){
    const entry=d.journal.find(e=>e.id==_jwEditId);
    if(entry){ entry.content=text; entry.mood=_jwMood; }
    _jwEditId=null;
    toast('Entry updated!');
  } else {
    d.journal.unshift({id:uid(),date:new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}),content:text,text:text,mood:_jwMood,ts:Date.now()});
    toast('Entry saved!');
  }
  if(cu) acc[cu]=d; saveAll(); renderJournalList();
  ta.value=''; ta.style.height=''; jwAutoResize(ta);
}
function jwAutoResize(ta){ ta.style.height='auto'; ta.style.height=ta.scrollHeight+'px'; }
function jwUseTpl(i){
  const ta=document.getElementById('jwta-mob'); if(!ta) return;
  ta.value=JOURNAL_TEMPLATES[i].text; ta.focus(); jwAutoResize(ta);
  document.getElementById('jwtpl-mob').style.display='none';
}
function jwShufflePrompt(){
  const ta=document.getElementById('jwta-mob'); if(!ta) return;
  ta.placeholder=JOURNAL_PROMPTS[Math.floor(Math.random()*JOURNAL_PROMPTS.length)];
  ta.focus();
}
function jwToggleTpl(){
  const row=document.getElementById('jwtpl-mob'); if(!row) return;
  row.style.display=row.style.display==='none'?'flex':'none';
}
function jwPickMood(m){
  _jwMood=m;
  const mood=MLAB[m]||MLAB[0];
  const cur=document.getElementById('jwmcur-mob');
  const txt=document.getElementById('jwmcurtxt-mob');
  if(cur){ cur.childNodes[0].textContent=mood.e+' '; }
  if(txt) txt.textContent=mood.l;
  document.querySelectorAll('#jwmpop-mob .jwmpop-btn').forEach(b=>b.classList.toggle('on',+b.dataset.m===m));
  jwToggleMoodPop(false);
}
function jwToggleMoodPop(force){
  const pop=document.getElementById('jwmpop-mob'); if(!pop) return;
  const open=force!==undefined?force:!pop.classList.contains('open');
  pop.classList.toggle('open',open);
  if(open){
    setTimeout(()=>{
      const h=e=>{if(!pop.contains(e.target)&&e.target.id!=='jwmcur-mob'){pop.classList.remove('open');document.removeEventListener('touchstart',h);document.removeEventListener('click',h);}};
      document.addEventListener('click',h); document.addEventListener('touchstart',h);
    },10);
  }
}
// wire up textarea auto-resize (DOM already ready when this script loads dynamically)
(function(){
  const ta=document.getElementById('jwta-mob');
  if(ta){
    ta.addEventListener('input',()=>jwAutoResize(ta));
    ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&window.innerWidth>600){e.preventDefault();jwSave();}});
  }
})();

// ══════════════════════════════════════════════
// HABITS — stores in prefs.habits + prefs.habitLog (matches desktop)
// ══════════════════════════════════════════════
const HAB_EMOJIS=['✔️','❌','💪','📚','🏃','💧','🧘','🥗','😴','🎯','✍️','🌿'];
let _habSelEmoji=HAB_EMOJIS[0];

function habShowEmojis(){
  const row=document.getElementById('hab-emoji-row'); if(!row) return;
  // build emojis once
  const wrap=document.getElementById('hab-emojis');
  if(!wrap.children.length){
    HAB_EMOJIS.forEach((e,i)=>{
      const btn=document.createElement('button');
      btn.textContent=e; btn.dataset.e=e;
      if(i===0) btn.classList.add('sel');
      btn.onclick=function(){ document.querySelectorAll('#hab-emojis button').forEach(b=>b.classList.remove('sel')); btn.classList.add('sel'); _habSelEmoji=e; };
      wrap.appendChild(btn);
    });
  }
  row.classList.add('open');
}
function habHideEmojis(){
  setTimeout(()=>{ const row=document.getElementById('hab-emoji-row'); if(row) row.classList.remove('open'); },160);
}

function renderHabitsList(){
  const list=document.getElementById('hab-list');
  if(!list) return;
  const habits=getP().habits||[]; const log=getP().habitLog||{}; const today=toDay();
  const total=habits.length, doneCount=habits.filter(h=>(log[today]||[]).map(Number).includes(+h.id)).length;
  if(!total){
    list.innerHTML=`<div class="mob-es"><div class="mob-es-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20z"/><path d="M8 12l3 3 5-5"/></svg></div><div class="mob-es-title">No habits yet</div><div class="mob-es-sub">Build your routine — type a habit below.</div></div>`;
    renderHabitFooter();
    return;
  }
  const pct=Math.round(doneCount/total*100);
  list.innerHTML=`
    <div class="hab-progress">
      <div class="hab-progress-row">
        <span class="hab-progress-lbl">${doneCount}/${total} TODAY</span>
        <span class="hab-progress-pct">${pct}%</span>
      </div>
      <div class="hab-progress-bar"><div class="hab-progress-fill" style="width:${pct}%"></div></div>
    </div>
    ${habits.map(h=>{
      const done=(log[today]||[]).map(Number).includes(+h.id);
      const streak=habStreak(h.id);
      return `<div class="hab-row">
        <button class="hab-circle-btn ${done?'done':''}" onclick="habitToggle('${h.id}')">
          <span class="hab-emoji">${h.emoji||'💪'}</span>
          <span class="hab-check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
        </button>
        <div class="hab-mid">
          <div class="hab-title ${done?'done':''}">${esc(h.name)}</div>
        </div>
        <span class="hab-streak-pill ${streak>0?'active':''}">🔥${streak}</span>
        <button class="hab-del-btn" onclick="deleteHabit('${h.id}')">✕</button>
      </div>`;
    }).join('')}`;
  renderHabitFooter();
}
function habStreak(id){
  id=+id; // always compare as number
  const log=getP().habitLog||{}; let streak=0; const d=new Date();
  if(!(log[toDay()]||[]).map(Number).includes(id)) d.setDate(d.getDate()-1);
  for(let i=0;i<365;i++){ const k=d.toISOString().slice(0,10); if((log[k]||[]).map(Number).includes(id)){streak++;d.setDate(d.getDate()-1);}else break; }
  return streak;
}
function habitToggle(id){
  id=+id; // always compare as number
  // pulse the circle before re-render
  const btn=document.querySelector(`.hab-circle-btn[onclick="habitToggle('${id}')"]`);
  if(btn){ btn.classList.add('pulse'); }
  setTimeout(()=>{
    const d=getD(); const p=d.prefs||{}; if(!p.habitLog) p.habitLog={};
    const today=toDay(); const arr=(p.habitLog[today]||[]).map(Number);
    if(arr.includes(id)) p.habitLog[today]=arr.filter(x=>+x!==id);
    else p.habitLog[today]=[...arr,id];
    d.prefs=p; if(cu) acc[cu]=d; saveAll(); renderHabitsList(); renderHome();
  },120);
}
function renderHabitFooter(){
  const footer=document.getElementById('hab-wfoot-inner');
  if(!footer) return;
  const d=getD(); const p=d.prefs||{}; const habits=p.habits||[];
  const atLimit=!isPro()&&habits.length>=3;
  const nearLimit=!isPro()&&habits.length===2;
  const counterHtml=!isPro()?`<div style="font-size:11px;font-weight:700;color:${atLimit?'var(--red)':nearLimit?'var(--ink3)':'var(--ink4)'};text-align:right;margin-bottom:6px;padding:6px 14px 0;">${habits.length}/3 habits used${atLimit?' · <span style="color:var(--a2);cursor:pointer;" onclick="showUpgradeModal(&quot;Unlimited Habits&quot;)">Upgrade for unlimited ✦</span>':''}</div>`:'';
  if(atLimit){
    footer.innerHTML=counterHtml+`<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px 14px;gap:10px;">
      <div style="font-size:13px;color:var(--ink3);line-height:1.4;">You've reached the free limit of 3 habits.</div>
      <button onclick="showUpgradeModal('Unlimited Habits')" style="background:var(--a2);color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0;">Upgrade ✦</button>
    </div>`;
  } else {
    footer.innerHTML=counterHtml+`<div class="hab-input-row">
      <input class="hab-inp" id="hab-inp" type="text" placeholder="Add a habit…" maxlength="40"
        onfocus="habShowEmojis()" onblur="habHideEmojis()" onkeydown="if(event.key==='Enter')saveHabit()" />
      <button class="hab-add-btn" onclick="saveHabit()">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      </button>
    </div>`;
  }
}

function saveHabit(){
  const inp=document.getElementById('hab-inp'); if(!inp) return;
  const name=inp.value.trim(); if(!name) return;
  const d=getD(); const p=d.prefs||{}; if(!p.habits) p.habits=[];
  if(!isPro() && p.habits.length>=3){ showUpgradeModal('Unlimited Habits'); return; }
  p.habits.push({id:Date.now(),name,emoji:_habSelEmoji,created:toDay()});
  d.prefs=p; if(cu) acc[cu]=d; saveAll(); renderHabitsList(); renderHome();
  inp.value=''; inp.blur(); toast('Habit added!');
  _habSelEmoji=HAB_EMOJIS[0];
  document.querySelectorAll('#hab-emojis button').forEach((b,i)=>b.classList.toggle('sel',i===0));
}
function deleteHabit(id){
  id=+id;
  appConfirm('Delete this habit?','Your streak and history will be lost.').then(ok=>{
    if(!ok) return;
    const d=getD(); const p=d.prefs||{}; p.habits=(p.habits||[]).filter(h=>h.id!==id);
    d.prefs=p; if(cu) acc[cu]=d; saveAll(); renderHabitsList(); renderHome();
  });
}

// ══════════════════════════════════════════════
// TIMER — matches desktop widget (Pomodoro + Custom)
// ══════════════════════════════════════════════
const MOB_TMODES=[{l:'Pomodoro',s:25*60,locked:true},{l:'Custom',s:20*60,locked:false}];
let _mobTMode=0, _mobSec=25*60, _mobTotal=25*60, _mobRunning=false, _mobIv=null;
let _mobSessions=0, _mobCustomSec=[25*60,20*60];
let _alarmCtx=null,_alarmIv=null,_alarmTimeout=null,_mobAlarmActive=false;

function fmtSec(s){
  const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60;
  if(h>0)return `${h}:${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`;
}
function parseTimeInput(raw){
  raw = raw.trim();
  const MAX = 5999; // cap at 99:59
  if(!raw.includes(':')){
    // Treat as minutes if ≤99, otherwise seconds
    const n = parseInt(raw) || 0;
    const secs = n <= 99 ? n * 60 : n;
    return Math.min(Math.max(secs, 1), MAX);
  }
  const parts = raw.split(':');
  // MM:SS
  const m = Math.min(parseInt(parts[0])||0, 99);
  const s = Math.min(parseInt(parts[1])||0, 59);
  return Math.min(m*60 + s, MAX);
}
const RING_CIRC=615.75;
function mobUpdateDisp(){
  const el=document.getElementById('tmtime-mob'); if(el) el.textContent=fmtSec(_mobSec);
  const r=document.getElementById('ring-prog-mob');
  if(r) r.style.strokeDashoffset=RING_CIRC*(1-_mobSec/_mobTotal);
}
function mobRenderSessions(){
  const el=document.getElementById('tmsess-mob'); if(!el) return;
  el.innerHTML=Array.from({length:4},(_,i)=>`<div class="tmsd${i<_mobSessions?' dn':''}"></div>`).join('');
}
function mobSetTMode(m){
  mobCancelEdit(); // discard any unsaved edit before switching — prevents mode bleed
  if(_mobRunning){ clearInterval(_mobIv); _mobRunning=false; }
  _mobTMode=m;
  _mobSec=_mobCustomSec[m]; _mobTotal=_mobSec;
  document.querySelectorAll('.tmm').forEach((b,i)=>b.classList.toggle('on',i===m));
  const ring=document.getElementById('timer-ring-wrap');
  if(ring) ring.classList.toggle('editable',!MOB_TMODES[m].locked);
  const lbl=document.getElementById('timer-mode-lbl');
  if(lbl) lbl.textContent=MOB_TMODES[m].l;
  const btn=document.getElementById('tmbtn-mob');
  if(btn){btn.textContent='Start';btn.classList.remove('stop');}
  const hist=document.getElementById('tm-history-mob');
  if(hist) hist.style.display=m===0?'block':'none';
  mobUpdateDisp(); mobRenderSessions();
  if(m===0) pomRenderHistory();
}
function tmInputFmt(e){
  let v = e.target.value.replace(/[^0-9:]/g, '');
  const colons = (v.match(/:/g)||[]).length;
  if(colons > 2) v = v.slice(0, v.lastIndexOf(':'));
  v = v.replace(/^:+/, '');
  v = v.replace(/:{2,}/g, ':');
  e.target.value = v;
}
function mobStartEdit(){
  if(MOB_TMODES[_mobTMode].locked||_mobRunning) return;
  const ring=document.getElementById('timer-ring-wrap');
  const inpEl=document.getElementById('tminputs-mob');
  if(!ring||!inpEl) return;
  // Pre-fill H/M/S from current time
  const h=Math.floor(_mobSec/3600);
  const m=Math.floor((_mobSec%3600)/60);
  const s=_mobSec%60;
  const hrInp=document.getElementById('tminp-hr');
  const minInp=document.getElementById('tminp-min');
  const secInp=document.getElementById('tminp-sec');
  if(hrInp) hrInp.value=h||'';
  if(minInp) minInp.value=m?String(m):'';
  if(secInp) secInp.value=s?String(s):'';
  ring.classList.add('hide');
  inpEl.classList.add('show');
  // Hide start button while editing
  const btn=document.getElementById('tmbtn-mob');if(btn)btn.style.display='none';
  setTimeout(()=>{if(hrInp) hrInp.focus();},50);
}
function mobCancelEdit(){
  document.getElementById('timer-ring-wrap')?.classList.remove('hide');
  document.getElementById('tminputs-mob')?.classList.remove('show');
  const btn=document.getElementById('tmbtn-mob');if(btn)btn.style.display='';
}
function mobConfirmEdit(){
  const h=parseInt(document.getElementById('tminp-hr')?.value)||0;
  const m=parseInt(document.getElementById('tminp-min')?.value)||0;
  const s=parseInt(document.getElementById('tminp-sec')?.value)||0;
  // Roll over: excess seconds into minutes, excess minutes into hours
  let total=h*3600+m*60+s;
  if(total<1){mobCancelEdit();return;}
  // Clamp to 23:59:59
  total=Math.min(total,86399);
  _mobCustomSec[_mobTMode]=total; _mobSec=total; _mobTotal=total;
  mobCancelEdit(); mobUpdateDisp();
}
function mobTimerBtn(){
  if(_mobAlarmActive){ mobStopAlarm(); _mobAlarmActive=false; _mobSec=_mobCustomSec[_mobTMode]; _mobTotal=_mobSec; mobUpdateDisp(); const btn=document.getElementById('tmbtn-mob'); if(btn){btn.textContent='Start';btn.classList.remove('stop');} return; }
  if(_mobRunning){
    clearInterval(_mobIv); _mobRunning=false;
    const btn=document.getElementById('tmbtn-mob'); if(btn){btn.textContent='Start';btn.classList.remove('stop');}
  } else {
    // Custom mode: if time not set, open editor instead of starting
    if(!MOB_TMODES[_mobTMode].locked && _mobSec<=0){
      mobStartEdit();
      return;
    }
    if(_mobSec<=0){ _mobSec=_mobCustomSec[_mobTMode]; _mobTotal=_mobSec; }
    _mobRunning=true;
    _mobIv=setInterval(()=>{
      _mobSec--;
      mobUpdateDisp();
      if(_mobSec<=0){
        clearInterval(_mobIv); _mobRunning=false;
        _mobAlarmActive=true;
        mobPlayAlarm();
        const btn=document.getElementById('tmbtn-mob'); if(btn){btn.textContent='Stop';btn.classList.add('stop');}
        if(_mobTMode===0){
          _mobSessions=(_mobSessions+1)%5;
          mobRenderSessions();
          const d=getD();const p=d.prefs||{};if(!p.pomHistory)p.pomHistory={};
          const k=toDay();p.pomHistory[k]=(p.pomHistory[k]||0)+1;
          d.prefs=p;if(cu)acc[cu]=d;saveAll();
          pomRenderHistory();
        }
        toast('🎉 Session complete!');
      }
    },1000);
    const btn=document.getElementById('tmbtn-mob'); if(btn){btn.textContent='Pause';btn.classList.add('stop');}
  }
}
function mobResetTimer(){
  clearInterval(_mobIv); _mobRunning=false; _mobAlarmActive=false;
  mobStopAlarm();
  _mobSec=_mobCustomSec[_mobTMode]; _mobTotal=_mobSec;
  mobUpdateDisp();
  const btn=document.getElementById('tmbtn-mob'); if(btn){btn.textContent='Start';btn.classList.remove('stop');}
}
function mobPlayAlarm(){
  mobStopAlarm();
  try{
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
    _alarmCtx=new AC(); _alarmCtx.resume();
    const pattern=[880,1100,880,1320]; let step=0;
    const tick=()=>{
      const osc=_alarmCtx.createOscillator(); const g=_alarmCtx.createGain();
      osc.connect(g); g.connect(_alarmCtx.destination);
      osc.frequency.value=pattern[step%pattern.length];
      g.gain.setValueAtTime(0.18,_alarmCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,_alarmCtx.currentTime+0.5);
      osc.start(); osc.stop(_alarmCtx.currentTime+0.5);
      step++;
    };
    tick(); _alarmIv=setInterval(tick,300);
    _alarmTimeout=setTimeout(()=>mobStopAlarm(),30000);
  }catch(e){}
}
function mobStopAlarm(){
  if(_alarmIv){clearInterval(_alarmIv);_alarmIv=null;}
  if(_alarmTimeout){clearTimeout(_alarmTimeout);_alarmTimeout=null;}
  if(_alarmCtx){try{_alarmCtx.close();}catch(e){}_alarmCtx=null;}
}
function pomTodayKey(){ return toDay(); }
function pomGetToday(){ return (getP().pomHistory||{})[pomTodayKey()]||0; }
function pomGetWeek(){
  const h=getP().pomHistory||{}; let total=0;
  for(let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()-i);total+=(h[d.toISOString().slice(0,10)]||0);}
  return total;
}
function pomGetWeekData(){
  const h=getP().pomHistory||{},days=[];
  for(let i=6;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);
    const k=d.toISOString().slice(0,10);
    days.push({label:d.toLocaleDateString('en-US',{weekday:'short'}),count:h[k]||0,today:i===0});
  }
  return days;
}
function pomRenderHistory(){
  const el=document.getElementById('mob-pom-history'); if(!el) return;
  const today=pomGetToday(),week=pomGetWeek(),days=pomGetWeekData();
  const max=Math.max(...days.map(d=>d.count),1);
  el.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <div><div style="font-size:28px;font-weight:800;letter-spacing:-1px;color:var(--ink);line-height:1;">${today}</div><div style="font-size:11px;color:var(--ink3);font-weight:600;margin-top:1px;">today</div></div>
      <div style="text-align:right;"><div style="font-size:28px;font-weight:800;letter-spacing:-1px;color:var(--ink);line-height:1;">${week}</div><div style="font-size:11px;color:var(--ink3);font-weight:600;margin-top:1px;">this week</div></div>
    </div>
    <div style="display:flex;align-items:flex-end;gap:6px;height:52px;">
      ${days.map(d=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
        <div style="width:100%;border-radius:4px;background:var(--a2);opacity:${d.count?1:.18};height:${Math.max(d.count/max*40,d.count?6:4)}px;min-height:${d.count?6:4}px;transition:height .3s;"></div>
        <div style="font-size:9px;font-weight:700;color:${d.today?'var(--a2)':'var(--ink4)'};text-transform:uppercase;">${d.label}</div>
      </div>`).join('')}
    </div>`;
}
// init on load
mobUpdateDisp(); mobRenderSessions();

// ══════════════════════════════════════════════
// CALENDAR
// ══════════════════════════════════════════════
let calOff=0;
let _mobCalOff=0;

function mobCalShift(d){ _mobCalOff+=d; renderSchedule(); }

function mobCalRender(){
  const now=new Date();
  const base=new Date(now.getFullYear(), now.getMonth()+_mobCalOff, 1);
  const yr=base.getFullYear(), mo=base.getMonth();
  const lbl=document.getElementById('mob-cal-month-lbl');
  const monthStr=base.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  if(lbl) lbl.innerHTML=monthStr+' <svg viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:10px;height:6px;flex-shrink:0;"><path d="M1 1l4 4 4-4"/></svg>';
  const firstDay=new Date(yr,mo,1).getDay();
  const dim=new Date(yr,mo+1,0).getDate();
  const today=toDay();
  const allEvs=getCalEvs();
  // Match events: exact date OR yearly events matching MM-DD
  const evDates={};
  allEvs.forEach(e=>{
    if(!e.date) return;
    const key=e.yearly ? `${yr}-${e.date.slice(5)}` : e.date;
    (evDates[key]=evDates[key]||[]).push(e.color||'var(--a2)');
  });
  let html='';
  for(let i=0;i<firstDay;i++) html+=`<div class="mob-cal-cell empty"></div>`;
  for(let d=1;d<=dim;d++){
    const ds=`${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday=ds===today;
    const colors=evDates[ds]||[];
    html+=`<div class="mob-cal-cell${isToday?' today':''}" onclick="mobCalDayClick('${ds}')">
      <div class="mob-cal-num${isToday?' today':''}">${d}</div>
      <div class="mob-cal-dot-row">${colors.slice(0,3).map(c=>`<div class="mob-cal-dot" style="background:${c}"></div>`).join('')}</div>
    </div>`;
  }
  const grid=document.getElementById('mob-cal-days');
  if(grid) grid.innerHTML=html;
}

function mobYearPickerToggle(){
  const pop=document.getElementById('mob-year-picker');
  if(!pop) return;
  if(pop.style.display!=='none'){ pop.style.display='none'; return; }
  const now=new Date();
  const curYr=new Date(now.getFullYear(), now.getMonth()+_mobCalOff, 1).getFullYear();
  const thisYr=now.getFullYear();
  // Only current year and future years (no past years)
  const years=Array.from({length:6},(_,i)=>thisYr+i);
  pop.innerHTML=years.map(y=>`
    <button onclick="mobYearPickerSelect(${y})"
      style="display:block;width:100%;padding:8px 16px;background:${y===curYr?'var(--a2)':'none'};color:${y===curYr?'#fff':'var(--ink)'};border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;text-align:left;display:flex;align-items:center;justify-content:space-between;transition:background .15s;">
      <span>${y}</span>
      ${y===thisYr?`<span style="font-size:10px;font-weight:700;color:${y===curYr?'rgba(255,255,255,.65)':'var(--ink4)'};letter-spacing:.3px;">THIS YEAR</span>`:''}
    </button>`).join('');
  pop.style.display='block';
  setTimeout(()=>document.addEventListener('click', function _close(e){
    if(!pop.contains(e.target)&&!document.getElementById('mob-cal-month-lbl').contains(e.target)){
      pop.style.display='none'; document.removeEventListener('click',_close);
    }
  }),50);
}

function mobYearPickerSelect(yr){
  const now=new Date();
  const curBase=new Date(now.getFullYear(), now.getMonth()+_mobCalOff, 1);
  const targetDate=new Date(yr, curBase.getMonth(), 1);
  _mobCalOff=(targetDate.getFullYear()-now.getFullYear())*12+(targetDate.getMonth()-now.getMonth());
  document.getElementById('mob-year-picker').style.display='none';
  mobCalRender();
  renderSchedule();
}

function mobCalDayClick(ds){
  _evSelDate=ds;
  const d=new Date(ds+'T12:00:00');
  const dateLabel=d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  // Check if there are events on this day
  const dayEvs=getCalEvs().filter(e=>e.date===ds);
  if(dayEvs.length){
    // Show a quick picker: list events with edit option + add new
    const sheet=document.getElementById('sh-event');
    document.getElementById('sh-event-title').textContent='Events on '+dateLabel;
    // Populate with events for this day + add new option
    // For now just open add sheet pre-filled with date
  }
  // Open add event sheet with date pre-selected
  openEvSheet(null, ds);
}

function renderSchedule(){
  const page=document.getElementById('sch-page');
  if(!page) return;
  mobCalRender();
  const today=toDay();
  // Show all events for the current viewed month
  const now=new Date();
  const base=new Date(now.getFullYear(), now.getMonth()+_mobCalOff, 1);
  const yr=base.getFullYear(), mo=base.getMonth();
  const monthStart=`${yr}-${String(mo+1).padStart(2,'0')}-01`;
  const monthEnd=`${yr}-${String(mo+1).padStart(2,'0')}-${String(new Date(yr,mo+1,0).getDate()).padStart(2,'0')}`;
  const allEvs=getCalEvs().sort((a,b)=>a.date>b.date?1:a.date<b.date?-1:0);
  const mmStart=monthStart.slice(5), mmEnd=monthEnd.slice(5);
  const monthEvs=allEvs.filter(e=>{
    if(e.yearly){ const mm=e.date.slice(5); return mm>=mmStart&&mm<=mmEnd; }
    return e.date>=monthStart&&e.date<=monthEnd;
  }).map(e=>e.yearly?{...e,date:`${yr}-${e.date.slice(5)}`}:e)
    .sort((a,b)=>a.date>b.date?1:a.date<b.date?-1:0);

  if(!monthEvs.length){
    page.innerHTML=`<div class="mob-es" style="padding:28px 0 12px;"><div class="mob-es-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 9h18M8 2v3M16 2v3"/></svg></div><div class="mob-es-title">No events this month</div><div class="mob-es-sub">Tap any day to add an event</div></div>`;
    return;
  }

  let html='';
  monthEvs.forEach(ev=>{
    const isToday=ev.date===today;
    const d=new Date(ev.date+'T12:00:00');
    const dayNum=d.getDate();
    const dayName=d.toLocaleDateString('en-US',{weekday:'short'});
    const monthLbl=d.toLocaleDateString('en-US',{month:'short'});
    html+=`<div class="sev${isToday?' sev-today':''}">
      <div class="sev-date-col">
        <div class="sev-day-num${isToday?' today':''}">${dayNum}</div>
        <div class="sev-day-name">${isToday?'Today':dayName}</div>
      </div>
      <div class="sev-bar" style="background:${ev.color||'var(--a2)'}"></div>
      <div class="sev-body" style="flex:1;min-width:0;">
        <div class="sev-title">${esc(ev.title)}${ev.yearly?'<span style="font-size:10px;margin-left:5px;">📌</span>':''}</div>
        ${ev.timeStart?`<div class="sev-time">${fmtTime(ev.timeStart)}${ev.timeEnd?' – '+fmtTime(ev.timeEnd):''}</div>`:''}
      </div>
      <button class="sev-del" onclick="mobDelEvent('${ev.id}')">✕</button>
    </div>`;
  });
  page.innerHTML=html;
}

function mobDelEvent(id){
  appConfirm('Delete this event?','This cannot be undone.').then(ok=>{
    if(!ok) return;
    const d=getD(); d.calEvs=(d.calEvs||[]).filter(e=>String(e.id)!==String(id));
    if(cu) acc[cu]=d; saveAll(); renderSchedule(); renderHome();
    // Refresh the day events list in the sheet
    const ds=_evSelDate;
    if(ds){
      const dayEvs=(getD().calEvs||[]).filter(e=>(e.date||'').slice(5)===ds.slice(5)&&String(e.id)!==String(id));
      const dayWrap=document.getElementById('mob-ev-day-events');
      const dayList=document.getElementById('mob-ev-day-list');
      if(dayWrap&&dayList){
        if(!dayEvs.length){ dayWrap.style.display='none'; return; }
        dayList.innerHTML=dayEvs.map(e=>`
          <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--surf2);border-radius:10px;margin-bottom:6px;">
            <div style="width:10px;height:10px;border-radius:50%;background:${e.color||'var(--a2)'};flex-shrink:0;"></div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:600;color:var(--ink);">${esc(e.title)}</div>
              ${e.timeStart?`<div style="font-size:11px;color:var(--ink3);">${fmtTime(e.timeStart)}${e.timeEnd?' – '+fmtTime(e.timeEnd):''}</div>`:''}
            </div>
            <button onclick="closeSheets();setTimeout(()=>openEvSheet('${e.id}','${ds}'),120);" style="font-size:11px;font-weight:700;color:var(--a2);background:none;border:none;cursor:pointer;">Edit</button>
            <button onclick="mobDelEvent('${e.id}')" style="font-size:11px;font-weight:700;color:var(--red);background:none;border:none;cursor:pointer;">Del</button>
          </div>`).join('');
      }
    }
  });
}

function fmtTime(t){ if(!t) return ''; const [h,m]=t.split(':').map(Number); const ampm=h>=12?'PM':'AM'; const h12=h%12||12; return `${h12}:${String(m).padStart(2,'0')} ${ampm}`; }

function deleteEvent(id){
  appConfirm('Delete this event?','This cannot be undone.').then(ok=>{
    if(!ok) return;
    const d=getD(); d.calEvs=(d.calEvs||[]).filter(e=>String(e.id)!==String(id));
    if(cu) acc[cu]=d; saveAll(); renderSchedule(); renderHome();
  });
}

// ── custom date picker state ──
let _evCalOff=0, _evSelDate=toDay(), _evTimeMode=null, _evTimeStart=null, _evTimeEnd=null, _evEditId=null, _evYearly=false;

function openEvSheet(editId, preDate){
  _evEditId=editId||null;
  _evSelDate=preDate||toDay();
  _evTimeStart=null; _evTimeEnd=null; _evTimeMode=null; _evYearly=false; _mobEvSetYearly(false);

  const ds=_evSelDate;
  const dateLabel=new Date(ds+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
  const titleEl=document.getElementById('sh-event-title');
  const dateLblEl=document.getElementById('mob-ev-date-lbl');
  const inpEl=document.getElementById('ev-inp');

  if(editId){
    // Edit mode: pre-fill with existing event
    const ev=getCalEvs().find(e=>String(e.id)===String(editId));
    if(titleEl) titleEl.textContent='Edit Event';
    if(inpEl) inpEl.value=ev?ev.title:'';
    // pre-fill time
    _evTimeStart=ev?.timeStart||null; _evTimeEnd=ev?.timeEnd||null;
    const tsb=document.getElementById('mob-ev-time-start');if(tsb){tsb.textContent=ev?.timeStart?fmtTime(ev.timeStart):'— Start';tsb.classList.toggle('filled',!!ev?.timeStart);}
    const teb=document.getElementById('mob-ev-time-end');if(teb){teb.textContent=ev?.timeEnd?fmtTime(ev.timeEnd):'— End';teb.classList.toggle('filled',!!ev?.timeEnd);}
    const clr=document.getElementById('mob-ev-time-clear');if(clr)clr.style.display=(ev?.timeStart||ev?.timeEnd)?'':'none';
    const tp=document.getElementById('mob-ev-timepick');if(tp)tp.style.display='none';
    // set matching color swatch
    const col=ev?ev.color:'#3A7D5E';
    document.querySelectorAll('.ev-cswatch').forEach(s=>s.classList.toggle('active',s.dataset.color===col));
  } else {
    if(titleEl) titleEl.textContent='Add Event';
    if(inpEl) inpEl.value='';
    _evTimeStart=null; _evTimeEnd=null;
    const tsI=document.getElementById('mob-ev-time-start');if(tsI){tsI.textContent='— Start';tsI.classList.remove('filled');}
    const teI=document.getElementById('mob-ev-time-end');if(teI){teI.textContent='— End';teI.classList.remove('filled');}
    const clrI=document.getElementById('mob-ev-time-clear');if(clrI)clrI.style.display='none';
    const tpI=document.getElementById('mob-ev-timepick');if(tpI)tpI.style.display='none';
    document.querySelectorAll('.ev-cswatch').forEach((s,i)=>s.classList.toggle('active',i===0));
  }

  // Show selected date
  if(dateLblEl) dateLblEl.textContent=dateLabel;

  // Show existing events on this day
  const dayEvs=getCalEvs().filter(e=>e.date===ds&&String(e.id)!==String(editId||''));
  const dayWrap=document.getElementById('mob-ev-day-events');
  const dayList=document.getElementById('mob-ev-day-list');
  if(dayWrap&&dayList){
    if(dayEvs.length){
      dayList.innerHTML=dayEvs.map(e=>`
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--bdr);">
          <div style="width:10px;height:10px;border-radius:50%;background:${e.color||'var(--a2)'};flex-shrink:0;"></div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:600;color:var(--ink);">${esc(e.title)}</div>
            ${e.timeStart?`<div style="font-size:11px;color:var(--ink3);">${fmtTime(e.timeStart)}${e.timeEnd?' – '+fmtTime(e.timeEnd):''}</div>`:''}
          </div>
          <button onclick="closeSheets();setTimeout(()=>openEvSheet('${e.id}','${ds}'),120);" style="font-size:11px;font-weight:700;color:var(--a2);background:none;border:none;cursor:pointer;">Edit</button>
          <button onclick="mobDelEvent('${e.id}')" style="font-size:11px;font-weight:700;color:var(--red);background:none;border:none;cursor:pointer;">Del</button>
        </div>`).join('');
      dayWrap.style.display='';
    } else {
      dayWrap.style.display='none';
    }
  }

  openSheet('sh-event');
  setTimeout(()=>{ if(inpEl) inpEl.focus(); },300);
}
function evCalShift(d){ _evCalOff+=d; evCalRender(); }
function evCalRender(){
  const base=new Date(); base.setDate(1); base.setMonth(base.getMonth()+_evCalOff);
  const yr=base.getFullYear(), mo=base.getMonth();
  document.getElementById('ev-cal-month').textContent=base.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const firstDay=new Date(yr,mo,1).getDay();
  const dim=new Date(yr,mo+1,0).getDate();
  const today=toDay();
  let html='';
  for(let i=0;i<firstDay;i++) html+=`<div class="ev-cal-day empty"></div>`;
  for(let d=1;d<=dim;d++){
    const ds=`${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isSel=ds===_evSelDate, isToday=ds===today;
    html+=`<div class="ev-cal-day${isSel?' sel':isToday?' today':''}" onclick="evCalPick('${ds}')">${d}</div>`;
  }
  document.getElementById('ev-cal-grid').innerHTML=html;
}
function evCalPick(ds){
  _evSelDate=ds;
  evCalRender();
  // Reset time when date changes
  _evTimeStart=null; _evTimeEnd=null;
  const ts=document.getElementById('mob-ev-time-start');if(ts){ts.textContent='— Start';ts.classList.remove('filled');}
  const te=document.getElementById('mob-ev-time-end');if(te){te.textContent='— End';te.classList.remove('filled');}
  const clr=document.getElementById('mob-ev-time-clear');if(clr)clr.style.display='none';
  const tp=document.getElementById('mob-ev-timepick');if(tp)tp.style.display='none';
}

function _mobParseTime(val){
  val=(val||'').trim();
  if(!val) return null;
  const isPM=/p/i.test(val); const isAM=/a/i.test(val);
  const nums=val.replace(/[^0-9:]/g,'');
  let h,m;
  if(nums.includes(':')){[h,m]=nums.split(':').map(Number);}
  else if(nums.length<=2){h=Number(nums);m=0;}
  else if(nums.length===3){h=Number(nums[0]);m=Number(nums.slice(1));}
  else{h=Number(nums.slice(0,2));m=Number(nums.slice(2,4));}
  if(isNaN(h)||isNaN(m)) return null;
  if(isPM&&h<12) h+=12;
  if(isAM&&h===12) h=0;
  if(h>23||m>59) return null;
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
}
function mobEtpFormatInput(el){
  el.value=el.value.replace(/[^0-9apmAPM: :]/g,'');
}
function evTimeOpen(mode){
  _evTimeMode=mode;
  document.getElementById('mob-ev-timepick-label').textContent=mode==='start'?'Start time':'End time';
  document.getElementById('mob-ev-timepick').style.display='block';
  const existing=mode==='start'?_evTimeStart:_evTimeEnd;
  const inp=document.getElementById('mob-etp-time-inp');
  if(inp){
    inp.value=existing?fmtTime(existing):'';
    setTimeout(()=>{inp.focus();inp.select();},50);
  }
}
function evTimeDone(){
  const inp=document.getElementById('mob-etp-time-inp');
  const timeStr=inp?_mobParseTime(inp.value):null;
  if(!timeStr&&inp&&inp.value.trim()){
    inp.style.borderColor='#dc2626';
    setTimeout(()=>inp.style.borderColor='var(--bdr)',1200);
    return;
  }
  // Prevent end time before or equal to start
  if(_evTimeMode==='end' && _evTimeStart && timeStr<=_evTimeStart){
    const lbl=document.getElementById('mob-ev-timepick-label');
    if(lbl){lbl.textContent='End must be after start';lbl.style.color='#dc2626';}
    setTimeout(()=>{if(lbl){lbl.textContent='End time';lbl.style.color='';}},1500);
    return;
  }
  if(_evTimeMode==='start'){
    _evTimeStart=timeStr;
    // Clear end if now invalid
    if(_evTimeEnd && _evTimeEnd<=timeStr){
      _evTimeEnd=null;
      const eel=document.getElementById('mob-ev-time-end');
      if(eel){eel.textContent='— End';eel.classList.remove('filled');}
    }
    const el=document.getElementById('mob-ev-time-start');
    if(el){el.textContent=fmtTime(timeStr);el.classList.add('filled');}
  } else {
    _evTimeEnd=timeStr;
    const el=document.getElementById('mob-ev-time-end');
    if(el){el.textContent=fmtTime(timeStr);el.classList.add('filled');}
  }
  document.getElementById('mob-ev-timepick').style.display='none';
  document.getElementById('mob-ev-time-clear').style.display=(_evTimeStart||_evTimeEnd)?'':'none';
}
function evTimeClear(){ _evTimeStart=null; _evTimeEnd=null; const ts=document.getElementById('mob-ev-time-start');if(ts){ts.textContent='— Start';ts.classList.remove('filled');} const te=document.getElementById('mob-ev-time-end');if(te){te.textContent='— End';te.classList.remove('filled');} const clr=document.getElementById('mob-ev-time-clear');if(clr)clr.style.display='none'; const tp=document.getElementById('mob-ev-timepick');if(tp)tp.style.display='none'; }
function _mobEvSetYearly(on){
  const btn=document.getElementById('mob-ev-yearly-btn');
  const knob=document.getElementById('mob-ev-yearly-knob');
  if(btn) btn.style.background=on?'var(--a2)':'var(--bdr)';
  if(knob) knob.style.transform=on?'translateX(18px)':'translateX(0)';
}
function mobEvToggleYearly(){
  _evYearly=!_evYearly;
  _mobEvSetYearly(_evYearly);
}


function evPickColor(btn){ document.querySelectorAll('.ev-cswatch').forEach(s=>s.classList.remove('active')); btn.classList.add('active'); }

function saveEvent(){
  const title=document.getElementById('ev-inp').value.trim(); if(!title) return;
  const color=document.querySelector('.ev-cswatch.active')?.dataset.color||'#3A7D5E';
  const ev={id:_evEditId||uid(),title,date:_evSelDate,color,timeStart:_evTimeStart||null,timeEnd:_evTimeEnd||null,yearly:_evYearly||false};
  const d=getD(); d.calEvs=d.calEvs||[];
  if(_evEditId) d.calEvs=d.calEvs.map(e=>e.id===_evEditId?ev:e);
  else d.calEvs.push(ev);
  if(cu) acc[cu]=d; saveAll(); renderSchedule(); renderHome(); closeSheets();
  toast(_evEditId?'Event updated!':'Event added!');
}
function shiftMonth(x){ calOff+=x; renderSchedule(); }

// ══════════════════════════════════════════════
// SHEET / PILL HELPERS
// ══════════════════════════════════════════════
function openSheet(id){
  const overlay = document.getElementById('sh-overlay');
  const sheet   = document.getElementById(id);
  if(overlay) overlay.classList.add('open');
  if(sheet)   sheet.classList.add('open');
  if(id==='sh-about'){
    const nameEl = document.getElementById('mob-about-name');
    const unEl   = document.getElementById('mob-about-username');
    if(nameEl) nameEl.textContent = 'David N.';
    if(unEl)   unEl.textContent   = 'Creator of Prodify';
  }
}
function closeSheets(){ document.getElementById('sh-overlay').classList.remove('open'); document.querySelectorAll('.sheet').forEach(s=>s.classList.remove('open')); }
function selPill(el,gid){ document.getElementById(gid).querySelectorAll('.pill').forEach(p=>p.classList.remove('active')); el.classList.add('active'); }
function getActivePill(gid){ return document.querySelector(`#${gid} .pill.active`)?.dataset.v||null; }
function selEmoji(btn){ document.querySelectorAll('.emoji-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); }

// ══════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function fmtDate(iso,short=false){ try{ const d=new Date(iso); if(isNaN(d)) return iso||''; return short?d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}):d.toLocaleDateString('en-US',{month:'short',day:'numeric'}); }catch(e){return iso||'';} }
let _toastTm;
function toast(msg){ const el=document.getElementById('toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(_toastTm); _toastTm=setTimeout(()=>el.classList.remove('show'),2000); }

function renderAll(){ renderHome(); renderTasks(); renderJournalList(); renderHabitsList(); renderSchedule(); renderNotesList(); }

// ══════════════════════════════════════════════
// NOTES PAGE
// ══════════════════════════════════════════════
let _notesView = 'list';
let _notesOpenId = null;
let _notesSaveTimer = null;
let _notesSearchQ = '';
let _notesSortMode = 'updated'; // 'updated' | 'title'

function renderNotesList(){
  const list = document.getElementById('mob-notes-list');
  if(!list) return;
  const allNotes = getNotes();
  const sorted = allNotes.slice().sort((a,b)=>{
    if(_notesSortMode === 'title'){
      const ta=(a.title||'').toLowerCase(), tb=(b.title||'').toLowerCase();
      if(!ta && tb) return 1; if(ta && !tb) return -1;
      return ta.localeCompare(tb);
    }
    return (b.updated||0)-(a.updated||0);
  });
  const q = _notesSearchQ.toLowerCase().trim();
  const filtered = q ? sorted.filter(n=>
    (n.title||'').toLowerCase().includes(q) ||
    (n.content||'').toLowerCase().includes(q)
  ) : sorted;
  const cl = document.getElementById('notes-search-clear');
  if(cl) cl.style.display = q ? 'flex' : 'none';
  const sortBtn = document.getElementById('notes-sort-btn');
  if(sortBtn) sortBtn.classList.toggle('active', _notesSortMode === 'title');

  if(!allNotes.length){
    list.innerHTML=`<div class="mob-es">
      <div class="mob-es-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8l4-4V4a2 2 0 0 0-2-2z"/><path d="M14 2v4h4M8 13h8M8 9h8M8 17h5"/></svg></div>
      <div class="mob-es-title">No notes yet</div>
      <div class="mob-es-sub">Tap + to write your first note</div>
    </div>`;
    return;
  }
  const hl = txt => q ? txt.replace(new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<mark style="background:var(--al);color:var(--a2);border-radius:2px;padding:0 1px;">$1</mark>') : txt;
  const hdr = `<div class="notes-list-meta"><span>${filtered.length} of ${allNotes.length} note${allNotes.length!==1?'s':''}</span></div>`;
  if(!filtered.length){
    list.innerHTML = hdr + `<div class="mob-es"><div class="mob-es-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8l4-4V4a2 2 0 0 0-2-2z"/><path d="M14 2v4h4M8 13h8M8 9h8M8 17h5"/></svg></div><div class="mob-es-title">No results</div><div class="mob-es-sub">Try a different search.</div></div>`;
    return;
  }
  list.innerHTML = hdr + filtered.map(n=>{
    const preview = (n.content||'').split('\n').find(l=>l.trim()) || '';
    const d = n.updated ? new Date(n.updated) : new Date();
    const dateStr = d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
    const titleHtml = hl(esc(n.title)) || '<span style="color:var(--ink4);font-style:italic;">Untitled</span>';
    const previewHtml = preview ? hl(esc(preview.slice(0,100))) : '';
    return `<div class="mob-note-card" onclick="openNote('${n.id}')">
      <div class="mob-note-card-head">
        <div class="mob-note-card-title">${titleHtml}</div>
        <div class="mob-note-card-date">${dateStr}</div>
      </div>
      ${previewHtml ? `<div class="mob-note-card-preview">${previewHtml}</div>` : ''}
    </div>`;
  }).join('');
}

function notesToggleSearch(){
  const bar = document.getElementById('notes-search-bar');
  const inp = document.getElementById('notes-search-inp');
  const btn = document.getElementById('notes-search-btn');
  const open = bar.style.display !== 'none';
  bar.style.display = open ? 'none' : 'block';
  btn.classList.toggle('active', !open);
  if(!open){ setTimeout(()=>inp&&inp.focus(), 50); }
  else { notesClearSearch(); }
}

function notesSearch(val){
  _notesSearchQ = val;
  renderNotesList();
}

function notesClearSearch(){
  _notesSearchQ = '';
  const inp = document.getElementById('notes-search-inp');
  const cl = document.getElementById('notes-search-clear');
  if(inp) inp.value = '';
  if(cl) cl.style.display = 'none';
  renderNotesList();
}

function notesToggleSort(){
  _notesSortMode = _notesSortMode === 'updated' ? 'title' : 'updated';
  renderNotesList();
}

function openNote(id){
  const notesFab=document.getElementById('notes-fab');
  if(notesFab) notesFab.style.display='none';
  const notes = getNotes();
  const note = notes.find(n=>n.id===id);
  if(!note) return;
  _notesOpenId = id;
  _notesView = 'editor';
  const listView = document.getElementById('mob-notes-list-view');
  const editorView = document.getElementById('mob-notes-editor-view');
  if(listView) listView.style.display='none';
  if(editorView) editorView.style.display='flex';
  const titleInp = document.getElementById('mob-note-title-inp');
  const contentTa = document.getElementById('mob-note-content-ta');
  if(titleInp) titleInp.value = note.title || '';
  if(contentTa) contentTa.value = note.content || '';
  const hdrTitle = document.getElementById('mob-note-editor-hdr');
  if(hdrTitle) hdrTitle.textContent = note.title || 'Untitled';
}

function notesBack(){
  // Flush any pending debounced save before navigating away
  if(_notesOpenId){
    clearTimeout(_notesSaveTimer);
    const titleInp = document.getElementById('mob-note-title-inp');
    const contentTa = document.getElementById('mob-note-content-ta');
    const title = titleInp ? titleInp.value : '';
    const content = contentTa ? contentTa.value : '';
    const notes = getNotes();
    const n = notes.find(x=>x.id===_notesOpenId);
    if(n){
      n.title = title;
      n.content = content;
      n.updated = Date.now();
      saveNotes(notes);
    }
  }
  _notesView = 'list';
  _notesOpenId = null;
  const listView = document.getElementById('mob-notes-list-view');
  const editorView = document.getElementById('mob-notes-editor-view');
  if(listView) listView.style.display='flex';
  if(editorView) editorView.style.display='none';
  const notesFab=document.getElementById('notes-fab');
  if(notesFab) notesFab.style.display='flex';
  renderNotesList();
}

function mobNewNote(){ notesNew(); }
function notesNew(){
  
  const notes = getNotes();
  const n = {id:'n'+Date.now().toString(36)+Math.random().toString(36).slice(2,5), title:'', content:'', updated:Date.now()};
  notes.unshift(n);
  saveNotes(notes);
  openNote(n.id);
  setTimeout(()=>{ const t=document.getElementById('mob-note-title-inp'); if(t) t.focus(); },100);
}

function noteEditorInput(){
  if(window._guestMode) return;
  if(!_notesOpenId) return;
  const titleInp = document.getElementById('mob-note-title-inp');
  const contentTa = document.getElementById('mob-note-content-ta');
  const title = titleInp ? titleInp.value : '';
  const content = contentTa ? contentTa.value : '';
  const hdrTitle = document.getElementById('mob-note-editor-hdr');
  if(hdrTitle) hdrTitle.textContent = title || 'Untitled';
  clearTimeout(_notesSaveTimer);
  _notesSaveTimer = setTimeout(()=>{
    const notes = getNotes();
    const n = notes.find(x=>x.id===_notesOpenId);
    if(!n) return;
    n.title = title;
    n.content = content;
    n.updated = Date.now();
    saveNotes(notes);
  }, 400);
}

async function deleteNote(){
  if(!_notesOpenId) return;
  const ok = await appConfirm('Delete this note?','This cannot be undone.');
  if(!ok) return;
  const notes = getNotes().filter(n=>n.id!==_notesOpenId);
  saveNotes(notes);
  notesBack();
}

// ══════════════════════════════════════════════
// FEEDBACK
// ══════════════════════════════════════════════
let _fbStar = 0;
function fbRate(n) {
  _fbStar = n;
  const container = document.getElementById('fb-stars');
  if (!container) return;
  container.querySelectorAll('.fbs').forEach(s => {
    const v = parseInt(s.dataset.v);
    if (v <= n) {
      s.setAttribute('fill', '#F5B800');
      s.setAttribute('stroke', '#F5B800');
    } else {
      s.setAttribute('fill', 'var(--bdr)');
      s.setAttribute('stroke', 'var(--ink4)');
    }
  });
}
async function submitFeedback(isDesktop) {
  const msg = (document.getElementById('fb-msg') || {}).value?.trim();
  if (!msg) { toast('Please write a message first'); return; }
  const btn = document.getElementById('fb-submit');
  const succEl = document.getElementById('fb-success');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
  try {
    const feedbackHtml = _emailHtmlWrap(`<h2 style="font-size:18px;font-weight:800;color:#1A1714;margin:0 0 16px;">New Feedback</h2><div style="background:#F5F3EF;border-radius:12px;padding:16px;margin-bottom:12px;"><div style="font-size:12px;font-weight:700;color:#9C978F;margin-bottom:6px;">FROM</div><div style="font-size:14px;color:#1A1714;">${cu||'anonymous'}</div></div><div style="background:#F5F3EF;border-radius:12px;padding:16px;margin-bottom:12px;"><div style="font-size:12px;font-weight:700;color:#9C978F;margin-bottom:6px;">RATING</div><div style="font-size:14px;color:#1A1714;">${_fbStar?'⭐'.repeat(_fbStar):'No rating'}</div></div><div style="background:#F5F3EF;border-radius:12px;padding:16px;"><div style="font-size:12px;font-weight:700;color:#9C978F;margin-bottom:6px;">MESSAGE</div><div style="font-size:14px;color:#1A1714;line-height:1.6;">${msg}</div></div>`);
    await resendEmail(RESEND_REPLY, 'Prodify Feedback (mobile)', feedbackHtml);
    if (sbReady) {
      await sb.from('feedback').insert({
        username: cu || null,
        type: 'general',
        rating: _fbStar || null,
        message: msg
      });
    }
    if (succEl) succEl.style.display = 'block';
    if (document.getElementById('fb-msg')) document.getElementById('fb-msg').value = '';
    _fbStar = 0;
    const container = document.getElementById('fb-stars');
    if (container) container.querySelectorAll('.fbs').forEach(s => {
      s.setAttribute('fill', 'var(--bdr)');
      s.setAttribute('stroke', 'var(--ink4)');
    });
    setTimeout(() => {
      if (succEl) succEl.style.display = 'none';
      closeSheets();
    }, 2500);
  } catch (e) {
    toast('Failed to send. Please try again.');
    console.warn('[Prodify] Feedback error:', e);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Send Feedback'; }
  }
}

// ══════════════════════════════════════════════
// PRO SYSTEM
// ══════════════════════════════════════════════
function isPro(){ return !!(getP().pro); }

const FREE_ACCENTS = ['green','blue','purple'];
const ACCENT_MAP = {
  green: ['#2A5C44','#3A7D5E','#EBF4EF'],
  blue:  ['#1E4A7C','#2563EB','#EBF0FF'],
  purple:['#4A2C6E','#7C3AED','#F0EBFF'],
  rose:  ['#7C1D2C','#E11D48','#FDEDEF'],
  amber: ['#7A4A00','#D97706','#FEF3C7'],
  teal:  ['#0F4C4C','#0D9488','#CCFBF1'],
};

function setAccentGuarded(k){
  if(!FREE_ACCENTS.includes(k) && !isPro()){ showUpgradeModal('Custom Accent Color'); return; }
  setAccent(k);
}

const FEAT_DESCS = {
  'Custom Accent Color':'Make Prodify yours with any color, including custom hex codes.',
  'Unlimited Habits':'Track as many habits as you want. No cap, no compromise.',
  'AI Daily Planner':'Tell Prodify your tasks and energy — get a prioritized plan in seconds.',
  'CSV Export':'Export tasks and journal as a spreadsheet ready for any tool.',
  'PDF Export':'Download a beautifully formatted productivity report.',
  'Cloud Backup History':'Restore from any of the last 7 daily snapshots.',
};

let _waitlistChecked=false, _onWaitlist=false, _waitlistPos=null;

function showUpgradeModal(featureName){
  // In guest mode, redirect to sign-in instead of upgrade
  if(window._guestMode){
    const sheet = document.getElementById('sh-guest-gate');
    const overlay = document.getElementById('sh-overlay');
    const titleEl = sheet && sheet.querySelector('div[style*="font-size:18px"]');
    const bodyEl = sheet && sheet.querySelectorAll('div[style*="font-size:13px"]')[0];
    if(titleEl) titleEl.textContent = 'Sign in to unlock this';
    if(bodyEl) bodyEl.textContent = 'This is a Pro feature. Create a free account first, then upgrade whenever you\'re ready.';
    if(sheet) sheet.classList.add('open');
    if(overlay) overlay.classList.add('open');
    return;
  }
  const sub = document.getElementById('mo-upgrade-sub');
  if(sub){
    const desc = featureName && FEAT_DESCS[featureName];
    sub.textContent = desc ? desc : featureName ? featureName+' is a Pro feature.' : 'Unlock everything. Stay in flow.';
  }
  // Highlight matching feat
  document.querySelectorAll('.upg-feat').forEach(el=>{
    const lbl=el.querySelector('.upg-feat-label');
    const match=lbl&&featureName&&lbl.textContent.toLowerCase().includes(featureName.toLowerCase().split(' ')[0]);
    el.style.background=match?'var(--al)':'';
    el.style.borderColor=match?'var(--a2)':'';
  });
  _syncMobUpgradeUI();
  document.getElementById('upg-overlay').classList.add('open');
  document.getElementById('mo-upgrade').classList.add('open');
  // Sync pro status in background
  checkWaitlist();
}
function closeUpgrade(){
  document.getElementById('upg-overlay').classList.remove('open');
  document.getElementById('mo-upgrade').classList.remove('open');
  // Restore device block screen if it was hidden to show upgrade
  const block = document.getElementById('mob-multidevice-block');
  if(block && block.style.display === 'none') block.style.display = '';
}
function _syncMobUpgradeUI(){
  const checkoutEl=document.getElementById('mob-upg-checkout');
  const managedEl=document.getElementById('mob-upg-managed');
  if(!checkoutEl||!managedEl) return;
  if(isPro()){
    checkoutEl.style.display='none';
    managedEl.style.display='block';
  } else {
    checkoutEl.style.display='block';
    managedEl.style.display='none';
  }
}
async function checkWaitlist(){
  if(!sbReady||!cu) return;
  try{
    const {data:row}=await sb.from('users').select('is_pro').eq('username',cu).maybeSingle();
    if(!row) return;
    const p=getP();
    const serverPro=!!(row.is_pro);
    if(serverPro !== !!(p.pro)){
      p.pro=serverPro;
      if(cu){ acc[cu].prefs=p; saveAll(); }
      _syncMobUpgradeUI();
      if(typeof renderSettingsPage==="function") renderSettingsPage();
    }
    // Handle ?pro=1 redirect after checkout
    if(new URLSearchParams(window.location.search).get('pro')=='1'){
      window.history.replaceState({},'',window.location.pathname);
      if(serverPro){ toast('✦ Welcome to Pro! All features unlocked.'); showMobileConfetti(); }
    renderMobileProBadge();
    }
  }catch(e){}
}
function _syncWaitlistUI(){
  // Legacy stub — mobile upgrade modal now uses _syncMobUpgradeUI
  _syncMobUpgradeUI();
}
async function joinWaitlist(){
  const errEl=document.getElementById('mob-upg-waitlist-err');
  const btn=document.getElementById('mob-upg-join-btn');
  if(errEl) errEl.style.display='none';
  if(btn){btn.textContent='Joining…';btn.disabled=true;}
  try{
    if(!sbReady) throw new Error('offline');
    if(!cu) throw new Error('not_logged_in');
    const {data:user}=await sb.from('users').select('email').eq('username',cu).maybeSingle();
    const email=user?.email||''; if(!email) throw new Error('no_email');
    const {data:existing}=await sb.from('waitlist').select('id,position').eq('email',email).maybeSingle();
    if(existing){_onWaitlist=true;_waitlistPos=existing.position;if(btn){btn.textContent='Join the waitlist';btn.disabled=false;}_syncWaitlistUI();return;}
    const {data:inserted,error}=await sb.from('waitlist').insert({email,username:cu,joined_at:new Date().toISOString()}).select('id,position').single();
    if(error&&error.code==='23505'){const {data:rw}=await sb.from('waitlist').select('id,position').eq('email',email).maybeSingle();if(rw){_onWaitlist=true;_waitlistPos=rw.position;if(btn){btn.textContent='Join the waitlist';btn.disabled=false;}_syncWaitlistUI();return;}}
    if(error) throw error;
    _onWaitlist=true;_waitlistPos=inserted?.position||null;
    if(btn){btn.textContent='Join the waitlist';btn.disabled=false;}
    _syncWaitlistUI();
  }catch(e){
    if(btn){btn.textContent='Join the waitlist';btn.disabled=false;}
    const msg=e.message==='offline'?'No connection. Try again.':e.message==='not_logged_in'?'Sign in first.':e.message==='no_email'?'No email on account. Contact support.':'Something went wrong.';
    if(errEl){errEl.textContent=msg;errEl.style.display='block';}
  }
}

// ── Mobile Lemon Squeezy checkout ──────────────────────────────────────────
async function mobLsCheckout(action){
  _track('checkout_started', { plan: action });
  const btnMonthly=document.getElementById('mob-upg-btn-monthly');
  const btnYearly=document.getElementById('mob-upg-btn-yearly');
  const errEl=document.getElementById('mob-upg-err');
  const activeBtn=action==='checkout_yearly'?btnYearly:btnMonthly;
  if(errEl) errEl.textContent='';
  if(activeBtn){activeBtn.textContent='Loading…';activeBtn.disabled=true;}
  try{
    if(!cu) throw new Error('not_logged_in');
    const token=(await sb.auth.getSession())?.data?.session?.access_token;
    if(!token) throw new Error('not_logged_in');
    const res=await fetch('/api/lemonsqueezy/checkout',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body:JSON.stringify({action}),
    });
    const data=await res.json();
    if(!res.ok||!data.url) throw new Error(data.error||'Could not create checkout');
    window.open(data.url,'_blank');
  }catch(e){
    if(errEl) errEl.textContent=e.message==='not_logged_in'?'Sign in to upgrade.':(e.message||'Something went wrong.');
  }finally{
    if(btnMonthly){btnMonthly.textContent='Get Monthly';btnMonthly.disabled=false;}
    if(btnYearly){btnYearly.textContent='Get Yearly · Best value';btnYearly.disabled=false;}
  }
}
async function mobOpenPortal(){
  const errEl=document.getElementById('mob-upg-err');
  if(errEl) errEl.textContent='';
  try{
    const token=(await sb.auth.getSession())?.data?.session?.access_token;
    if(!token) throw new Error('not_logged_in');
    const res=await fetch('/api/lemonsqueezy/checkout',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body:JSON.stringify({action:'portal'}),
    });
    const data=await res.json();
    if(!res.ok||!data.url) throw new Error(data.error||'Could not open portal');
    window.open(data.url,'_blank');
  }catch(e){
    if(errEl) errEl.textContent=e.message||'Something went wrong.';
  }
}

// ══════════════════════════════════════════════
// CUSTOM CONFIRM — matches desktop appConfirm()
// ══════════════════════════════════════════════
let _confirmResolve=null;
function appConfirm(msg,sub='',okLabel='Delete'){
  return new Promise(res=>{
    _confirmResolve=res;
    const el=document.getElementById('mo-confirm');
    const msgEl=document.getElementById('confirm-msg');
    const subEl=document.getElementById('confirm-sub');
    const okBtn=document.getElementById('confirm-ok-btn');
    if(msgEl) msgEl.textContent=msg;
    if(subEl){ subEl.textContent=sub; subEl.style.display=sub?'':'none'; }
    if(okBtn) okBtn.textContent=okLabel;
    if(el) el.classList.add('open');
    else console.error('[Prodify] mo-confirm not found!');
  });
}
function confirmResolve(val){
  const el=document.getElementById('mo-confirm'); if(el) el.classList.remove('open');
  if(_confirmResolve){_confirmResolve(val);_confirmResolve=null;}
}

// ══════════════════════════════════════════════
// EXPORT
// ══════════════════════════════════════════════
function exportJSON(){
  const d=getD();
  const data={exportedAt:new Date().toISOString(),tasks:d.tasks||[],journal:d.journal||[],habits:getP().habits||[],projects:d.subjects||[],calendarEvents:d.calEvs||[]};
  const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='prodify-export-'+new Date().toISOString().slice(0,10)+'.json';a.click();
  toast('Exported!');
}
function exportCSV(){
  if(!isPro()){closeSheets();showUpgradeModal('CSV Export');return;}
  const e2=v=>'"'+String(v||'').replace(/"/g,'""')+'"';
  const tasks=getTasks(); const journal=getJournal();
  let csv='TASKS\r\n';
  csv+=['Title','Status','Priority','Created'].map(e2).join(',')+'\r\n';
  tasks.forEach(t=>{csv+=[t.title,t.col==='todo'?'To Do':t.col==='inprog'?'In Progress':'Done',t.priority||'—',new Date(t.created||0).toISOString().slice(0,10)].map(e2).join(',')+'\r\n';});
  csv+='\r\nJOURNAL\r\n';
  csv+=['Date','Mood','Entry'].map(e2).join(',')+'\r\n';
  journal.forEach(j=>{csv+=[j.date,j.mood||'',j.content||''].map(e2).join(',')+'\r\n';});
  csv+='\r\nHABITS\r\n';
  csv+=['Name','Emoji','Streak'].map(e2).join(',')+'\r\n';
  (getP().habits||[]).forEach(h=>{csv+=[h.name,h.emoji||'',habStreak(h.id)].map(e2).join(',')+'\r\n';});
  const b=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='prodify-'+new Date().toISOString().slice(0,10)+'.csv';a.click();
  closeSheets(); toast('CSV exported!');
}
function exportPDF(){
  if(!isPro()){closeSheets();showUpgradeModal('PDF Export');return;}
  const name=getD().displayName||cu;
  const tasks=getTasks();const journal=getJournal();const habits=getP().habits||[];
  const taskRows=tasks.map(t=>`<tr><td>${t.title||''}</td><td>${t.col==='todo'?'To Do':t.col==='inprog'?'In Progress':'Done'}</td></tr>`).join('');
  const jRows=journal.slice(0,20).map(j=>`<div style="background:#F8F6F2;border-radius:10px;padding:14px 16px;margin-bottom:10px;"><div style="display:flex;justify-content:space-between;margin-bottom:6px;font-weight:700;font-size:12px;"><span>${j.mood||''}</span><span style="color:#9C978F;font-weight:400;">${j.date}</span></div><div style="font-size:12px;line-height:1.7;color:#5A5450;">${j.content||''}</div></div>`).join('');
  const habRows=habits.map(h=>`<div style="display:flex;justify-content:space-between;padding:10px 14px;background:#F8F6F2;border-radius:10px;margin-bottom:8px;font-size:12px;font-weight:600;"><span>${h.emoji||''} ${h.name}</span><span style="color:#2A5C44;">🔥 ${habStreak(h.id)} day streak</span></div>`).join('');
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Prodify Report — ${name}</title><style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',sans-serif;background:#fff;color:#1A1714;padding:48px;max-width:800px;margin:0 auto;font-size:13px;}.logo{font-size:20px;font-weight:800;color:#2A5C44;margin-bottom:16px;}h2{font-size:15px;font-weight:800;margin:28px 0 12px;padding-bottom:8px;border-bottom:1.5px solid #E3DED7;}table{width:100%;border-collapse:collapse;}th{text-align:left;font-size:11px;font-weight:700;color:#9C978F;padding:6px 10px;background:#F8F6F2;}td{padding:9px 10px;border-bottom:1px solid #F0EDE8;font-size:12px;}</style></head><body><div class="logo">Pro<b>dify</b></div><h1 style="font-size:28px;font-weight:800;letter-spacing:-1px;margin-bottom:4px;">Productivity Report</h1><p style="color:#9C978F;font-size:12px;margin-bottom:28px;">${name} · ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</p>${tasks.length?`<h2>Tasks</h2><table><thead><tr><th>Task</th><th>Status</th></tr></thead><tbody>${taskRows}</tbody></table>`:''}${journal.length?`<h2>Journal</h2>${jRows}`:''}${habits.length?`<h2>Habits</h2>${habRows}`:''}<div style="margin-top:48px;padding-top:16px;border-top:1px solid #E3DED7;font-size:11px;color:#CEC9C1;text-align:center;">Generated by Prodify · prodify.cc</div></body></html>`;
  const win=window.open('','_blank'); win.document.write(html); win.document.close(); setTimeout(()=>win.print(),600);
  closeSheets();
}

// ══════════════════════════════════════════════
// BACKUP (PRO)
// ══════════════════════════════════════════════
function showBackupModal(){
  if(!isPro()){showUpgradeModal('Cloud Backup History');return;}
  renderBackupList();
  openSheet('sh-backup');
}
function renderBackupList(){
  const el=document.getElementById('sh-backup-list'); if(!el) return;
  const backups=getP().backups||[];
  if(!backups.length){el.innerHTML=`<div style="text-align:center;padding:28px 0;color:var(--ink4);font-size:13px;">No backups yet.<br><span style="font-size:11px;">Snapshots are saved automatically each day.</span></div>`;return;}
  el.innerHTML=backups.map((b,i)=>{
    const d=new Date(b.ts); const label=d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
    return `<div class="backup-row" onclick="restoreBackup(${i})"><div style="flex:1;"><div class="backup-row-date">${label}</div><div class="backup-row-meta">${(b.tasks||[]).length} tasks · ${(b.journal||[]).length} journal entries · ${(b.habits||[]).length} habits</div></div><button class="backup-restore-btn" onclick="event.stopPropagation();restoreBackup(${i})">Restore</button></div>`;
  }).join('');
}
async function restoreBackup(idx){
  const b=(getP().backups||[])[idx]; if(!b) return;
  const d=new Date(b.ts).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const ok=await appConfirm(`Restore backup from ${d}?`,'Your current data will be replaced.','Restore');
  if(!ok) return;
  const dd=getD();
  if(b.tasks)   dd.tasks=b.tasks;
  if(b.journal) dd.journal=b.journal;
  if(b.subjects)dd.subjects=b.subjects;
  if(b.calEvs)  dd.calEvs=b.calEvs;   // matches desktop
  if(b.notes)   dd.notes=b.notes;     // matches desktop
  if(b.habits)  { const p=getP(); p.habits=b.habits; dd.prefs=p; }
  if(cu) acc[cu]=dd; saveAll();
  renderAll(); closeSheets(); toast('Backup restored!');
}
function backupSnapshotToday(){
  const today=new Date().toISOString().slice(0,10);
  const p=getP(); if(!p.backups) p.backups=[];
  if(p.backups.length>0&&p.backups[0].date===today) return;
  const d=getD();
  p.backups.unshift({date:today,ts:Date.now(),tasks:JSON.parse(JSON.stringify(d.tasks||[])),journal:JSON.parse(JSON.stringify(d.journal||[])),habits:JSON.parse(JSON.stringify(p.habits||[])),subjects:JSON.parse(JSON.stringify(d.subjects||[]))});
  if(p.backups.length>7) p.backups=p.backups.slice(0,7);
  if(cu){acc[cu].prefs=p;saveAll();}
}

// ══════════════════════════════════════════════
// SETTINGS HELPERS
// ══════════════════════════════════════════════
function clearPomHistory(){
  appConfirm('Clear session history?','This will erase all your Pomodoro session data.','Clear').then(ok=>{
    if(!ok) return;
    const p=getP(); p.pomHistory={};
    if(cu){acc[cu].prefs=p;saveAll();}
    pomRenderHistory();
    toast('History cleared');
  });
}
async function deleteAccount(){
  const ok=await appConfirm('Delete your account?','All your data will be permanently erased. This cannot be undone.','Delete Account');
  if(!ok) return;
  // Cancel any pending debounced save — prevents a ghost write after the account is gone
  if(_saveTimer){ clearTimeout(_saveTimer); _saveTimer=null; }
  if(sbReady){ try{ await sb.rpc('delete_auth_user',{p_username:cu}); }catch(e){} await sb.auth.signOut().catch(()=>{}); }
  if(cu){ delete acc[cu]; LS.s('pd1_acc',acc); LS.d('pd1_cur'); }
  if(_realtimeChannel && sb){ try{sb.removeChannel(_realtimeChannel);}catch(e){} _realtimeChannel=null; }
  cu=null; showScreen('login');
}

// Update settings page username display
function renderSettingsPage(){
  const name=getD().displayName||(cu&&cu!=='__mobile__'?cu:'')||'—';
  const snv=document.getElementById('set-name-val'); if(snv) snv.textContent=name;
  const unv=document.getElementById('set-username-val');
  if(unv){
    const storedEmail=(cu&&acc[cu])?acc[cu].email||'':'';
    if(storedEmail){ unv.textContent=storedEmail; }
    else if(sbReady&&cu){ sb.auth.getUser().then(({data})=>{ if(data?.user?.email&&unv){unv.textContent=data.user.email; if(cu&&acc[cu])acc[cu].email=data.user.email; } }).catch(()=>{}); }
    else { unv.textContent='—'; }
  }
  // Show/hide pro card
  const upgCard=document.getElementById('set-upgrade-card');
  const proActive=document.getElementById('set-pro-active');
  if(upgCard) upgCard.style.display=isPro()?'none':'block';
  if(proActive) proActive.style.display=isPro()?'flex':'none';
  // Unlock export buttons for Pro users
  document.querySelectorAll('.export-opt-locked').forEach(el=>{
    if(isPro()){
      el.classList.remove('export-opt-locked');
      el.querySelector('.export-opt-icon-locked')?.classList.remove('export-opt-icon-locked');
    }
  });
  // Sync dark mode toggle
  const p=getP();
  const tog=document.getElementById('toggle-dark');
  if(tog) tog.className='toggle'+(p.dark?' on':'');
  // Sync accent swatch selected state by data-key
  const ak=p.accentColor||p.accentKey||'green';
  document.querySelectorAll('#mob-accent-presets .accent-swatch').forEach(s=>{
    s.classList.toggle('selected', s.dataset.key===ak);
  });
  // Disable Apply hex button for non-pro users
  const applyBtn=document.getElementById('mob-accent-apply-btn');
  if(applyBtn){
    if(!isPro()){
      applyBtn.style.opacity='0.4';
      applyBtn.style.pointerEvents='none';
      applyBtn.title='Upgrade to Pro to use custom hex colors';
    } else {
      applyBtn.style.opacity='';
      applyBtn.style.pointerEvents='';
      applyBtn.title='';
    }
  }
  renderMobileProBadge();
}
// ── Pro badge + ring on mobile avatar ──
function renderMobileProBadge(){
  const pro=isPro();
  const p=getP();
  const accentKey=p.accentColor||p.accentKey||'green';
  // Derive accent colors
  const ACCENT_MAP={green:{a:'#2A5C44',a2:'#3A7D5E',al:'rgba(58,125,94,.12)'},blue:{a:'#1E4A7C',a2:'#2563EB',al:'rgba(37,99,235,.12)'},purple:{a:'#4A2C6E',a2:'#7C3AED',al:'rgba(124,58,237,.12)'},rose:{a:'#7C1D2C',a2:'#E11D48',al:'rgba(225,29,72,.12)'},amber:{a:'#7A4A00',a2:'#D97706',al:'rgba(217,119,6,.12)'},teal:{a:'#0F4C4C',a2:'#0D9488',al:'rgba(13,148,136,.12)'},slate:{a:'#1E293B',a2:'#475569',al:'rgba(71,85,105,.12)'}};
  const colors=ACCENT_MAP[accentKey]||ACCENT_MAP.green;
  const a2=p.accentHex||colors.a2;
  const al=colors.al;

  // Inject pro ring keyframe
  let styleEl=document.getElementById('mob-pro-ring-style');
  if(!styleEl){ styleEl=document.createElement('style'); styleEl.id='mob-pro-ring-style'; document.head.appendChild(styleEl); }
  styleEl.textContent=`@keyframes mob-pro-ring-pulse{0%{box-shadow:0 0 0 2.5px ${a2},0 0 8px 2px ${al};}50%{box-shadow:0 0 0 3px ${a2},0 0 16px 5px ${al};}100%{box-shadow:0 0 0 2.5px ${a2},0 0 8px 2px ${al};}}`;

  // Apply ring to mobile avatar
  const avatar=document.getElementById('tb-avatar');
  if(avatar){
    if(pro){ avatar.style.animation='mob-pro-ring-pulse 2.5s ease-in-out infinite'; avatar.style.borderRadius='50%'; }
    else { avatar.style.animation=''; }
  }

  // Show/hide ✦ Pro badge in nav
  let proBadge=document.getElementById('mob-nav-pro-badge');
  if(pro && !proBadge){
    const aiBtn=document.getElementById('nav-aiplanner');
    if(aiBtn){
      // Replace PRO label with ✦ badge
      const existing=aiBtn.querySelector('i');
      if(existing){ existing.style.background=`linear-gradient(135deg,${colors.a},${a2})`; }
    }
  }

  // Show/hide pro badge in profile/settings
  document.querySelectorAll('.pro-badge').forEach(el=>{
    el.style.display=pro?'inline-flex':'none';
    if(pro){ el.style.background=`linear-gradient(135deg,${colors.a},${a2})`; }
  });
}

// ── Accent hex input (mirrors desktop) ──
function accentHexInput(inp){
  const hex=inp.value.replace(/[^0-9a-fA-F]/g,'').slice(0,6);
  inp.value=hex;
  const prev=document.getElementById('mob-accent-hex-preview');
  if(prev) prev.style.background=hex.length>=3?'#'+hex:'var(--a2)';
}
function accentHexConfirm(){
  const inp=document.getElementById('mob-accent-hex-input');
  if(!inp) return;
  const hex=inp.value.trim();
  if(hex.length<3){ appConfirm('Invalid hex','Enter at least 3 hex characters.','OK'); return; }
  if(!isPro()){ showUpgradeModal('Custom Colors'); return; }
  const p=getP(); p.accentKey='custom'; p.accentColor='#'+hex; p.accentHex='#'+hex;
  applyAccentCSS('custom');
  document.documentElement.style.setProperty('--a','#'+hex);
  document.documentElement.style.setProperty('--a2','#'+hex);
  if(cu){ acc[cu].prefs=p; saveAll(); }
}

// ═══════════════════════════════════════
// AI PLANNER — mobile-native implementation
// (app.js is never loaded on mobile, so these functions live here)
// ═══════════════════════════════════════
let _aipHistory = [];
let _aipContext = '';

function _buildAipContext() {
  const p = getP();
  const today = toDay();
  const log = p.habitLog || {};

  const pending = getTasks().filter(t => t.col !== 'done');
  const taskList = pending.length
    ? pending.map(t => '• ' + (t.title||t.text||'') + (t.priority?' ['+t.priority+']':'') + (t.dueDate?' (due '+t.dueDate+')':'')).join('\n')
    : '(no tasks)';

  const habits = p.habits || [];
  const pendingHabits = habits.filter(h => !(log[today]||[]).map(Number).includes(+h.id));
  const doneHabits = habits.filter(h => (log[today]||[]).map(Number).includes(+h.id));
  const habitList = pendingHabits.length ? pendingHabits.map(h => '• '+h.emoji+' '+h.name).join('\n') : '(all done)';

  const todayEvs = getCalEvs().filter(e => e.date === today);
  const eventList = todayEvs.length ? todayEvs.map(e => '• '+(e.timeStart||'')+' '+e.title).join('\n') : '(none)';

  const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
  const yStr = yesterday.toISOString().slice(0,10);
  const carried = getTasks().filter(t => t.col !== 'done' && t.dueDate === yStr);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true});
  const dateStr = now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});

  return { taskList, habitList, eventList, timeStr, dateStr,
    pendingCount: pending.length, habitCount: pendingHabits.length,
    doneHabitCount: doneHabits.length, eventCount: todayEvs.length,
    carriedTasks: carried, doneHabits, pendingHabits, todayEvs, pendingTasks: pending };
}

function renderAIPlanner(containerId, isMobile) {
  const el = document.getElementById(containerId);
  if (!el) return;
  _aipHistory = [];
  const ctx = _buildAipContext();
  const carried = ctx.carriedTasks.length;

  const habitListWithIds = ctx.pendingHabits.length
    ? ctx.pendingHabits.map(h => '• [id:' + h.id + '] ' + h.emoji + ' ' + h.name).join('\n')
    : '(none)';
  const taskListWithIds = ctx.pendingTasks.length
    ? ctx.pendingTasks.map(t => '• [id:' + t.id + '] ' + (t.title||t.text||'') + (t.priority?' ['+t.priority+']':'') + (t.dueDate?' due '+t.dueDate:'')).join('\n')
    : '(none)';

  const currentYear = new Date().getFullYear();
  _aipContext = 'You are a sharp productivity coach in Prodify. Today is ' + ctx.dateStr + ', ' + ctx.timeStr + '. Current year: ' + currentYear + '. All dates must use year ' + currentYear + ' or later.\n'
    + 'PENDING TASKS:\n' + taskListWithIds + '\n'
    + (carried ? 'OVERDUE FROM YESTERDAY: ' + ctx.carriedTasks.map(t=>'[id:'+t.id+'] '+(t.title||t.text)).join(', ') + '\n' : '')
    + 'HABITS TO DO:\n' + habitListWithIds + (ctx.doneHabitCount>0?' | ALREADY DONE: '+ctx.doneHabitCount:'') + '\n'
    + 'CALENDAR: ' + ctx.eventList + '\n'
    + 'NOTES (recent): ' + (getD().notes||[]).slice(0,5).map(n=>(n.title||'Untitled')+(n.content?' — '+n.content.slice(0,80):'')).join('; ') + '\n'
    + 'PROJECTS: ' + ((getD().subjects||[]).slice(0,5).map(p=>p.name+(p.grade?' ('+p.grade+'%)':'')).join(', ')||'(none)') + '\n\n'
    + 'Build a realistic, prioritized plan for the day based on the data above.\n'
    + 'Format each block: **HH:MM – HH:MM** Task name\n> One practical tip\n'
    + 'End with **Note:** one key insight. Be specific and direct. No fluff.';

  el.innerHTML =
    '<div class="aip-chat-wrap" id="' + containerId + '-wrap">'
    + '<div class="aip-chat-header">'
    + '<div class="aip-chat-header-left">'
    + '<div class="aip-chat-avatar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>'
    + '<div>'
    + '<div class="aip-chat-name">AI Planner <span style="font-size:9px;font-weight:700;background:linear-gradient(135deg,var(--a),var(--a2));color:#fff;padding:1px 5px;border-radius:100px;vertical-align:middle;margin-left:3px;">PRO</span></div>'
    + '<div class="aip-chat-status"><span class="aip-status-dot"></span>' + ctx.pendingCount + ' tasks · ' + ctx.habitCount + ' habits · ' + ctx.eventCount + ' events' + (carried ? ' · <span style=\"color:#dc2626;\">' + carried + ' overdue</span>' : '') + '</div>'
    + '</div></div>'
    + '<button class="aip-reset-btn" onclick="openAIPlanner()" style="padding:4px 8px;">✕</button>'    + '</div>'    + '<div class="aip-chat-msgs" id="' + containerId + '-msgs"></div>'    + '<div class="aip-chat-footer" style="padding:12px 14px;">'    + '<button class="aip-generate-btn" id="' + containerId + '-genbtn" onclick="aipGenerate(\'' + containerId + '\')">⚡ Generate my plan</button>'    + '</div></div>';
}

async function _track(event, data) {
  try {
    if (typeof window.umami !== 'undefined') {
      window.umami.track(event, data);
    }
  } catch(e) {}
}

async function aipGenerate(containerId) {
  if (!isPro()) { showUpgradeModal('AI Daily Planner'); return; }
  const msgs   = document.getElementById(containerId + '-msgs');
  const genBtn = document.getElementById(containerId + '-genbtn');
  if (!msgs || !genBtn) return;

  msgs.innerHTML = '';
  genBtn.disabled = true;
  genBtn.textContent = 'Generating…';
  _track('ai_plan_generated');

  const ty = document.createElement('div');
  ty.className = 'aip-bubble aip-bubble-ai aip-typing';
  ty.innerHTML = '<span></span><span></span><span></span>';
  msgs.appendChild(ty);
  msgs.scrollTop = msgs.scrollHeight;

  // Single-shot: fresh context + generate prompt
  const apiMessages = [{ role: 'user', content: _aipContext + '\n\nGenerate my plan for today.' }];

  try {
    const { data: { session: _aipSess } } = await sb.auth.getSession().catch(() => ({ data: { session: null } }));
    const _aipToken = _aipSess?.access_token || '';
    const resp = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${_aipToken}` },
      body: JSON.stringify({ messages: apiMessages })
    });
    if (resp.status === 429) {
      const errData = await resp.json();
      throw new Error(errData.error || 'Daily limit reached. Try again tomorrow.');
    }
    if (resp.status === 403) {
      showUpgradeModal('AI Daily Planner');
      throw new Error('pro_gate');
    }
    if (resp.status === 401) {
      throw new Error('Session expired. Please sign out and back in.');
    }
    const data = await resp.json();
    const aiText = (data.content || []).map(b => b.text || '').join('');
    if (!aiText) throw new Error(data.error?.message || 'Empty response');

    _aipPlanGenerated = true;
    ty.remove();

    const ab = document.createElement('div');
    ab.className = 'aip-bubble aip-bubble-ai';
    ab.innerHTML = _aipFormat(aiText);
    msgs.appendChild(ab);

    if (genBtn) { genBtn.disabled = false; genBtn.textContent = '↺ Generate another plan'; }

  } catch (err) {
    ty.remove();
    if (err.message === 'pro_gate') return;
    const eb = document.createElement('div');
    eb.className = 'aip-bubble aip-bubble-ai aip-bubble-err';
    eb.textContent = (err.message.includes('limit') || err.message.includes('expired')) ? '⚠️ ' + err.message : '⚠️ Something went wrong. Please try again.';
    msgs.appendChild(eb);
    if (genBtn) { genBtn.disabled = false; genBtn.textContent = '⚡ Generate my plan'; }
  } finally {
    msgs.scrollTop = msgs.scrollHeight;
  }
}

async function _mobAipExecuteActions(text) {
  const actionRegex = /<<<ACTION>>>(.*?)<<<END>>>/gs;
  let match;
  const actions = [];
  while ((match = actionRegex.exec(text)) !== null) {
    try { actions.push(JSON.parse(match[1])); } catch(e) {}
  }
  let cleanText = text.replace(/<<<ACTION>>>.*?<<<END>>>/gs, '').trim();
  if (!actions.length) return cleanText;

  const d = getD();
  let changed = false;
  const today = toDay();

  for (const action of actions) {
    try {
      if (action.type === 'create_task') {
        let safeDate = action.dueDate || null;
        if (safeDate) {
          const dd = new Date(safeDate + 'T00:00:00');
          const tod = new Date(); tod.setHours(0,0,0,0);
          if (isNaN(dd.getTime()) || dd < tod) safeDate = null;
        }
        d.tasks = d.tasks || [];
        d.tasks.unshift({ id: uid(), text: action.text, title: action.text, col: 'todo',
          dueDate: safeDate, priority: action.priority || 'medium',
          recurring: 'none', date: new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'}), created: Date.now() });
        changed = true;
      } else if (action.type === 'complete_habit') {
        const p = d.prefs || {}; if (!p.habitLog) p.habitLog = {};
        const arr = p.habitLog[today] || [];
        const hid = Number(action.id);
        if (!arr.includes(hid)) { p.habitLog[today] = [...arr, hid]; d.prefs = p; changed = true; }
      } else if (action.type === 'move_task') {
        const t = (d.tasks||[]).find(x => String(x.id) === String(action.id));
        if (t) { t.col = action.col; changed = true; }
      } else if (action.type === 'create_event') {
        d.calEvs = d.calEvs || [];
        d.calEvs.push({ id: uid(), title: action.title, date: action.date, color: '#3A7D5E' });
        changed = true;
      }
    } catch(e) {}
  }

  if (changed) {
    if (cu) acc[cu] = d;
    saveAll();
    renderAll();
  }
  return cleanText;
}

function _aipFormat(text) {
  return text
    .replace(/^## (.+)$/gm, '<div class="aip-plan-title">$1</div>')
    .replace(/\*\*(\d{1,2}:\d{2}[\s\u2013\-]+\d{1,2}:\d{2})\*\*/g, '<span class="aip-time-block">$1</span>')
    .replace(/\*\*Note:\*\*/g, '<span class="aip-note-label">Note:</span>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^> (.+)$/gm, '<div class="aip-tip">$1</div>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

// ═══════════════════════════════════════
// PRO WELCOME — confetti on upgrade
// ═══════════════════════════════════════
function showMobileConfetti(){
  const colors=['#3A7D5E','#4A9D74','#F5B800','#fff','#2A5C44'];
  for(let i=0;i<60;i++){
    const el=document.createElement('div');
    const size=Math.random()*8+4;
    const color=colors[Math.floor(Math.random()*colors.length)];
    const startX=Math.random()*window.innerWidth;
    const delay=Math.random()*600;
    const duration=Math.random()*1200+800;
    el.style.cssText=`position:fixed;top:-10px;left:${startX}px;width:${size}px;height:${size}px;background:${color};border-radius:${Math.random()>0.5?'50%':'2px'};z-index:99998;pointer-events:none;`;
    document.body.appendChild(el);
    el.animate([
      {transform:`translateY(0) rotate(0deg)`,opacity:1},
      {transform:`translateY(${window.innerHeight+20}px) rotate(${Math.random()*720}deg)`,opacity:0}
    ],{duration,delay,easing:'cubic-bezier(.25,.46,.45,.94)',fill:'forwards'})
      .onfinish=()=>el.remove();
  }
}

// ══════════════════════════════════════════════
// DEVICE MANAGEMENT
// ══════════════════════════════════════════════
const _DEVICE_KEY = 'pd1_device_id';

function getOrCreateDeviceId() {
  let id = localStorage.getItem(_DEVICE_KEY);
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2,10) + '_' + Date.now().toString(36);
    localStorage.setItem(_DEVICE_KEY, id);
  }
  return id;
}

async function checkAndRegisterDevice(username) {
  try {
    if (!sbReady) return true; // offline — fail open
    const myId = getOrCreateDeviceId();
    const { data: row, error } = await sb.from('users')
      .select('active_device_id, is_pro, bypass_device_check')
      .eq('username', username).single();
    if (error) return true; // fail open
    if (row?.bypass_device_check) return true;
    if (row?.is_pro) {
      await sb.from('users').update({ active_device_id: myId }).eq('username', username);
      return true;
    }
    const activeId = row?.active_device_id || null;
    if (activeId && activeId !== myId) return false;
    await sb.from('users').update({ active_device_id: myId }).eq('username', username);
    return true;
  } catch(e) {
    console.warn('[Prodify] Device check failed, allowing access', e);
    return true;
  }
}

async function unregisterDevice(username) {
  if (!sbReady || !username) return;
  try {
    const myId = getOrCreateDeviceId();
    const { data } = await sb.from('users').select('active_device_id').eq('username', username).single();
    if (data && data.active_device_id === myId)
      await sb.from('users').update({ active_device_id: null }).eq('username', username);
  } catch(e) {}
}

function showMobMultiDeviceBlock() {
  const existing = document.getElementById('mob-multidevice-block');
  if (existing) return;
  const el = document.createElement('div');
  el.id = 'mob-multidevice-block';
  el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:var(--surf);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 24px;text-align:center;';
  el.innerHTML = `
    <div style="font-size:52px;margin-bottom:18px;">📱</div>
    <div style="font-size:20px;font-weight:800;color:var(--ink);margin-bottom:10px;">Device limit reached</div>
    <div style="font-size:14px;color:var(--ink3);line-height:1.7;margin-bottom:28px;">Free plan supports <strong>1 active device</strong>.<br/>Sign out on your other device first, then try again.</div>
    <button onclick="document.getElementById('mob-multidevice-block').style.display='none';showUpgradeModal('Multi-Device Sync');" style="width:100%;max-width:280px;padding:14px;border-radius:14px;border:none;background:linear-gradient(135deg,var(--a),var(--a2));color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;margin-bottom:10px;">✦ Upgrade to Pro</button>
    <button onclick="document.getElementById('mob-multidevice-block').remove();doSignOut();" style="width:100%;max-width:280px;padding:12px;border-radius:14px;border:1.5px solid var(--bdr);background:transparent;color:var(--ink3);font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;">Sign out</button>
  `;
  document.body.appendChild(el);
}


// ══════════════════════════════════════════════
// BOOT — runs once on script load
// ══════════════════════════════════════════════
(async () => {
  try{ _lastSaveTs=parseInt(localStorage.getItem('pd1_lastSaveTs')||'0',10)||0; }catch(e){}

  // Check for OAuth redirect first
  const hasOAuthParams = window.location.hash.includes('access_token') || window.location.search.includes('code=');
  if(hasOAuthParams && sbReady){
    const handled = await handleGoogleCallback();
    if(handled) return;
  }
  // Check for existing Supabase session (returning user, same browser)
  if(sbReady){
    try{
      const {data} = await sb.auth.getSession();
      if(data.session){
        const handled = await handleGoogleCallback();
        if(handled) return;
      }
    }catch(e){}
  }
  // Check for existing local session — launch immediately, sync cloud in background
  if(cu && acc[cu]){
    if(sbReady){
      const deviceAllowed = await checkAndRegisterDevice(cu);
      if(!deviceAllowed){ showScreen('login'); showMobMultiDeviceBlock(); return; }
    }
    launch();
    if(sbReady){ setTimeout(()=>pullFromCloud(), 500); }
  } else {
    showScreen('login');
  }
})();

// Save on page unload / app backgrounding
window.addEventListener('pagehide', function(){
  if(!cu || !acc[cu]) return;
  const d=acc[cu];
  d._localTs=Date.now();
  LS.s('pd1_acc',acc);
  try{ localStorage.setItem('pd1_lastSaveTs',String(d._localTs)); }catch(e){}
});

// ═══════════════════════════════════════
// APP STREAK (mobile)
// ═══════════════════════════════════════
const MOB_STREAK_KEY = 'pd1_app_streak';
const MOB_STREAK_LAST_KEY = 'pd1_app_streak_last';

function getAppStreak(){
  if(window._guestMode) return 0;
  try{
    const streak = parseInt(localStorage.getItem(MOB_STREAK_KEY)||'0',10)||0;
    const last = localStorage.getItem(MOB_STREAK_LAST_KEY)||'';
    const today = new Date().toISOString().slice(0,10);
    const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
    if(last===today) return streak;
    if(last===yesterday){
      const newStreak = streak+1;
      localStorage.setItem(MOB_STREAK_KEY, String(newStreak));
      localStorage.setItem(MOB_STREAK_LAST_KEY, today);
      return newStreak;
    }
    localStorage.setItem(MOB_STREAK_KEY, '1');
    localStorage.setItem(MOB_STREAK_LAST_KEY, today);
    return 1;
  }catch(e){ return 0; }
}

function streakVisual(n){
  if(n<=0) return {icon:'🔥', color:'var(--ink4)'};
  if(n<7)  return {icon:'🔥', color:'var(--ink3)'};
  if(n<30) return {icon:'🔥', color:'#D97706'};
  if(n<100)return {icon:'🔥', color:'var(--a2)'};
  return           {icon:'✨', color:'#B45309'};
}

function renderHomeStreak(){
  if(window._guestMode) return;
  const n = getAppStreak();
  const numEl = document.getElementById('hstat-streak');
  const lblEl = numEl && numEl.nextElementSibling;
  if(!numEl) return;
  const v = streakVisual(n);
  numEl.textContent = n;
  numEl.style.color = v.color;
  if(lblEl){ lblEl.textContent = v.icon + ' day streak'; }
  if([7,30,100,365].includes(n)){
    setTimeout(()=>_showMobStreakMilestone(n), 800);
  }
}

function _showMobStreakMilestone(n){
  const msgs = {
    7:   {e:'🔥', t:'One week streak!',   s:'7 days in a row. Your streak is heating up — keep going and watch it change.'},
    30:  {e:'🔥', t:'30 day streak!',      s:"A full month. Your streak just turned green. Don't stop now."},
    100: {e:'✨', t:'100 day streak!',     s:"Gold. You've earned it. This is exceptional."},
    365: {e:'👑', t:'One year streak!',    s:'A full year with Prodify.'},
  };
  const m = msgs[n]; if(!m) return;
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);z-index:9000;background:var(--surf);border:1.5px solid var(--bdr);border-radius:16px;padding:14px 20px;box-shadow:0 8px 32px rgba(0,0,0,0.12);display:flex;align-items:center;gap:12px;white-space:nowrap;animation:fadeIn .4s ease both;max-width:90vw;';
  t.innerHTML = `<span style="font-size:24px;">${m.e}</span><div><div style="font-size:14px;font-weight:800;color:var(--ink);letter-spacing:-.3px;">${m.t}</div><div style="font-size:12px;color:var(--ink3);margin-top:2px;">${m.s}</div></div>`;
  document.body.appendChild(t);
  setTimeout(()=>{ t.style.transition='opacity .5s'; t.style.opacity='0'; setTimeout(()=>t.remove(),500); }, 4000);
}
