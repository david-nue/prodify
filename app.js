if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  });
}





// ══════════════════════════════════════════════════════
// GUEST MODE
// ══════════════════════════════════════════════════════
window._guestMode = false;
let _guestFreeWrites = {task: 0, journal: 0, note: 0};

// Allow first write of each type freely; gate on subsequent ones
function guestWriteGuard(type){
  if(!window._guestMode) return false;
  if(type && _guestFreeWrites[type] === 0){
    _guestFreeWrites[type]++;
    return false; // first action free
  }
  guestGuard();
  return true;
}

const GUEST_PREFS = {
  habits:[],
  habitLog:{},
  accent:'green', theme:'light',
};

function enterGuestMode(){
  // Guard re-entry — already in guest mode, just go to canvas
  if(window._guestMode){ show('app'); goPg('canvas',null); return; }
  window._guestMode = true;
  window._guestStartTime = Date.now();

  // Track guest mode entry
  _track('guest_mode_entered', { source: 'preview_button' });

  // 30-minute nudge — reuse sign-in modal with loss aversion copy
  window._guestNudgeTimer = setTimeout(()=>{
    if(!window._guestMode) return;
    // Count what they've built
    const taskCount = tasks.length;
    const journalCount = journal.length;
    const habitCount = (prefs.habits||[]).length;
    const parts = [];
    if(taskCount) parts.push(`${taskCount} task${taskCount>1?'s':''}`);
    if(journalCount) parts.push(`${journalCount} journal entr${journalCount>1?'ies':'y'}`);
    if(habitCount) parts.push(`${habitCount} habit${habitCount>1?'s':''}`);
    const lostMsg = parts.length
      ? `You've built ${parts.join(', ')} — it all disappears when you close this tab.`
      : `You've been here 30 minutes — everything disappears when you close this tab.`;
    // Show sign-in modal with updated copy
    _showGuestSignInModal(
      "⏱️ Don't lose your work",
      lostMsg
    );
    _track('guest_nudge_shown', { minutes: 30, items_built: parts.length });
  }, 30 * 60 * 1000);
  // Empty data — no sample entries
  tasks = [];
  journal = [];
  notes = [];
  prefs = JSON.parse(JSON.stringify(GUEST_PREFS));
  calEvs = [];
  subjects = [];
  widgets = [];
  cu = '__guest__';
  // Purge any stale guest data
  delete acc['__guest__'];
  acc['__guest__'] = {tasks,journal,notes,prefs,calEvs,subjects,widgets,
    displayName:'Guest',username:'guest',email:'',avatarUrl:''};
  // Reset free-write quotas
  _guestFreeWrites = {task: 0, journal: 0, note: 0};
  // Clear canvas DOM from any previous session
  const cvs = document.getElementById('canvas');
  if(cvs) cvs.innerHTML = '';
  // Show app and force canvas page
  document.body.classList.add('in-app');
  show('app');
  goPg('canvas', null);
  // Show guest banner
  const banner = document.getElementById('guest-banner');
  if(banner) banner.style.display='flex';
  document.body.classList.add('guest-active');
  // Update avatar
  const av = document.getElementById('sbavt');
  if(av) av.textContent='G';
  const ddnm = document.getElementById('ddnm');
  if(ddnm) ddnm.textContent='Guest';
  const ddun = document.getElementById('ddun');
  if(ddun) ddun.textContent='Preview mode';
  const soLabel = document.getElementById('dsk-dd-signout-label');
  if(soLabel) soLabel.textContent='Exit preview';
  // Guest preview starts with empty canvas too — they build it themselves
  setTimeout(()=>{
    widgets = [];
    acc['__guest__'].widgets = widgets;
    nextZ = 10;
    renderCanvas();
    renderCanvasGreeting();
    updateAllStatsW();
    if(typeof renderFullCal==='function') renderFullCal();
  }, 80);
  // Exit intent
  window._guestBeforeUnload = function(e){
    if(!window._guestMode) return;
    e.preventDefault();
    e.returnValue = '';
  };
  window.addEventListener('beforeunload', window._guestBeforeUnload);
}

function _cleanupGuestMode(){
  if(window._guestBeforeUnload){
    window.removeEventListener('beforeunload', window._guestBeforeUnload);
    window._guestBeforeUnload = null;
  }
  // Clear 30-min nudge timer
  if(window._guestNudgeTimer){
    clearTimeout(window._guestNudgeTimer);
    window._guestNudgeTimer = null;
  }
  const tip = document.getElementById('guest-tooltip');
  if(tip) tip.remove();
  const gsiMo = document.getElementById('mo-guest-signin');
  if(gsiMo) gsiMo.remove();
  const nudgeMo = document.getElementById('mo-guest-nudge');
  if(nudgeMo) nudgeMo.remove();
  const streakEl = document.getElementById('flt-streak');
  if(streakEl) streakEl.style.display='none';
  const cvs = document.getElementById('canvas');
  if(cvs) cvs.innerHTML = '';
  const banner = document.getElementById('guest-banner');
  if(banner) banner.style.display='none';
  document.body.classList.remove('guest-active');
  document.body.classList.remove('in-app');
  const soLabel = document.getElementById('dsk-dd-signout-label');
  if(soLabel) soLabel.textContent='Sign out';
}

function _trackGuestExit(converted){
  const spent = window._guestStartTime ? Math.round((Date.now() - window._guestStartTime) / 1000) : 0;
  const minutes = Math.round(spent / 60);
  if(converted){
    _track('guest_converted', { minutes_spent: minutes });
  } else {
    _track('guest_exited', { minutes_spent: minutes });
  }
  window._guestStartTime = null;
}

function exitGuestMode(){
  appConfirm('Exit preview?', 'Your preview data will be cleared. Sign in instead to save your work.', 'Exit preview').then(ok => {
    if(!ok) return;
    document.querySelectorAll('.ov.open').forEach(o => o.classList.remove('open'));
    _trackGuestExit(false);
    window._guestMode = false;
    window._pendingGuestData = null;
    try { sessionStorage.removeItem('pd1_guest_data'); } catch(e) {}
    cu = null;
    tasks=[]; journal=[]; notes=[]; prefs={}; calEvs=[]; subjects=[]; widgets=[];
    _cleanupGuestMode();
    show('sl');
  });
}

function guestGuard(){
  if(!window._guestMode) return false;
  const mo = document.getElementById('mo-guest-gate');
  if(mo) mo.style.display='flex';
  return true;
}

function guestGateSignIn(){
  document.querySelectorAll('.ov.open').forEach(o => o.classList.remove('open'));
  const mo = document.getElementById('mo-guest-gate');
  if(mo) mo.style.display='none';
  // Save ALL guest data before showing sign-in modal
  window._pendingGuestData = {
    tasks:    JSON.parse(JSON.stringify(tasks)),
    journal:  JSON.parse(JSON.stringify(journal)),
    notes:    JSON.parse(JSON.stringify(notes)),
    prefs:    JSON.parse(JSON.stringify(prefs)),
    calEvs:   JSON.parse(JSON.stringify(calEvs)),
    widgets:  JSON.parse(JSON.stringify(widgets)),
  };
  // Persist to sessionStorage so it survives magic link page redirect
  try { sessionStorage.setItem('pd1_guest_data', JSON.stringify(window._pendingGuestData)); } catch(e) {}
  // Show inline sign-in modal (stays over canvas — no redirect)
  _showGuestSignInModal();
}

function _showGuestSignInModal(title, subtitle){
  const _title = title || 'Save your work';
  const _subtitle = subtitle || 'Create a free account to keep everything you just built.';
  if(document.getElementById('mo-guest-signin')) {
    // Already open — just update the text
    const t = document.querySelector('#mo-guest-signin div[style*="font-size:22px"]');
    const s = document.querySelector('#mo-guest-signin div[style*="margin-bottom:24px"]');
    if(t) t.textContent = _title;
    if(s) s.textContent = _subtitle;
    return;
  }
  const mo = document.createElement('div');
  mo.id = 'mo-guest-signin';
  mo.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease both;';
  mo.innerHTML = `
    <div style="background:var(--surf);border-radius:20px;padding:36px 32px 28px;max-width:400px;width:92%;box-shadow:0 24px 80px rgba(0,0,0,0.2);position:relative;">
      <button onclick="document.getElementById('mo-guest-signin').remove()" style="position:absolute;top:16px;right:16px;background:none;border:none;cursor:pointer;color:var(--ink3);font-size:20px;line-height:1;padding:4px 8px;border-radius:8px;" onmouseover="this.style.background='var(--surf2)'" onmouseout="this.style.background='none'">&times;</button>
      <div style="font-size:22px;font-weight:800;letter-spacing:-.4px;color:var(--ink);margin-bottom:4px;">${_title}</div>
      <div style="font-size:13px;color:var(--ink3);margin-bottom:24px;line-height:1.6;">${_subtitle}</div>
      <div id="gsi-err" class="ferr" style="display:none;margin-bottom:12px;text-align:center;"></div>
      <button class="btn-google btn-google-lg" onclick="_gsiDoGoogle()" id="gsi-google-btn">
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.33 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.67 14.62 48 24 48z"/>
        </svg>
        Continue with Google
      </button>
      <div class="auth-divider"><span>or</span></div>
      <div id="gsi-magic-form">
        <input type="email" id="gsi-email" class="fi" placeholder="Enter your email address" autocomplete="email" onkeydown="if(event.key==='Enter')_gsiDoMagic()" style="margin-bottom:8px;"/>
        <div class="ferr" id="gsi-magic-err" style="display:none;margin-bottom:8px;"></div>
        <button class="btn bfull" onclick="_gsiDoMagic()" id="gsi-magic-btn" style="width:100%;padding:12px;font-size:14px;">Continue with Email</button>
      </div>
      <div id="gsi-magic-sent" style="display:none;text-align:center;padding:12px 0;">
        <div style="font-size:22px;margin-bottom:8px;">📬</div>
        <div style="font-size:14px;font-weight:700;color:var(--ink);margin-bottom:4px;">Check your inbox</div>
        <div style="font-size:12px;color:var(--ink3);">We sent a sign-in link to <span id="gsi-sent-email" style="font-weight:700;color:var(--a2);"></span></div>
        <button onclick="document.getElementById('gsi-magic-sent').style.display='none';document.getElementById('gsi-magic-form').style.display='block';" style="margin-top:12px;background:none;border:none;font-size:12px;color:var(--ink4);cursor:pointer;font-family:inherit;">Use a different email</button>
      </div>
      <p class="auth-note" style="margin-top:16px;">Free to start · No credit card needed</p>
    </div>`;
  document.body.appendChild(mo);
  setTimeout(()=>{ const e = document.getElementById('gsi-email'); if(e) e.focus(); }, 100);
}

async function _gsiDoGoogle(){
  const btn = document.getElementById('gsi-google-btn');
  if(btn){ btn.disabled=true; btn.style.opacity='.6'; }
  // Remove exit-intent listener so the OAuth redirect doesn't trigger "Leave site?"
  if(window._guestBeforeUnload){
    window.removeEventListener('beforeunload', window._guestBeforeUnload);
    window._guestBeforeUnload = null;
  }
  await doGoogleAuth();
}

async function _gsiDoMagic(){
  const emailEl = document.getElementById('gsi-email');
  const errEl = document.getElementById('gsi-magic-err');
  const btn = document.getElementById('gsi-magic-btn');
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
    document.getElementById('gsi-magic-form').style.display='none';
    document.getElementById('gsi-magic-sent').style.display='block';
    const sentEl = document.getElementById('gsi-sent-email');
    if(sentEl) sentEl.textContent = email;
  } catch(e){
    if(btn){ btn.disabled=false; btn.textContent='Continue with Email'; }
    if(errEl){ errEl.textContent = e.message||'Something went wrong. Please try again.'; errEl.style.display='block'; }
  }
}



// ── CUSTOM CONFIRM ──
let _confirmResolve = null;
function appConfirm(msg, sub='', okLabel='Delete'){
  return new Promise(res=>{
    _confirmResolve = res;
    const mo = document.getElementById('dsk-mo-confirm');
    const msgEl = document.getElementById('dsk-mo-confirm-msg');
    const subEl = document.getElementById('dsk-mo-confirm-sub');
    const okBtn = document.getElementById('dsk-mo-confirm-ok');
    if(msgEl) msgEl.textContent = msg;
    if(subEl){ subEl.textContent = sub; subEl.style.display = sub ? '' : 'none'; }
    if(okBtn) okBtn.textContent = okLabel;
    if(mo){ mo.style.display='flex'; }
  });
}
function confirmResolve(val){
  const mo = document.getElementById('dsk-mo-confirm');
  if(mo) mo.style.display='none';
  if(_confirmResolve){ _confirmResolve(val); _confirmResolve=null; }
}
// Close on backdrop click
document.addEventListener('click', function(e){
  const mo = document.getElementById('dsk-mo-confirm');
  if(mo && e.target === mo) confirmResolve(false);
});

// ── Canvas: bounded to viewport, no pan/scroll ──
(function(){
  const scroll = document.getElementById('canvas-scroll');
  const cvs    = document.getElementById('canvas');
  if(!scroll || !cvs) return;

  // No pan — canvas is fixed to viewport size
  window._canvasScale = 1;

  function applyZoom(){ /* zoom disabled on bounded canvas */ }

  // ── SCROLL WHEEL ZOOM — disabled for now, will be a toggle in settings ──

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
})();



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
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    sbReady = true;
    if(typeof cu !== 'undefined' && cu) setTimeout(()=>startRealtimeSync(cu), 0);

    // Listen for auth state changes — catches Google OAuth redirect session
    let _googleCallbackHandled = false;
    sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session && !_googleCallbackHandled) {
        // Use the flag set by boot — Supabase cleans the URL before this event fires
        // so checking window.location for 'code=' or 'access_token' here is too late.
        // _oauthRedirectInProgress is only set when boot actually saw the OAuth URL.
        if (!window._oauthRedirectInProgress) return;
        _googleCallbackHandled = true;
        window._oauthRedirectInProgress = false;
        window.history.replaceState({}, document.title, window.location.pathname);
        await handleGoogleCallback(session);
      }
    });
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
    // Use RPC (SECURITY DEFINER) so RLS never blocks user fetching their own data
    const {data,error}=await sb.rpc('get_user_by_username',{p_username:username});
    if(error||!data||!data[0]) return null;
    return data[0];
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
  if(!sbReady) return false;
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
    if(saveErr){
      console.error('[Prodify] Save error:',saveErr.message,'code:',saveErr.code);
      // Do NOT update _lastSaveTs — save failed, local is still ahead
      return false;
    }
    // Only mark cloud as up-to-date when save actually succeeded.
    // Also persisted to localStorage so the trustLocal heuristic works across page reloads.
    _lastSaveTs = Date.now();
    // Keep _localTs alive so incoming realtime from other devices doesn't overwrite
    if(cu && acc[cu]) { acc[cu]._localTs = _lastSaveTs; LS.s('pd1_acc', acc); }
    try{ localStorage.setItem('pd1_lastSaveTs', String(_lastSaveTs)); }catch(e){}
    return true;
  }catch(e){
    console.error('[Prodify] Supabase save FAILED:',e?.message||e);
    return false;
  }
}
async function dbDeleteUser(username){
  if(!sbReady) return;
  try{ await sb.rpc('delete_auth_user', { p_username: username }); }catch(e){ console.warn('dbDeleteUser error', e); }
}
// ── REALTIME SYNC ──
let _realtimeChannel = null;
// Persisted across page reloads so the trustLocal heuristic doesn't always
// default to trusting local on a fresh tab open (module-level 0 caused that).
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
      // Only block echo from THIS device's own save (in-memory only, not localStorage)
      if(Date.now()-_lastSaveTs < 1500) return;
      applyRemoteData(payload.new);
    })
    .subscribe(status=>{
      });
}

function stopRealtimeSync(){
  if(_realtimeChannel && sb){try{sb.removeChannel(_realtimeChannel);}catch(e){}}
  _realtimeChannel=null;
}

// Safe JSON parse with a fallback — prevents one corrupted column from
// breaking the entire applyRemoteData call and leaving the UI stale.
function safeParseJSON(str, fallback){
  if(str == null) return fallback;
  try{ return JSON.parse(str); }
  catch(e){ console.error('[Prodify] JSON parse error, using fallback:',e); return fallback; }
}

// Migrate old notes format (object keyed by widget ID) to new array format
function migrateNotes(raw){
  if(!raw) return [];
  // Already an array — new format
  if(Array.isArray(raw)) return raw;
  // Old format: { widgetId: { title, content }, ... }
  if(typeof raw === 'object'){
    const entries = Object.values(raw).filter(v => v && typeof v === 'object');
    if(!entries.length) return [];
    return entries.map(e => ({
      id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
      title: e.title || '',
      content: e.content || '',
      updated: Date.now()
    }));
  }
  return [];
}

function normalizeTasks(arr){
  return (arr||[]).map(t=>{
    if(!t.text  && t.title) t.text  = t.title;
    if(!t.title && t.text)  t.title = t.text;
    if(t.id !== undefined) t.id = String(t.id);
    if(t.subjectId !== undefined) t.subjectId = String(t.subjectId);
    return t;
  });
}

function normalizeJournal(arr){
  return (arr||[]).map(j=>{
    // Ensure id is always a string
    if(j.id !== undefined) j.id = String(j.id);
    // Ensure both text and content exist
    if(!j.text    && j.content) j.text    = j.content;
    if(!j.content && j.text)    j.content = j.text;
    // Fix date: mobile stores ISO string, desktop expects "Mon, Mar 16"
    if(j.date && j.date.includes('T') && j.date.includes('Z')){
      try{
        j.date = new Date(j.date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
      }catch(e){}
    }
    return j;
  });
}

function applyRemoteData(row){
  if(!row||!cu) return;
  try{
    const d = acc[cu] || {};
    // Sync display_name so name changes on mobile show on desktop immediately
    if(row.display_name != null && row.display_name !== '') {
      d.displayName = row.display_name;
      const ddnmEl=$('ddnm'); if(ddnmEl) ddnmEl.textContent=row.display_name;
    }
    if(row.tasks    != null) { tasks    = normalizeTasks(safeParseJSON(row.tasks, [])); d.tasks = tasks; }
    if(row.journal  != null) { journal  = normalizeJournal(safeParseJSON(row.journal,  [])); d.journal  = journal;  }
    if(row.subjects != null) { subjects = (safeParseJSON(row.subjects, [])||[]).map(s=>{if(s.id!==undefined)s.id=String(s.id);return s;}); d.subjects = subjects; }
    if(row.cal_evs  != null) { calEvs   = safeParseJSON(row.cal_evs,  []); d.calEvs   = calEvs;   }
    if(row.widgets  != null) { widgets  = safeParseJSON(row.widgets,  []); d.widgets  = widgets;  }
    if(row.notes    != null) { notes    = migrateNotes(safeParseJSON(row.notes, [])); d.notes    = notes;    }
    if(row.prefs){
      const rp=safeParseJSON(row.prefs, {});
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
    // Re-render only what changed
    if(row.tasks    != null) { renderAllTaskW(); updateAllStatsW(); updateFixedStats(); }
    if(row.journal  != null) renderAllJournalW();
    if(row.subjects != null) { renderSubFull(); renderAllSubW(); }
    if(row.cal_evs  != null) renderFullCal();
    if(row.notes    != null) { widgets.filter(w=>w.type==='note').forEach(w=>{ const body=$('wb-'+w.id); if(body){body.innerHTML='';_renderNoteW(body,w);} }); }
    if(row.prefs    != null) {
      applyTheme();
      renderProBadge();
      pomRenderHistory();
      applyAvatar();
    }
    // Rebuild canvas if widgets/tasks/subjects changed
    if(row.widgets != null || row.tasks != null || row.subjects != null) {
      renderCanvas();
    }
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

// Restore guest data that survived a magic link redirect
(function(){
  try {
    const raw = sessionStorage.getItem('pd1_guest_data');
    if(raw) { window._pendingGuestData = JSON.parse(raw); }
  } catch(e) {}
})();
// Must be declared before initSupabase() registers onAuthStateChange
window._oauthRedirectInProgress = false;
initSupabase();
let tasks=[],journal=[],subjects=[],calEvs=[],widgets=[],notes=[];
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
async function clearAllData(){
  if(!await appConfirm('Clear all data?','This will erase all your tasks, journal entries, habits and calendar events. This cannot be undone.','Clear')) return;
  tasks=[]; journal=[]; subjects=[]; calEvs=[]; notes=[];
  if(prefs){ prefs.habits=[]; prefs.habitLog={}; prefs.pomHistory={}; }
  persist();
  renderAllTaskW(); renderAllJournalW(); renderAllSubW();
  // Reset journal textareas
  widgets.filter(w=>w.type==='journal').forEach(w=>{
    const ta=$('jwta-'+w.id); if(ta){ta.value='';ta.style.height='';}
  });
  // Re-render habit widgets
  widgets.filter(w=>w.type==='habits').forEach(w=>renderHabitW(w.id));
  // Re-render note widgets
  widgets.filter(w=>w.type==='note').forEach(w=>fillWBody(w));
  // Re-render calendar widgets
  widgets.filter(w=>w.type==='calendar').forEach(w=>fillWBody(w));
  if(typeof renderFullCal==='function') renderFullCal();
  updateAllStatsW(); updateFixedStats();
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
async function hp(p){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(p));return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');}
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
  raw = raw.trim();
  // No colon: treat as pure seconds (e.g. "30" = 30s, "90" = 90s)
  if(!raw.includes(':')){
    const n = parseInt(raw) || 0;
    return Math.min(Math.max(n, 0), 359999); // cap at 99:59:59
  }
  const parts = raw.split(':');
  if(parts.length === 3){
    // H:MM:SS
    const h = Math.min(parseInt(parts[0])||0, 99);
    const m = Math.min(parseInt(parts[1])||0, 59);
    const s = Math.min(parseInt(parts[2])||0, 59);
    return h*3600 + m*60 + s;
  }
  // MM:SS
  const m = Math.min(parseInt(parts[0])||0, 99);
  const s = Math.min(parseInt(parts[1])||0, 59);
  return m*60 + s;
}

// ═══════════════════════════════════════
// SCREENS & PAGES
// ═══════════════════════════════════════
function show(id){
  document.documentElement.classList.remove('has-user');
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('off',s.id!==id));
  if(window._checkMobile) window._checkMobile();
}

function goPg(id,btn){
  if(window._guestMode && (id==='profile'||id==='settings')){guestGuard();return;}
  document.querySelectorAll('.pg').forEach(p=>p.classList.toggle('off',p.id!=='pg-'+id));
  // Show back button on profile/settings, hide main nav buttons
  const backBtn = document.getElementById('sb-back-btn');
  const mainBtns = document.getElementById('sb-main-btns');
  const isSubPage = id==='profile'||id==='settings';
  if(backBtn) backBtn.style.display = isSubPage ? 'flex' : 'none';
  if(mainBtns) mainBtns.style.display = isSubPage ? 'none' : 'contents';
  closeWkPicker();
  if(id==='canvas'){renderCanvasGreeting();}
  if(id==='profile')renderProfile();
  if(id==='calendar')renderFullCal();
  if(id==='settings')renderSettings();
  if(id==='subjects')renderSubFull();
  if(id==='aiplanner'){if(!isPro()){showUpgradeModal('AI Daily Planner');return;}renderAIPlanner('aip-body',false);}
  LS.s('pd1_pg',id);
}

// AUTH
// ═══════════════════════════════════════
function showAuth(tab){
  show('sa');
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
  const newUser={passHash:await hp(p),displayName:'',tasks:[],journal:[],subjects:[],calEvs:[],widgets:[],notes:[],prefs:{dark:false},joined:Date.now()};
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
    const createOk=await dbCreateUser(u,await hp(p),'',authId,e);
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
}
// Merge sign-in DB data with local — trust local if it has a fresher _localTs
function _mergeSignInData(u, dbUser){
  const loc = acc[u] || {};
  const localTs = loc._localTs || 0;
  const trustLocal = localTs > 0 && localTs >= (_lastSaveTs || 0) && Object.keys(loc).length > 3;
  const cP = JSON.parse(dbUser.prefs || '{}');
  if (dbUser.avatar_url) cP.avatarUrl = dbUser.avatar_url;
  if (trustLocal) {
    acc[u] = Object.assign({}, loc, {
      passHash: dbUser.pass_hash || loc.passHash || '',
      displayName: dbUser.display_name || loc.displayName || '',
      joined: new Date(dbUser.joined_at).getTime() || loc.joined || Date.now(),
    });
    if (sbReady) dbSaveUser(u, acc[u]).catch(()=>{});
  } else {
    acc[u] = {
      passHash: dbUser.pass_hash,
      displayName: dbUser.display_name || '',
      tasks: JSON.parse(dbUser.tasks || '[]'),
      journal: JSON.parse(dbUser.journal || '[]'),
      subjects: JSON.parse(dbUser.subjects || '[]'),
      calEvs: JSON.parse(dbUser.cal_evs || '[]'),
      widgets: JSON.parse(dbUser.widgets || '[]'),
      notes: JSON.parse(dbUser.notes || '{}'),
      prefs: cP,
      joined: new Date(dbUser.joined_at).getTime() || Date.now(),
      _localTs: 0,
    };
  }
  LS.s('pd1_acc', acc);
}

async function doSI(){
  const u=$('si-u').value.trim().toLowerCase(),p=$('si-p').value;
  ce('sie','sipe');
  const rateLimitMsg=checkRateLimit(u);
  if(rateLimitMsg){fe('sie',rateLimitMsg);return;}
  if(!sbReady){fe('sie','Sync unavailable, try again.');return;}
  if(sbReady){
    // Use RPC to verify username + password server-side — works before Auth session exists
    const {data,error}=await sb.rpc('get_user_for_login',{p_username:u,p_pass_hash:await hp(p)});
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

    _mergeSignInData(u, dbUser);
  } else {
    if(!acc[u]||acc[u].passHash!==await hp(p)){recordLoginFailure(u);fe('sie','Invalid username or password.');return;}
  }
  clearLoginAttempts(u);
  cu=u;LS.s('pd1_cur',u);
  if(!acc[u].displayName||acc[u].displayName.trim()===''){
    const _d=acc[u];
    tasks=_d.tasks||[];journal=_d.journal||[];subjects=_d.subjects||[];
    calEvs=_d.calEvs||[];widgets=_d.widgets||[];notes=migrateNotes(_d.notes||[]);prefs=_d.prefs||{dark:false};
    show('sn');_obApplyAccent('green');setTimeout(()=>obGo(0),80);
  }
  else {
    startRealtimeSync(u);
    checkAndRegisterDevice(u).then(allowed => {
      if (!allowed) { showMultiDeviceBlock(); _silentSignOut(); return; }
      launch();
    });
  }
}

// ── GOOGLE AUTH ──────────────────────────────────────────────────────────────
async function doMagicLink() {
  const emailEl = document.getElementById('sa-magic-email');
  const errEl   = document.getElementById('sa-magic-err');
  const btn     = document.getElementById('sa-magic-btn');
  const email   = emailEl?.value.trim() || '';

  // Clear error
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

  if (!email || !email.includes('@')) {
    if (errEl) { errEl.textContent = 'Please enter a valid email address.'; errEl.style.display = 'block'; }
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

  try {
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'https://prodify.cc',
      }
    });
    if (error) throw error;

    // Show success state
    document.getElementById('sa-magic-form').style.display = 'none';
    const sentEl = document.getElementById('sa-magic-sent');
    const sentEmail = document.getElementById('sa-magic-sent-email');
    if (sentEl) sentEl.style.display = 'block';
    if (sentEmail) sentEmail.textContent = email;

  } catch (err) {
    if (errEl) { errEl.textContent = err.message || 'Could not send link. Please try again.'; errEl.style.display = 'block'; }
    if (btn) { btn.disabled = false; btn.textContent = 'Continue with Email'; }
  }
}

async function doGoogleAuth() {
  const btn = document.querySelector('.btn-google:not([disabled])');
  if (btn) { btn.disabled = true; btn.textContent = 'Opening Google…'; }
  try {
    if (!sbReady) throw new Error('Sync unavailable. Try again.');
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) throw error;
    // Page will redirect to Google — no further code runs here
  } catch(e) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.33 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.67 14.62 48 24 48z"/></svg> Continue with Google`;
      // Show error on the auth screen
      const saErr = document.getElementById('sa-err');
      if (saErr) { saErr.textContent = e.message || 'Google sign-in failed. Try again.'; saErr.style.display = 'block'; }
    }
  }
}

// Called on page load — handles the redirect back from Google OAuth
async function handleGoogleCallback(passedSession = null) {
  if (!sbReady) return;
  try {
    let session = passedSession;
    if (!session) {
      const { data, error } = await sb.auth.getSession();
      if (error || !data.session) return;
      session = data.session;
    }
    // Clean URL if still dirty
    if (window.location.hash.includes('access_token') || window.location.search.includes('code=')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const authUser = session.user;
    const email = authUser.email || '';
    const googleName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || '';

    // Check if a Prodify user row already exists for this email
    // Try RPC first (bypasses RLS), fall back to direct query if RPC not yet created
    let existingUser = null;
    try {
      const { data: rpcRows, error: rpcErr } = await sb.rpc('get_user_by_email', { p_email: email });
      if (!rpcErr && rpcRows && rpcRows[0]) {
        existingUser = rpcRows[0];
      } else {
        // Fallback: direct query (works if auth_id already linked or RLS allows it)
        const { data: directRow } = await sb.from('users').select('*').eq('email', email).maybeSingle();
        if (directRow) existingUser = directRow;
      }
    } catch(lookupErr) {
      console.warn('[Prodify] email lookup error:', lookupErr);
    }

    if (existingUser) {
      // Existing user — link their Google auth_id if not already linked, then log in.
      // MUST use the set_auth_id_for_user RPC (SECURITY DEFINER) — not a direct update.
      // Old accounts have no auth_id, so RLS blocks any direct .update() on their row,
      // causing the link to fail silently and ALL future dbSaveUser calls to fail too.
      let _authIdLinked = !!existingUser.auth_id; // already linked
      if (!existingUser.auth_id && authUser.id) {
        try {
          const {error: linkErr} = await sb.rpc('set_auth_id_for_user', {
            p_username: existingUser.username,
            p_pass_hash: existingUser.pass_hash || '',
            p_auth_id: authUser.id,
            p_email: email
          });
          if (linkErr) {
            console.warn('[Prodify] auth_id link failed:', linkErr.message);
          } else {
            _authIdLinked = true;
          }
        } catch(e) {
          console.warn('[Prodify] auth_id link exception:', e);
        }
      }
      const u = existingUser.username;
      // Use _localTs to decide whether local or cloud is more recent.
      // doSO keeps acc[u] in localStorage after sign-out (only pd1_cur is removed).
      // So local may be newer than cloud if the async save didn't complete in time.
      const loc = acc[u] || {};
      const localTs = loc._localTs || 0;
      // Supabase doesn't expose updated_at here, so we compare against _lastSaveTs.
      // If we have a recent local timestamp that's after the last known cloud save,
      // trust local entirely. Otherwise trust cloud.
      const trustLocal = localTs > 0 && localTs >= (_lastSaveTs || 0) && Object.keys(loc).length > 3;
      const cP = JSON.parse(existingUser.prefs || '{}');
      if (existingUser.avatar_url) cP.avatarUrl = existingUser.avatar_url;
      if (trustLocal) {
        // Local is at least as fresh — keep it, but patch in auth fields from cloud
        acc[u] = Object.assign({}, loc, {
          passHash: existingUser.pass_hash || loc.passHash || '',
          displayName: existingUser.display_name || loc.displayName || '',
          joined: new Date(existingUser.joined_at).getTime() || loc.joined || Date.now(),
        });
        // Push local state to cloud to close any gap
        if (sbReady) dbSaveUser(u, acc[u]).catch(()=>{});
      } else {
        // Cloud is source of truth
        acc[u] = {
          passHash: existingUser.pass_hash || '',
          displayName: existingUser.display_name || '',
          tasks: JSON.parse(existingUser.tasks || '[]'),
          journal: JSON.parse(existingUser.journal || '[]'),
          subjects: JSON.parse(existingUser.subjects || '[]'),
          calEvs: JSON.parse(existingUser.cal_evs || '[]'),
          widgets: JSON.parse(existingUser.widgets || '[]'),
          notes: JSON.parse(existingUser.notes || '{}'),
          prefs: cP,
          joined: new Date(existingUser.joined_at).getTime() || Date.now(),
          _localTs: 0,
        };
      }
      LS.s('pd1_acc', acc);
      cu = u; LS.s('pd1_cur', u);
      if (!acc[u].displayName || acc[u].displayName.trim() === '') {
        // Hydrate globals from the loaded account data BEFORE entering onboarding.
        // Without this, tasks/journal/widgets are still [] from app init,
        // and _obSyncGlobals() would flush empty arrays to the cloud on every step.
        const _d = acc[u];
        tasks    = _d.tasks    || [];
        journal  = _d.journal  || [];
        subjects = _d.subjects || [];
        calEvs   = _d.calEvs   || [];
        widgets  = _d.widgets  || [];
        notes    = migrateNotes(_d.notes    || []);
        prefs    = _d.prefs    || { dark: false };
        show('sn'); _obApplyAccent('green'); setTimeout(() => obGo(0), 80);
      } else {
        startRealtimeSync(u);
        checkAndRegisterDevice(u).then(allowed => {
          if (!allowed) { showMultiDeviceBlock(); _silentSignOut(); return; }
          launch();
        });
      }
    } else {
      // New Google user — let them pick a username first
      _pendingGoogleSession = { authUser, email, googleName };
      showGoogleUsernamePicker();
    }
  } catch(e) {
    console.error('[Prodify] Google callback error:', e);
  }
}

// ── GOOGLE USERNAME PICKER ───────────────────────────────────────────────────
function showGoogleUsernamePicker() {
  // Pre-fill a suggestion based on Google name/email
  const { googleName, email } = _pendingGoogleSession || {};
  const suggestion = (googleName?.split(' ')[0] || email?.split('@')[0] || '')
    .toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20);
  const inp = document.getElementById('gu-u');
  if (inp && suggestion.length >= 3) inp.value = suggestion;
  const errEl = document.getElementById('gue');
  if (errEl) errEl.textContent = '';
  show('sg');
  setTimeout(() => { if (inp) inp.focus(); }, 300);
}

function guValidate(inp) {
  const val = inp.value.trim().toLowerCase();
  const errEl = document.getElementById('gue');
  if (!errEl) return;
  if (val.length > 0 && val.length < 3) {
    errEl.textContent = 'Minimum 3 characters.';
    errEl.style.display = 'block';
  } else if (val.length > 0 && !/^[a-z0-9_]+$/.test(val)) {
    errEl.textContent = 'Letters, numbers, and underscores only.';
    errEl.style.display = 'block';
  } else {
    errEl.textContent = '';
    errEl.style.display = 'none';
  }
}

async function doGoogleUsername() {
  const inp = document.getElementById('gu-u');
  const errEl = document.getElementById('gue');
  const btn = document.getElementById('gu-btn');
  const u = inp ? inp.value.trim().toLowerCase() : '';

  if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }

  if (!u || u.length < 3) {
    if (errEl) { errEl.textContent = 'Minimum 3 characters.'; errEl.style.display = 'block'; }
    return;
  }
  if (!/^[a-z0-9_]+$/.test(u)) {
    if (errEl) { errEl.textContent = 'Letters, numbers, and underscores only.'; errEl.style.display = 'block'; }
    return;
  }
  if (!_pendingGoogleSession) {
    if (errEl) { errEl.textContent = 'Session expired. Please sign in again.'; errEl.style.display = 'block'; }
    show('sl'); return;
  }

  if (btn) { btn.textContent = 'Creating workspace…'; btn.disabled = true; }

  try {
    const { authUser, email, googleName } = _pendingGoogleSession;

    // Check username availability via RPC (SECURITY DEFINER — bypasses RLS)
    const { data: avail, error: availErr } = await sb.rpc('check_signup_availability', {
      p_username: u,
      p_email: email
    });
    if (availErr) throw new Error('Could not verify availability. Please try again.');
    const availResult = avail && avail[0];
    if (availResult && availResult.username_taken) {
      if (errEl) { errEl.textContent = 'This username is already taken.'; errEl.style.display = 'block'; }
      if (btn) { btn.textContent = 'Create my workspace'; btn.disabled = false; }
      return;
    }

    const displayName = googleName || u;
    const createOk = await dbCreateUser(u, '', displayName, authUser.id, email);
    if (!createOk) throw new Error('Account could not be created. Please try again.');

    const newUser = {
      passHash: '', displayName,
      tasks: [], journal: [], subjects: [], calEvs: [],
      widgets: [], notes: {}, prefs: { dark: false },
      joined: Date.now()
    };
    acc[u] = newUser;
    LS.s('pd1_acc', acc);
    cu = u; LS.s('pd1_cur', u);
    _pendingGoogleSession = null;
    // New user — send to onboarding (startRealtimeSync called in launch() after obFinish)
    show('sn'); _obApplyAccent('green'); setTimeout(() => obGo(0), 80);

  } catch(e) {
    if (btn) { btn.textContent = 'Create my workspace'; btn.disabled = false; }
    if (errEl) { errEl.textContent = e.message || 'Something went wrong. Try again.'; errEl.style.display = 'block'; }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pending login state for migration flow
let _pendingLogin=null;

// Pending Google session — held while user picks username
let _pendingGoogleSession = null;

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
      p_pass_hash:await hp(p),
      p_auth_id:authId,
      p_email:email
    });
    if(rpcErr){if(errEl)errEl.textContent='Save error: '+rpcErr.message;if(okBtn){okBtn.disabled=false;okBtn.textContent='Save & continue';}return;}

    // Step 4: Sign in so JWT is active for all future RLS checks
    await sbSignIn(email,p).catch(()=>{});

    closeMo('mo-migrate-email');
    _pendingLogin=null;

    _mergeSignInData(u, dbUser);
    cu=u;LS.s('pd1_cur',u);
    if(!acc[u].displayName||acc[u].displayName.trim()===''){show('sn');_obApplyAccent('green');setTimeout(()=>obGo(0),80);}
    else {
      startRealtimeSync(u);
      checkAndRegisterDevice(u).then(allowed=>{
        if(!allowed){showMultiDeviceBlock();_silentSignOut();return;}
        launch();
      });
    }
  }catch(e){
    if(errEl)errEl.textContent='Unexpected error: '+(e?.message||e);
    if(okBtn){okBtn.disabled=false;okBtn.textContent='Save & continue';}
  }
}
// ── ONBOARDING ──
let _obColor = 'green';
let _obUseCase = '';
let _obTheme = 'light';

// Apply accent to CSS vars directly — bypasses isPro() check, safe during onboarding
function _obApplyAccent(key) {
  const presets = {
    green:  { a:'#2A5C44', a2:'#3A7D5E', al:'#EBF4EF', aRgb:'42,92,68',  a2Rgb:'58,125,94' },
    blue:   { a:'#1E4A7C', a2:'#2563EB', al:'#EBF0FC', aRgb:'30,74,124', a2Rgb:'37,99,235' },
    purple: { a:'#4A2C6E', a2:'#7C3AED', al:'#F0EBFD', aRgb:'74,44,110', a2Rgb:'124,58,237' },
  };
  const c = presets[key] || presets.green;
  const root = document.documentElement;
  root.style.setProperty('--a',     c.a);
  root.style.setProperty('--a2',    c.a2);
  root.style.setProperty('--al',    c.al);
  root.style.setProperty('--a-rgb',  c.aRgb);
  root.style.setProperty('--a2-rgb', c.a2Rgb);
}

function _obSetProgress(step) {
  const fill = document.getElementById('ob-progress-fill');
  const label = document.getElementById('ob-progress-label');
  const s = Math.min(step, 3); // steps 0-3 shown, steps 4+ hide bar
  if (fill) fill.style.width = ((s + 1) / 4 * 100) + '%';
  if (label) label.textContent = 'Step ' + (s + 1) + ' of 4';
  // Hide progress on plan + all set steps
  const wrap = document.getElementById('ob-steps');
  if (wrap) wrap.style.opacity = step >= 4 ? '0' : '1';
}

function obGo(step) {
  const panels = document.querySelectorAll('.ob-panel');
  panels.forEach((p, i) => {
    if (p.classList.contains('active') && i !== step) {
      p.classList.add('exit');
      setTimeout(() => { p.classList.remove('active', 'exit'); }, 300);
    }
  });
  setTimeout(() => {
    const next = document.getElementById('ob-' + step);
    if (next) { next.classList.add('active'); next.classList.remove('exit'); }
    _obSetProgress(step);
    const inp = next && next.querySelector('input');
    if (inp) setTimeout(() => inp.focus(), 80);
  }, step === 0 ? 0 : 320);
}

function obPickUC(btn, key) {
  _obUseCase = key;
  document.querySelectorAll('.ob-uc-card').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function obPickTheme(btn, mode) {
  _obTheme = mode;
  document.querySelectorAll('.ob-theme-card').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  // Live preview — right panel only
  const obRight = document.querySelector('#sn .ob-right');
  if (obRight) {
    obRight.classList.toggle('ob-right-dark', mode === 'dark');
    obRight.classList.toggle('ob-right-light', mode === 'light');
  }
}

function obPickColor(btn, key) {
  document.querySelectorAll('.ob-color-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _obColor = key;
  _obApplyAccent(key);
  // Update left panel gradient to match chosen accent
  const leftPanel = document.querySelector('#sn .ob-left');
  if (leftPanel) {
    const gradients = {
      green:  { bg: 'linear-gradient(160deg,#0A1F15 0%,#112D1E 40%,#0D2318 100%)', glow: 'radial-gradient(ellipse at 25% 20%,rgba(58,125,94,.35) 0%,transparent 60%),radial-gradient(ellipse at 75% 80%,rgba(29,183,110,.12) 0%,transparent 50%)' },
      blue:   { bg: 'linear-gradient(160deg,#08142A 0%,#0E2048 40%,#0A1A3C 100%)', glow: 'radial-gradient(ellipse at 25% 20%,rgba(37,99,235,.35) 0%,transparent 60%),radial-gradient(ellipse at 75% 80%,rgba(30,74,170,.15) 0%,transparent 50%)' },
      purple: { bg: 'linear-gradient(160deg,#12082A 0%,#1E0E40 40%,#160A32 100%)', glow: 'radial-gradient(ellipse at 25% 20%,rgba(124,58,237,.35) 0%,transparent 60%),radial-gradient(ellipse at 75% 80%,rgba(74,44,110,.2) 0%,transparent 50%)' },
    };
    const g = gradients[key] || gradients.green;
    leftPanel.style.background = g.bg;
    // update the ::before pseudo via a data attribute driven CSS var isn't possible — apply via inline style on a child overlay
    let overlay = leftPanel.querySelector('.ob-left-glow');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'ob-left-glow';
      leftPanel.insertBefore(overlay, leftPanel.firstChild);
    }
    overlay.style.cssText = `position:absolute;inset:0;pointer-events:none;background:${g.glow};`;
  }
}

// Sync in-memory globals back into acc[cu] before any onboarding save.
// Without this, returning users who hit onboarding (e.g. empty displayName after
// Google sign-in) would overwrite their cloud data with empty arrays.
function _obSyncGlobals() {
  if (!cu || !acc[cu]) return;
  acc[cu].tasks    = tasks;
  acc[cu].journal  = journal;
  acc[cu].subjects = subjects;
  acc[cu].calEvs   = calEvs;
  acc[cu].widgets  = widgets;
  acc[cu].notes    = notes;
}

function obNext(step) {
  if (step === 0) {
    const n = document.getElementById('nin').value.trim();
    if (!n) { document.getElementById('nin').focus(); return; }
    acc[cu].displayName = n;
    _obSyncGlobals();
    LS.s('pd1_acc', acc);
    if (sbReady) dbSaveUser(cu, acc[cu]);
    const dt = document.getElementById('ob-done-title');
    if (dt) dt.textContent = 'You\'re all set, ' + n.split(' ')[0] + '!';
    obGo(1);
  } else if (step === 1) {
    if (_obUseCase) {
      if (!acc[cu].prefs) acc[cu].prefs = {};
      acc[cu].prefs.useCase = _obUseCase;
      const subs = { student: 'Ready to study smarter.', work: 'Ready to crush your goals.', personal: 'Ready to grow every day.' };
      const ds = document.getElementById('ob-done-sub');
      if (ds && subs[_obUseCase]) ds.textContent = subs[_obUseCase];
      _obSyncGlobals();
      LS.s('pd1_acc', acc);
      if (sbReady) dbSaveUser(cu, acc[cu]);
    }
    obGo(2);
  } else if (step === 2) {
    // Save free color to prefs
    if (!acc[cu].prefs) acc[cu].prefs = {};
    acc[cu].prefs.accentColor = _obColor;
    prefs = acc[cu].prefs;
    _obSyncGlobals();
    LS.s('pd1_acc', acc);
    if (sbReady) dbSaveUser(cu, acc[cu]);
    obGo(3);
  } else if (step === 3) {
    // Save dark mode
    if (!acc[cu].prefs) acc[cu].prefs = {};
    acc[cu].prefs.dark = (_obTheme === 'dark');
    prefs = acc[cu].prefs;
    _obSyncGlobals();
    LS.s('pd1_acc', acc);
    if (sbReady) dbSaveUser(cu, acc[cu]);
    obGo(4); // → plan
  } else if (step === 4) {
    obGo(5); // → all set
  } else if (step === 5) {
    obFinish();
  }
}

function obFinish() {
  acc[cu].onboarded = true;
  _obSyncGlobals();

  // Merge guest data if user signed in from preview mode
  if(window._pendingGuestData){
    const gd = window._pendingGuestData;
    window._pendingGuestData = null;
    try { sessionStorage.removeItem('pd1_guest_data'); } catch(e) {}

    if(gd.tasks    && gd.tasks.length)    acc[cu].tasks    = gd.tasks;
    if(gd.journal  && gd.journal.length)  acc[cu].journal  = gd.journal;
    if(gd.notes    && gd.notes.length)    acc[cu].notes    = gd.notes;
    if(gd.calEvs   && gd.calEvs.length)   acc[cu].calEvs   = gd.calEvs;
    if(gd.widgets  && gd.widgets.length)  acc[cu].widgets  = gd.widgets;

    // Merge prefs selectively — keep onboarding choices (color, dark, useCase)
    // but bring over habits, habitLog and pomHistory from the guest session
    if(gd.prefs){
      const p = acc[cu].prefs || {};
      if(gd.prefs.habits    && gd.prefs.habits.length)  p.habits    = gd.prefs.habits;
      if(gd.prefs.habitLog  && Object.keys(gd.prefs.habitLog).length) p.habitLog  = gd.prefs.habitLog;
      if(gd.prefs.pomHistory && Object.keys(gd.prefs.pomHistory).length) p.pomHistory = gd.prefs.pomHistory;
      acc[cu].prefs = p;
    }

    // New user converted from guest mode — track it
    const minutes = window._guestStartTime ? Math.round((Date.now() - window._guestStartTime) / 60000) : 0;
    _track('guest_converted', { minutes_spent: minutes });
    window._guestStartTime = null;
  }

  // New users start with an empty canvas — they build it themselves
  // Only set _newUser if they genuinely have no widgets (not converting from guest)
  if (!acc[cu].widgets || !acc[cu].widgets.length) {
    acc[cu].widgets = [];
    widgets = [];
    acc[cu]._newUser = true; // flag for first-time empty state hint
  } else {
    widgets = acc[cu].widgets;
  }

  LS.s('pd1_acc', acc);
  if (sbReady) dbSaveUser(cu, acc[cu]);
  // Send welcome email via Resend — fire and forget, don't block launch
  sendWelcomeEmail(acc[cu].displayName);
  checkAndRegisterDevice(cu).then(allowed => {
    if (!allowed) { showMultiDeviceBlock(); _silentSignOut(); return; }
    launch();
  });
}

// ═══════════════════════════════════════
// RESEND EMAIL
// ═══════════════════════════════════════
const RESEND_FROM = 'Prodify <hello@mail.prodify.cc>';
const RESEND_REPLY = 'prodifysupport@gmail.com';

async function resendEmail(to, subject, html){
  try{
    const { data: { session: _reSess } } = await sb.auth.getSession().catch(() => ({ data: { session: null } }));
    const _reToken = _reSess?.access_token || '';
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${_reToken}` },
      body: JSON.stringify({ from: RESEND_FROM, reply_to: RESEND_REPLY, to, subject, html }),
    });
    const data = await res.json();
    console.log('[Resend]', res.status, JSON.stringify(data));
    return res.ok;
  } catch(e){ console.error('[Resend] error:', e); return false; }
}

function _emailHtmlWrap(bodyContent, previewText=''){
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light"/>
<title>Prodify</title>
</head>
<body style="margin:0;padding:0;background:#F7F5F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
${previewText?`<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}</div>`:''}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F2;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

      <!-- HEADER -->
      <tr><td style="padding-bottom:28px;text-align:center;">
        <div style="display:inline-block;">
          <span style="font-size:32px;font-weight:900;letter-spacing:-1.5px;color:#1A1714;">Pro</span><span style="font-size:32px;font-weight:900;letter-spacing:-1.5px;color:#3A7D5E;">dify</span>
        </div>
      </td></tr>

      <!-- CARD -->
      <tr><td style="background:#ffffff;border-radius:20px;padding:40px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
        ${bodyContent}
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="padding:24px 0 8px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#B0A898;line-height:1.6;">
          © 2026 Prodify · Built by David N.<br/>
          <a href="https://prodify.cc" style="color:#3A7D5E;text-decoration:none;">prodify.cc</a> · <a href="https://prodify.cc/blog/" style="color:#B0A898;text-decoration:none;">Blog</a> · <a href="https://prodify.cc/privacy.html" style="color:#B0A898;text-decoration:none;">Privacy</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

async function sendWelcomeEmail(name){
  try{
    const { data } = await sb.auth.getUser();
    const email = data?.user?.email || '';
    if(!email) return;
    const body = `
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#3A7D5E;letter-spacing:.5px;text-transform:uppercase;">Welcome</p>
      <h1 style="margin:0 0 16px;font-size:26px;font-weight:800;color:#1A1714;letter-spacing:-.6px;line-height:1.2;">Hey ${name || 'there'} 👋</h1>
      <p style="margin:0 0 28px;font-size:15px;color:#6B6460;line-height:1.7;">Your Prodify workspace is ready. Here are a few things to try first:</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr><td style="padding:14px 0;border-bottom:1px solid #F0EDE8;">
          <span style="font-size:18px;vertical-align:middle;margin-right:12px;">✅</span>
          <span style="font-size:14px;color:#1A1714;font-weight:600;">Add your first task</span>
          <span style="font-size:14px;color:#9C978F;"> — drag it to done when finished</span>
        </td></tr>
        <tr><td style="padding:14px 0;border-bottom:1px solid #F0EDE8;">
          <span style="font-size:18px;vertical-align:middle;margin-right:12px;">🔥</span>
          <span style="font-size:14px;color:#1A1714;font-weight:600;">Start your streak</span>
          <span style="font-size:14px;color:#9C978F;"> — open Prodify every day to keep it going</span>
        </td></tr>
        <tr><td style="padding:14px 0;border-bottom:1px solid #F0EDE8;">
          <span style="font-size:18px;vertical-align:middle;margin-right:12px;">🎯</span>
          <span style="font-size:14px;color:#1A1714;font-weight:600;">Track a habit</span>
          <span style="font-size:14px;color:#9C978F;"> — check it off daily to build consistency</span>
        </td></tr>
        <tr><td style="padding:14px 0;">
          <span style="font-size:18px;vertical-align:middle;margin-right:12px;">📓</span>
          <span style="font-size:14px;color:#1A1714;font-weight:600;">Write a journal entry</span>
          <span style="font-size:14px;color:#9C978F;"> — pick a mood, reflect on your day</span>
        </td></tr>
      </table>

      <a href="https://prodify.cc" style="display:block;background:#1A1714;color:#fff;text-align:center;padding:15px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:-.2px;">Open my workspace</a>`;
    resendEmail(email, `Welcome to Prodify, ${name || 'there'}!`, _emailHtmlWrap(body, `Your workspace is ready — let's get started.`));
  } catch(e){}
}

async function maybeSendWeeklySummary(){
  if(!cu || window._guestMode) return;
  const today = new Date();
  if(today.getDay() !== 0) return; // Sunday only
  const weekKey = `pd1_weekly_${today.toISOString().slice(0,10)}`;
  try{ if(localStorage.getItem(weekKey)) return; localStorage.setItem(weekKey, '1'); } catch(e){ return; }
  try{
    const { data } = await sb.auth.getUser();
    const email = data?.user?.email || '';
    if(!email) return;
    const name = (acc[cu]?.displayName || cu || 'there').split(' ')[0];
    const streak = getAppStreak();
    const sv = streakVisual(streak);
    const completedTasks = tasks.filter(t => t.col === 'done').length;
    const weekAgo = new Date(Date.now() - 7*86400000).toISOString().slice(0,10);
    const journalCount = journal.filter(j => (j.date || '') >= weekAgo).length;
    const upcoming = calEvs
      .filter(e => e.date >= today.toISOString().slice(0,10))
      .sort((a,b) => a.date > b.date ? 1 : -1)
      .slice(0, 3);
    const upcomingHtml = upcoming.length
      ? upcoming.map(e => `
        <tr><td style="padding:12px 0;border-bottom:1px solid #F0EDE8;">
          <span style="font-size:14px;font-weight:600;color:#1A1714;">${e.title}</span>
          <span style="font-size:13px;color:#9C978F;"> · ${e.date}${e.timeStart ? ' at ' + e.timeStart : ''}</span>
        </td></tr>`).join('')
      : '<tr><td style="padding:12px 0;font-size:14px;color:#9C978F;">No upcoming events.</td></tr>';
    const body = `
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#3A7D5E;letter-spacing:.5px;text-transform:uppercase;">Weekly Summary</p>
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1A1714;letter-spacing:-.5px;">Your week in review</h1>
      <p style="margin:0 0 28px;font-size:14px;color:#9C978F;">${today.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr>
          <td width="33%" style="text-align:center;padding:20px 8px;background:#F7F5F2;border-radius:12px;">
            <div style="font-size:36px;font-weight:900;color:#1A1714;letter-spacing:-1px;">${completedTasks}</div>
            <div style="font-size:11px;font-weight:700;color:#9C978F;margin-top:4px;letter-spacing:.8px;text-transform:uppercase;">Tasks done</div>
          </td>
          <td width="4%"></td>
          <td width="33%" style="text-align:center;padding:20px 8px;background:#F7F5F2;border-radius:12px;">
            <div style="font-size:36px;font-weight:900;color:#1A1714;letter-spacing:-1px;">${journalCount}</div>
            <div style="font-size:11px;font-weight:700;color:#9C978F;margin-top:4px;letter-spacing:.8px;text-transform:uppercase;">Journal entries</div>
          </td>
          <td width="4%"></td>
          <td width="33%" style="text-align:center;padding:20px 8px;background:#F7F5F2;border-radius:12px;">
            <div style="font-size:36px;font-weight:900;color:${streak>=30?'#3A7D5E':streak>=7?'#D97706':'#1A1714'};letter-spacing:-1px;">${streak}</div>
            <div style="font-size:11px;font-weight:700;color:#9C978F;margin-top:4px;letter-spacing:.8px;text-transform:uppercase;">${sv.icon} Day streak</div>
          </td>
        </tr>
      </table>

      ${upcoming.length ? `
      <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#9C978F;letter-spacing:.8px;text-transform:uppercase;">Coming up</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">${upcomingHtml}</table>` : ''}

      <a href="https://prodify.cc" style="display:block;background:#1A1714;color:#fff;text-align:center;padding:15px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:-.2px;">Open Prodify</a>`;
    resendEmail(email, `Your week in review, ${name} 📊`, _emailHtmlWrap(body, `${completedTasks} tasks done · ${streak} day streak — here's your week.`));
  } catch(e){}
}

// Legacy — keep for any stray calls
function doName() {
  const n = $('nin').value.trim(); if (!n) return;
  obNext(0);
}
// ── PHOTO UPLOAD ──
async function handlePhotoUpload(e){
  const file=e.target.files[0];if(!file)return;
  const url=await uploadAvatarToStorage(file);
  if(!url){appConfirm('Photo upload failed','Please try again.','OK');return;}
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

// Silent sign out — used by device block, no confirmation dialog
async function _silentSignOut() {
  try {
    if (cu) await unregisterDevice(cu);
    if (sbReady) await sb.auth.signOut().catch(()=>{});
  } catch(e) {}
  // Clear local state
  try { localStorage.removeItem('pd1_cur'); } catch(e) {}
  cu = null;
  show('sl');
}

async function doSO(){
  if(window._guestMode){ exitGuestMode(); return; }
  const ok = await appConfirm('Sign out?', 'You will be returned to the landing page.', 'Sign out');
  if(!ok) return;
  const _cu = cu;
  _pendingGoogleSession = null;
  // Flush any pending debounced save and do a final cloud save BEFORE signing out.
  // sbSignOut() kills the JWT immediately — any in-flight or debounced dbSaveUser
  // calls after that point will fail RLS and the user's last changes are lost.
  if(_persistTimer){ clearTimeout(_persistTimer); _persistTimer=null; }
  if(_cu && sbReady && acc[_cu]){
    const _d = acc[_cu];
    _d.tasks=tasks;_d.journal=journal;_d.subjects=subjects;
    _d.calEvs=calEvs;_d.widgets=widgets;_d.notes=notes;_d.prefs=prefs;
    _d._localTs=Date.now();
    LS.s('pd1_acc', acc);
    await dbSaveUser(_cu, _d).catch(()=>{});
  }
  await unregisterDevice(_cu);
  stopRealtimeSync();
  if(sbReady) await sbSignOut().catch(()=>{});  // must await — unregisterDevice needs JWT active
  LS.d('pd1_cur'); LS.d('pd1_pg'); cu = null; closeDD();
  // Always reset to light mode + default green accent on landing/auth screens
  document.documentElement.setAttribute('data-dark','');
  const root = document.documentElement;
  root.style.removeProperty('--a');
  root.style.removeProperty('--a2');
  root.style.removeProperty('--al');
  document.body.classList.remove('in-app');
  // Hide AI planner float button and panel
  const aipBtn=document.getElementById('aip-float-btn');if(aipBtn)aipBtn.style.display='none';
  const aipPanel=document.getElementById('aip-panel');if(aipPanel)aipPanel.style.display='none';
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
  // If local data was saved more recently than the last known cloud write,
  // skip the pull entirely — we'd only overwrite newer local state with older cloud data.
  // This is the main cause of the 1-3 minute wipe: tab becomes visible after
  // >10s, pullFromCloud fires, and blindly stomps local changes that haven't
  // finished syncing to cloud yet.
  const localTs = (acc[cu]||{})._localTs || 0;
  if(localTs > 0 && Date.now()-localTs < 3000) return; // local change too recent (<3s)
  try{
    const dbUser=await dbGetUser(cu);
    if(!dbUser){
      // Could not fetch from DB — if we have a valid session, keep local data
      const {data:{session:chkSession}} = await sb.auth.getSession().catch(()=>({data:{session:null}}));
      if(chkSession){ return; } // stay on local — do not wipe or re-launch
      doSO(); return;
    }
    const oldWidgetIds=widgets.map(x=>x.id).sort().join(',');
    const pulledPrefs=JSON.parse(dbUser.prefs||'{}');
    if(dbUser.avatar_url) pulledPrefs.avatarUrl=dbUser.avatar_url;
    // Re-check localTs here too — the async fetch took time and user may have
    // added data while we were waiting for the DB response
    const pullLocalTs = (acc[cu]||{})._localTs || 0;
    // Only abort if local was saved in the last 3s — longer window means cross-device
    if(pullLocalTs > 0 && Date.now()-pullLocalTs < 3000 && pullLocalTs > _lastSaveTs){
      return;
    }
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
      _localTs:0, // cloud data — no local timestamp
    };
    LS.s('pd1_acc',acc);
    tasks=normalizeTasks(acc[cu].tasks);acc[cu].tasks=tasks;journal=normalizeJournal(acc[cu].journal);acc[cu].journal=journal;subjects=acc[cu].subjects;
    calEvs=acc[cu].calEvs;widgets=acc[cu].widgets;notes=migrateNotes(acc[cu].notes);prefs=acc[cu].prefs;
    const newWidgetIds=widgets.map(x=>x.id).sort().join(',');
    if(oldWidgetIds!==newWidgetIds){
      renderCanvas();
    } else {
      renderAllTaskW();renderAllJournalW();renderAllSubW();
      renderFullCal();widgets.forEach(w=>fillWBody(w));
    }
    updateAllStatsW();updateFixedStats();
  }catch(e){}
}

let _hiddenAt=0;
let _realtimeStarted=false; // guard against duplicate visibilitychange listeners
function startRealtime(){
  if(_realtimeStarted) return; // already registered — do not stack listeners
  _realtimeStarted=true;
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden'){
      _hiddenAt=Date.now();
    } else if(document.visibilityState==='visible'){
      // Only pull if we've been away for more than 10 seconds
      if(_hiddenAt&&Date.now()-_hiddenAt>10000) pullFromCloud();
    }
  });
}

function renderCanvasGreeting(){
  const el=document.getElementById('canvas-greeting-text');
  if(!el)return;
  const name=(acc[cu]?.displayName||cu||'').split(' ')[0];
  const h=new Date().getHours();
  const g=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
  el.textContent=name?`${g}, ${name}.`:`${g}.`;
  renderCanvasStreak();
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
  // Merge guest data if user signed in from preview mode (returning user path)
  if(window._pendingGuestData){
    const gd = window._pendingGuestData;
    window._pendingGuestData = null;
    try { sessionStorage.removeItem('pd1_guest_data'); } catch(e) {}
    if(gd.tasks    && gd.tasks.length)    d.tasks    = [...gd.tasks,    ...(d.tasks||[])];
    if(gd.journal  && gd.journal.length)  d.journal  = [...gd.journal,  ...(d.journal||[])];
    if(gd.notes    && gd.notes.length)    d.notes    = [...gd.notes,    ...(d.notes||[])];
    if(gd.calEvs   && gd.calEvs.length)   d.calEvs   = [...gd.calEvs,   ...(d.calEvs||[])];
    if(gd.widgets  && gd.widgets.length)  d.widgets  = gd.widgets;
    if(gd.prefs){
      const p = d.prefs || {};
      if(gd.prefs.habits     && gd.prefs.habits.length)                   p.habits     = gd.prefs.habits;
      if(gd.prefs.habitLog   && Object.keys(gd.prefs.habitLog).length)    p.habitLog   = gd.prefs.habitLog;
      if(gd.prefs.pomHistory && Object.keys(gd.prefs.pomHistory).length)  p.pomHistory = gd.prefs.pomHistory;
      d.prefs = p;
    }
    acc[cu] = d;
    LS.s('pd1_acc', acc);
    if(sbReady) dbSaveUser(cu, d).catch(()=>{});
  }
  tasks=d.tasks||[];journal=d.journal||[];subjects=d.subjects||[];
  calEvs=d.calEvs||[];widgets=d.widgets||[];notes=migrateNotes(d.notes||[]);prefs=d.prefs||{dark:false};
  // avatarUrl lives inside prefs — already set before launch() is called in doSI
  // just make sure it wasn't lost when prefs was reassigned above
  if(d.prefs?.avatarUrl) prefs.avatarUrl=d.prefs.avatarUrl;
  const nm=d.displayName||cu,av=nm[0].toUpperCase();
  const ddnmEl=$('ddnm'), ddunEl=$('ddun');
  if(ddnmEl) ddnmEl.textContent=nm;
  if(ddunEl) ddunEl.textContent='@'+cu;
  const floatBtn=document.getElementById('aip-float-btn');if(floatBtn)floatBtn.style.display='flex';
  applyAvatar();
  // _evDate is set by openCalAdd/openCalEdit
  applyTheme();
  scheduleRecurringCheck();
  // Check waitlist status in background
  checkWaitlist();
  renderProBadge();
  // Close any stray open modals before transition
  document.querySelectorAll('.ov.open').forEach(o => o.classList.remove('open'));
  // Prepare app fully before revealing — no glimpse
  const snEl = document.getElementById('sn');
  const appEl = document.getElementById('app');
  // Run all renders while app is still hidden
  goPg('canvas',null); // always start on dashboard
  renderCanvas();
  renderCanvasGreeting();
  renderCanvasStreak();
  // Weekly summary — delayed so it doesn't block app load
  setTimeout(maybeSendWeeklySummary, 2000);
  updateFixedStats();
  if (snEl && appEl) {
    // Stage app: visible in DOM but fully transparent, no transform
    appEl.style.cssText = 'opacity:0;transform:none;transition:none;pointer-events:none;visibility:visible;position:fixed;inset:0;z-index:0;';
    appEl.classList.remove('off');
    // Check mobile wall immediately — before any animation starts
    if(window._checkMobile) window._checkMobile();
    // If mobile wall is showing, abort the canvas animation entirely
    var mobScreen = document.getElementById('mobile-only-screen');
    if(mobScreen && mobScreen.style.display === 'flex'){
      appEl.style.cssText = '';
      return;
    }
    // Force reflow so the opacity:0 state is painted before we animate
    void appEl.offsetHeight;
    // Fade onboarding out
    snEl.style.transition = 'opacity .4s ease';
    snEl.style.opacity = '0';
    setTimeout(() => {
      // Hide onboarding completely
      snEl.classList.add('off');
      snEl.style.cssText = '';
      // Fade app in
      appEl.style.transition = 'opacity .4s ease';
      appEl.style.opacity = '1';
      setTimeout(() => {
        // Restore normal screen styles
        appEl.style.cssText = '';
        document.body.classList.add('in-app');
        startRealtime();
        if(window._checkMobile) window._checkMobile();
        }, 420);
    }, 420);
  } else {
    show('app');
    document.body.classList.add('in-app');
    startRealtime();
    if(window._checkMobile) window._checkMobile();
    }
  startRealtimeSync(cu);
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
  if(!msg){appConfirm('Nothing to send','Please write a message before sending.','OK');return;}
  const succId=isDesktop?'dsk-fb-success':'fb-success';
  const succEl=$(succId);
  const btnId=isDesktop?'dsk-fb-submit':'fb-submit';
  const btn=$(btnId);
  if(btn){btn.disabled=true;btn.textContent='Sending…';}
  try{
    // Send feedback via Resend
    const feedbackHtml = _emailHtmlWrap(`
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#3A7D5E;letter-spacing:.5px;text-transform:uppercase;">Feedback received</p>
      <h1 style="margin:0 0 28px;font-size:24px;font-weight:800;color:#1A1714;letter-spacing:-.5px;">${_fbType.charAt(0).toUpperCase()+_fbType.slice(1)} feedback</h1>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:14px 0;border-bottom:1px solid #F0EDE8;">
          <div style="font-size:11px;font-weight:700;color:#9C978F;letter-spacing:.8px;text-transform:uppercase;margin-bottom:4px;">From</div>
          <div style="font-size:14px;color:#1A1714;font-weight:600;">${cu||'anonymous'}</div>
        </td></tr>
        <tr><td style="padding:14px 0;border-bottom:1px solid #F0EDE8;">
          <div style="font-size:11px;font-weight:700;color:#9C978F;letter-spacing:.8px;text-transform:uppercase;margin-bottom:4px;">Rating</div>
          <div style="font-size:20px;">${_fbStar ? '⭐'.repeat(_fbStar) : '<span style="font-size:14px;color:#9C978F;">No rating</span>'}</div>
        </td></tr>
        <tr><td style="padding:14px 0;">
          <div style="font-size:11px;font-weight:700;color:#9C978F;letter-spacing:.8px;text-transform:uppercase;margin-bottom:8px;">Message</div>
          <div style="font-size:15px;color:#1A1714;line-height:1.7;">${msg}</div>
        </td></tr>
      </table>`, `New ${_fbType} feedback from ${cu||'anonymous'}`);
    await resendEmail(RESEND_REPLY, `Prodify Feedback — ${_fbType}`, feedbackHtml);
    // Also save to Supabase for records
    if(sbReady){
      await sb.from('feedback').insert({
        username: cu||null,
        type: _fbType,
        rating: _fbStar||null,
        message: msg
      });
    }
    if(succEl){succEl.style.display='block';}
    if($(msgId))$(msgId).value='';
    _fbStar=0; initFbStars();
    setTimeout(()=>{if(succEl)succEl.style.display='none';if(isDesktop)closeMo('mo-feedback');},2500);
  }catch(e){
    appConfirm('Failed to send','Something went wrong. Please try again.','OK');
    console.warn('[Prodify] Feedback error:',e);
  }finally{
    if(btn){btn.disabled=false;btn.textContent='Send Feedback';}
  }
}


// Boot: load local first, sync cloud silently after
(async function boot(){
  document.documentElement.setAttribute('data-dark',''); // start light until app loads
  // If this is an OAuth redirect, hide all screens and let handleGoogleCallback take over
  const isOAuthRedirect = window.location.hash.includes('access_token') ||
                          window.location.search.includes('code=');
  if (isOAuthRedirect) {
    window._oauthRedirectInProgress = true;
    document.querySelectorAll('.screen').forEach(s => s.classList.add('off'));
    return;
  }
  const u=LS.g('pd1_cur',null);
  if(!u){show('sl');return;}
  cu=u;
  if(!acc[u]){acc[u]={tasks:[],journal:[],subjects:[],calEvs:[],widgets:[],notes:[],prefs:{dark:false},displayName:'',passHash:''};}
  // Wait for Supabase device check before launching — prevents bypass
  try{
    if(!sbReady){
      // Offline — still run device check (grace period logic inside)
      const deviceAllowed = await checkAndRegisterDevice(cu);
      if (!deviceAllowed) {
        LS.d('pd1_cur'); cu = null;
        document.documentElement.setAttribute('data-dark','');
        const _r=document.documentElement;_r.style.removeProperty('--a');_r.style.removeProperty('--a2');_r.style.removeProperty('--al');
        document.body.classList.remove('in-app');
        show('sl'); showMultiDeviceBlock(); return;
      }
      launch(); return;
    }
    const {data:{session}} = await sb.auth.getSession();
    if(!session){
      // No session in memory — try refreshing from stored token
      const {data:refreshed,error:refreshErr} = await sb.auth.refreshSession();
      if(refreshErr||!refreshed?.session){
        // Session expired — check device grace period before launching
        console.warn('[Prodify] Session expired, checking device grace period');
        const deviceAllowed = await checkAndRegisterDevice(cu);
        if (!deviceAllowed) {
          LS.d('pd1_cur'); cu = null;
          document.documentElement.setAttribute('data-dark','');
          const _r=document.documentElement;_r.style.removeProperty('--a');_r.style.removeProperty('--a2');_r.style.removeProperty('--al');
          document.body.classList.remove('in-app');
          show('sl'); showMultiDeviceBlock(); return;
        }
        launch(); return;
      }
    }
    const dbUser=await dbGetUser(cu);
    if(!dbUser){
      // Could not fetch from DB — if we have a valid session, launch from local data
      // rather than signing out (happens for Google auth users before RLS is fully set up)
      const {data:{session:chkSession}} = await sb.auth.getSession().catch(()=>({data:{session:null}}));
      if(chkSession){
        console.warn('[Prodify] dbGetUser returned null but session exists — launching from local data');
        launch(); return;
      }
      doSO(); return;
    }
    // Use _localTs to decide whether local or cloud is the freshest copy.
    // _localTs is stamped on every persist() and beforeunload, so it's always
    // current. If local is newer, keep it and push to cloud. Otherwise use cloud.
    const loc=acc[cu]||{};
    const localTs = loc._localTs || 0;
    const trustLocal = localTs > 0 && localTs >= (_lastSaveTs || 0) && Object.keys(loc).length > 3;
    const cP=JSON.parse(dbUser.prefs||'{}');
    if(dbUser.avatar_url) cP.avatarUrl = dbUser.avatar_url;
    let fT,fJ,fS,fC,fW,fN,fP;
    if(trustLocal){
      // Local is fresher — use it wholesale, sync back to cloud
      fT=loc.tasks||[];fJ=loc.journal||[];fS=loc.subjects||[];
      fC=loc.calEvs||[];fW=loc.widgets||[];fN=migrateNotes(loc.notes||[]);
      fP=loc.prefs||{};
      if(dbUser.avatar_url) fP.avatarUrl=dbUser.avatar_url;
    } else {
      // Cloud is source of truth
      fT=JSON.parse(dbUser.tasks||'[]');fJ=JSON.parse(dbUser.journal||'[]');
      fS=JSON.parse(dbUser.subjects||'[]');fC=JSON.parse(dbUser.cal_evs||'[]');
      fW=JSON.parse(dbUser.widgets||'[]');fN=migrateNotes(JSON.parse(dbUser.notes||'[]'));
      fP=cP;
    }
    acc[cu]={passHash:dbUser.pass_hash,displayName:dbUser.display_name||loc.displayName||'',
      tasks:fT,journal:fJ,subjects:fS,calEvs:fC,widgets:fW,notes:fN,prefs:fP,joined:loc.joined||Date.now(),_localTs:loc._localTs||0};
    LS.s('pd1_acc',acc);
    tasks=fT;journal=fJ;subjects=fS;calEvs=fC;widgets=fW;notes=fN;
    prefs=fP;
    if(dbUser.avatar_url) prefs.avatarUrl = dbUser.avatar_url;
    acc[cu].prefs = prefs;
    // If local was ahead, push it to cloud now to close the gap
    if(trustLocal && sbReady) dbSaveUser(cu, acc[cu]).catch(()=>{});




    // Device check — must pass before app launches
    const deviceAllowed = await checkAndRegisterDevice(cu);
    if (!deviceAllowed) {
      stopRealtimeSync();
      if(sbReady) sbSignOut().catch(()=>{});
      LS.d('pd1_cur'); cu = null;
      document.documentElement.setAttribute('data-dark','');
      const _r=document.documentElement;_r.style.removeProperty('--a');_r.style.removeProperty('--a2');_r.style.removeProperty('--al');
      document.body.classList.remove('in-app');
      show('sl');
      showMultiDeviceBlock();
      return;
    }
    // Device check passed — launch app
    launch();
    // launch() already calls goPg, renderCanvas, applyTheme, updateFixedStats,
    // startRealtime and startRealtimeSync — no need to call any of them again here.
    
  }catch(e){console.warn('[Prodify] cloud sync failed',e);}
})();

// ═══════════════════════════════════════
// PERSIST
// ═══════════════════════════════════════
function persist(){
  if(window._guestMode) return;
  if(!cu)return;
  // Snapshot before writing so all direct persist() calls get a backup,
  // not just calls that go through window.persist (the old monkey-patch approach
  // missed any direct persist() call since JS closures don't see the patched version).
  if(typeof backupSnapshotToday==='function') backupSnapshotToday();
  const d=acc[cu];
  d.tasks=tasks;d.journal=journal;d.subjects=subjects;d.calEvs=calEvs;
  d.widgets=widgets;d.notes=notes;d.prefs=prefs;
  d._localTs=Date.now(); // timestamp every local save for sign-in merge
  LS.s('pd1_acc',acc);
  dbSaveUser(cu,d);
}
window.persist = persist;

// Debounced persist — use for high-frequency changes (typing, slider, etc.)
let _persistTimer=null;
function debouncedPersist(delay=600){
  clearTimeout(_persistTimer);
  _persistTimer=setTimeout(persist,delay);
}

// Save on page unload — fires on refresh, tab close, navigation.
// dbSaveUser uses fetch under the hood. We pass keepalive:true via a direct
// fetch so the browser keeps the request alive after the page closes — far more
// reliable than a plain async call which the browser kills mid-flight.
window.addEventListener('beforeunload', function() {
  if(!cu || !acc[cu]) return;
  const _d = acc[cu];
  _d.tasks=tasks;_d.journal=journal;_d.subjects=subjects;
  _d.calEvs=calEvs;_d.widgets=widgets;_d.notes=notes;_d.prefs=prefs;
  _d._localTs = Date.now(); // stamp before writing
  // Synchronous — always completes before unload
  LS.s('pd1_acc', acc);
  try{ localStorage.setItem('pd1_lastSaveTs', String(_d._localTs)); }catch(e){}
  // keepalive:true survives page close; falls back to regular dbSaveUser if Supabase
  // client exposes a way to pass it — for now fire both and let the winner count.
  if(sbReady) dbSaveUser(cu, _d).catch(()=>{});
});

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

// Widget picker
function toggleWkPicker(){}
function closeWkPicker(){}

// ═══════════════════════════════════════
// MODALS
// ═══════════════════════════════════════
function openMo(id){
  const el=$(id); if(!el){ console.warn('[Prodify] openMo: element not found:', id); return; }
  el.classList.add('open');
  if(id==='mo-feedback'){_fbType='general';_fbStar=0;setTimeout(initFbStars,50);}
  if(id==='mo-about'){
    const nameEl = document.getElementById('about-display-name');
    const unEl   = document.getElementById('about-username');
    if(nameEl) nameEl.textContent = 'David N.';
    if(unEl)   unEl.textContent   = 'Creator of Prodify';
  }
}
function closeMo(id){ const el=$(id); if(el) el.classList.remove('open'); }

// ═══════════════════════════════════════
// DARK MODE
// ═══════════════════════════════════════
function applyTheme(){
  // Only apply dark mode when user is logged in (inside app) — never on login/onboarding
  document.documentElement.setAttribute('data-dark', (prefs.dark && cu) ? '1' : '');
  const t=$('tog-dk');if(t)t.className='tog'+(prefs.dark?' on':'');
  const mt=$('mob-tog-dk');if(mt)mt.className='tog'+(prefs.dark?' on':'');
  // Apply custom accent color — Pro only, free users always get green
  const root = document.documentElement;
  const freeColors = ['green','blue','purple'];
  const accentKey = prefs.accentColor || prefs.accentKey || 'green';
  const isFreeColor = freeColors.includes(accentKey);
  if(accentKey && accentKey !== 'green' && (isPro() || isFreeColor)){
    const acc = deriveAccent(accentKey);
    root.style.setProperty('--a', acc.a);
    root.style.setProperty('--a2', acc.a2);
    root.style.setProperty('--al', (prefs.dark && cu && acc.ald) ? acc.ald : acc.al);
    if(acc.a2Rgb) root.style.setProperty('--a2-rgb', acc.a2Rgb);
  } else if(accentKey === 'green') {
    root.style.removeProperty('--a');
    root.style.removeProperty('--a2');
    root.style.removeProperty('--al');
    root.style.removeProperty('--a2-rgb');
  } else {
    root.style.removeProperty('--a');
    root.style.removeProperty('--a2');
    root.style.removeProperty('--al');
    root.style.removeProperty('--a2-rgb');
  }
  // Sync color picker UI
  const picks = document.querySelectorAll('.accent-swatch.selected');
  picks.forEach(s => s.classList.remove('selected'));
  const cur = prefs.accentColor || prefs.accentKey || 'green';
  document.querySelectorAll(`.accent-swatch[data-key="${cur}"]`).forEach(s => s.classList.add('selected'));
  // Sync hex input + preview
  const hexInp = document.getElementById('accent-hex-input');
  const hexPrev = document.getElementById('accent-hex-preview');
  const derived = deriveAccent(cur);
  if (hexPrev) hexPrev.style.background = derived.a2;
  if (hexInp && cur.startsWith('#')) hexInp.value = cur.replace('#','');
  else if (hexInp) hexInp.value = '';
  // Re-inject pro ring with updated accent
  if (typeof renderProBadgeRing === 'function') renderProBadgeRing();
}

// Derive --a, --a2, --al from a hex color
function hexToHsl(hex){
  let r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b);let h,s,l=(max+min)/2;
  if(max===min){h=s=0;}else{const d=max-min;s=l>0.5?d/(2-max-min):d/(max+min);
    switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break;}h/=6;}
  return [Math.round(h*360),Math.round(s*100),Math.round(l*100)];
}
function hslStr(h,s,l){return `hsl(${h},${s}%,${l}%)`;}
function deriveAccent(key){
  const presets={
    green:{a:'#2A5C44',a2:'#3A7D5E',al:'#EBF4EF',ald:'#172A20',a2Rgb:'58,125,94'},
    blue:{a:'#1E4A7C',a2:'#2563EB',al:'#EBF0FC',ald:'#0F1E3A',a2Rgb:'37,99,235'},
    purple:{a:'#4A2C6E',a2:'#7C3AED',al:'#F0EBFD',ald:'#1E1030',a2Rgb:'124,58,237'},
    rose:{a:'#7C1D2C',a2:'#E11D48',al:'#FDEEF1',ald:'#2A0A10',a2Rgb:'225,29,72'},
    amber:{a:'#7A4A00',a2:'#D97706',al:'#FEF3C7',ald:'#281900',a2Rgb:'217,119,6'},
    teal:{a:'#0F4C4C',a2:'#0D9488',al:'#EBFAFA',ald:'#061E1E',a2Rgb:'13,148,136'},
    slate:{a:'#2A3548',a2:'#475569',al:'#EEF0F4',ald:'#131820',a2Rgb:'71,85,105'},
  };
  if(presets[key]) return presets[key];
  // custom hex
  if(key.startsWith('#')){
    const [h,s,l]=hexToHsl(key);
    const a2=hslStr(h,s,l);
    // convert a2 hex to rgb for rgba() usage
    const r=parseInt(a2.slice(1,3),16),g=parseInt(a2.slice(3,5),16),b=parseInt(a2.slice(5,7),16);
    return {a:hslStr(h,Math.max(s-10,20),Math.max(l-15,20)),a2,al:hslStr(h,Math.min(s,60),93),ald:hslStr(h,Math.min(s,80),12),a2Rgb:r+','+g+','+b};
  }
  return presets.green;
}

function setAccentColor(key){
  const freeColors = ['green','blue','purple'];
  if(!isPro() && !freeColors.includes(key)){showUpgradeModal('Custom Accent Color');return;}
  prefs.accentColor=key;
  persist();
  applyTheme();
}

function accentHexInput(inp){
  // Live preview as user types
  const val = inp.value.replace(/[^0-9a-fA-F]/g,'').slice(0,6);
  inp.value = val;
  const prev = document.getElementById('accent-hex-preview');
  if(prev && val.length===6) prev.style.background = '#'+val;
}

function accentHexConfirm(){
  if(!isPro()){showUpgradeModal('Custom Accent Color');return;}
  const inp = document.getElementById('accent-hex-input');
  if(!inp) return;
  const val = inp.value.replace(/[^0-9a-fA-F]/g,'');
  if(val.length !== 6) return;
  setAccentColor('#'+val);
}
function togDark(btn){prefs.dark=!prefs.dark;persist();applyTheme();}

// ═══════════════════════════════════════
// ═══════════════════════════════════════
// STATS BAR
// ═══════════════════════════════════════
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
  journal:{w:420,h:340,title:'Journal'},
  timer:{w:320,h:400,title:'Focus Timer'},
  note:{w:340,h:240,title:'Notes'},
  stats:{w:320,h:200,title:'Stats'},
  quote:{w:280,h:160,title:'Quote'},
  calendar:{w:540,h:420,title:'Calendar'},
  habits:{w:340,h:380,title:'Daily Habits'},
  sticky:{w:220,h:200,title:'Sticky'},
};

function bringToFront(id) {
  const w = widgets.find(x => x.id === id);
  if (!w) return;
  const maxZ = widgets.reduce((m, x) => Math.max(m, x.z || 10), 10);
  w.z = maxZ + 1;
  const el = $(id);
  if (el) el.style.zIndex = w.z;
  persist();
}

// Toggle widget — if on canvas: scroll to & highlight it. If not: add it.
function toggleW(type) {
  const existing = widgets.find(w => w.type === type);
  if (existing) {
    const el = $(existing.id);
    if (el) {
      bringToFront(existing.id);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.outline = '2px solid var(--a2)';
      setTimeout(() => el.style.outline = '', 900);
    }
  } else {
    addW(type);
  }
  updateWToggleStates();
}

// Update active state on nav toggle buttons
function updateWToggleStates() {
  // No persistent active state — widget toggles only react on hover
  ['tasks','habits','timer','journal','calendar','note'].forEach(type => {
    const btn = document.getElementById('wtb-' + type);
    if (btn) btn.classList.remove('act');
  });
}

function addW(type,opts={}) {
  _track('widget_added', { type: type });
  // Single-instance rule — all widgets are single instance
  if(true){
    const existing=widgets.find(w=>w.type===type);
    if(existing){
      // Flash/focus the existing widget
      const el=$(existing.id);
      if(el){bringToFront(existing.id);el.style.outline='2px solid var(--a2)';setTimeout(()=>el.style.outline='',800);}
      return;
    }
  }
  const def=WD[type]||{w:300,h:240,title:type};
  const wrap=$('canvas-wrap')||document.querySelector('.canvas-wrap');
  // Account for canvas zoom scale so widget spawns at correct visual position
  const scale=window._canvasScale||1;
  const sx=(wrap?wrap.scrollLeft:0)/scale;
  const sy=(wrap?wrap.scrollTop:0)/scale;
  const cw=(wrap?wrap.clientWidth:800)/scale;
  const ch=(wrap?wrap.clientHeight:600)/scale;
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
  // Always place new widget above every existing one — fixes "spawns behind" bug
  const maxZ=widgets.reduce((m,w)=>Math.max(m,w.z||10),10);
  const topZ=Math.max(maxZ+1,nextZ);
  nextZ=topZ+1;
  const ent={id,type,x:Math.round(x),y:Math.round(y),w:opts.w||def.w,h:opts.h||def.h,title:opts.title||def.title,z:topZ};
  if(type==='note') ent._noteOpen=null; // will be set in buildNoteW
  widgets.push(ent);
  if(cu&&acc[cu]) acc[cu].hasAddedWidget=true; // mark without triggering extra persist
  const hint=$('canvas-hint');if(hint)hint.remove();
  const emptyState=document.getElementById('canvas-empty-state');if(emptyState)emptyState.remove();
  persist(); // single persist — removed duplicate call
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
  updateWToggleStates();
  if(!widgets.length) renderCanvas(); // show empty state if canvas is now empty
}

async function clearCanvas(){
  closeWkPicker();
  if(!await appConfirm('Clear the canvas?','All widgets will be removed. Your data is still saved — you can add them back anytime.','Clear'))return;
  widgets.forEach(w=>{if(TMS[w.id]){clearInterval(TMS[w.id].iv);if(TMS[w.id].alarmActive)stopAlarm();delete TMS[w.id];}});
  widgets=[];persist();renderCanvas();
}

function renderCanvas(){
  $('canvas').innerHTML='';
  if(!widgets.length){
    nextZ=10;
    // Empty state — only shown when no widgets are present
    const name=(acc[cu]?.displayName||'').split(' ')[0];
    const h=new Date().getHours();
    const g=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
    const greeting=name?`${g}, ${name}.`:`${g}.`;
    const empty=document.createElement('div');
    empty.id='canvas-empty-state';
    empty.style.cssText='position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;user-select:none;gap:10px;padding-bottom:80px;';
    empty.innerHTML=`
      <div style="font-size:28px;font-weight:800;letter-spacing:-.6px;color:var(--ink2);opacity:.55;">${greeting}</div>
      <div style="font-size:13px;color:var(--ink4);font-weight:500;">Your workspace is empty — add a widget to get started.</div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:8px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink4)" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
        <span style="font-size:11px;color:var(--ink4);font-weight:600;letter-spacing:.3px;">USE THE TOOLBAR BELOW TO ADD WIDGETS</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink4)" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
      </div>`;
    const canvas=$('canvas');
    if(canvas) canvas.appendChild(empty);
    return;
  }
  // Always sync nextZ from the actual highest stored z — prevents new widgets spawning behind existing ones
  const mz=widgets.reduce((m,w)=>Math.max(m,w.z||10),10);
  nextZ=mz+1;
  widgets.forEach(w=>buildWidgetEl(w));
  updateWToggleStates();
}

function buildWidgetEl(w){
  const WICONS={
    tasks:`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>`,
    journal:`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
    timer:`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 3h6"/></svg>`,
    habits:`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-5"/></svg>`,
    subjects:`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 17.5h7M17.5 14v7"/></svg>`,
    calendar:`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 9h18M8 2v3M16 2v3"/></svg>`,
    note:`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8l4-4V4a2 2 0 0 0-2-2z"/><path d="M14 2v4h4M8 13h8M8 9h8M8 17h5"/></svg>`,
  };
  const wicon=WICONS[w.type]?`<span style="display:inline-flex;align-items:center;opacity:.5;margin-right:5px;flex-shrink:0;">${WICONS[w.type]}</span>`:'';
  const el=document.createElement('div');
  el.className='widget';el.id=w.id;
  el.dataset.type=w.type;
  // Clamp saved position to canvas bounds so no widget is off-screen on load
  const _cvs=document.getElementById('canvas');
  if(_cvs){
    w.x=Math.min(Math.max(0,w.x), Math.max(0,_cvs.clientWidth  - w.w));
    w.y=Math.min(Math.max(0,w.y), Math.max(0,_cvs.clientHeight - w.h));
  }
  const isSticky = w.type === 'sticky';
  el.style.cssText=`left:${w.x}px;top:${w.y}px;width:${w.w}px;height:${w.h}px;z-index:${w.z||10};${isSticky?`--sticky-color:${w.color||'#fef9c3'};`:''}`;

  el.innerHTML=`
    <div class="whead" id="wh-${w.id}" style="${isSticky ? `background:${w.color||'#fef9c3'};border-bottom:1px solid rgba(0,0,0,0.08);` : ''}">
      ${isSticky ? `<span style="font-size:11px;font-weight:700;color:rgba(0,0,0,0.4);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(w.title||'Sticky')}</span>` : `<span class="whtit">${esc(w.title&&w.title!=='undefined'?w.title:(WD[w.type]?.title||w.type))}</span>`}
      ${!isSticky && w.type==='journal'?`<button class="whead-search-btn" id="jwsib-${w.id}" onclick="jwToggleSearch('${w.id}')" data-tip="Search"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></button>`:''}
      <button class="wclose" onclick="removeW('${w.id}')" data-tip="Remove"><svg viewBox="0 0 10 10"><path d="M2 2l6 6M8 2l-6 6"/></svg></button>
    </div>
    <div class="wbody" id="wb-${w.id}" style="${isSticky ? `background:${w.color||'#fef9c3'};` : ''}"></div>
    <div class="wrsz" onpointerdown="startResize(event,'${w.id}')">
      <svg viewBox="0 0 8 8"><path d="M7 1L1 7"/><path d="M7 4L4 7"/></svg>
    </div>`;
  canvas.appendChild(el);
  // drag handle
  el.querySelector('.whead').addEventListener('pointerdown',e=>{
    if(e.target.classList.contains('wclose'))return;
    startDrag(e,w.id);
  });
  el.addEventListener('pointerdown',()=>bringToFront(w.id),true);
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
  else if(w.type==='sticky')buildStickyW(body,w);
  else if(w.type==='stats')buildStatsW(body,w);
  else if(w.type==='quote')buildQuoteW(body,w);
  else if(w.type==='calendar')buildCalW(body,w);
  else if(w.type==='habits')buildHabitW(body,w);
}


/* ── HABIT TRACKER ── */
function habitWSelectEmoji(btn, wid){
  const wrap=document.getElementById('wemoji-'+wid);
  if(!wrap)return;
  wrap.querySelectorAll('button').forEach(b=>{b.style.outline='none';});
  btn.style.outline='2px solid var(--a2)';
  wrap._sel=btn.dataset.emoji;
}

function buildHabitW(body,w){
  body.style.cssText='display:flex;flex-direction:column;height:100%;overflow:hidden;';
  const wid=w.id;

  // Emoji picker — hidden by default, shown on input focus
  const emojiWrap=document.createElement('div');
  emojiWrap.id='wemoji-'+wid;
  emojiWrap.style.cssText='display:flex;gap:3px;padding:0 12px;overflow:hidden;height:0;opacity:0;transition:height .2s ease,opacity .2s ease,padding .2s ease;';
  HABIT_EMOJIS.forEach((e,i)=>{
    const btn=document.createElement('button');
    btn.dataset.emoji=e;
    btn.textContent=e;
    btn.style.cssText='flex:1;min-width:0;aspect-ratio:1;border-radius:6px;border:none;background:var(--surf2);cursor:pointer;font-size:11px;transition:background .1s;outline:none;';
    if(i===0) btn.style.outline='2px solid var(--a2)';
    btn.onmousedown=function(e){e.preventDefault();habitWSelectEmoji(this,wid);};
    emojiWrap.appendChild(btn);
  });
  emojiWrap._sel=HABIT_EMOJIS[0];

  const inp=document.createElement('input');
  inp.id='hinp-'+wid;inp.type='text';inp.placeholder='Add a habit…';inp.maxLength=40;
  inp.style.cssText='flex:1;background:transparent;border:none;font-size:12px;color:var(--ink);outline:none;font-family:inherit;';
  inp.onfocus=function(){
    emojiWrap.style.height='36px';
    emojiWrap.style.opacity='1';
    emojiWrap.style.paddingTop='6px';
    emojiWrap.style.paddingBottom='6px';
  };
  inp.onblur=function(e){
    setTimeout(()=>{
      // Don't hide if focus moved to emoji picker
      if(emojiWrap.contains(document.activeElement)) return;
      if(inp.value.trim().length > 0) return;
      emojiWrap.style.height='0';
      emojiWrap.style.opacity='0';
      emojiWrap.style.paddingTop='0';
      emojiWrap.style.paddingBottom='0';
    },160);
  };
  inp.onkeydown=function(e){if(e.key==='Enter')habitWSubmit(wid);};

  const addBtn=document.createElement('button');
  addBtn.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  addBtn.style.cssText='width:26px;height:26px;border-radius:50%;background:var(--a2);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
  addBtn.onclick=function(){habitWSubmit(wid);};

  const inputRow=document.createElement('div');
  inputRow.id='hinput-row-'+wid;
  inputRow.style.cssText='display:flex;align-items:center;gap:8px;padding:0 12px;height:40px;flex-shrink:0;';
  inputRow.appendChild(inp);inputRow.appendChild(addBtn);

  const footer=document.createElement('div');
  footer.id='hfooter-'+wid;
  footer.style.cssText='flex-shrink:0;border-top:1px solid var(--bdr);';
  footer.appendChild(emojiWrap);
  footer.appendChild(inputRow);

  const list=document.createElement('div');
  list.id='hlist-'+wid;list.style.cssText='display:flex;flex-direction:column;';
  const scroll=document.createElement('div');
  scroll.id='hwrap-'+wid;scroll.style.cssText='flex:1;overflow-y:auto;padding:8px 10px 4px;';
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
    list.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:32px 12px;text-align:center;"><div style="width:40px;height:40px;border-radius:12px;background:var(--surf2);border:1.5px solid var(--bdr);display:flex;align-items:center;justify-content:center;color:var(--ink4);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-5"/></svg></div><div style="font-size:12px;font-weight:700;color:var(--ink3);">No habits yet</div><div style="font-size:11px;color:var(--ink4);">Add one below</div></div>`;
    return;
  }
  const pct=Math.round(doneCount/total*100);
  list.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;padding:0 2px;">
      <span style="font-size:10px;font-weight:700;letter-spacing:.4px;color:var(--ink4);">${doneCount}/${total} TODAY</span>
      <span style="font-size:10px;font-weight:700;color:var(--a2);">${pct}%</span>
    </div>
    <div style="height:2px;background:var(--bdr);border-radius:2px;margin-bottom:10px;overflow:hidden;">
      <div style="height:100%;width:${pct}%;background:var(--a2);border-radius:2px;transition:width .3s;"></div>
    </div>
    ${habits.map(h=>{
      const done=habitDoneToday(h.id);
      const streak=habitStreak(h.id);
      return `<div style="display:flex;align-items:center;gap:9px;padding:5px 2px;border-bottom:1px solid var(--bdr);" class="habit-row-${wid}">
        <button onclick="habitToggleW(${h.id},'${wid}')" style="width:20px;height:20px;border-radius:50%;border:1.5px solid ${done?'var(--a2)':'var(--bdr)'};background:${done?'var(--a2)':'transparent'};display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all .15s;">
          ${done?'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>':''}
        </button>
        <span style="font-size:13px;flex-shrink:0;">${h.emoji}</span>
        <span style="font-size:12px;font-weight:500;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${done?'var(--ink3)':'var(--ink)'};${done?'text-decoration:line-through;':''};transition:all .15s;">${esc(h.name)}</span>
        ${streak>0?`<span style="font-size:10px;font-weight:600;color:var(--ink3);">🔥${streak}</span>`:''}
        <button onclick="habitDeleteW(${h.id},'${wid}')" style="background:none;border:none;color:transparent;cursor:pointer;font-size:10px;padding:2px;flex-shrink:0;transition:color .15s;" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='transparent'">✕</button>
      </div>`;
    }).join('')}`;
  _updateHabitWFooter(wid);
}

function _updateHabitWFooter(wid){
  const footer=document.getElementById('hfooter-'+wid);
  const inputRow=document.getElementById('hinput-row-'+wid);
  if(!footer||!inputRow) return;
  const habitCount=(prefs.habits||[]).length;
  const atLimit=!isPro()&&habitCount>=HABIT_MAX_FREE;
  const nearLimit=!isPro()&&habitCount===HABIT_MAX_FREE-1;
  const oldCounter=document.getElementById('hcounter-'+wid);
  if(oldCounter) oldCounter.remove();
  if(!isPro()){
    const counter=document.createElement('div');
    counter.id='hcounter-'+wid;
    counter.style.cssText='font-size:10px;font-weight:700;text-align:right;padding:5px 12px 0;color:'+(atLimit?'var(--red)':nearLimit?'var(--ink3)':'var(--ink4)');
    counter.innerHTML=habitCount+'/'+HABIT_MAX_FREE+' used'+(atLimit?' &middot; <span style="color:var(--a2);cursor:pointer;" onclick="habitShowProGate()">Upgrade ✶</span>':'');
    footer.insertBefore(counter,footer.firstChild);
  }
  let limitMsg=document.getElementById('hlimit-'+wid);
  if(atLimit){
    inputRow.style.display='none';
    if(!limitMsg){
      limitMsg=document.createElement('div');
      limitMsg.id='hlimit-'+wid;
      limitMsg.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:8px 12px 10px;gap:8px;';
      limitMsg.innerHTML='<span style="font-size:11px;color:var(--ink3);">Free limit reached</span><button onclick="habitShowProGate()" style="background:var(--a2);color:#fff;border:none;border-radius:6px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;">Upgrade ✶</button>';
      footer.appendChild(limitMsg);
    }
  } else {
    inputRow.style.display='flex';
    if(limitMsg) limitMsg.remove();
  }
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
  const emojiWrap=document.getElementById('wemoji-'+wid);
  const selectedEmoji=(emojiWrap&&emojiWrap._sel)||'✔️';
  prefs.habits=prefs.habits||[];
  prefs.habits.push({id:Date.now(),name:inp.value.trim(),emoji:selectedEmoji,created:habitToday()});
  habitSave();
  inp.value='';
  // Reset emoji selection to first
  if(emojiWrap){
    emojiWrap._sel=HABIT_EMOJIS[0];
    emojiWrap.querySelectorAll('button').forEach((b,i)=>{b.style.outline=i===0?'2px solid var(--a2)':'none';});
  }
  inp.blur();
  renderHabitW(wid);
  widgets.filter(w=>w.type==='habits'&&w.id!==wid).forEach(w=>renderHabitW(w.id));
  renderHabits('habit-list'); renderHabits('mob-habit-list'); renderHabits('mob-habit-page-list');
}

// DRAG
function startDrag(e,id){
  e.preventDefault();
  const el=$(id);if(!el)return;
  const w=widgets.find(x=>x.id===id);if(!w)return;
  bringToFront(id);
  el.classList.add('wdrag');
  document.querySelectorAll('.widget').forEach(wd=>{if(wd.id!==id)wd.style.pointerEvents='none';});
  const scale=window._canvasScale||1;
  // Release any existing pointer capture on the element before re-capturing,
  // avoids stale capture state from a previous interrupted drag
  try{if(e.pointerId!=null&&el.hasPointerCapture&&el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);}catch(_){}
  const startX=e.clientX/scale-w.x;
  const startY=e.clientY/scale-w.y;
  let rafId=null, pendingX=w.x, pendingY=w.y;
  let active=true;

  const cleanup=()=>{
    if(!active)return;
    active=false;
    if(rafId){cancelAnimationFrame(rafId);rafId=null;}
    // Flush final position
    w.x=pendingX;w.y=pendingY;
    el.style.left=w.x+'px';el.style.top=w.y+'px';
    el.classList.remove('wdrag');
    document.querySelectorAll('.widget').forEach(wd=>wd.style.pointerEvents='');
    // Remove cursor override on document
    document.body.style.cursor='';
    document.body.style.userSelect='';
    persist();
    document.removeEventListener('pointermove',mm);
    document.removeEventListener('pointerup',mu);
    document.removeEventListener('pointercancel',mu);
  };

  const mm=e=>{
    if(!active)return;
    const cvs=document.getElementById('canvas');
    const maxX=cvs ? Math.max(0, cvs.clientWidth  - w.w) : 99999;
    const maxY=cvs ? Math.max(0, cvs.clientHeight - w.h) : 99999;
    pendingX=Math.min(Math.max(0,e.clientX/scale-startX), maxX);
    pendingY=Math.min(Math.max(0,e.clientY/scale-startY), maxY);
    if(rafId)return;
    rafId=requestAnimationFrame(()=>{
      w.x=pendingX;w.y=pendingY;
      el.style.left=w.x+'px';el.style.top=w.y+'px';
      rafId=null;
    });
  };

  const mu=()=>cleanup();

  // Attach to document — not el — so fast mouse movement can never escape
  document.addEventListener('pointermove',mm);
  document.addEventListener('pointerup',mu);
  document.addEventListener('pointercancel',mu);
  // Lock cursor globally during drag
  document.body.style.cursor='grabbing';
  document.body.style.userSelect='none';
}

// RESIZE
function startResize(e,id){
  e.preventDefault();e.stopPropagation();
  const el=$(id);if(!el)return;
  const w=widgets.find(x=>x.id===id);if(!w)return;
  el.classList.add('wresize');
  const scale=window._canvasScale||1;
  const startX=e.clientX/scale,startY=e.clientY/scale,startW=w.w,startH=w.h;
  const WMIN={
    timer:  {w:260, h:400},
    habits: {w:340, h:380},
    tasks:  {w:420, h:260},
    journal:{w:420, h:320},
    stats:  {w:260, h:180},
    subjects:{w:240,h:220},
    calendar:{w:380,h:420},
    quote:  {w:200, h:130},
    note:   {w:280, h:180},
  };
  const wm=WMIN[w.type]||{w:180,h:130};
  const minW=wm.w;
  const minH=wm.h;
  let rafId=null,pendingW=w.w,pendingH=w.h;
  let active=true;

  const cleanup=()=>{
    if(!active)return;
    active=false;
    if(rafId){cancelAnimationFrame(rafId);rafId=null;}
    w.w=pendingW;w.h=pendingH;
    el.style.width=w.w+'px';el.style.height=w.h+'px';
    el.classList.remove('wresize');
    document.body.style.cursor='';
    document.body.style.userSelect='';
    persist();
    document.removeEventListener('pointermove',mm);
    document.removeEventListener('pointerup',mu);
    document.removeEventListener('pointercancel',mu);
  };

  const mm=e=>{
    if(!active)return;
    const cvs=document.getElementById('canvas');
    const maxW=cvs ? Math.max(minW, cvs.clientWidth  - w.x) : 99999;
    const maxH=cvs ? Math.max(minH, cvs.clientHeight - w.y) : 99999;
    pendingW=Math.min(maxW,Math.max(minW,startW+(e.clientX/scale-startX)));
    pendingH=Math.min(maxH,Math.max(minH,startH+(e.clientY/scale-startY)));
    if(rafId)return;
    rafId=requestAnimationFrame(()=>{
      w.w=pendingW;w.h=pendingH;
      el.style.width=w.w+'px';el.style.height=w.h+'px';
      rafId=null;
    });
  };

  const mu=()=>cleanup();

  // Attach to document so fast resize never loses the pointer
  document.addEventListener('pointermove',mm);
  document.addEventListener('pointerup',mu);
  document.addEventListener('pointercancel',mu);
  document.body.style.cursor='se-resize';
  document.body.style.userSelect='none';
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
      <div class="tw-recur-dd" id="twrd-${w.id}" data-val="none" onclick="toggleRecurDd('${w.id}',event)">
        <span class="tw-recur-dd-lbl" id="twrdl-${w.id}">↺</span>
        <div class="tw-recur-dd-menu" id="twrdm-${w.id}">
          <div class="tw-recur-opt" data-v="none" onclick="setRecurDd('${w.id}','none',event)">No repeat</div>
          <div class="tw-recur-opt" data-v="daily" onclick="setRecurDd('${w.id}','daily',event)">Daily</div>
          <div class="tw-recur-opt" data-v="weekly" onclick="setRecurDd('${w.id}','weekly',event)">Weekly</div>
        </div>
      </div>
      <button id="twdb-${w.id}" onclick="openDskDuePicker('${w.id}')" style="flex-shrink:0;display:inline-flex;align-items:center;gap:4px;padding:6px 10px;background:var(--surf);border:1.5px solid var(--bdr);border-radius:8px;font-size:11px;font-weight:600;color:var(--ink3);cursor:pointer;font-family:inherit;white-space:nowrap;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 9h18M8 2v3M16 2v3"/></svg>
        <span id="twdb-lbl-${w.id}">Due date</span>
      </button>
      <button class="twbtn" onclick="addTask('${w.id}')">Add</button>
    </div>
    <div class="twcols">
      <div class="twcol"><div class="twchd"><div class="twchl"><div class="twdot twdot-todo"></div>To Do</div><span class="twcnt" id="cn-todo-${w.id}">0</span></div><div class="twbody" id="col-todo-${w.id}" onclick="if(_selTask)_selTask=null,renderAllTaskW()" ondragover="dov(event,'todo','${w.id}')" ondragleave="dlv(event)" ondrop="drp(event,'todo')"></div></div>
      <div class="twcol"><div class="twchd"><div class="twchl"><div class="twdot twdot-inprog"></div>In Progress</div><span class="twcnt" id="cn-inprog-${w.id}">0</span></div><div class="twbody" id="col-inprog-${w.id}" ondragover="dov(event,'inprog','${w.id}')" ondragleave="dlv(event)" ondrop="drp(event,'inprog')"></div></div>
      <div class="twcol"><div class="twchd"><div class="twchl"><div class="twdot twdot-done"></div>Done</div><div style="display:flex;align-items:center;gap:6px;"><span class="twcnt" id="cn-done-${w.id}">0</span><button class="twbtn" style="padding:2px 7px;font-size:10px;opacity:0.7;" onclick="clrDoneTasks('${w.id}')" data-tip="Clear all done tasks">Clear</button></div></div><div class="twbody" id="col-done-${w.id}" ondragover="dov(event,'done','${w.id}')" ondragleave="dlv(event)" ondrop="drp(event,'done')"></div></div>
    </div>`;
  renderTaskCols(w.id);
}

// ── DATE PICKER (calendar sheet) ──
let _calViewYear=0,_calViewMonth=0,_dskCalWid=null,_dpSelected='',_dpCallback=null;
function calToday(){const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate());}
function calFmt(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;}
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
    html+=`<div ${click} style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:${fw};color:${color};background:${bg};border:${border};border-radius:10px;cursor:${cursor};opacity:${op};transition:background .15s,color .15s;">${d}</div>`;
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
    // Mutual exclusion: due date clears recurring
    if(val){
      const dd=$('twrd-'+wid);
      const rl=$('twrdl-'+wid);
      if(dd){dd.setAttribute('data-val','none');dd.classList.remove('tw-recur-active');}
      if(rl)rl.textContent='↺';
    }
  });
}
function openDuePicker(wid){openDskDuePicker(wid);}
function onDueChange(wid){}

function addTask(wid){
  const inp=$('twi-'+wid);const t=inp.value.trim();if(!t){inp.focus();return;}
  const due=$('twd-'+wid)?.value||'';
  const rec=$('twrd-'+wid)?.getAttribute('data-val')||'none';
  tasks.unshift({id:String(Date.now()),text:t,title:t,col:'todo',date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'}),dueDate:due,recurring:rec});
  persist();renderAllTaskW();inp.value='';
  // reset due date
  if($('twd-'+wid))$('twd-'+wid).value='';
  const twdb=$('twdb-'+wid);const twdbl=$('twdb-lbl-'+wid);
  if(twdbl)twdbl.textContent='Due date';
  if(twdb){twdb.style.borderColor='var(--bdr)';twdb.style.color='var(--ink3)';twdb.style.background='var(--surf)';twdb.classList.remove('active');twdb.style.opacity='';twdb.style.pointerEvents='';}
  // reset recurring
  if($('twrd-'+wid)){$('twrd-'+wid).setAttribute('data-val','none');$('twrd-'+wid).classList.remove('tw-recur-active');const l=$('twrdl-'+wid);if(l)l.textContent='↺';}
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
  if(diff<=7)  return{label:due.toLocaleDateString('en-US',{month:'short',day:'numeric'}),color:'#A16207',bg:'rgba(234,179,8,0.12)',border:'rgba(234,179,8,0.35)',priority:3};
  return{label:due.toLocaleDateString('en-US',{month:'short',day:'numeric'}),color:'var(--ink3)',bg:'rgba(156,151,143,0.1)',border:'rgba(156,151,143,0.3)',priority:4};
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
  // If the click landed on the delete button, let its own onclick handle it
  if(e.target.closest('.tcdel')) return;
  e.stopPropagation();
  _selTask=(String(_selTask)===String(id))?null:String(id);
  renderAllTaskW();
}
async function delTask(id){if(!await appConfirm('Delete this task?','This cannot be undone.'))return;tasks=tasks.filter(t=>String(t.id)!==String(id));_selTask=null;persist();renderAllTaskW();updateAllStatsW();updateFixedStats();}
function populateTaskWidgetSubjSels(){
  widgets.forEach(w=>{
    if(w.type!=='tasks')return;
    const sel=$('twsub-'+w.id);if(!sel)return;
    const cur=sel.value;
    sel.innerHTML='<option value="">No project</option>'+subjects.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
    if(cur)sel.value=cur;
  });
}

function renderAllTaskW(){widgets.filter(w=>w.type==='tasks').forEach(w=>renderTaskCols(w.id));setTimeout(populateTaskWidgetSubjSels,0);}
function sortByDueLegacy(arr){return sortByDue(arr);} // alias
function renderTaskCols(wid){
  if(!$('col-todo-'+wid))return;
  const cols={todo:[],inprog:[],done:[]};
  tasks.forEach(t=>{if(cols[t.col])cols[t.col].push(t);});
  Object.keys(cols).forEach(k=>{cols[k]=sortByDue(cols[k]);});
  ['todo','inprog','done'].forEach(c=>{
    const el=$('col-'+c+'-'+wid);if(!el)return;
    $('cn-'+c+'-'+wid).textContent=cols[c].length;
    if(!cols[c].length){
      const _cfg={
        todo:{icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>`,title:'Nothing planned',hint:'Add a task below'},
        inprog:{icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,title:'Nothing in progress',hint:'Drag a task here'},
        done:{icon:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-5"/></svg>`,title:'Nothing done yet',hint:'Complete a task to see it here'}
      }[c];
      el.innerHTML='<div class="twempty"><div class="twempty-icon">'+_cfg.icon+'</div><div class="twempty-t">'+_cfg.title+'</div><div class="twempty-hint">'+_cfg.hint+'</div></div>';
      return;
    }
    el.innerHTML=cols[c].map(t=>{
      const due=taskDueInfo(t);
      const dueTag=due?`<span class="tag tl" style="background:${due.bg};color:${due.color};border:1px solid ${due.border};">${due.label}</span>`:'';
      const isOverdue=due?.label==='Overdue';
      const recurTag=t.recurring&&t.recurring!=='none'?`<span class="tc-recur-tag">${t.recurring==='daily'?'Daily':'Weekly'}</span>`:'';
      const proj=t.subjectId?subjects.find(s=>String(s.id)===String(t.subjectId)):null;
      const projTag=proj?`<span class="tc-proj-tag" style="background:rgba(58,125,94,.1);color:var(--a2);border:1px solid rgba(58,125,94,.2);border-radius:5px;font-size:9px;font-weight:700;padding:1px 6px;white-space:nowrap;">${esc(proj.name)}</span>`:'';
      return `<div class="tc${String(_selTask)===String(t.id)?' tc-selected':''}${isOverdue?' tc-overdue':''}" id="tc-${t.id}" draggable="true" ondragstart="dstart(event,'${t.id}')" ondragend="dend()" onclick="selTask(event,'${t.id}')" ontouchstart="tcTouchStart(event,'${t.id}')">
      <button class="tcdel" onclick="event.stopPropagation();delTask('${t.id}')">&times;</button>
      <div class="tct" style="${t.col==='done'?'text-decoration:line-through;opacity:.45;':''}">${esc(t.text||t.title||'')}</div><div class="tcf" style="${t.col==='done'?'opacity:.45;':''}">${projTag}${recurTag}${dueTag}<span class="tcd">${t.date}</span></div>
    </div>`;
    }).join('');
  });
}
function dstart(e,id){dragTaskId=String(id);e.dataTransfer.effectAllowed='move';setTimeout(()=>{const el=$('tc-'+id);if(el)el.classList.add('dragging');},0);}
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
function drp(e,col){e.preventDefault();document.querySelectorAll('.twbody').forEach(e=>e.classList.remove('dov'));if(dragTaskId===null)return;const t=tasks.find(x=>String(x.id)===String(dragTaskId));if(t&&t.col!==col){t.col=col;syncProjectProgress();persist();renderAllTaskW();updateAllStatsW();updateFixedStats();renderAllSubW();}dragTaskId=null;}

/* ── JOURNAL ── */
function buildJournalW(body,w){
  body.style.display='flex';body.style.flexDirection='column';
  // Reflection card data
  const _todayKey=new Date().toISOString().slice(0,10);
  const _todayStr=new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  const _prefs=acc[cu]?.prefs||{};
  const _habits=_prefs.habits||[];
  const _habitLog=_prefs.habitLog||{};
  const _doneHabits=_habits.filter(h=>_habitLog[h.id]&&_habitLog[h.id][_todayKey]).length;
  const _sessions=((_prefs.pomHistory||{})[_todayKey]||[]).length;
  const _doneTasks=tasks.filter(t=>t.col==='done').length;
  const _statsHtml=[_doneTasks?`<span class="jw-ref-stat">${_doneTasks} task${_doneTasks>1?'s':''} done</span>`:'',_habits.length?`<span class="jw-ref-stat">${_doneHabits}/${_habits.length} habits</span>`:'',_sessions?`<span class="jw-ref-stat">${_sessions} focus session${_sessions>1?'s':''}</span>`:''].filter(Boolean).join('');
  if(!(_dskRefMoods[w.id]>=0)) _dskRefMoods[w.id]=0;
  const _moodsHtml=MLAB.map((m,i)=>`<button class="jw-ref-mood-btn${i===_dskRefMoods[w.id]?' selected':''}" onclick="dskRefPickMood(${i},'${w.id}')">${m.e}</button>`).join('');
  const _todayRef=(journal||[]).find(j=>j.date===_todayStr&&j.isReflection);
  const _refHtml=_todayRef?`<div class="jw-ref-done"><div class="jw-ref-done-icon">${MLAB[_todayRef.mood||0].e}</div><div class="jw-ref-done-text">Today's reflection saved</div><button class="jw-ref-done-edit" onclick="dskEditReflection('${_todayRef.id}','${w.id}')">Edit</button></div>`:`<div class="jw-reflection-card" id="jw-reflection-card-${w.id}"><div class="jw-ref-date">${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>${_statsHtml?`<div class="jw-ref-stats">${_statsHtml}</div>`:''}<div class="jw-ref-mood-row"><span class="jw-ref-label">How are you feeling?</span><div class="jw-ref-moods" id="jw-ref-moods-${w.id}">${_moodsHtml}</div></div><div class="jw-ref-q"><label class="jw-ref-label">What went well today?</label><textarea class="jw-ref-ta" id="jw-ref-well-${w.id}" placeholder="Something you're proud of..."></textarea></div><div class="jw-ref-q"><label class="jw-ref-label">What's on your mind?</label><textarea class="jw-ref-ta" id="jw-ref-mind-${w.id}" placeholder="Thoughts, feelings, anything..."></textarea></div><div class="jw-ref-q"><label class="jw-ref-label">What would make tomorrow better?</label><textarea class="jw-ref-ta" id="jw-ref-tomorrow-${w.id}" placeholder="One thing to focus on..."></textarea></div><button class="jw-ref-save" onclick="dskSaveReflection('${w.id}')">Save Reflection</button></div>`;
  body.innerHTML=`
    <div class="jw-reflection-wrap" id="jw-ref-wrap-${w.id}">${_refHtml}</div>
    <div class="jwsearch-bar" id="jwsbar-${w.id}" style="display:none;">
      <div class="jwsearch-inner">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--ink4)" stroke-width="2.5" stroke-linecap="round" style="flex-shrink:0;"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input class="jwsearch" id="jws-${w.id}" type="text" placeholder="Search entries…" oninput="onJwSearch('${w.id}',this.value)"/>
        <button class="jwsearch-clear" id="jwscl-${w.id}" onclick="jwClearSearch('${w.id}')" style="display:none;">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--ink4)" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
    <div class="jwlist" id="jwl-${w.id}"></div>`;
  renderJournalW(w.id);
}

function jwAutoResize(ta){
  ta.style.height='auto';
  ta.style.height=(ta.scrollHeight)+'px';
}

function dskUseTemplate(idx, wid){
  const t=JOURNAL_TEMPLATES[idx];
  const ta=document.getElementById('jwta-'+wid);
  if(!ta)return;
  ta.value=t.text;ta.focus();
  jwAutoResize(ta);
}
function dskShufflePrompt(wid){
  const ta=document.getElementById('jwta-'+wid);
  if(!ta)return;
  ta.placeholder=getJournalPrompt();
  ta.focus();
}
function pickMoodW(m,wid){
  curMood=m;
  const mood=MLAB[m]||MLAB[0];
  // update popup selected state
  document.querySelectorAll(`#jwmpop-${wid} .jwmpop-btn`).forEach(b=>b.classList.toggle('on',+b.dataset.m===m));
  // update trigger button
  const cur=document.getElementById('jwmcur-'+wid);
  const txt=document.getElementById('jwmcurtxt-'+wid);
  if(cur) cur.firstChild.textContent=mood.e;
  if(txt) txt.textContent=mood.l;
  // close popup
  jwToggleMoodPop(wid,false);
}
function jwToggleMoodPop(wid,force){
  const pop=document.getElementById('jwmpop-'+wid);
  if(!pop)return;
  const open=force!==undefined?force:!pop.classList.contains('open');
  pop.classList.toggle('open',open);
  // close on outside click
  if(open){
    setTimeout(()=>{
      const handler=e=>{if(!pop.contains(e.target)&&e.target.id!=='jwmcur-'+wid){pop.classList.remove('open');document.removeEventListener('click',handler);}};
      document.addEventListener('click',handler);
    },10);
  }
}

function jwToggleSearch(wid){
  const bar = document.getElementById('jwsbar-'+wid);
  const inp = document.getElementById('jws-'+wid);
  const btn = document.getElementById('jwsib-'+wid);
  if(!bar) return;
  const open = bar.style.display !== 'none';
  bar.style.display = open ? 'none' : 'block';
  btn.classList.toggle('active', !open);
  if(!open && inp) setTimeout(()=>inp.focus(), 50);
  if(open){ jwClearSearch(wid); }
}
function jwClearSearch(wid){
  const inp = document.getElementById('jws-'+wid);
  if(inp) inp.value = '';
  onJwSearch(wid, '');
  const cl = document.getElementById('jwscl-'+wid);
  if(cl) cl.style.display = 'none';
}
function jwToggleTpl(wid){
  const row=document.getElementById('jwtpl-'+wid);
  if(!row)return;
  row.style.display=row.style.display==='none'?'flex':'none';
}
// legacy compat
function pickMood(m,wid){pickMoodW(m,wid);}
function toggleMoodPicker(wid,force){}

// ── Journal edit state ──
let _jwEditId=null, _jwEditWid=null;

function jwEditEntry(id, wid){
  const entry=journal.find(j=>String(j.id)===String(id)); if(!entry) return;
  _jwEditId=id; _jwEditWid=wid;
  const ta=$('jwta-'+wid); if(!ta) return;
  ta.value=entry.text||entry.content||'';
  ta.style.height='auto'; ta.style.height=ta.scrollHeight+'px';
  curMood=entry.mood||0;
  pickMoodW(curMood, wid);
  const saveBtn=document.getElementById('jwsave-'+wid);
  const cancelBtn=document.getElementById('jwcancel-'+wid);
  if(saveBtn){ saveBtn.textContent='Update'; saveBtn.style.background='var(--amb,#9A6818)'; }
  if(cancelBtn){ cancelBtn.style.display='inline-flex'; }
  document.querySelectorAll('#jwl-'+wid+' .jwje').forEach(el=>el.classList.remove('jw-editing'));
  const entryEl=document.querySelector('#jwl-'+wid+' .jwje[data-id="'+id+'"]');
  if(entryEl) entryEl.classList.add('jw-editing');
  ta.focus();
  ta.scrollIntoView({behavior:'smooth', block:'nearest'});
}

function jwCancelEdit(wid){
  _jwEditId=null; _jwEditWid=null;
  const ta=$('jwta-'+wid); if(ta){ ta.value=''; ta.style.height=''; }
  const saveBtn=document.getElementById('jwsave-'+wid);
  const cancelBtn=document.getElementById('jwcancel-'+wid);
  if(saveBtn){ saveBtn.textContent='Save'; saveBtn.style.background=''; }
  if(cancelBtn){ cancelBtn.style.display='none'; }
  document.querySelectorAll('#jwl-'+wid+' .jwje').forEach(el=>el.classList.remove('jw-editing'));
}

function addJournal(wid){
  const el=$('jwta-'+wid); const t=el.value.trim(); if(!t){el.focus();return;}
  if(_jwEditId && _jwEditWid==wid){
    const entry=journal.find(j=>String(j.id)===String(_jwEditId));
    if(entry){ entry.text=t; entry.content=t; entry.mood=curMood; }
    jwCancelEdit(wid);
  } else {
    journal.unshift({id:Date.now(),text:t,content:t,mood:curMood,date:new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}),ts:Date.now()});
  }
  persist(); renderAllJournalW(); updateAllStatsW(); updateFixedStats();
  el.value=''; el.style.height='';
}
async function delJournal(id){if(!await appConfirm('Delete this journal entry?','This cannot be undone.'))return;journal=journal.filter(j=>String(j.id)!==String(id));persist();renderAllJournalW();updateAllStatsW();updateFixedStats();}
function renderAllJournalW(){widgets.filter(w=>w.type==='journal').forEach(w=>renderJournalW(w.id));}
function onJwSearch(wid,val){
  _jwSearch[wid]=val.toLowerCase().trim();
  renderJournalW(wid);
  const cl=document.getElementById('jwscl-'+wid);
  if(cl) cl.style.display=val?'flex':'none';
}
function renderJournalW(wid){
  const el=$('jwl-'+wid);if(!el)return;
  const q=_jwSearch[wid]||'';
  const filtered=q?journal.filter(j=>(j.text||j.content||'').toLowerCase().includes(q)):journal;
  if(!journal.length){el.innerHTML='<div class="es"><div class="es-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h6M8 15h4"/></svg></div><div class="es-title">No journal entries yet</div><div class="es-hint">Write your first entry below.</div></div>';return;}
  if(!filtered.length){el.innerHTML='<div class="jwempty">No entries match your search.</div>';return;}
  const hdr=`<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 2px 6px;"><span style="font-size:10px;color:var(--ink4);letter-spacing:0.04em;">${filtered.length} of ${journal.length} entr${journal.length>1?'ies':'y'}</span></div>`;
  const escQ=q?esc(q).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'):'';
  const hl=(txt)=>escQ?txt.replace(new RegExp('('+escQ+')','gi'),'<mark style="background:var(--al);color:var(--a2);border-radius:2px;padding:0 1px;">$1</mark>'):txt;
  el.innerHTML=hdr+filtered.map(j=>{
    const m=MLAB[j.mood]||MLAB[0];
    const _jtext=j.text||j.content||'';
    const preview=_jtext.length>120?_jtext.slice(0,120)+'…':_jtext;
    const wc=_jtext.trim().split(/\s+/).filter(Boolean).length;
    const _moodColors={0:'#2A7D5E',1:'#4A9D74',2:'#888888',3:'#5A7AAA',4:'#6B7280',5:'#C44040',6:'#DC2626',7:'#D97706',8:'#7A5EA8',9:'#E11D48'};
    const borderCol=_moodColors[j.mood??0]||'var(--a2)';
    const _todayStr2=new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
    const _isToday2=j.date===_todayStr2;
    return `<div class="jwje" style="border-left-color:${borderCol};" data-id="${j.id}">
      <div class="jwjehd">
        <span class="jwm" title="${m.l}">${m.e}</span>
        <div style="flex:1;min-width:0;">
          <div class="jwdt">${j.date}</div>
          <div class="jwmood-lbl">${m.l}</div>
        </div>
        ${_isToday2 ? '' : `<button class="jwdel" onclick="delJournal('${j.id}')">&times;</button>`}
      </div>
      <div class="jwtx">${hl(esc(preview))}</div>
    </div>`;
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
<div style="display:flex;align-items:flex-end;justify-content:center;gap:4px;margin-bottom:10px;">
            <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
              <input id="tminp-hr-${w.id}" type="text" inputmode="numeric" min="0" max="23" placeholder="0"
                style="width:56px;font-size:24px;font-weight:800;text-align:center;border:2px solid var(--bdr);border-radius:10px;padding:6px 4px;background:var(--surf2);color:var(--ink);outline:none;font-family:inherit;"
                oninput="this.value=this.value.replace(/[^0-9]/g,\'\').slice(0,2)"
                onfocus="this.select();this.style.borderColor=\'var(--a2)\'" onblur="this.style.borderColor=\'var(--bdr)\'"
                onkeydown="if(event.key===\'Enter\'){event.preventDefault();tmConfirmEdit(\'${w.id}\');}"/>
              <span style="font-size:9px;font-weight:700;color:var(--ink4);letter-spacing:.5px;">HR</span>
            </div>
            <span style="font-size:24px;font-weight:800;color:var(--ink3);padding-bottom:16px;">:</span>
            <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
              <input id="tminp-min-${w.id}" type="text" inputmode="numeric" min="0" placeholder="00"
                style="width:56px;font-size:24px;font-weight:800;text-align:center;border:2px solid var(--bdr);border-radius:10px;padding:6px 4px;background:var(--surf2);color:var(--ink);outline:none;font-family:inherit;"
                oninput="this.value=this.value.replace(/[^0-9]/g,\'\').slice(0,4)"
                onfocus="this.select();this.style.borderColor=\'var(--a2)\'" onblur="this.style.borderColor=\'var(--bdr)\'"
                onkeydown="if(event.key===\'Enter\'){event.preventDefault();tmConfirmEdit(\'${w.id}\');}"/>
              <span style="font-size:9px;font-weight:700;color:var(--ink4);letter-spacing:.5px;">MIN</span>
            </div>
            <span style="font-size:24px;font-weight:800;color:var(--ink3);padding-bottom:16px;">:</span>
            <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
              <input id="tminp-sec-${w.id}" type="text" inputmode="numeric" min="0" placeholder="00"
                style="width:56px;font-size:24px;font-weight:800;text-align:center;border:2px solid var(--bdr);border-radius:10px;padding:6px 4px;background:var(--surf2);color:var(--ink);outline:none;font-family:inherit;"
                oninput="this.value=this.value.replace(/[^0-9]/g,\'\').slice(0,4)"
                onfocus="this.select();this.style.borderColor=\'var(--a2)\'" onblur="this.style.borderColor=\'var(--bdr)\'"
                onkeydown="if(event.key===\'Enter\'){event.preventDefault();tmConfirmEdit(\'${w.id}\');}"/>
              <span style="font-size:9px;font-weight:700;color:var(--ink4);letter-spacing:.5px;">SEC</span>
            </div>
          </div>
          <button class="tm-setbtn" onclick="tmConfirmEdit(\'${w.id}\')">Set time</button>
        </div>
      </div>
      <div class="tmctrl">
        <button class="tm-resetbtn" data-tip="Reset" onclick="resetTimer('${w.id}')">↺</button>
        <button class="tm-startbtn ${ts.running?'stop':''}" id="tmbtn-${w.id}" onclick="timerBtn('${w.id}')" style="flex:1;">${ts.running?'Pause':'Start'}</button>
        <button class="tm-resetbtn" data-tip="Focus Mode" onclick="fcsOpen('${w.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="width:14px;height:14px;"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg></button>
      </div>
      <div class="tmsess" id="tmsess-${w.id}" style="${ts.mode!==0?'display:none;':''}">
        ${Array.from({length:4},(_,i)=>`<div class="tmsd${i<ts.sessions?' dn':''}"></div>`).join('')}
      </div>
      <div id="dsk-pom-history-wrap-${w.id}" class="tm-history-wrap" style="${ts.mode!==0?'display:none;':''}">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:var(--ink3);margin-bottom:8px;">Session History</div>
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
  if(!timeEl||!inpEl)return;
  const _h=Math.floor(ts.sec/3600),_m=Math.floor((ts.sec%3600)/60),_s=ts.sec%60;
  const _hi=$('tminp-hr-'+wid),_mi=$('tminp-min-'+wid),_si=$('tminp-sec-'+wid);
  if(_hi)_hi.value=_h||''; if(_mi)_mi.value=_m||''; if(_si)_si.value=_s||'';
  timeEl.classList.add('hide');
  inpEl.classList.add('show');
  // Hide start button while editing
  const btn=$('tmbtn-'+wid);if(btn)btn.style.display='none';
  setTimeout(()=>{if(_hi)_hi.focus();},50);
}
function tmInputFmt(e){
  let v = e.target.value.replace(/[^0-9:]/g, '');
  // At most 2 colons (H:MM:SS format)
  const colons = (v.match(/:/g)||[]).length;
  if(colons > 2) v = v.slice(0, v.lastIndexOf(':'));
  // No leading colons
  v = v.replace(/^:+/, '');
  // No consecutive colons
  v = v.replace(/:{2,}/g, ':');
  e.target.value = v;
}
function tmInputKey(e,wid){
  if(e.key==='Enter'){e.preventDefault();tmConfirmEdit(wid);}
  if(e.key==='Escape'){e.preventDefault();tmCancelEdit(wid);}
}
function tmConfirmEdit(wid){
  const ts=TMS[wid];if(!ts)return;
  const h=parseInt($('tminp-hr-'+wid)?.value)||0;
  const m=parseInt($('tminp-min-'+wid)?.value)||0;
  const s=parseInt($('tminp-sec-'+wid)?.value)||0;
  const total=Math.min(h*3600+m*60+s,86399);
  if(total<1)return;
  ts.custom[ts.mode]=total;
  ts.sec=total;
  tmCancelEdit(wid);
  const w=widgets.find(x=>x.id===wid);if(w)fillWBody(w);
}
function tmCancelEdit(wid){
  const timeEl=$('tmtime-'+wid);
  const inpEl=$('tminputs-'+wid);
  if(timeEl)timeEl.classList.remove('hide');
  if(inpEl)inpEl.classList.remove('show');
  const btn=$('tmbtn-'+wid);if(btn)btn.style.display='';
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
    // Custom mode: if time not set, open the editor instead of starting
    if(!TMODES[ts.mode]?.locked && ts.sec<=0){
      tmStartEdit(wid);
      return;
    }
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
// ── NOTES WIDGET ──
// notes is now an array: [{id, title, content, updated}, ...]
// Each Note widget remembers which entry is open via w._noteOpen (entry id)

function buildNoteW(body, w){
  body.style.display='flex';
  body.style.flexDirection='column';
  // If no entries exist yet, create a blank one
  if(!notes.length){
    const first={id:'n'+Date.now().toString(36),title:'',content:'',updated:Date.now()};
    notes.push(first);
    persist();
  }
  // Determine which entry to show — default to most recently updated
  if(!w._noteOpen || !notes.find(n=>n.id===w._noteOpen)){
    w._noteOpen = notes.slice().sort((a,b)=>(b.updated||0)-(a.updated||0))[0].id;
  }
  _renderNoteW(body, w);
}

function _renderNoteW(body, w){
  const open = notes.find(n=>n.id===w._noteOpen);
  if(!open){ buildNoteW(body, w); return; }

  // Filter + sort
  const q = _noteSearchQ.toLowerCase().trim();
  const filtered = notes.filter(n => !q || (n.title||'').toLowerCase().includes(q) || (n.content||'').toLowerCase().includes(q));
  const sorted = filtered.slice().sort((a,b) =>
    _noteSortMode === 'title' ? (a.title||'').localeCompare(b.title||'') : (b.updated||0)-(a.updated||0)
  );

  body.innerHTML=`
    <div class="nw-wrap">
      <div class="nw-list">
        <div style="display:flex;align-items:center;gap:5px;padding:7px 8px 5px;border-bottom:1px solid var(--bdr);">
          <input id="nw-search-${w.id}" type="text" placeholder="Search…" value="${esc(_noteSearchQ)}"
            oninput="_noteSearchQ=this.value;_renderNoteList('${w.id}')"
            style="flex:1;background:var(--surf2);border:1.5px solid var(--bdr);border-radius:7px;padding:4px 8px;font-size:11px;color:var(--ink);outline:none;font-family:inherit;min-width:0;"
            onfocus="this.style.borderColor='var(--a2)'" onblur="this.style.borderColor='var(--bdr)'"/>
          <button onclick="_noteSortMode=_noteSortMode==='updated'?'title':'updated';_renderNoteList('${w.id}')"
            title="${_noteSortMode==='updated'?'Sort A–Z':'Sort by recent'}"
            style="background:${_noteSortMode==='title'?'var(--al)':'var(--surf2)'};border:1.5px solid ${_noteSortMode==='title'?'var(--a2)':'var(--bdr)'};border-radius:7px;padding:4px 6px;cursor:pointer;color:var(--ink4);display:flex;align-items:center;flex-shrink:0;transition:all .15s;">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M3 6h18M7 12h10M11 18h2"/></svg>
          </button>
        </div>
        <div id="nwl-${w.id}">
          ${sorted.length === 0 ? `<div style="padding:14px 10px;font-size:11px;color:var(--ink4);text-align:center;">${q?'No notes match':'No notes yet'}</div>` :
          sorted.map(n=>`
            <div class="nw-list-item${n.id===w._noteOpen?' active':''}" onclick="noteWOpen('${w.id}','${n.id}')">
              <div class="nw-list-title">${esc(n.title)||'<span style="color:var(--ink4);font-style:italic;">Untitled</span>'}</div>

            </div>
          `).join('')}
          <button class="nw-add-btn" onclick="noteWAdd('${w.id}')">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            New note
          </button>
        </div>
      </div>
      <div class="nw-editor" id="nwe-${w.id}">
        <div class="nw-editor-head">
          <input class="nw-title-inp" id="nwti-${w.id}" placeholder="Title…" value="${esc(open.title)}"
            oninput="saveNoteField('${w.id}','${open.id}','title',this.value)"/>
          <button onclick="pinStickyNote('${w.id}','${open.id}')" title="Pin as sticky note" style="background:none;border:none;cursor:pointer;padding:3px;color:var(--ink4);display:flex;align-items:center;border-radius:5px;transition:color .15s;" onmouseover="this.style.color='var(--a2)'" onmouseout="this.style.color='var(--ink4)'">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </button>
          <button class="nw-del-btn" onclick="noteWDel('${w.id}','${open.id}')" title="Delete note">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>
        <div class="nw-color-picker" id="nwcp-${w.id}" style="display:none;position:absolute;top:36px;left:8px;background:var(--surf);border:1.5px solid var(--bdr);border-radius:14px;padding:10px;box-shadow:var(--sh3);z-index:100;flex-wrap:wrap;gap:6px;align-items:center;">
          <div style="display:flex;flex-wrap:wrap;gap:6px;flex:1;">
            <button class="nw-color-swatch" style="background:#1a1a1a;" onmousedown="event.preventDefault();dskApplyColor('${w.id}','#1a1a1a')"></button>
            <button class="nw-color-swatch" style="background:#ef4444;" onmousedown="event.preventDefault();dskApplyColor('${w.id}','#ef4444')"></button>
            <button class="nw-color-swatch" style="background:#f97316;" onmousedown="event.preventDefault();dskApplyColor('${w.id}','#f97316')"></button>
            <button class="nw-color-swatch" style="background:#eab308;" onmousedown="event.preventDefault();dskApplyColor('${w.id}','#eab308')"></button>
            <button class="nw-color-swatch" style="background:#22c55e;" onmousedown="event.preventDefault();dskApplyColor('${w.id}','#22c55e')"></button>
            <button class="nw-color-swatch" style="background:#3b82f6;" onmousedown="event.preventDefault();dskApplyColor('${w.id}','#3b82f6')"></button>
            <button class="nw-color-swatch" style="background:#8b5cf6;" onmousedown="event.preventDefault();dskApplyColor('${w.id}','#8b5cf6')"></button>
            <button class="nw-color-swatch" style="background:#ec4899;" onmousedown="event.preventDefault();dskApplyColor('${w.id}','#ec4899')"></button>
            <button class="nw-color-swatch" style="background:#3A7D5E;" onmousedown="event.preventDefault();dskApplyColor('${w.id}','#3A7D5E')"></button>
            <button class="nw-color-swatch" style="background:#6b7280;" onmousedown="event.preventDefault();dskApplyColor('${w.id}','#6b7280')"></button>
          </div>
          <button onmousedown="event.preventDefault();dskResetColor('${w.id}')" style="font-size:10px;font-weight:700;color:var(--ink4);background:none;border:1.5px solid var(--bdr);border-radius:100px;padding:3px 8px;cursor:pointer;font-family:inherit;white-space:nowrap;">Reset</button>
        </div>
        <div class="nw-toolbar" id="nwtb-${w.id}" style="position:relative;">
          <button onmousedown="event.preventDefault();document.execCommand('bold')" class="nw-tb-btn" title="Bold"><b>B</b></button>
          <button onmousedown="event.preventDefault();document.execCommand('italic')" class="nw-tb-btn" title="Italic"><i>I</i></button>
          <button onmousedown="event.preventDefault();document.execCommand('underline')" class="nw-tb-btn" title="Underline"><u>U</u></button>
          <button onmousedown="event.preventDefault();document.execCommand('strikeThrough')" class="nw-tb-btn" title="Strikethrough"><s>S</s></button>
          <button id="nw-color-btn-${w.id}" onmousedown="event.preventDefault();dskToggleColorPicker('${w.id}')" class="nw-tb-btn" title="Text color" style="padding:0;width:26px;">
            <svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="5" id="nw-color-circle-${w.id}" fill="var(--ink)" stroke="none"/><circle cx="9" cy="9" r="7.5" fill="none" stroke="var(--bdr)" stroke-width="1.2"/></svg>
          </button>
          <div style="width:1px;background:var(--bdr);margin:2px 3px;"></div>
          <button onmousedown="event.preventDefault();document.execCommand('insertUnorderedList')" class="nw-tb-btn" title="Bullet list"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg></button>
          <button onmousedown="event.preventDefault();document.execCommand('insertOrderedList')" class="nw-tb-btn" title="Numbered list"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="2" y="8" font-size="7" fill="currentColor" stroke="none">1</text><text x="2" y="14" font-size="7" fill="currentColor" stroke="none">2</text><text x="2" y="20" font-size="7" fill="currentColor" stroke="none">3</text></svg></button>
          <div style="width:1px;background:var(--bdr);margin:2px 3px;"></div>
          <button onmousedown="event.preventDefault();document.execCommand('removeFormat');dskResetColor('${w.id}')" class="nw-tb-btn" title="Clear formatting"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 3h12M8 3l4 6m0 0l4-6M12 9v12M5 21h7"/><line x1="17" y1="17" x2="21" y2="21"/></svg></button>
        </div>
        <div class="nw-content-ta" id="nwta-${w.id}" contenteditable="true" spellcheck="true" placeholder="Start writing…"
          oninput="saveNoteFieldHtml('${w.id}','${open.id}',this.innerHTML)">${open.content}</div>
      </div>
    </div>`;
}

function noteWOpen(wid, nid){
  const w=widgets.find(x=>x.id===wid); if(!w) return;
  w._noteOpen=nid;
  const body=$('wb-'+wid); if(body){ body.innerHTML=''; _renderNoteW(body,w); }
}

function noteWAdd(wid){
  const w=widgets.find(x=>x.id===wid); if(!w) return;
  const n={id:'n'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),title:'',content:'',updated:Date.now()};
  notes.unshift(n);
  w._noteOpen=n.id;
  persistSilent();
  const body=$('wb-'+wid); if(body){ body.innerHTML=''; _renderNoteW(body,w); }
  // Focus title input
  setTimeout(()=>{ const ti=$('nwti-'+wid); if(ti) ti.focus(); },50);
}

async function noteWDel(wid, nid){
  if(!await appConfirm('Delete this note?','This cannot be undone.')) return;
  notes=notes.filter(n=>n.id!==nid);
  const w=widgets.find(x=>x.id===wid); if(!w) return;
  // If deleted the open one, switch to next or create blank
  if(w._noteOpen===nid){
    if(notes.length) w._noteOpen=notes.slice().sort((a,b)=>(b.updated||0)-(a.updated||0))[0].id;
    else { const blank={id:'n'+Date.now().toString(36),title:'',content:'',updated:Date.now()}; notes.push(blank); w._noteOpen=blank.id; }
  }
  persistSilent();
  const body=$('wb-'+wid); if(body){ body.innerHTML=''; _renderNoteW(body,w); }
}

let _noteTimer=null;
let _noteSearchQ='';
let _noteSortMode='updated'; // 'updated' | 'title'
function _renderNoteList(wid){
  const list=document.getElementById('nwl-'+wid); if(!list) return;
  const w=widgets.find(x=>x.id===wid); if(!w) return;
  const q=_noteSearchQ.toLowerCase().trim();
  const fil=notes.filter(n=>!q||(n.title||'').toLowerCase().includes(q)||(n.content||'').toLowerCase().includes(q));
  const sorted=fil.slice().sort((a,b)=>_noteSortMode==='title'?(a.title||'').localeCompare(b.title||''):(b.updated||0)-(a.updated||0));
  list.innerHTML=(sorted.length===0
    ? `<div style="padding:14px 10px;font-size:11px;color:var(--ink4);text-align:center;">${q?'No notes match':'No notes yet'}</div>`
    : sorted.map(n=>`
        <div class="nw-list-item${n.id===w._noteOpen?' active':''}" onclick="noteWOpen('${wid}','${n.id}')">
          <div class="nw-list-title">${esc(n.title)||'<span style="color:var(--ink4);font-style:italic;">Untitled</span>'}</div>
        </div>`).join('')
  )+`<button class="nw-add-btn" onclick="noteWAdd('${wid}')"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>New note</button>`;
}
function saveNoteFieldHtml(wid, nid, html){
  const n=notes.find(x=>x.id===nid); if(!n) return;
  n.content=html;
  n.updated=Date.now();
  _renderNoteList(wid);
  // Sync to pinned sticky note if exists
  const sticky = widgets.find(w => w.type === 'sticky' && w.noteRef === nid);
  if (sticky) {
    sticky.content = html;
    sticky.title = n.title || 'Sticky';
    const stickyContent = document.getElementById('sticky-content-' + sticky.id);
    if (stickyContent) stickyContent.innerHTML = html;
    const stickyHead = document.getElementById('wh-' + sticky.id);
    if (stickyHead) {
      const titleEl = stickyHead.querySelector('span');
      if (titleEl) titleEl.textContent = n.title || 'Sticky';
    }
  }
  clearTimeout(_noteTimer);
  _noteTimer=setTimeout(()=>persistSilent(),800);
}
function saveNoteField(wid, nid, field, val){
  const n=notes.find(x=>x.id===nid); if(!n) return;
  n[field]=val;
  n.updated=Date.now();
  _renderNoteList(wid);
  // Sync title to sticky if exists
  if (field === 'title') {
    const sticky = widgets.find(w => w.type === 'sticky' && w.noteRef === nid);
    if (sticky) {
      sticky.title = val || 'Sticky';
      const stickyHead = document.getElementById('wh-' + sticky.id);
      if (stickyHead) { const titleEl = stickyHead.querySelector('span'); if (titleEl) titleEl.textContent = val || 'Sticky'; }
    }
  }
  clearTimeout(_noteTimer);
  _noteTimer=setTimeout(()=>persistSilent(),800);
}
function persistSilent(){
  if(window._guestMode) return;
  if(!cu)return;
  const d=acc[cu];
  d.tasks=tasks;d.journal=journal;d.subjects=subjects;d.calEvs=calEvs;
  d.widgets=widgets;d.notes=notes;d.prefs=prefs;
  d._localTs=Date.now(); // stamp so pullFromCloud won't overwrite a freshly typed note
  LS.s('pd1_acc',acc);
  try{ localStorage.setItem('pd1_lastSaveTs', String(d._localTs)); }catch(e){}
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
function goToProject(id){ /* projects page removed */ }
function gradeC(g){return g>=90?'#2A5C44':g>=75?'#9A6818':g>=60?'#B87333':'#B83030';}
function gradeL(g){return g>=90?'A':g>=80?'B':g>=70?'C':g>=60?'D':'F';}
// ── NEW DESKTOP PROJECT WIDGET ──
function renderSubW(wid){
  const el=$('swb-'+wid);if(!el)return;
  if(!subjects.length){el.innerHTML='<div class="es"><div class="es-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 17.5h7M17.5 14v7"/></svg></div><div class="es-title">No projects yet</div><div class="es-hint">Create a project from the Projects page.</div></div>';return;}
  const activeSubjects=subjects.filter(s=>(s.status||'active')!=='done');
  if(!activeSubjects.length){el.innerHTML='<div class="es"><div class="es-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></div><div class="es-title">All projects completed</div><div class="es-hint">No active projects to show.</div></div>';return;}
  const now=new Date();now.setHours(0,0,0,0);
  el.innerHTML=activeSubjects.map(s=>{
    const prog=getProjProgress(s);
    const projTasks=tasks.filter(t=>String(t.subjectId)===String(s.id));
    const doneCnt=projTasks.filter(t=>t.col==='done').length;
    const total=projTasks.length;
    const st=s.status||'active';
    const overdue=s.due&&st!=='done'&&new Date(s.due+'T00:00:00')<now;
    const dueSoon=s.due&&st!=='done'&&!overdue&&(new Date(s.due+'T00:00:00')-now)<=(3*86400000);
    const dueStr=s.due?new Date(s.due+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):'';
    const color=_projColor(s);
    const urgentHtml=(overdue||dueSoon)
      ?`<span style="font-size:10px;font-weight:700;color:#E53E3E;">${overdue?'Overdue':'Due soon'}${dueStr?' · '+dueStr:''}</span>`
      :(dueStr?`<span style="font-size:10px;color:var(--ink4);">${dueStr}</span>`:'');
    const taskCntHtml=total?`<span style="font-size:10px;color:var(--ink3);flex-shrink:0;">${doneCnt}/${total}</span>`:'';
    return `<div class="swrow" style="border-left:3px solid ${color};padding-left:9px;${(overdue||dueSoon)?'border-color:#E53E3E;':''}">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:5px;">
          <div class="swname">${esc(s.name)}</div>
          ${urgentHtml}
        </div>
        <div style="display:flex;align-items:center;gap:7px;">
          <div class="swbar" style="flex:1;"><div class="swfill" style="width:${prog}%;background:${color}"></div></div>
          ${taskCntHtml}
        </div>
      </div>
      <button onclick="goToProject('${s.id}')" style="background:none;border:none;padding:4px;cursor:pointer;color:var(--ink3);display:flex;align-items:center;flex-shrink:0;border-radius:6px;" title="Open project">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3l5 5-5 5"/></svg>
      </button>
    </div>`;
  }).join('');
}

function buildCalW(body,w){
  body.style.display='flex';body.style.flexDirection='column';body.style.overflow='hidden';
  body.innerHTML=`
    <div class="cwhead">
      <button class="cw-nav-btn" onclick="shiftCalW(-1,'${w.id}')" style="background:none;border:none;cursor:pointer;color:var(--ink3);padding:4px;border-radius:6px;display:flex;align-items:center;">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M10 3L5 8l5 5"/></svg>
      </button>
      <div style="flex:1;text-align:center;position:relative;">
        <button class="cwlbl" id="cw-monthlbl-${w.id}" onclick="calWYearPickerToggle('${w.id}')"
          style="background:none;border:none;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:6px;transition:background .15s;"
          onmouseover="this.style.background='var(--surf2)'" onmouseout="this.style.background='none'">
          <span id="cw-monthlbl-text-${w.id}"></span>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 1l4 4 4-4"/></svg>
        </button>
        <div id="cw-year-picker-${w.id}" style="display:none;position:absolute;top:calc(100% + 4px);left:50%;transform:translateX(-50%);background:var(--surf);border:1.5px solid var(--bdr);border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.12);z-index:999;padding:6px;min-width:150px;"></div>
      </div>
      <button class="cw-nav-btn" onclick="shiftCalW(1,'${w.id}')" style="background:none;border:none;cursor:pointer;color:var(--ink3);padding:4px;border-radius:6px;display:flex;align-items:center;">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 3l5 5-5 5"/></svg>
      </button>
    </div>
    <div class="cw-grid-wrap" id="cwgrid-${w.id}" style="flex:1;overflow-y:auto;padding:0 10px 10px;"></div>`;
  renderCalW(w.id);
}
function calWYearPickerToggle(wid){
  const pop=document.getElementById('cw-year-picker-'+wid);
  if(!pop) return;
  if(pop.style.display!=='none'){ pop.style.display='none'; return; }
  const now=new Date();
  const curYr=new Date(now.getFullYear(),now.getMonth()+calOff,1).getFullYear();
  const thisYr=now.getFullYear();
  const years=Array.from({length:6},(_,i)=>thisYr+i);
  pop.innerHTML=years.map(y=>`
    <button onclick="calWYearPickerSelect(${y},'${wid}')"
      style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:6px 12px;background:${y===curYr?'var(--a2)':'none'};color:${y===curYr?'#fff':'var(--ink)'};border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .12s;"
      onmouseover="if(this.style.background!=='var(--a2)')this.style.background='var(--surf2)'"
      onmouseout="if(this.style.background!=='var(--a2)')this.style.background='none'">
      <span>${y}</span>
      ${y===thisYr?`<span style="font-size:10px;font-weight:700;color:${y===curYr?'rgba(255,255,255,.65)':'var(--ink4)'};letter-spacing:.3px;">THIS YEAR</span>`:''}
    </button>`).join('');
  pop.style.display='block';
  setTimeout(()=>document.addEventListener('click', function _close(e){
    if(!pop.contains(e.target)&&!document.getElementById('cw-monthlbl-'+wid)?.contains(e.target)){
      pop.style.display='none'; document.removeEventListener('click',_close);
    }
  }),50);
}
function calWYearPickerSelect(yr,wid){
  const now=new Date();
  const curBase=new Date(now.getFullYear(),now.getMonth()+calOff,1);
  const targetDate=new Date(yr,curBase.getMonth(),1);
  calOff=(targetDate.getFullYear()-now.getFullYear())*12+(targetDate.getMonth()-now.getMonth());
  document.getElementById('cw-year-picker-'+wid).style.display='none';
  widgets.forEach(w=>{if(w.type==='calendar')fillWBody(w);});
}

function shiftCalW(dir,wid){calOff+=dir;widgets.forEach(w=>{if(w.type==='calendar')fillWBody(w);});}
function renderCalW(wid){
  const lbl=document.getElementById('cw-monthlbl-'+wid);
  const grid=document.getElementById('cwgrid-'+wid);
  if(!grid) return;
  const now=new Date();
  const base=new Date(now.getFullYear(),now.getMonth()+calOff,1);
  const yr=base.getFullYear(), mo=base.getMonth();
  const tok=fdk(new Date());
  if(lbl){
    const span=document.getElementById('cw-monthlbl-text-'+wid);
    if(span) span.textContent=base.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  }
  const firstDay=(new Date(yr,mo,1).getDay()+6)%7;
  const daysInMonth=new Date(yr,mo+1,0).getDate();
  const dn=['M','T','W','T','F','S','S'];
  let html='<div class="cw-month-grid">';
  html+='<div class="cw-month-hd-row">'+dn.map(d=>`<div class="cw-month-hd">${d}</div>`).join('')+'</div>';
  html+='<div class="cw-month-body">';
  for(let i=0;i<firstDay;i++) html+='<div class="cw-day empty"></div>';
  for(let d=1;d<=daysInMonth;d++){
    const ds=`${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday=ds===tok;
    const dayEvs=calEvs.filter(e=>e.yearly ? e.date.slice(5)===ds.slice(5) : (e.date||'')===ds);
    html+=`<div class="cw-day${isToday?' cw-today':''}" onclick="calDayClick('${ds}');openMo('mo-ev')">
      <div class="cw-day-num${isToday?' cw-today-num':''}">${d}</div>
      <div class="cw-day-dots">${dayEvs.slice(0,2).map(e=>`<div class="cw-ev-dot2" style="background:${e.color||'var(--a2)'};" title="${esc(e.title)}"></div>`).join('')}${dayEvs.length>2?`<div class="cw-ev-dot2 cw-ev-more">+${dayEvs.length-2}</div>`:''}</div>
    </div>`;
  }
  html+='</div></div>';
  // Upcoming events this month
  const monthStart=`${yr}-${String(mo+1).padStart(2,'0')}-01`;
  const monthEnd=`${yr}-${String(mo+1).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`;
  const mmS=monthStart.slice(5),mmE=monthEnd.slice(5);
  const monthEvs=calEvs.filter(e=>{
    if(e.yearly){ const mm=e.date.slice(5); return mm>=mmS&&mm<=mmE; }
    return e.date>=monthStart&&e.date<=monthEnd;
  }).map(e=>e.yearly?{...e,date:`${yr}-${e.date.slice(5)}`}:e)
    .sort((a,b)=>a.date>b.date?1:-1);
  if(monthEvs.length){
    html+='<div class="cw-ev-list" style="margin-top:8px;">';
    monthEvs.forEach(ev=>{
      const d=new Date(ev.date+'T12:00:00');
      const isToday=ev.date===tok;
      const lbl2=isToday?'Today':d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
      const col=ev.color||'var(--a2)';
      const timeLbl=ev.timeStart?fmtTime(ev.timeStart)+(ev.timeEnd?'–'+fmtTime(ev.timeEnd):''):'';
      html+=`<div class="cw-ev-item" onclick="calEvClick('${ev.id}')">
        <div class="cw-ev-dot" style="background:${col};"></div>
        <div class="cw-ev-body">
          <div class="cw-ev-title">${esc(ev.title)}${ev.yearly?'<span style="font-size:10px;margin-left:4px;">📌</span>':''}</div>
          <div class="cw-ev-meta">${lbl2}${timeLbl?' · '+timeLbl:''}</div>
        </div>
        <button onclick="event.stopPropagation();delEv('${ev.id}')" style="background:none;border:none;color:var(--ink4);cursor:pointer;font-size:14px;padding:2px 4px;border-radius:4px;" title="Delete">×</button>
      </div>`;
    });
    html+='</div>';
  } else {
    html+=`<div class="cw-empty" style="padding:16px;"><div style="font-size:11px;color:var(--ink4);text-align:center;">No events this month · Click a day to add</div></div>`;
  }
  grid.innerHTML=html;
}

// ═══════════════════════════════════════
// FULL PAGE — SUBJECTS
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// FULL PAGE — SUBJECTS
// ═══════════════════════════════════════
let _activeSubId=null;

function renderSubFull(){
  const g=$('subgrid');if(!g)return;
  const scroll=document.querySelector('#pg-subjects .fpscroll');
  if(_activeSubId!==null){
    const s=subjects.find(x=>String(x.id)===String(_activeSubId));
    if(s){if(scroll)scroll.classList.remove('is-list');scroll&&scroll.classList.add('is-detail');renderSubDetail(s);return;}
    _activeSubId=null;
  }
  if(scroll){scroll.classList.add('is-list');scroll.classList.remove('is-detail');}
  renderSubList();
}

function syncProjectProgress(){
  subjects.forEach(s=>{
    const projTasks=tasks.filter(t=>String(t.subjectId)===String(s.id));
    if(projTasks.length){
      const doneCnt=projTasks.filter(t=>t.col==='done').length;
      s.progress=Math.round(doneCnt/projTasks.length*100);
      // Auto-complete when all tasks done; auto-revert when not
      s.status=doneCnt===projTasks.length?'done':'active';
    }
  });
  if(acc[cu]) acc[cu].subjects=subjects;
}
function getProjProgress(s){
  const projTasks=tasks.filter(t=>String(t.subjectId)===String(s.id));
  if(!projTasks.length)return s.progress||0;
  const done=projTasks.filter(t=>t.col==='done').length;
  return Math.round((done/projTasks.length)*100);
}

// Project card accent colors — saved per project, fallback spreads across palette by array position
const _projPalette=['#3A7D5E','#7C5CBF','#C0693A','#2E86AB','#C47B2B','#A0522D','#5B8C5A','#B5446E'];
function _projColor(s){
  if(s.color&&s.color!=='var(--a2)')return s.color;
  // assign fallback color based on position so no two adjacent projects share a color
  const allIdx=subjects.indexOf(s);
  const noColor=subjects.filter(x=>!x.color||x.color==='var(--a2)');
  const idx=noColor.indexOf(s);
  return _projPalette[(idx>=0?idx:allIdx)%_projPalette.length];
}

// ── NEW DESKTOP PROJECT LIST ──
function renderSubList(){
  const g=$('subgrid');if(!g)return;
  const hdr=document.querySelector('#pg-subjects .fphdr');
  if(hdr)hdr.innerHTML=`<div class="pg-hdr-inner"><div class="fptit">Projects</div><button class="btn ba bsm" onclick="_resetSubMo();openMo('mo-sub')">+ New Project</button></div>`;
  if(!subjects.length){
    g.innerHTML=`<div class="sub-empty"><div class="sub-empty-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 17.5h7M17.5 14v7"/></svg></div><div class="sub-empty-title">No projects yet</div><div class="sub-empty-desc">Create your first project to start organizing tasks.</div><button class="btn ba bsm" onclick="_resetSubMo();openMo('mo-sub')">+ New Project</button></div>`;
    return;
  }
  const now=new Date();now.setHours(0,0,0,0);
  function projUrgency(s){
    const st=s.status||'active';
    const projTasks=tasks.filter(t=>String(t.subjectId)===String(s.id));
    const remaining=projTasks.filter(t=>t.col!=='done').length;
    if(s.due){const d=new Date(s.due+'T00:00:00');const diff=Math.round((d-now)/(1000*60*60*24));if(diff<0)return -10000+diff;return diff*10-remaining;}
    return 5000-remaining;
  }
  function sortedSubjects(arr){return arr.slice().sort((a,b)=>projUrgency(a)-projUrgency(b));}
  const groups=[
    {key:'active',label:'Active',subjects:sortedSubjects(subjects.filter(s=>(s.status||'active')==='active'))},
    {key:'done',label:'Completed',subjects:subjects.filter(s=>s.status==='done')},
  ].filter(g=>g.subjects.length);

  function cardHtml(s){
    const st=s.status||'active';
    const prog=getProjProgress(s);
    const projTasks=tasks.filter(t=>String(t.subjectId)===String(s.id));
    const doneCnt=projTasks.filter(t=>t.col==='done').length;
    const total=projTasks.length;
    const color=_projColor(s);
    const overdue=s.due&&st!=='done'&&new Date(s.due+'T00:00:00')<now;
    const dueSoon=s.due&&st!=='done'&&!overdue&&(new Date(s.due+'T00:00:00')-now)<=(3*86400000);
    const dueStr=s.due?new Date(s.due+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'';
    const urgentBorder=overdue?'border-color:#E53E3E;':dueSoon?'border-color:#E53E3E;':'';
    const urgentBadge=overdue
      ?`<span style="font-size:10px;font-weight:700;color:#E53E3E;background:#FEF2F2;border:1px solid #FECACA;border-radius:100px;padding:2px 8px;white-space:nowrap;">Overdue</span>`
      :dueSoon
      ?`<span style="font-size:10px;font-weight:700;color:#E53E3E;background:#FEF2F2;border:1px solid #FECACA;border-radius:100px;padding:2px 8px;white-space:nowrap;">Due soon</span>`
      :'';
    const statLabel={active:'Ongoing',done:'Completed'};
    const statClass={active:'st-active',done:'st-done'};
    // Show up to 4 task pills
    const shownTasks=projTasks.slice(0,4);
    const taskPills=shownTasks.map(t=>{
      const done=t.col==='done';
      const inprog=t.col==='inprog';
      const bg=done?`${color}22`:inprog?`${color}44`:'var(--surf2)';
      const border=done?`${color}44`:inprog?`${color}88`:'var(--bdr)';
      const textDecor=done?'text-decoration:line-through;opacity:.5;':'';
      return `<div style="display:flex;align-items:center;gap:5px;padding:3px 8px;background:${bg};border:1px solid ${border};border-radius:100px;font-size:11px;font-weight:600;color:var(--ink);max-width:100%;overflow:hidden;">
        ${done?`<svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"><path d="M2 8l4 4 8-8"/></svg>`
        :inprog?`<div style="width:6px;height:6px;border-radius:50%;background:${color};flex-shrink:0;"></div>`
        :`<div style="width:6px;height:6px;border-radius:50%;background:var(--bdr);flex-shrink:0;"></div>`}
        <span style="${textDecor}white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(t.text||t.title||'')}</span>
      </div>`;
    }).join('');
    const moreTasks=projTasks.length>4?`<div style="font-size:11px;color:var(--ink4);padding:2px 6px;">+${projTasks.length-4} more</div>`:'';
    return `<div class="subcard" id="subcard-${s.id}" style="--proj-color:${color};${urgentBorder}" onclick="openSubDetail('${s.id}')">
      <div style="height:5px;background:${color};flex-shrink:0;border-radius:0;"></div>
      <div class="subbody">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px;">
          <div class="subname">${esc(s.name)}</div>
          ${urgentBadge||`<span class="subtag ${statClass[st]}">${statLabel[st]}</span>`}
        </div>
        ${s.desc?`<div class="subdesc">${esc(s.desc)}</div>`:''}
        <div style="display:flex;align-items:center;gap:8px;margin:8px 0 6px;">
          <div class="subbar" style="flex:1;"><div class="subbarfill" style="width:${prog}%;background:${color}"></div></div>
          <span style="font-size:11px;font-weight:700;color:var(--ink3);min-width:26px;">${prog}%</span>
        </div>
        ${total?`<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;">${taskPills}${moreTasks}</div>`:'<div style="font-size:11px;color:var(--ink4);">No tasks yet</div>'}
      </div>
      <div class="subfoot">
        <span class="subdue${overdue?' overdue':dueSoon?' duesoon':''}">${dueStr?(overdue?'Overdue: ':dueSoon?'Due soon: ':'Due: ')+dueStr:''}</span>
        ${!urgentBadge?'':`<span class="subtag ${statClass[st]}">${statLabel[st]}</span>`}
      </div>
    </div>`;
  }

  g.style.display='block';
  g.innerHTML=groups.map(grp=>`
    <div class="sub-group">
      <div class="sub-group-hd">${grp.label} <span class="sub-group-cnt">${grp.subjects.length}</span></div>
      <div class="subgrid-inner">${grp.subjects.map(s=>cardHtml(s)).join('')}</div>
    </div>
  `).join('');
}


function cycProjStatus(id){
  const s=subjects.find(x=>String(x.id)===String(id));if(!s)return;
  const cycle={active:'hold',hold:'done',done:'active'};
  s.status=cycle[s.status||'active'];
  persist();renderSubFull();
}

// ── PROJECT CARD DRAG-TO-REORDER ──
let _sgDragIdx=null;
function sgDragStart(e,idx){
  _sgDragIdx=idx;
  e.dataTransfer.effectAllowed='move';
  setTimeout(()=>{
    const card=e.currentTarget;
    if(card)card.classList.add('subcard-dragging');
  },0);
}
function sgDragEnd(e){
  _sgDragIdx=null;
  document.querySelectorAll('.subcard').forEach(c=>c.classList.remove('subcard-dragging','subcard-dragover'));
}
function _sgSameBucket(a,b){
  // Same bucket = same due date string (including both empty)
  return (a.due||'') === (b.due||'');
}
function sgDragOver(e,idx){
  e.preventDefault();
  if(_sgDragIdx===null||_sgDragIdx===idx)return;
  if(!_sgSameBucket(subjects[_sgDragIdx],subjects[idx]))return;
  document.querySelectorAll('.subcard').forEach(c=>c.classList.remove('subcard-dragover'));
  e.currentTarget.classList.add('subcard-dragover');
}
function sgDragLeave(e){
  e.currentTarget.classList.remove('subcard-dragover');
}
function sgDrop(e,idx){
  e.preventDefault();
  e.stopPropagation();
  document.querySelectorAll('.subcard').forEach(c=>c.classList.remove('subcard-dragging','subcard-dragover'));
  if(_sgDragIdx===null||_sgDragIdx===idx){_sgDragIdx=null;return;}
  if(!_sgSameBucket(subjects[_sgDragIdx],subjects[idx])){_sgDragIdx=null;return;}
  const moved=subjects.splice(_sgDragIdx,1)[0];
  subjects.splice(idx,0,moved);
  _sgDragIdx=null;
  persist();renderSubList();renderAllSubW();
}

function openSubDetail(id){
  _activeSubId=String(id);
  renderSubDetail(subjects.find(s=>String(s.id)===String(id)));
}

// ── NEW DESKTOP PROJECT DETAIL ──
function renderSubDetail(s){
  const g=$('subgrid');if(!g||!s)return;
  const color=_projColor(s);
  const hdr=document.querySelector('#pg-subjects .fphdr');
  if(hdr)hdr.innerHTML=`<div class="pg-hdr-inner"><div style="display:flex;align-items:center;gap:10px;"><button class="subdet-back" onclick="_activeSubId=null;renderSubFull()"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13L5 8l5-5"/></svg></button><div class="fptit">${esc(s.name)}</div></div><button class="btn ba bsm" onclick="openAddTaskToProj('${s.id}')">+ Add Task</button></div>`;
  const projTasks=tasks.filter(t=>String(t.subjectId)===String(s.id));
  const prog=getProjProgress(s);
  const statLabel={active:'Ongoing',done:'Completed'};
  const statClass={active:'st-active',done:'st-done'};
  const st=s.status||'active';
  const now=new Date();now.setHours(0,0,0,0);
  const overdue=s.due&&st!=='done'&&new Date(s.due+'T00:00:00')<now;
  const dueSoon=s.due&&st!=='done'&&!overdue&&(new Date(s.due+'T00:00:00')-now)<=(3*86400000);
  const dueStr=s.due?new Date(s.due+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'';
  const todo=sortByDue(projTasks.filter(t=>t.col==='todo'));
  const inprog=sortByDue(projTasks.filter(t=>t.col==='inprog'));
  const done=projTasks.filter(t=>t.col==='done');

  function taskCard(t){
    const due=taskDueInfo(t);
    const dueTag=due?`<span class="tag tl" style="background:${due.bg};color:${due.color};border:1px solid ${due.border};">${due.label}</span>`:'';
    const isOverdue=due?.label==='Overdue';
    const isDone=t.col==='done';
    return `<div class="tc${isOverdue?' tc-overdue':''}" id="sdtc-${t.id}" draggable="true"
      ondragstart="sdDragStart(event,'${t.id}','${s.id}')"
      ondragend="sdDragEnd()"
      style="${isDone?'opacity:.5;cursor:default;':''}">
      <div class="tct" style="${isDone?'text-decoration:line-through;opacity:.6;':''}">${esc(t.text||t.title||'')}</div>
      <div class="tcf" style="${isDone?'opacity:.4;':''}">
        ${dueTag}<span class="tcd">${t.date||''}</span>
      </div>
    </div>`;
  }

  function dropCol(col){
    return `id="sdc-${col}-${s.id}" ondragover="sdDragOver(event,'${col}','${s.id}')" ondragleave="sdDragLeave(event)" ondrop="sdDrop(event,'${col}','${s.id}')"`;
  }

  // Due date bar — shown only when due date exists
  const dueDateBar=(overdue||dueSoon)?`
    <div style="height:3px;background:#E53E3E;margin-bottom:0;"></div>
    <div style="padding:7px 16px;background:#FEF2F2;border-bottom:1px solid #FECACA;display:flex;align-items:center;gap:8px;">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#E53E3E" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M2 7h12M6 1v3M10 1v3"/></svg>
      <span style="font-size:11px;font-weight:700;color:#E53E3E;">${overdue?'Overdue':'Due soon'} — ${dueStr}</span>
    </div>`
    :dueStr?`<div style="padding:6px 16px;background:var(--surf2);border-bottom:1px solid var(--bdr);display:flex;align-items:center;gap:8px;">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--ink4)" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M2 7h12M6 1v3M10 1v3"/></svg>
      <span style="font-size:11px;color:var(--ink3);">Due ${dueStr}</span>
    </div>`:'';

  g.style.display='block';
  g.innerHTML=`
    <div class="subdet">
      <div class="subdet-meta" style="padding:0;overflow:hidden;">
        <div style="height:4px;background:${color};"></div>
        ${dueDateBar}
        <div style="padding:12px 16px;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="subtag ${statClass[st]}">${statLabel[st]}</span>
            <span class="subdet-stat-sep">·</span>
            <span class="subdet-stat-chip">${projTasks.length} task${projTasks.length!==1?'s':''}</span>
            <span class="subdet-stat-sep">·</span>
            <span class="subdet-stat-chip">${done.length} done</span>
            <div style="flex:1;min-width:60px;"></div>
            <div class="subdet-prog-track" style="width:100px;"><div class="subdet-prog-fill" style="width:${prog}%;background:${color};"></div></div>
            <span style="font-size:11px;font-weight:700;color:var(--ink3);min-width:30px;">${prog}%</span>
            <button class="subdet-del-btn" onclick="delSub('${s.id}')" title="Delete project"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 5 13 5"/><path d="M6 5V3h4v2M6 8v5M10 8v5"/><rect x="4" y="5" width="8" height="9" rx="1.5"/></svg></button>
          </div>
          ${s.desc?`<div style="font-size:12px;color:var(--ink3);margin-top:8px;line-height:1.5;">${esc(s.desc)}</div>`:''}
          <div style="font-size:11px;color:var(--ink4);margin-top:8px;letter-spacing:.01em;">Drag tasks forward to advance</div>
        </div>
      </div>
      <div class="subdt-cols">
        <div class="subdt-col">
          <div class="subdt-colhd"><div class="twdot twdot-todo"></div>To Do <span class="twcnt">${todo.length}</span></div>
          <div class="twbody" ${dropCol('todo')}>
            ${todo.length?todo.map(t=>taskCard(t)).join(''):`<div class="twempty"><div class="twempty-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg></div><div class="twempty-t">No tasks</div><div class="twempty-hint">Click + Add Task above</div></div>`}
          </div>
        </div>
        <div class="subdt-col">
          <div class="subdt-colhd"><div class="twdot twdot-inprog"></div>In Progress <span class="twcnt">${inprog.length}</span></div>
          <div class="twbody" ${dropCol('inprog')}>
            ${inprog.length?inprog.map(t=>taskCard(t)).join(''):`<div class="twempty"><div class="twempty-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></div><div class="twempty-t">Nothing in progress</div><div class="twempty-hint">Drag a task here</div></div>`}
          </div>
        </div>
        <div class="subdt-col">
          <div class="subdt-colhd"><div class="twdot" style="background:${color}"></div>Done <span class="twcnt">${done.length}</span></div>
          <div class="twbody" ${dropCol('done')}>
            ${done.length?done.map(t=>taskCard(t)).join(''):`<div class="twempty"><div class="twempty-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-5"/></svg></div><div class="twempty-t">Nothing done yet</div></div>`}
          </div>
        </div>
      </div>
    </div>`;
}


let _sdDragId=null;
function sdDragStart(e,id,subjId){
  _sdDragId=id;
  e.dataTransfer.effectAllowed='move';
  setTimeout(()=>{const el=$('sdtc-'+id);if(el)el.classList.add('dragging');},0);
}
function sdDragEnd(){
  _sdDragId=null;
  document.querySelectorAll('[id^="sdtc-"]').forEach(e=>e.classList.remove('dragging'));
  document.querySelectorAll('[id^="sdc-"]').forEach(e=>e.classList.remove('dov'));
}
function sdDragOver(e,col,subjId){
  e.preventDefault();
  document.querySelectorAll('[id^="sdc-"]').forEach(e=>e.classList.remove('dov'));
  const cols=['todo','inprog','done'];
  const t=tasks.find(x=>String(x.id)===String(_sdDragId));
  if(t&&cols.indexOf(col)>cols.indexOf(t.col)){
    const el=$('sdc-'+col+'-'+subjId);if(el)el.classList.add('dov');
  }
}
function sdDragLeave(e){
  if(!e.currentTarget.contains(e.relatedTarget))e.currentTarget.classList.remove('dov');
}
function sdDrop(e,col,subjId){
  e.preventDefault();
  document.querySelectorAll('[id^="sdc-"]').forEach(e=>e.classList.remove('dov'));
  if(_sdDragId===null)return;
  const t=tasks.find(x=>String(x.id)===String(_sdDragId));
  const cols=['todo','inprog','done'];
  // forward-only: only allow moving to a column ahead of the current one
  if(t&&cols.indexOf(col)>cols.indexOf(t.col)){
    t.col=col;syncProjectProgress();persist();renderSubFull();renderAllTaskW();updateAllStatsW();updateFixedStats();renderAllSubW();
  }
  _sdDragId=null;
}
function sdAdvanceTask(id,subjId){
  const t=tasks.find(x=>String(x.id)===String(id));if(!t)return;
  const cols=['todo','inprog','done'];
  const idx=cols.indexOf(t.col);
  if(idx>=2)return;
  t.col=cols[idx+1];
  syncProjectProgress();persist();renderSubFull();renderAllTaskW();updateAllStatsW();updateFixedStats();renderAllSubW();
}

function sdSelTask(e,id,subjId){
  e.stopPropagation();
  // clicking card does nothing extra in project view — drag handles movement
}

function openAddTaskToProj(subjId){
  const s=subjects.find(x=>String(x.id)===String(subjId));
  const bar=document.getElementById('ptask-mo-bar');
  if(bar)bar.style.background=s?_projColor(s):'var(--a2)';
  const nameEl=$('ptask-name');if(nameEl)nameEl.value='';
  document.querySelectorAll('#ptask-col-row .sub-stat-pill').forEach((p,i)=>p.classList.toggle('active',i===0));
  const colEl=$('ptask-col');if(colEl)colEl.value='todo';
  const sidEl=$('ptask-subjid');if(sidEl)sidEl.value=subjId;
  openMo('mo-ptask');
  setTimeout(()=>{const n=$('ptask-name');if(n)n.focus();},300);
}
function ptaskOpenDatePicker(){
  dpOpen($('ptask-due').value||'',function(val){
    const inp=$('ptask-due');if(inp)inp.value=val||'';
    const lbl=document.getElementById('ptask-date-lbl');if(lbl)lbl.textContent=val?calDisplay(new Date(val+'T00:00:00')):'Choose due date';
    const btn=document.getElementById('ptask-date-btn');if(btn)btn.classList.toggle('filled',!!val);
  });
}
function ptaskPickCol(el){
  document.querySelectorAll('#ptask-col-row .sub-stat-pill').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  const c=$('ptask-col');if(c)c.value=el.dataset.val;
}
function addProjTask(){
  const name=$('ptask-name').value.trim();if(!name)return;
  const subjId=String($('ptask-subjid').value);
  const col=$('ptask-col').value||'todo';
  tasks.unshift({
    id:String(Date.now()),text:name,title:name,col,
    date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'}),
    dueDate:null,recurring:'none',subjectId:subjId
  });
  // Adding a task always makes the project ongoing again
  const s=subjects.find(x=>String(x.id)===String(subjId));
  if(s) s.status='active';
  syncProjectProgress();persist();renderSubFull();renderAllTaskW();updateAllStatsW();updateFixedStats();renderAllSubW();
  closeMo('mo-ptask');
}

function toggleSubTask(id){
  const t=tasks.find(x=>x.id===id);if(!t)return;
  t.col=t.col==='done'?'todo':'done';
  syncProjectProgress();persist();renderSubFull();renderAllTaskW();updateAllStatsW();updateFixedStats();renderAllSubW();
}

function removeTaskFromProj(id){
  const idx=tasks.findIndex(x=>x.id===id);if(idx===-1)return;
  tasks.splice(idx,1);
  syncProjectProgress();
  persist();renderSubFull();renderAllTaskW();updateAllStatsW();updateFixedStats();renderAllSubW();
}
// ── NEW PROJECT MODAL HELPERS ──
let _subPickedColor='#3A7D5E';
function subPickColor(el){
  _subPickedColor=el.dataset.color;
  document.querySelectorAll('#sub-color-swatches .ev-cswatch').forEach(s=>s.classList.remove('sel'));
  el.classList.add('sel');
  const bar=document.getElementById('sub-mo-bar');
  if(bar)bar.style.background=_subPickedColor;
}
function subPickStatus(el){
  document.querySelectorAll('#sub-status-row .sub-stat-pill').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  const inp=$('sstat-i');if(inp)inp.value=el.dataset.val;
}
function subOpenDatePicker(){
  const cur=$('sdue-i').value||'';
  dpOpen(cur,function(val){
    const inp=$('sdue-i');
    const btn=document.getElementById('sub-date-btn');
    const lbl=document.getElementById('sub-date-lbl');
    if(inp)inp.value=val||'';
    if(lbl)lbl.textContent=val?calDisplay(new Date(val+'T00:00:00')):'Choose due date';
    if(btn){
      if(val){btn.classList.add('filled');}
      else{btn.classList.remove('filled');}
    }
  });
}
function _resetSubMo(){
  const colors=['#3A7D5E','#7C5CBF','#C0693A','#2E86AB','#C47B2B','#B5446E','#5B8C5A','#5B8DD9'];
  const used=new Set(subjects.map(s=>s.color).filter(Boolean));
  const unused=colors.filter(c=>!used.has(c));
  const pool=unused.length?unused:colors;
  _subPickedColor=pool[Math.floor(Math.random()*pool.length)];
  ['sn-i','sdesc-i'].forEach(id=>{const el=$(id);if(el)el.value='';});
  _subDraftTasks=[];
  const taskList=$('sub-task-list');if(taskList)taskList.innerHTML='';
  const taskInp=$('sub-task-inp');if(taskInp)taskInp.value='';
  const due=$('sdue-i');if(due)due.value='';
  const lbl=document.getElementById('sub-date-lbl');if(lbl)lbl.textContent='Choose due date';
  const btn=document.getElementById('sub-date-btn');if(btn)btn.classList.remove('filled');
  document.querySelectorAll('#sub-status-row .sub-stat-pill').forEach((p,i)=>p.classList.toggle('active',i===0));
  const sstat=$('sstat-i');if(sstat)sstat.value='active';
  const bar=document.getElementById('sub-mo-bar');if(bar)bar.style.background=_subPickedColor;
}

let _subDraftTasks=[];
function subAddTaskItem(){
  const inp=$('sub-task-inp'); if(!inp) return;
  const name=inp.value.trim(); if(!name) return;
  _subDraftTasks.push({text:name});
  inp.value='';
  subRenderDraftTasks();
  inp.focus();
}
function subRenderDraftTasks(){
  const list=$('sub-task-list'); if(!list) return;
  list.innerHTML=_subDraftTasks.map((t,i)=>`
    <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--surf2);border:1px solid var(--bdr);border-radius:9px;">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--ink4)" stroke-width="2" stroke-linecap="round"><path d="M3 8h10M3 5h10M3 11h6"/></svg>
      <span style="flex:1;font-size:13px;color:var(--ink);">${esc(t.text)}</span>
      <button onclick="subRemoveDraftTask(${i})" style="background:none;border:none;color:var(--ink4);cursor:pointer;font-size:16px;line-height:1;padding:0 2px;">&times;</button>
    </div>`).join('');
}
function subRemoveDraftTask(i){
  _subDraftTasks.splice(i,1);
  subRenderDraftTasks();
}

function addSub(){
  const name=$('sn-i').value.trim();if(!name)return;
  const subjId=Date.now();
  subjects.push({id:subjId,name,
    desc:$('sdesc-i').value.trim(),
    due:$('sdue-i').value,
    status:'active',
    color:_subPickedColor||'#3A7D5E',
    progress:0,created:Date.now()});
  // Add draft tasks linked to this project
  _subDraftTasks.forEach(t=>{
    tasks.unshift({id:Date.now()+Math.random(),text:t.text,title:t.text,col:'todo',
      date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'}),
      dueDate:null,recurring:'none',subjectId:subjId,created:Date.now()});
  });
  persist();renderSubFull();renderAllSubW();updateAllStatsW();populateTaskWidgetSubjSels();closeMo('mo-sub');
  _resetSubMo();
}
async function delSub(id){if(!await appConfirm('Delete this project?','All project data will be permanently removed.'))return;subjects=subjects.filter(s=>String(s.id)!==String(id));if(String(_activeSubId)===String(id))_activeSubId=null;persist();renderSubFull();renderAllSubW();updateAllStatsW();populateTaskWidgetSubjSels();}
function updProjStatus(id,val){
  const s=subjects.find(x=>x.id===id);if(!s)return;
  s.status=val;if(val==='done')s.progress=100;
  persist();renderSubFull();renderAllSubW();
}
function updGrade(id,val){/* progress now auto-calculated from tasks */}

// ═══════════════════════════════════════
// FULL PAGE — CALENDAR
// ═══════════════════════════════════════
function getWeekDays(off=0){
  const now=new Date(),day=now.getDay(),mon=new Date(now);
  mon.setDate(now.getDate()-((day+6)%7)+off*7);
  return Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d;});
}
function fdk(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;}
function shiftW(dir){calOff+=dir;renderFullCal();widgets.forEach(w=>{if(w.type==='calendar')fillWBody(w);});}
function updateEvSubSel(){
  const sel=$('ev-s');if(!sel)return;
  sel.innerHTML='<option value="">None</option>'+subjects.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
}
// addEv now defined in planner helpers section above

async function delEv(id){
  if(!await appConfirm('Delete this event?','This cannot be undone.')) return;
  calEvs=calEvs.filter(e=>String(e.id)!==String(id));
  persist();renderFullCal();widgets.forEach(w=>{if(w.type==='calendar')fillWBody(w);});
  // Refresh the day events list in the modal if still open
  if(_evDate) _populateDayEvents(_evDate, null);
}
// ── PLANNER helpers ──────────────────────────────────
const PLANNER_START=6,PLANNER_END=23;
const HOUR_H=56;
function plannerTimeToY(timeStr){
  if(!timeStr)return 0;
  const[h,m]=timeStr.split(':').map(Number);
  return((h-PLANNER_START)*60+m)/60*HOUR_H;
}
function plannerDuration(ts,te){
  if(!ts||!te)return HOUR_H;
  const[h1,m1]=ts.split(':').map(Number);
  const[h2,m2]=te.split(':').map(Number);
  const mins=(h2*60+m2)-(h1*60+m1);
  return Math.max(mins/60*HOUR_H,22);
}
function fmtTime(t){
  if(!t)return '';
  const[h,m]=t.split(':').map(Number);
  const ampm=h>=12?'pm':'am';
  const hh=h%12||12;
  return m?`${hh}:${String(m).padStart(2,'0')}${ampm}`:`${hh}${ampm}`;
}
function fmt12to24(h12,min,ampm){
  let h=parseInt(h12);
  if(ampm==='PM'&&h!==12)h+=12;
  if(ampm==='AM'&&h===12)h=0;
  return `${String(h).padStart(2,'0')}:${String(parseInt(min)).padStart(2,'0')}`;
}
function fmt24to12(t24){
  if(!t24)return {h:'9',m:'00',ap:'AM'};
  const[h,m]=t24.split(':').map(Number);
  const ap=h>=12?'PM':'AM';
  const hh=h%12||12;
  return {h:String(hh),m:String(m).padStart(2,'0'),ap};
}
// ── TIME PICKER BOTTOM SHEET (mirrors dpOpen pattern) ──
let _tpCallback=null,_tpWhich=null;
let _tpH='9',_tpM='00',_tpAP='AM';
function tpOpen(which,currentVal,onConfirm){
  _tpWhich=which;_tpCallback=onConfirm;
  const cur=currentVal?fmt24to12(currentVal):{h:'9',m:'00',ap:'AM'};
  _tpH=cur.h;_tpM=cur.m;_tpAP=cur.ap;
  let modal=document.getElementById('tp-modal');
  if(!modal){
    modal=document.createElement('div');
    modal.id='tp-modal';
    modal.style.cssText='position:fixed;inset:0;z-index:99999;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,0);transition:background .25s;pointer-events:none;';
    modal.innerHTML=`
      <div id="tp-sheet" style="position:relative;width:100%;max-width:440px;background:var(--surf);border-radius:24px 24px 0 0;padding:0 0 28px;box-shadow:0 -12px 48px rgba(0,0,0,.2);transform:translateY(100%);transition:transform .3s cubic-bezier(.32,.72,0,1);">
        <div style="width:40px;height:4px;border-radius:2px;background:var(--bdr);margin:14px auto 0;"></div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;">
          <span id="tp-title" style="font-size:17px;font-weight:800;color:var(--ink);letter-spacing:-.4px;">Start time</span>
          <button onclick="tpClear()" style="background:none;border:none;font-size:12px;font-weight:700;color:var(--ink3);cursor:pointer;font-family:inherit;padding:6px 10px;border-radius:8px;transition:all .15s;" onmouseover="this.style.background='var(--rl)';this.style.color='var(--red)'" onmouseout="this.style.background='none';this.style.color='var(--ink3)'">Clear</button>
        </div>
        <div style="margin:0 16px;background:var(--surf2);border-radius:18px;border:1.5px solid var(--bdr);padding:16px;">
          <div style="display:flex;gap:8px;align-items:flex-start;">
            <div style="flex:2;">
              <div style="font-size:10px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;text-align:center;">Hour</div>
              <div class="tp-sheet-col" id="tp-hr"></div>
            </div>
            <div style="flex:1;">
              <div style="font-size:10px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;text-align:center;">Min</div>
              <div class="tp-sheet-col" id="tp-min"></div>
            </div>
            <div style="flex:1;">
              <div style="font-size:10px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;text-align:center;">AM/PM</div>
              <div class="tp-sheet-col" id="tp-ap"></div>
            </div>
          </div>
        </div>
        <button id="tp-confirm" onclick="tpConfirm()" style="display:block;width:calc(100% - 32px);margin:14px 16px 0;background:var(--a2);color:#fff;border:none;border-radius:14px;padding:16px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;letter-spacing:-.2px;transition:background .15s;">Confirm</button>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',function(e){if(e.target===modal)tpClose();});
  }
  document.getElementById('tp-title').textContent=which==='start'?'Start time':'End time';
  tpRender();
  modal.style.pointerEvents='auto';
  requestAnimationFrame(()=>{
    modal.style.background='rgba(0,0,0,.5)';
    document.getElementById('tp-sheet').style.transform='translateY(0)';
  });
}
function tpRender(){
  const hours=['12','1','2','3','4','5','6','7','8','9','10','11'];
  const mins=['00','15','30','45'];
  const aps=['AM','PM'];
  const hr=document.getElementById('tp-hr');
  const mn=document.getElementById('tp-min');
  const ap=document.getElementById('tp-ap');
  if(hr)hr.innerHTML=hours.map(h=>`<div class="tp-pill${h===_tpH?' sel':''}" onclick="tpPick('h','${h}')">${h}</div>`).join('');
  if(mn)mn.innerHTML=mins.map(m=>`<div class="tp-pill${m===_tpM?' sel':''}" onclick="tpPick('m','${m}')">${m}</div>`).join('');
  if(ap)ap.innerHTML=aps.map(a=>`<div class="tp-pill${a===_tpAP?' sel':''}" onclick="tpPick('ap','${a}')">${a}</div>`).join('');
  const btn=document.getElementById('tp-confirm');
  if(btn)btn.textContent=`Confirm \u2014 ${_tpH}:${_tpM} ${_tpAP}`;
  // scroll selected into view
  setTimeout(()=>{
    document.querySelectorAll('#tp-hr .tp-pill.sel,#tp-min .tp-pill.sel,#tp-ap .tp-pill.sel').forEach(el=>el.scrollIntoView({block:'center',behavior:'smooth'}));
  },50);
}
function tpPick(part,val){
  if(part==='h')_tpH=val;
  else if(part==='m')_tpM=val;
  else _tpAP=val;
  tpRender();
}
function tpClear(){
  if(_tpCallback)_tpCallback(null);
  tpClose();
}
function tpConfirm(){
  const val=fmt12to24(_tpH,_tpM,_tpAP);
  if(_tpCallback)_tpCallback(val);
  tpClose();
}
function tpClose(){
  const modal=document.getElementById('tp-modal');
  const sheet=document.getElementById('tp-sheet');
  if(!modal)return;
  modal.style.background='rgba(0,0,0,0)';
  if(sheet)sheet.style.transform='translateY(100%)';
  modal.style.pointerEvents='none';
  _tpCallback=null;
}
// ── EVENT MODAL STATE ──
let _evColor='#3A7D5E';
let _editEvId=null;
let _evDate='';
let _evTimeStart='';
let _evTimeEnd='';
let _evHasTime=false;
function evPickColor(el){
  document.querySelectorAll('.ev-cswatch').forEach(s=>s.classList.remove('sel'));
  el.classList.add('sel');
  _evColor=el.dataset.color;
  const bar=document.getElementById('ev-mod-bar');
  if(bar)bar.style.background=_evColor;
}
// Generate recurring event instances from a base event
function evOpenDatePicker(){
  dpOpen(_evDate||'',function(val){
    _evDate=val||calFmt(calToday());
    const btn=document.getElementById('ev-date-btn');
    const lbl=document.getElementById('ev-date-lbl');
    if(lbl)lbl.textContent=val?calDisplay(new Date(val+'T00:00:00')):'Choose date';
    if(btn)btn.classList.toggle('filled',!!val);
    // Reset time on date change
    _dskEvTimeStart=null; _dskEvTimeEnd=null;
    const tsb=document.getElementById('ev-time-start');if(tsb){tsb.textContent='— Start';tsb.classList.remove('filled');}
    const teb=document.getElementById('ev-time-end');if(teb){teb.textContent='— End';teb.classList.remove('filled');}
    const clrb=document.getElementById('ev-time-clear');if(clrb)clrb.style.display='none';
    const tpb=document.getElementById('ev-timepick');if(tpb)tpb.style.display='none';
  });
}
function _resetEvModal(){
  _editEvId=null;_evDate='';_evTimeStart='';_evTimeEnd='';_evHasTime=false;_evColor='#3A7D5E';
  const et=document.getElementById('ev-t');if(et){et.value='';setTimeout(()=>et.focus(),200);}
  _dskEvTimeStart=null; _dskEvTimeEnd=null;
  const tsb=document.getElementById('ev-time-start');if(tsb){tsb.textContent='— Start';tsb.classList.remove('filled');}
  const teb=document.getElementById('ev-time-end');if(teb){teb.textContent='— End';teb.classList.remove('filled');}
  const clrb=document.getElementById('ev-time-clear');if(clrb)clrb.style.display='none';
  const tpb=document.getElementById('ev-timepick');if(tpb)tpb.style.display='none';
  const en=document.getElementById('ev-note');if(en)en.value='';

  const dbl=document.getElementById('ev-date-lbl');if(dbl)dbl.textContent='Choose date';
  const dbtn=document.getElementById('ev-date-btn');if(dbtn)dbtn.classList.remove('filled');

  document.querySelectorAll('.ev-cswatch').forEach(s=>s.classList.remove('sel'));
  const first=document.querySelector('.ev-cswatch');if(first)first.classList.add('sel');
  const bar=document.getElementById('ev-mod-bar');if(bar)bar.style.background=_evColor;
  const dr=document.getElementById('ev-del-row');if(dr)dr.style.display='none';
  _dskEvYearly=false; _dskEvSetYearly(false);
  const dar=document.getElementById('ev-del-all-row');if(dar)dar.style.display='none';
  updateEvSubSel();
}
function openCalAdd(date,timeStart,timeEnd){
  _resetEvModal();
  date=date||calFmt(calToday());
  _evDate=date;
  const dbl=document.getElementById('ev-date-lbl');
  if(dbl)dbl.textContent=calDisplay(new Date(date+'T00:00:00'));
  const dbtn=document.getElementById('ev-date-btn');if(dbtn)dbtn.classList.add('filled');

  if(timeStart){_evTimeStart=timeStart;_evHasTime=true;}
  if(timeEnd){_evTimeEnd=timeEnd;}
  const ttl=document.getElementById('mo-ev-title');if(ttl)ttl.textContent='New Event';
  const btn=document.getElementById('ev-save-btn');if(btn){btn.textContent='Save';btn.onclick=addEv;}
  openMo('mo-ev');
}
function openCalEdit(id){
  const ev=calEvs.find(e=>e.id===id);if(!ev)return;
  _resetEvModal();
  _editEvId=id;
  _evDate=ev.date||calFmt(calToday());
  _evTimeStart=ev.timeStart||'';
  _evTimeEnd=ev.timeEnd||'';
  _evHasTime=!!ev.timeStart;
  _evColor=ev.color||ev.subColor||'#3A7D5E';
  const ttl=document.getElementById('mo-ev-title');if(ttl)ttl.textContent='Edit Event';
  const btn=document.getElementById('ev-save-btn');if(btn){btn.textContent='Save';btn.onclick=saveEvEdit;}
  const et=document.getElementById('ev-t');if(et)et.value=ev.title||'';
  _dskEvTimeStart=ev.timeStart||null; _dskEvTimeEnd=ev.timeEnd||null;
  const ts2=document.getElementById('ev-time-start');if(ts2){ts2.textContent=ev.timeStart?_fmtTime(ev.timeStart):'— Start';ts2.classList.toggle('filled',!!ev.timeStart);}
  const te2=document.getElementById('ev-time-end');if(te2){te2.textContent=ev.timeEnd?_fmtTime(ev.timeEnd):'— End';te2.classList.toggle('filled',!!ev.timeEnd);}
  const clr2=document.getElementById('ev-time-clear');if(clr2)clr2.style.display=(ev.timeStart||ev.timeEnd)?'':'none';
  const tp2=document.getElementById('ev-timepick');if(tp2)tp2.style.display='none';
  const en=document.getElementById('ev-note');if(en)en.value=ev.note||'';
  // date button
  const dbl=document.getElementById('ev-date-lbl');if(dbl)dbl.textContent=calDisplay(new Date(_evDate+'T00:00:00'));
  const dbtn=document.getElementById('ev-date-btn');if(dbtn)dbtn.classList.add('filled');
  // time preserved from drag (not shown in modal — edit via drag on planner)
  // color
  document.querySelectorAll('.ev-cswatch').forEach(s=>s.classList.toggle('sel',s.dataset.color===_evColor));
  const bar=document.getElementById('ev-mod-bar');if(bar)bar.style.background=_evColor;
  _dskEvYearly=!!ev.yearly; _dskEvSetYearly(!!ev.yearly);
  // project
  const ss=document.getElementById('ev-s');if(ss)ss.value=subjects.find(s=>s.name===ev.subName)?.id||'';
  // delete row
  const dr=document.getElementById('ev-del-row');if(dr)dr.style.display='block';
  const db=document.getElementById('ev-del-btn');
  // show "delete all" button if recurring series
  const dar=document.getElementById('ev-del-all-row');
  if(dar)dar.style.display=ev.recurringId?'block':'none';
  const dab=document.getElementById('ev-del-all-btn');
  if(dab)dab.onclick=async()=>{
    if(!await appConfirm(`Delete all events in this series?`,'This cannot be undone.','Delete All'))return;
    calEvs=calEvs.filter(e=>e.recurringId!==ev.recurringId);
    persist();renderFullCal();
    widgets.forEach(w=>{if(w.type==='calendar')fillWBody(w);});
    closeMo('mo-ev');
  };
  if(db)db.onclick=async()=>{
    if(!await appConfirm('Delete this event?','This cannot be undone.'))return;
    calEvs=calEvs.filter(e=>e.id!==id);
    persist();renderFullCal();
    widgets.forEach(w=>{if(w.type==='calendar')fillWBody(w);});
    closeMo('mo-ev');
  };
  openMo('mo-ev');
}
function saveEvEdit(){
  if(!_editEvId)return;
  const t=document.getElementById('ev-t').value.trim();if(!t)return;
  const ev=calEvs.find(e=>e.id===_editEvId);if(!ev)return;
  const sid=document.getElementById('ev-s').value,sub=subjects.find(s=>String(s.id)===String(sid));
  ev.title=t;ev.date=_evDate||calFmt(calToday());
  ev.color=_evColor;ev.note=document.getElementById('ev-note').value.trim();
  ev.subName=sub?sub.name:'';ev.subColor=sub?sub.color:'';
  ev.timeStart=_dskEvTimeStart||null;ev.timeEnd=_dskEvTimeEnd||null;ev.yearly=_dskEvYearly||false;
  persist();renderFullCal();
  widgets.forEach(w=>{if(w.type==='calendar')fillWBody(w);});
  closeMo('mo-ev');
}
let _dskEvTimeStart=null, _dskEvTimeEnd=null, _dskEvTimeMode=null, _dskEvYearly=false;

// Parse "9:30 AM", "14:00", "930", "9" etc → "HH:MM" or null
function _parseTimeInput(val){
  val=val.trim();
  if(!val) return null;
  const ampm=val.match(/([ap]m?)$/i);
  const isPM=ampm&&ampm[1].toLowerCase().startsWith('p');
  const isAM=ampm&&ampm[1].toLowerCase().startsWith('a');
  const nums=val.replace(/[^0-9:]/g,'');
  let h,m;
  if(nums.includes(':')){
    [h,m]=nums.split(':').map(Number);
  } else if(nums.length<=2){
    h=Number(nums); m=0;
  } else if(nums.length===3){
    h=Number(nums[0]); m=Number(nums.slice(1));
  } else {
    h=Number(nums.slice(0,2)); m=Number(nums.slice(2,4));
  }
  if(isNaN(h)||isNaN(m)) return null;
  if(isPM&&h<12) h+=12;
  if(isAM&&h===12) h=0;
  if(h>23||m>59) return null;
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
}
function dskEtpFormatInput(el){
  // live-format: auto-insert colon after 2 digits
  let v=el.value.replace(/[^0-9apmAPM: ]/g,'');
  el.value=v;
}
function _dskEvSetYearly(on){
  const btn=document.getElementById('dsk-ev-yearly-btn');
  const knob=document.getElementById('dsk-ev-yearly-knob');
  if(btn) btn.style.background=on?'var(--a2)':'var(--bdr)';
  if(knob) knob.style.transform=on?'translateX(17px)':'translateX(0)';
}
function dskEvToggleYearly(){
  _dskEvYearly=!_dskEvYearly;
  _dskEvSetYearly(_dskEvYearly);
}

function dskEvTimeOpen(mode){
  _dskEvTimeMode=mode;
  document.getElementById('ev-timepick-label').textContent=mode==='start'?'Start time':'End time';
  document.getElementById('ev-timepick').style.display='block';
  const existing=mode==='start'?_dskEvTimeStart:_dskEvTimeEnd;
  const inp=document.getElementById('etp-time-inp');
  if(inp){
    inp.value=existing?_fmtTime(existing):'';
    setTimeout(()=>{inp.focus();inp.select();},50);
  }
}
function dskEvTimeDone(){
  const inp=document.getElementById('etp-time-inp');
  const timeStr=inp?_parseTimeInput(inp.value):null;
  if(!timeStr&&inp&&inp.value.trim()){
    inp.style.borderColor='var(--red)';
    setTimeout(()=>inp.style.borderColor='var(--bdr)',1200);
    return;
  }
  // Prevent end time being before or equal to start time
  if(_dskEvTimeMode==='end' && _dskEvTimeStart && timeStr<=_dskEvTimeStart){
    const tp=document.getElementById('ev-timepick');
    const lbl=document.getElementById('ev-timepick-label');
    if(lbl){lbl.textContent='End must be after start';lbl.style.color='var(--red,#dc2626)';}
    setTimeout(()=>{if(lbl){lbl.textContent='End time';lbl.style.color='';}},1500);
    return;
  }
  if(_dskEvTimeMode==='start'){
    _dskEvTimeStart=timeStr;
    // Clear end time if it's now before start
    if(_dskEvTimeEnd && _dskEvTimeEnd<=timeStr){
      _dskEvTimeEnd=null;
      const eel=document.getElementById('ev-time-end');
      if(eel){eel.textContent='— End';eel.classList.remove('filled');}
    }
    const el=document.getElementById('ev-time-start');
    if(el){el.textContent=_fmtTime(timeStr);el.classList.add('filled');}
  } else {
    _dskEvTimeEnd=timeStr;
    const el=document.getElementById('ev-time-end');
    if(el){el.textContent=_fmtTime(timeStr);el.classList.add('filled');}
  }
  document.getElementById('ev-timepick').style.display='none';
  const clr=document.getElementById('ev-time-clear');
  if(clr)clr.style.display=(_dskEvTimeStart||_dskEvTimeEnd)?'':'none';
}
function dskEvTimeClear(){
  _dskEvTimeStart=null; _dskEvTimeEnd=null;
  const s=document.getElementById('ev-time-start');if(s){s.textContent='— Start';s.classList.remove('filled');}
  const e=document.getElementById('ev-time-end');if(e){e.textContent='— End';e.classList.remove('filled');}
  const clr=document.getElementById('ev-time-clear');if(clr)clr.style.display='none';
  const tp=document.getElementById('ev-timepick');if(tp)tp.style.display='none';
}
function _fmtTime(t){ if(!t)return ''; const [h,m]=t.split(':').map(Number); const ap=h>=12?'PM':'AM'; const h12=h%12||12; return h12+':'+String(m).padStart(2,'0')+' '+ap; }

function addEv(){
  const t=document.getElementById('ev-t').value.trim();if(!t||!_evDate)return;
  calEvs.push({id:String(Date.now()),title:t,date:_evDate,color:_evColor,timeStart:_dskEvTimeStart||null,timeEnd:_dskEvTimeEnd||null,yearly:_dskEvYearly||false});
  persist();renderFullCal();widgets.forEach(w=>{if(w.type==='calendar')fillWBody(w);});
  closeMo('mo-ev');
}

function renderFullCal(){
  const now=new Date();
  const base=new Date(now.getFullYear(),now.getMonth()+calOff,1);
  const yr=base.getFullYear(), mo=base.getMonth();
  const tok=fdk(new Date());

  // Update header label
  const wlbl=$('calwlbl');
  if(wlbl) wlbl.textContent=base.toLocaleDateString('en-US',{month:'long',year:'numeric'});

  const g=$('planner-grid'); if(!g) return;

  const firstDay=(new Date(yr,mo,1).getDay()+6)%7; // Mon=0
  const daysInMonth=new Date(yr,mo+1,0).getDate();
  const dn=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  let html=`<div class="cal-month-grid">`;
  // Day headers
  html+=`<div class="cal-month-hd-row">${dn.map(d=>`<div class="cal-month-hd">${d}</div>`).join('')}</div>`;
  // Day cells
  html+=`<div class="cal-month-body">`;
  for(let i=0;i<firstDay;i++) html+=`<div class="cal-day empty"></div>`;
  for(let d=1;d<=daysInMonth;d++){
    const ds=`${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const mmdd=ds.slice(5);
    const isToday=ds===tok;
    const dayEvs=calEvs.filter(e=>(e.date||'').slice(5)===mmdd);
    html+=`<div class="cal-day${isToday?' today':''}" onclick="calDayClick('${ds}')">
      <div class="cal-day-num${isToday?' today':''}">${d}</div>
      <div class="cal-day-dots">${dayEvs.slice(0,3).map(e=>`
        <div class="cal-ev-dot" style="background:${e.color||'var(--a2)'};" title="${esc(e.title)}" onclick="event.stopPropagation();calEvClick('${e.id}')"></div>
      `).join('')}${dayEvs.length>3?`<div class="cal-ev-dot-more">+${dayEvs.length-3}</div>`:''}</div>
    </div>`;
  }
  html+=`</div></div>`;

  // Event list: today + next 3 days only
  const _today=new Date(); _today.setHours(0,0,0,0);
  const _in3=new Date(_today); _in3.setDate(_in3.getDate()+3);
  const todayKey=fdk(_today);
  const in3Key=fdk(_in3);
  const upcomingEvs=calEvs.filter(e=>e.date>=todayKey&&e.date<=in3Key).sort((a,b)=>a.date>b.date?1:-1);
  if(upcomingEvs.length){
    html+=`<div class="cal-month-list"><div class="cal-upcoming-hd">Upcoming — next 3 days</div>`;
    upcomingEvs.forEach(ev=>{
      const d=new Date(ev.date+'T12:00:00');
      const isToday=ev.date===todayKey;
      const lbl=isToday?'Today':d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
      html+=`<div class="cal-month-ev" onclick="calEvClick('${ev.id}')">
        <div class="cal-month-ev-dot" style="background:${ev.color||'var(--a2)'}"></div>
        <div class="cal-month-ev-body">
          <div class="cal-month-ev-title">${esc(ev.title)}</div>
          <div class="cal-month-ev-date">${lbl}${ev.timeStart?' · '+_fmtTime(ev.timeStart)+(ev.timeEnd?' – '+_fmtTime(ev.timeEnd):''):''}</div>
        </div>
        <button class="cal-month-ev-del" onclick="event.stopPropagation();delEv('${ev.id}')" title="Delete">×</button>
      </div>`;
    });
    html+=`</div>`;
  } else {
    html+=`<div class="cal-month-list"><div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:32px 20px;text-align:center;"><div style="width:44px;height:44px;border-radius:14px;background:var(--surf2);border:1.5px solid var(--bdr);display:flex;align-items:center;justify-content:center;color:var(--ink4);"><svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='4' width='18' height='18' rx='2'/><path d='M3 9h18M8 2v3M16 2v3'/></svg></div><div style="font-size:13px;font-weight:700;color:var(--ink2);">Nothing in the next 3 days</div><div style="font-size:11px;color:var(--ink4);">Click any day on the calendar to add an event</div></div></div>`;
  } g.innerHTML=html;
}

function _populateDayEvents(ds, excludeId){
  const dayEvs=calEvs.filter(e=>e.date===ds&&String(e.id)!==String(excludeId||''));
  const wrap=document.getElementById('ev-day-events');
  const list=document.getElementById('ev-day-events-list');
  const lbl=document.getElementById('ev-day-events-lbl');
  if(!wrap||!list) return;
  if(!dayEvs.length){ wrap.style.display='none'; return; }
  const dateStr=new Date(ds+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
  if(lbl) lbl.textContent=`Events on ${dateStr}`;
  list.innerHTML=dayEvs.map(e=>`
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--bdr);">
      <div style="width:10px;height:10px;border-radius:50%;background:${e.color||'var(--a2)'};flex-shrink:0;"></div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:600;color:var(--ink);">${esc(e.title)}</div>
        ${e.timeStart?`<div style="font-size:11px;color:var(--ink3);">${_fmtTime(e.timeStart)}${e.timeEnd?' – '+_fmtTime(e.timeEnd):''}</div>`:''}
      </div>
      <button onclick="calEvClick('${e.id}')" style="font-size:11px;font-weight:700;color:var(--a2);background:none;border:none;cursor:pointer;padding:2px 6px;">Edit</button>
      <button onclick="delEv('${e.id}')" style="font-size:11px;font-weight:700;color:var(--red);background:none;border:none;cursor:pointer;padding:2px 6px;">Del</button>
    </div>`).join('');
  wrap.style.display='';
}

function calDayClick(ds){
  _evDate=ds;
  const btn=document.getElementById('ev-date-btn');
  const lbl=document.getElementById('ev-date-lbl');
  if(lbl) lbl.textContent=new Date(ds+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
  if(btn) btn.classList.add('filled');
  document.getElementById('ev-t').value='';
  document.getElementById('ev-del-row').style.display='none';
  document.getElementById('mo-ev-title').textContent='Add Event';
  document.getElementById('ev-save-btn').onclick=addEv;
  document.querySelectorAll('#ev-color-swatches .ev-cswatch').forEach((s,i)=>s.classList.toggle('sel',i===0));
  _evColor='#3A7D5E';
  // Reset time picker
  _dskEvTimeStart=null; _dskEvTimeEnd=null;
  const _tsr=document.getElementById('ev-time-start');if(_tsr){_tsr.textContent='— Start';_tsr.classList.remove('filled');}
  const _ter=document.getElementById('ev-time-end');if(_ter){_ter.textContent='— End';_ter.classList.remove('filled');}
  const _clrr=document.getElementById('ev-time-clear');if(_clrr)_clrr.style.display='none';
  const _tpr=document.getElementById('ev-timepick');if(_tpr)_tpr.style.display='none';
  _populateDayEvents(ds, null);
  openMo('mo-ev');
  setTimeout(()=>{ const t=document.getElementById('ev-t'); if(t) t.focus(); },200);
}

function calEvClick(id){
  const ev=calEvs.find(e=>String(e.id)===String(id)); if(!ev) return;
  _evDate=ev.date;
  const btn=document.getElementById('ev-date-btn');
  const lbl=document.getElementById('ev-date-lbl');
  if(lbl) lbl.textContent=new Date(ev.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
  if(btn) btn.classList.add('filled');
  document.getElementById('ev-t').value=ev.title;
  document.getElementById('mo-ev-title').textContent='Edit Event';
  document.getElementById('ev-del-row').style.display='';
  document.getElementById('ev-del-btn').onclick=()=>{delEv(String(id));closeMo('mo-ev');};
  document.getElementById('ev-save-btn').onclick=()=>editEv(String(id));
  _evColor=ev.color||'#3A7D5E';
  document.querySelectorAll('#ev-color-swatches .ev-cswatch').forEach(s=>s.classList.toggle('sel',s.dataset.color===_evColor));
  _populateDayEvents(ev.date, String(id));
  openMo('mo-ev');
}

function editEv(id){
  const t=document.getElementById('ev-t').value.trim(); if(!t||!_evDate) return;
  const note=document.getElementById('ev-note').value.trim();
  const idx=calEvs.findIndex(e=>String(e.id)===String(id)); if(idx===-1) return;
  calEvs[idx]={...calEvs[idx],title:t,date:_evDate,color:_evColor};
  persist(); renderFullCal(); widgets.forEach(w=>{if(w.type==='calendar')fillWBody(w);});
  closeMo('mo-ev');
}

// ── PLANNER DRAG & DROP ──────────────────────────────

function pxToTime(px){
  const totalMins=(px/HOUR_H)*60;
  const mins=Math.round(totalMins/15)*15; // snap to 15min
  const h=Math.floor(mins/60)+PLANNER_START;
  const m=mins%60;
  const clampedH=Math.max(PLANNER_START,Math.min(PLANNER_END-1,h));
  return `${String(clampedH).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
function addMins(t24,mins){
  if(!t24)return '';
  const[h,m]=t24.split(':').map(Number);
  const total=h*60+m+mins;
  const nh=Math.max(0,Math.min(23,Math.floor(total/60)));
  const nm=total%60;
  return `${String(nh).padStart(2,'0')}:${String(Math.max(0,nm)).padStart(2,'0')}`;
}
function plannerBindDrag(g){
  let dragState=null;

  // ── CANVAS PAN: mousedown on empty grid area ──
  g.addEventListener('mousedown',function(e){
    if(e.button!==0)return;
    if(e.target.closest('.planner-ev-block'))return;
    const startX=e.clientX,startY=e.clientY;
    const origScrollTop=g.scrollTop,origScrollLeft=g.scrollLeft;
    let panning=false;
    function onPanMove(ev){
      const dx=ev.clientX-startX,dy=ev.clientY-startY;
      if(!panning&&(Math.abs(dx)>4||Math.abs(dy)>4)){panning=true;g.style.cursor='grabbing';}
      if(!panning)return;
      g.scrollTop=origScrollTop-dy;g.scrollLeft=origScrollLeft-dx;
    }
    function onPanUp(){g.style.cursor='';document.removeEventListener('mousemove',onPanMove);document.removeEventListener('mouseup',onPanUp);}
    document.addEventListener('mousemove',onPanMove);
    document.addEventListener('mouseup',onPanUp);
  });

  // ── MOVE: mousedown on event block ──
  g.querySelectorAll('.planner-ev-block').forEach(block=>{
    block.addEventListener('mousedown',function(e){
      if(e.button!==0)return;
      if(e.target.classList.contains('planner-ev-resize'))return;
      e.stopPropagation();
      const evId=parseInt(block.dataset.id);
      const ev=calEvs.find(ev=>ev.id===evId);if(!ev)return;
      const col=block.closest('.planner-day-col');
      const blockRect=block.getBoundingClientRect();
      const grabOffsetX=e.clientX-blockRect.left;
      const grabOffsetY=e.clientY-blockRect.top;
      dragState={type:'move',evId,block,col,grabOffsetX,grabOffsetY,
        origTop:parseInt(block.style.top),origH:parseInt(block.style.height),
        origDate:ev.date,startClientX:e.clientX,startClientY:e.clientY,
        moved:false,clone:null,targetCol:null};
      e.preventDefault();
    });
  });

  // ── RESIZE: mousedown on resize handle ──
  g.querySelectorAll('.planner-ev-resize').forEach(handle=>{
    handle.addEventListener('mousedown',function(e){
      if(e.button!==0)return;
      e.stopPropagation();
      const evId=parseInt(handle.dataset.id);
      const block=handle.closest('.planner-ev-block');
      block.classList.add('dragging');
      dragState={type:'resize',evId,block,
        origTop:parseInt(block.style.top),origH:parseInt(block.style.height),
        startClientY:e.clientY};
      e.preventDefault();
    });
  });

  // ── MOUSEMOVE ──
  function onMouseMove(e){
    if(!dragState)return;
    const{type}=dragState;

    if(type==='move'){
      const{block,col,grabOffsetX,grabOffsetY,origH,startClientX,startClientY}=dragState;
      const dx=Math.abs(e.clientX-startClientX),dy=Math.abs(e.clientY-startClientY);

      // Activate drag after 4px movement
      if(!dragState.moved&&(dx>4||dy>4)){
        dragState.moved=true;
        // Create floating clone that follows the cursor
        const rect=block.getBoundingClientRect();
        const clone=block.cloneNode(true);
        clone.style.cssText=`position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;opacity:.88;z-index:9999;pointer-events:none;box-shadow:0 10px 32px rgba(0,0,0,.28);border-radius:7px;transition:none;`;
        document.body.appendChild(clone);
        dragState.clone=clone;
        block.style.opacity='0.35';
      }
      if(!dragState.moved)return;

      // Move clone to follow mouse
      const{clone}=dragState;
      if(clone){
        clone.style.left=(e.clientX-grabOffsetX)+'px';
        clone.style.top=(e.clientY-grabOffsetY)+'px';
      }

      // Detect which column and time slot we're hovering
      const cols=Array.from(g.querySelectorAll('.planner-day-col'));
      cols.forEach(c=>c.classList.remove('drag-over'));
      const hoveredCol=cols.find(c=>{
        const r=c.getBoundingClientRect();
        return e.clientX>=r.left&&e.clientX<=r.right;
      });
      if(hoveredCol){
        hoveredCol.classList.add('drag-over');
        dragState.targetCol=hoveredCol;
        // Show shadow block at snap position in target col
        const colRect=hoveredCol.getBoundingClientRect();
        const rawY=e.clientY-colRect.top+g.scrollTop-grabOffsetY;
        const snapY=Math.round(rawY/(HOUR_H/4))*(HOUR_H/4);
        dragState.snapY=Math.max(0,Math.min(HOUR_H*(PLANNER_END-PLANNER_START)-origH,snapY));
        block.style.top=dragState.snapY+'px';
        // Move block to hovered col if different
        if(hoveredCol!==col&&block.parentElement!==hoveredCol){
          hoveredCol.appendChild(block);
        } else if(hoveredCol===col&&block.parentElement!==col){
          col.appendChild(block);
        }
      } else {
        dragState.targetCol=null;
      }
    }

    if(type==='resize'){
      const{block,origTop,origH,startClientY}=dragState;
      const delta=e.clientY-startClientY;
      const snapDelta=Math.round(delta/(HOUR_H/4))*(HOUR_H/4);
      const newH=Math.max(HOUR_H/4,origH+snapDelta);
      block.style.height=newH+'px';
      const timeEl=block.querySelector('.planner-ev-time');
      if(timeEl)timeEl.textContent=fmtTime(pxToTime(origTop))+' \u2013 '+fmtTime(pxToTime(origTop+newH));
    }
  }

  // ── MOUSEUP ──
  function onMouseUp(e){
    if(!dragState)return;
    const{type}=dragState;

    if(type==='move'){
      const{evId,block,col,origTop,targetCol,moved,clone,snapY}=dragState;
      // Cleanup clone
      if(clone){clone.remove();}
      block.style.opacity='';
      block.classList.remove('dragging');
      g.querySelectorAll('.planner-day-col').forEach(c=>c.classList.remove('drag-over'));
      // Put block back in original col if no target
      if(!targetCol&&block.parentElement!==col)col.appendChild(block);

      if(!moved){
        // Was a click — restore position and open edit
        block.style.top=origTop+'px';
        if(block.parentElement!==col)col.appendChild(block);
        dragState=null;
        openCalEdit(evId);
        return;
      }

      const finalTop=snapY!==undefined?snapY:parseInt(block.style.top);
      const finalCol=targetCol||col;
      const ev=calEvs.find(ev=>ev.id===evId);
      if(ev){
        const newTs=pxToTime(finalTop);
        const duration=ev.timeEnd&&ev.timeStart?(()=>{
          const[h1,m1]=ev.timeStart.split(':').map(Number);
          const[h2,m2]=ev.timeEnd.split(':').map(Number);
          return(h2*60+m2)-(h1*60+m1);
        })():60;
        ev.timeStart=newTs;ev.timeEnd=addMins(newTs,duration);
        ev.date=finalCol.dataset.date;
        persist();widgets.forEach(w=>{if(w.type==='calendar')fillWBody(w);});
      }
      dragState=null;renderFullCal();return;
    }

    if(type==='resize'){
      const{evId,block,origTop}=dragState;
      block.classList.remove('dragging');
      const newH=parseInt(block.style.height);
      const ev=calEvs.find(ev=>ev.id===evId);
      if(ev){
        ev.timeStart=pxToTime(origTop);ev.timeEnd=pxToTime(origTop+newH);
        persist();widgets.forEach(w=>{if(w.type==='calendar')fillWBody(w);});
      }
      dragState=null;renderFullCal();return;
    }

    dragState=null;
  }

  document.removeEventListener('mousemove',window._plannerMM);
  document.removeEventListener('mouseup',window._plannerMU);
  window._plannerMM=onMouseMove;
  window._plannerMU=onMouseUp;
  document.addEventListener('mousemove',onMouseMove);
  document.addEventListener('mouseup',onMouseUp);
}

// ═══════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════
function renderProfile(){
  const d=acc[cu],nm=d.displayName||cu;
  const photo=prefs.avatarUrl||prefs.avatarPhoto||null;
  const pbavEl=$('pbav');
  if(pbavEl){
    if(photo){
      pbavEl.innerHTML=`<img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0;"/><div class="pbav-overlay">📷 Change</div>`;
    } else {
      pbavEl.innerHTML=esc(nm[0].toUpperCase())+'<div class="pbav-overlay">📷 Change</div>';
    }
  }
  const pbnm=$('pbnm'); if(pbnm) pbnm.textContent=nm;
  const pbun=$('pbun'); if(pbun) pbun.textContent='@'+cu;
  const pbjn=$('pbjn'); if(pbjn) pbjn.textContent='Joined '+new Date(d.joined||Date.now()).toLocaleDateString('en-US',{month:'long',year:'numeric'});
}

// ═══════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════
function renderSettings(){
  const d=acc[cu]||{};
  const displayName=d.displayName||d.display_name||'—';
  const el=document.getElementById('set-dn');if(el)el.textContent=displayName;
  const un=document.getElementById('set-un');
  if(un){
    // Show email from auth if available, fall back to stored email
    const storedEmail=acc[cu]?.email||'';
    if(storedEmail){ un.textContent=storedEmail; }
    else if(sbReady){ sb.auth.getUser().then(({data})=>{ if(data?.user?.email&&un) un.textContent=data.user.email; }).catch(()=>{}); }
    else { un.textContent='—'; }
  }
  const nmInput=$('nm-i');if(nmInput)nmInput.value=d.displayName||'';
  const togDk=$('tog-dk'); if(togDk) togDk.className='tog'+(prefs.dark?' on':'');
  // Hide custom hex row for free users — Apply button only needed for Pro hex input
  const hexRow=document.querySelector('.accent-custom-row');
  if(hexRow) hexRow.style.display=isPro()?'flex':'none';
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
  // Only update initials if no photo is set — otherwise the photo stays as-is
  const hasPhoto=prefs.avatarUrl||prefs.avatarPhoto;
  if(!hasPhoto){
    ['sbavt','ddav'].forEach(id=>{const e=$(id);if(e)e.textContent=n[0].toUpperCase();});
  }
  const ddnm=$('ddnm');if(ddnm)ddnm.textContent=n;
  if($('pbnm'))$('pbnm').textContent=n;
  renderSettings();
  closeMo('mo-nm');
}

async function clrTasks(){if(!await appConfirm('Delete all tasks?','This cannot be undone.','Delete'))return;tasks=[];persist();renderAllTaskW();updateAllStatsW();updateFixedStats();}
async function clrJournal(){if(!await appConfirm('Delete all journal entries?','This cannot be undone.','Delete'))return;journal=[];persist();renderAllJournalW();updateAllStatsW();updateFixedStats();}
async function clrSubjects(){if(!await appConfirm('Delete all projects?','This cannot be undone.','Delete'))return;subjects=[];persist();renderSubFull();renderAllSubW();updateAllStatsW();}
async function clrDoneTasks(wid){
  const done=tasks.filter(t=>t.col==='done');
  if(!done.length)return;
  if(!await appConfirm('Clear all '+done.length+' completed task'+(done.length>1?'s':'')+'?','This cannot be undone.'))return;
  tasks=tasks.filter(t=>t.col!=='done');
  persist();renderAllTaskW();updateAllStatsW();updateFixedStats();
}
async function clrJournalW(wid){
  if(!journal.length)return;
  if(!await appConfirm('Clear all '+journal.length+' journal entr'+(journal.length>1?'ies':'y')+'?','This cannot be undone.'))return;
  journal=[];persist();renderAllJournalW();updateAllStatsW();updateFixedStats();
}
async function delAcc(){
  const ok = await appConfirm('Delete your account?', 'All your data will be permanently erased. This cannot be undone.', 'Delete Account');
  if(!ok) return;
  const _cu = cu;
  // Cancel any pending debounced save — prevents a ghost write after account is gone
  if(_persistTimer){ clearTimeout(_persistTimer); _persistTimer=null; }
  stopRealtimeSync();
  delete acc[_cu]; LS.s('pd1_acc',acc); LS.d('pd1_cur'); cu = null;
  await dbDeleteUser(_cu);
  if(sbReady) sbSignOut().catch(()=>{});
  document.documentElement.setAttribute('data-dark','');
  const _r2=document.documentElement;_r2.style.removeProperty('--a');_r2.style.removeProperty('--a2');_r2.style.removeProperty('--al');
  document.body.classList.remove('in-app');
  show('sl');
}

// ── GLOBAL TOOLTIP POSITIONER ──
(function(){
  let tipEl = null, currentTarget = null, hideTimer = null;

  function getTip(){
    if(!tipEl){
      tipEl = document.createElement('div');
      tipEl.id = 'g-tip';
      tipEl.style.cssText = [
        'position:fixed','background:var(--ink)','color:var(--bg)',
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
    if(!dt) return null;
    return { el: dt, text: dt.getAttribute('data-tip') };
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
  if(window._guestMode) return;
  if(cu){ acc[cu].prefs=prefs; LS.s('pd1_acc',acc); if(typeof sbReady!=='undefined'&&sbReady) dbSaveUser(cu,acc[cu]); }
}

function habitGetAll(){ return prefs.habits||[]; }

function habitGetLog(){ return prefs.habitLog||{}; }

function habitDoneToday(id){
  const log=habitGetLog();
  return (log[habitToday()]||[]).map(Number).includes(+id);
}

function habitToggle(id){
  if(!prefs.habitLog) prefs.habitLog={};
  const key=habitToday();
  const arr=(prefs.habitLog[key]||[]).map(Number);
  if(arr.includes(+id)){
    prefs.habitLog[key]=arr.filter(x=>+x!==+id);
  } else {
    prefs.habitLog[key]=[...arr,+id];
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
  if(!(log[todayKey]||[]).map(Number).includes(+id)) d.setDate(d.getDate()-1);
  for(let i=0;i<365;i++){
    const key=d.toISOString().slice(0,10);
    if((log[key]||[]).map(Number).includes(+id)){ streak++; d.setDate(d.getDate()-1); }
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
    days.push((log[key]||[]).map(Number).includes(+id)?1:0);
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

// habitShowProGate → see Session 9 Pro System

function renderHabits(containerId){
  const el=document.getElementById(containerId);
  if(!el) return;
  const habits=habitGetAll();
  const total=habits.length;
  const doneCount=habits.filter(h=>habitDoneToday(h.id)).length;

  if(!total){
    el.innerHTML='<div class="es" style="padding:24px 16px;"><div class="es-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20z"/><path d="M8 12l3 3 5-5"/></svg></div><div class="es-title">Build a daily routine</div><div class="es-hint">Add habits below and check them off each day.</div></div>';
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
  const habitCount = habits.length;
  const nearLimit = !isPro() && habitCount >= HABIT_MAX_FREE - 1;

  el.innerHTML=`<div style="${isPage?'':'border-top:1px solid var(--bdr);'}padding-top:${isPage?'0':'12px'};margin-top:4px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <div style="font-size:10px;font-weight:700;color:var(--ink4);text-transform:uppercase;letter-spacing:.6px;">Add a new habit</div>
      ${!isPro() ? `<div style="font-size:11px;font-weight:700;color:${atLimit?'var(--red)':nearLimit?'var(--ink3)':'var(--ink4)'};">${habitCount}/${HABIT_MAX_FREE} used${atLimit?' · <span style="color:var(--a2);cursor:pointer;" onclick="habitShowProGate()">Upgrade for unlimited ✦</span>':''}</div>` : ''}
    </div>
    <div style="display:grid;grid-template-columns:repeat(12,1fr);gap:4px;margin-bottom:10px;">
      ${HABIT_EMOJIS.map(e=>`<button onclick="habitSelectEmoji(this,'${containerId}')" data-emoji="${e}" style="aspect-ratio:1;width:100%;border-radius:8px;border:1.5px solid var(--bdr);background:var(--surf);cursor:pointer;font-size:clamp(12px,3.5vw,18px);transition:all .13s;" title="${e}">${e}</button>`).join('')}
    </div>
    ${atLimit
      ? `<div style="display:flex;align-items:center;justify-content:space-between;background:var(--surf2);border:1.5px solid var(--bdr);border-radius:10px;padding:10px 14px;">
          <div style="font-size:13px;color:var(--ink3);">You've reached the free limit of ${HABIT_MAX_FREE} habits.</div>
          <button onclick="habitShowProGate()" style="background:var(--a2);color:#fff;border:none;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0;margin-left:10px;">Upgrade ✦</button>
        </div>`
      : `<div style="display:flex;gap:8px;">
          <input id="${containerId}-inp" type="text" placeholder="e.g. Read 20 mins, Drink water…" maxlength="40"
            style="flex:1;background:var(--surf);border:1.5px solid var(--bdr);border-radius:10px;padding:9px 12px;font-size:13px;color:var(--ink);outline:none;font-family:inherit;"
            onfocus="this.style.borderColor='var(--a2)'" onblur="this.style.borderColor='var(--bdr)'"
            onkeydown="if(event.key==='Enter')habitSubmit('${containerId}')"/>
          <button onclick="habitSubmit('${containerId}')" style="background:var(--a2);color:#fff;border:none;border-radius:10px;padding:9px 16px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;">+ Add Habit</button>
        </div>
        <div style="font-size:11px;color:var(--ink4);margin-top:6px;">Tap the circle on a habit card each day to mark it done and build your streak.</div>`
    }
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


// ═══════════════════════════════════════════


// ── RECUR DROPDOWN (desktop widget) ──
function toggleRecurDd(wid, e) {
  e.stopPropagation();
  const menu = $('twrdm-'+wid);
  if (!menu) return;
  const isOpen = menu.classList.contains('open');
  // close all other recur menus
  document.querySelectorAll('.tw-recur-dd-menu.open').forEach(m => m.classList.remove('open'));
  if (!isOpen) menu.classList.add('open');
}
function setRecurDd(wid, val, e) {
  e.stopPropagation();
  const dd = $('twrd-'+wid);
  const lbl = $('twrdl-'+wid);
  const menu = $('twrdm-'+wid);
  if (dd) dd.setAttribute('data-val', val);
  if (lbl) lbl.textContent = val === 'none' ? '↺' : (val === 'daily' ? 'Daily' : 'Weekly');
  if (dd) dd.classList.toggle('tw-recur-active', val !== 'none');
  if (menu) menu.classList.remove('open');
  // Mutual exclusion: recurring clears due date
  if (val !== 'none') {
    const inp = $('twd-'+wid);
    if (inp) inp.value = '';
    const btn = $('twdb-'+wid);
    const dbl = $('twdb-lbl-'+wid);
    if (dbl) dbl.textContent = 'Due date';
    if (btn) { btn.style.borderColor='var(--bdr)';btn.style.color='var(--ink3)';btn.style.background='var(--surf)';btn.classList.remove('active');btn.style.opacity='.4';btn.style.pointerEvents='none'; }
  } else {
    const btn = $('twdb-'+wid);
    if (btn) { btn.style.opacity='';btn.style.pointerEvents=''; }
  }
}
// close recur dropdowns on outside click
document.addEventListener('click', () => {
  document.querySelectorAll('.tw-recur-dd-menu.open').forEach(m => m.classList.remove('open'));
});

// ── RECURRING TASK RESET ──
function checkRecurringReset() {
  const today = new Date().toISOString().slice(0, 10);
  const lastReset = prefs.lastRecurringReset || '';
  if (lastReset === today) return;
  let changed = false;
  tasks.forEach(t => {
    if (!t.recurring || t.recurring === 'none') return;
    if (t.col !== 'done') return;
    if (t.recurring === 'daily') {
      t.col = 'todo';
      changed = true;
    } else if (t.recurring === 'weekly') {
      // reset once per week — check if last reset was in a different week
      const lastDate = lastReset ? new Date(lastReset) : null;
      const now = new Date();
      const weekStart = d => { const c = new Date(d); c.setDate(c.getDate() - c.getDay()); return c.toISOString().slice(0,10); };
      if (!lastDate || weekStart(lastDate) !== weekStart(now)) {
        t.col = 'todo';
        changed = true;
      }
    }
  });
  prefs.lastRecurringReset = today;
  if (changed) { persist(); renderAllTaskW(); }
}

function scheduleRecurringCheck() {
  checkRecurringReset();
  // schedule next check at midnight
  const now = new Date();
  const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1) - now;
  setTimeout(() => { checkRecurringReset(); scheduleRecurringCheck(); }, msUntilMidnight);
}





// ═══════════════════════════════════════
// JOURNAL PROMPTS & TEMPLATES
// ═══════════════════════════════════════
const JOURNAL_PROMPTS = [
  "What made you smile today?",
  "What's one thing you're proud of this week?",
  "What's been on your mind lately?",
  "What's one thing you want to do differently tomorrow?",
  "Who or what are you grateful for right now?",
  "What's the biggest challenge you're facing?",
  "What did you learn today?",
  "How are you really feeling right now?",
  "What would make tomorrow a great day?",
  "What's something you've been putting off?",
  "Describe your energy level today and why.",
  "What's one small win you had recently?",
];

const JOURNAL_TEMPLATES = [
  {
    icon: '🌅',
    label: 'Morning',
    fullLabel: 'Morning Intention',
    text: "Today I intend to...\n\nOne thing I'm looking forward to:\n\nMy focus for today is:",
  },
  {
    icon: '🌙',
    label: 'Evening',
    fullLabel: 'Evening Reflection',
    text: "How today went...\n\nSomething I'm proud of today:\n\nOne thing I'd do differently:",
  },
  {
    icon: '🙏',
    label: 'Gratitude',
    fullLabel: 'Gratitude',
    text: "Three things I'm grateful for:\n1. \n2. \n3. \n\nWhy these matter to me:",
  },
  {
    icon: '🧠',
    label: 'Brain Dump',
    fullLabel: 'Brain Dump',
    text: "",
  },
];

function getJournalPrompt(){
  return JOURNAL_PROMPTS[Math.floor(Math.random()*JOURNAL_PROMPTS.length)];
}

// ═══════════════════════════════════════
// SESSION 10 — AI DAILY PLANNER
// ═══════════════════════════════════════

function openAIPlanner() {
  if (!isPro()) { showUpgradeModal('AI Daily Planner'); return; }
  toggleAipPanel();
}

function toggleAipPanel() {
  if (!isPro()) { showUpgradeModal('AI Daily Planner'); return; }
  const panel = document.getElementById('aip-panel');
  const btn   = document.getElementById('aip-float-btn');
  if (!panel) return;
  const isOpen = panel.style.display === 'flex';
  if (isOpen) {
    panel.style.opacity = '0';
    panel.style.transform = 'translateY(12px) scale(.97)';
    setTimeout(() => { panel.style.display = 'none'; }, 220);
    if (btn) btn.style.transform = 'scale(1)';
  } else {
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    requestAnimationFrame(() => {
      panel.style.opacity = '1';
      panel.style.transform = 'none';
    });
    // Only render if not already rendered — preserves chat history
    const aipBody = document.getElementById('aip-body');
    if (aipBody && !aipBody.querySelector('.aip-chat-wrap')) {
      renderAIPlanner('aip-body', false);
    }
  }
}

// ── AI Planner state ──
let _aipHistory = [];
let _aipContext = '';
let _aipPlanGenerated = false;

function _buildAipContext() {
  const pending = tasks.filter(t => t.col !== 'done');
  const taskList = pending.length
    ? pending.map(t => {
        let line = `• ${t.text}`;
        if (t.priority) line += ` [${t.priority}]`;
        if (t.dueDate) line += ` (due ${t.dueDate})`;
        return line;
      }).join('\n')
    : '(no tasks)';

  const pendingHabits = (prefs.habits||[]).filter(h => !habitDoneToday(h.id));
  const doneHabits = (prefs.habits||[]).filter(h => habitDoneToday(h.id));
  const habitList = pendingHabits.length
    ? pendingHabits.map(h => `• ${h.emoji} ${h.name}`).join('\n')
    : '(all done)';

  const todayStr = new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const todayEvs = calEvs.filter(e => e.date === todayStr);
  const eventList = todayEvs.length
    ? todayEvs.map(e => `• ${e.timeStart||''} ${e.title}`).join('\n')
    : '(none)';

  // Yesterday's incomplete tasks (due yesterday or created yesterday and still todo/inprog)
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
  const yStr = yesterday.toISOString().slice(0,10);
  const carried = tasks.filter(t => t.col !== 'done' && t.dueDate === yStr);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true});
  const dateStr = now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});

  return { taskList, habitList, eventList, timeStr, dateStr,
    pendingCount: pending.length,
    habitCount: pendingHabits.length,
    doneHabitCount: doneHabits.length,
    eventCount: todayEvs.length,
    carriedTasks: carried,
    doneHabits,
    pendingHabits,
    todayEvs,
    pendingTasks: pending };
}

function renderAIPlanner(containerId, isMobileParam) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (el.querySelector('.aip-chat-wrap')) return;

  _aipHistory = [];
  _aipPlanGenerated = false;

  const ctx = _buildAipContext();
  const carried = ctx.carriedTasks.length;

  // Build detailed lists with IDs for accurate action targeting
  const habitListWithIds = ctx.pendingHabits.length
    ? ctx.pendingHabits.map(h => '• [id:' + h.id + '] ' + h.emoji + ' ' + h.name).join('\n')
    : '(none)';
  const taskListWithIds = ctx.pendingTasks.length
    ? ctx.pendingTasks.map(t => '• [id:' + t.id + '] ' + (t.text||t.title) + (t.priority?' ['+t.priority+']':'') + (t.dueDate?' due '+t.dueDate:'')).join('\n')
    : '(none)';

  const notesSummary = (notes||[]).slice(0,5).map(n=>(n.title||'Untitled')+(n.content?' — '+n.content.slice(0,80):'')).join('; ') || '(none)';
  const projectSummary = (subjects||[]).slice(0,5).map(p=>p.name+(p.grade?' ('+p.grade+'%)':'')).join(', ') || '(none)';

  const currentYear = new Date().getFullYear();
  _aipContext = 'You are a sharp productivity coach in Prodify. Today is ' + ctx.dateStr + ', ' + ctx.timeStr + '. Current year: ' + currentYear + '. All dates must use year ' + currentYear + ' or later.\n'

    + 'PENDING TASKS:\n' + taskListWithIds + '\n'

    + (carried ? 'OVERDUE FROM YESTERDAY: ' + ctx.carriedTasks.map(t=>'[id:'+t.id+'] '+t.text).join(', ') + '\n' : '')

    + 'HABITS TO DO:\n' + habitListWithIds + (ctx.doneHabitCount>0?' | ALREADY DONE TODAY: '+ctx.doneHabitCount:'') + '\n'

    + 'CALENDAR: ' + ctx.eventList + '\n'

    + 'NOTES (recent): ' + notesSummary + '\n'

    + 'PROJECTS: ' + projectSummary + '\n\n'

    + 'Build a realistic, prioritized plan for the day based on the data above.\n'
    + 'Format each block: **HH:MM – HH:MM** Task name\n> One practical tip\n'
    + 'End with **Note:** one key insight. Be specific and direct. No fluff.';

  const closeBtn = isMobileParam ? '' : '<button class="aip-reset-btn" onclick="toggleAipPanel()" title="Close" style="padding:4px 8px;">✕</button>';

  el.innerHTML =
    '<div class="aip-chat-wrap" id="' + containerId + '-wrap" style="height:100%;">'    + '<div class="aip-chat-header">'    + '<div class="aip-chat-header-left">'    + '<div class="aip-chat-avatar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>'    + '<div>'    + '<div class="aip-chat-name">AI Planner <span style="font-size:9px;font-weight:700;background:linear-gradient(135deg,var(--a),var(--a2));color:#fff;padding:1px 6px;border-radius:100px;vertical-align:middle;margin-left:4px;">PRO</span></div>'    + '<div class="aip-chat-status"><span class="aip-status-dot"></span>' + ctx.pendingCount + ' tasks · ' + ctx.habitCount + ' habits · ' + ctx.eventCount + ' events' + (carried ? ' · <span style=\"color:#dc2626;\">' + carried + ' overdue</span>' : '') + '</div>'    + '</div>'    + '</div>'    + '<div style="display:flex;gap:6px;align-items:center;">'    + closeBtn    + '</div>'    + '</div>'    + '<div class="aip-chat-msgs" id="' + containerId + '-msgs"></div>'    + '<div class="aip-chat-footer" style="padding:12px 14px;">'    + '<button class="aip-generate-btn" id="' + containerId + '-genbtn" onclick="aipGenerate(\'' + containerId + '\')">⚡ Generate my plan</button>'    + '</div>'    + '</div>';
}

async function aipGenerate(containerId) {
  if (!isPro()) { showUpgradeModal('AI Daily Planner'); return; }
  const msgs   = document.getElementById(containerId + '-msgs');
  const genBtn = document.getElementById(containerId + '-genbtn');
  if (!msgs || !genBtn) return;

  // Clear previous plan
  msgs.innerHTML = '';
  genBtn.disabled = true;
  genBtn.textContent = 'Generating…';

  // Show typing indicator
  const typingEl = document.createElement('div');
  typingEl.className = 'aip-bubble aip-bubble-ai aip-typing';
  typingEl.innerHTML = '<span></span><span></span><span></span>';
  msgs.appendChild(typingEl);
  msgs.scrollTop = msgs.scrollHeight;

  const apiMessages = [{ role: 'user', content: _aipContext + '\n\nGenerate my plan for today.' }];

  try {
    const { data: { session: _aipSess } } = await sb.auth.getSession().catch(() => ({ data: { session: null } }));
    const _aipToken = _aipSess?.access_token || '';
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${_aipToken}` },
      body: JSON.stringify({ messages: apiMessages })
    });
    if (response.status === 429) {
      const errData = await response.json();
      throw new Error(errData.error || 'Daily limit reached. Try again tomorrow.');
    }
    if (response.status === 403) {
      showUpgradeModal('AI Daily Planner');
      throw new Error('pro_gate');
    }
    if (response.status === 401) {
      throw new Error('Session expired. Please sign out and back in.');
    }
    const data = await response.json();
    const aiText = (data.content || []).map(b => b.text || '').join('');
    if (!aiText) throw new Error(data.error?.message || data.error || 'Empty response');

    _aipPlanGenerated = true;
    typingEl.remove();

    const aiBubble = document.createElement('div');
    aiBubble.className = 'aip-bubble aip-bubble-ai';
    aiBubble.innerHTML = formatAipMessage(aiText);
    msgs.appendChild(aiBubble);

    // Change button to "Generate another plan"
    if (genBtn) { genBtn.disabled = false; genBtn.textContent = '↺ Generate another plan'; }

  } catch(err) {
    typingEl.remove();
    if (err.message === 'pro_gate') return;
    const errBubble = document.createElement('div');
    errBubble.className = 'aip-bubble aip-bubble-ai aip-bubble-err';
    errBubble.textContent = (err.message.includes('limit') || err.message.includes('expired')) ? '⚠️ ' + err.message : '⚠️ Something went wrong. Please try again.';
    msgs.appendChild(errBubble);
    if (genBtn) { genBtn.disabled = false; genBtn.textContent = '⚡ Generate my plan'; }
  } finally {
    msgs.scrollTop = msgs.scrollHeight;
  }
}

async function _aipExecuteActions(text) {
  const actionRegex = /<<<ACTION>>>(.*?)<<<END>>>/gs;
  let match;
  const actions = [];
  while ((match = actionRegex.exec(text)) !== null) {
    try { actions.push(JSON.parse(match[1])); } catch(e) {}
  }

  // Strip action blocks from display text
  let cleanText = text.replace(/<<<ACTION>>>.*?<<<END>>>/gs, '').trim();

  if (!actions.length) return cleanText;

  let changed = false;
  for (const action of actions) {
    try {
      if (action.type === 'create_task') {
        // Validate and fix dueDate — reject dates in the past
        let safeDate = action.dueDate || null;
        if (safeDate) {
          const d = new Date(safeDate + 'T00:00:00');
          const today = new Date(); today.setHours(0,0,0,0);
          if (isNaN(d.getTime()) || d < today) safeDate = null; // clear invalid/past dates
        }
        tasks.unshift({ id: String(Date.now() + Math.random()), text: action.text, title: action.text,
          col: 'todo', dueDate: safeDate, priority: action.priority || 'medium',
          recurring: 'none', date: new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'}), created: Date.now() });
        changed = true;
      } else if (action.type === 'complete_habit') {
        const hid = Number(action.id);
        if (!prefs.habitLog) prefs.habitLog = {};
        const key = habitToday();
        const arr = prefs.habitLog[key] || [];
        if (!arr.includes(hid)) { prefs.habitLog[key] = [...arr, hid]; changed = true; }
      } else if (action.type === 'move_task') {
        const t = tasks.find(x => String(x.id) === String(action.id));
        if (t) { t.col = action.col; changed = true; }
      } else if (action.type === 'create_event') {
        calEvs.push({ id: String(Date.now() + Math.random()), title: action.title, date: action.date, color: '#3A7D5E' });
        changed = true;
      }
    } catch(e) { console.warn('[Prodify] Action failed:', e); }
  }

  if (changed) {
    persist();
    renderAllTaskW?.();
    renderHabits?.('habit-list');
    renderHabits?.('mob-habit-page-list');
    renderFullCal?.();
    updateFixedStats?.();
    widgets?.filter(w=>w.type==='habits').forEach(w=>renderHabitW?.(w.id));
  }

  return cleanText;
}

function formatAipMessage(text) {
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
// SESSION 9 — PRO SYSTEM
// ═══════════════════════════════════════
function isPro() { return !!(prefs.pro); }

// Sync is_pro from Supabase into prefs.pro on every launch
async function checkWaitlist() {
  try {
    if (!sbReady || !cu) return;
    const { data: row } = await sb.from('users').select('is_pro').eq('username', cu).maybeSingle();
    if (!row) return;
    const serverPro = !!(row.is_pro);
    if (serverPro !== !!(prefs.pro)) {
      prefs.pro = serverPro;
      if (acc[cu]) acc[cu].prefs = prefs;
      LS.s('pd1_acc', acc);
      renderProBadge();
      _syncUpgradeUI();
      _syncMobUpgradeUI();
    }
    // Check if user returned from checkout (?pro=1)
    if (new URLSearchParams(window.location.search).get('pro') === '1') {
      window.history.replaceState({}, '', window.location.pathname);
      if (serverPro) { showProWelcome(); }
    }
  } catch(e) { /* silent */ }
}

// ── Mobile Lemon Squeezy Checkout ──────────────────────────────────────────
async function mobLsCheckout(action) {
  const btnMonthly = document.getElementById('mob-upg-btn-monthly');
  const btnYearly  = document.getElementById('mob-upg-btn-yearly');
  const errEl      = document.getElementById('mob-upg-err');
  const activeBtn  = action === 'checkout_yearly' ? btnYearly : btnMonthly;
  if (errEl) errEl.textContent = '';
  if (activeBtn) { activeBtn.textContent = 'Loading...'; activeBtn.disabled = true; }
  try {
    if (!cu) throw new Error('not_logged_in');
    const token = (await sb.auth.getSession())?.data?.session?.access_token;
    if (!token) throw new Error('not_logged_in');
    const res = await fetch('/api/lemonsqueezy/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error || 'Could not create checkout');
    window.open(data.url, '_blank');
  } catch(e) {
    if (errEl) errEl.textContent = e.message === 'not_logged_in' ? 'Sign in to upgrade.' : (e.message || 'Something went wrong.');
  } finally {
    if (btnMonthly) { btnMonthly.textContent = 'Get Monthly'; btnMonthly.disabled = false; }
    if (btnYearly)  { btnYearly.textContent  = 'Get Yearly · Best value'; btnYearly.disabled = false; }
  }
}

async function mobOpenPortal() {
  const errEl = document.getElementById('mob-upg-err');
  if (errEl) errEl.textContent = '';
  try {
    const token = (await sb.auth.getSession())?.data?.session?.access_token;
    if (!token) throw new Error('not_logged_in');
    const res = await fetch('/api/lemonsqueezy/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action: 'portal' }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error || 'Could not open portal');
    window.open(data.url, '_blank');
  } catch(e) {
    if (errEl) errEl.textContent = e.message || 'Something went wrong.';
  }
}

function _syncMobUpgradeUI() {
  const checkoutEl = document.getElementById('mob-upg-checkout');
  const managedEl  = document.getElementById('mob-upg-managed');
  if (!checkoutEl || !managedEl) return;
  if (isPro()) {
    checkoutEl.style.display = 'none';
    managedEl.style.display  = 'block';
  } else {
    checkoutEl.style.display = 'block';
    managedEl.style.display  = 'none';
  }
}

// ═══════════════════════════════════════
// WAITLIST SYSTEM (landing page only)
// ═══════════════════════════════════════
// ── Lemon Squeezy Checkout ─────────────────────────────────────────────────

async function _lsCheckout(action) {
  _track('checkout_started', { plan: action });
  const btnMonthly = document.getElementById('dsk-upg-btn-monthly');
  const btnYearly  = document.getElementById('dsk-upg-btn-yearly');
  const errEl      = document.getElementById('dsk-upg-err');
  const activeBtn  = action === 'checkout_yearly' ? btnYearly : btnMonthly;

  if (errEl) errEl.style.display = 'none';
  if (activeBtn) { activeBtn.textContent = 'Loading…'; activeBtn.disabled = true; }

  try {
    if (!cu) throw new Error('not_logged_in');
    const token = (await sb.auth.getSession())?.data?.session?.access_token;
    if (!token) throw new Error('not_logged_in');

    const res = await fetch('/api/lemonsqueezy/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action }),
    });

    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error || 'Could not create checkout');

    // Open Lemon Squeezy checkout in a new tab
    window.open(data.url, '_blank');

  } catch(e) {
    if (errEl) {
      const msg = e.message === 'not_logged_in' ? 'Sign in to upgrade.'
                : e.message || 'Something went wrong. Please try again.';
      errEl.textContent = msg;
      errEl.style.display = 'block';
    }
  } finally {
    if (btnMonthly) { btnMonthly.textContent = 'Get Monthly'; btnMonthly.disabled = false; }
    if (btnYearly)  { btnYearly.textContent  = 'Get Yearly · Best value'; btnYearly.disabled = false; }
  }
}

async function openCustomerPortal() {
  const btn   = document.getElementById('dsk-upg-portal-btn');
  const errEl = document.getElementById('dsk-upg-err');
  if (errEl) errEl.style.display = 'none';
  if (btn) { btn.textContent = 'Loading…'; btn.disabled = true; }

  try {
    const token = (await sb.auth.getSession())?.data?.session?.access_token;
    if (!token) throw new Error('not_logged_in');

    const res = await fetch('/api/lemonsqueezy/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action: 'portal' }),
    });

    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error || 'Could not open portal');
    window.open(data.url, '_blank');

  } catch(e) {
    if (errEl) {
      errEl.textContent = e.message || 'Something went wrong.';
      errEl.style.display = 'block';
    }
  } finally {
    if (btn) { btn.textContent = 'Manage subscription'; btn.disabled = false; }
  }
}

function _syncUpgradeUI() {
  const checkoutEl = document.getElementById('dsk-upg-checkout');
  const managedEl  = document.getElementById('dsk-upg-managed');
  if (!checkoutEl || !managedEl) return;
  if (isPro()) {
    checkoutEl.style.display = 'none';
    managedEl.style.display  = 'block';
  } else {
    checkoutEl.style.display = 'block';
    managedEl.style.display  = 'none';
  }
}

const _featureDescriptions = {
  'AI Daily Planner': 'Tell Prodify your tasks and energy — get a prioritized, timed plan for your day in seconds.',
  'Unlimited Habits': 'Track as many habits as you want. No cap, no compromise.',
  'Custom Accent Color': 'Make Prodify yours with any color you want, including custom hex codes.',
  'CSV Export': 'Export your tasks and journal as a spreadsheet — ready for any tool.',
  'PDF Export': 'Download a beautifully formatted report of your productivity.',
  'Cloud Backup History': 'Restore your workspace from any of the last 7 daily snapshots.',
  'Multi-Device Sync': 'Use Prodify on all your devices at the same time, seamlessly. Free plan is limited to 1 device.',
};

function showUpgradeModal(featureName) {
  const sub = document.getElementById('dsk-mo-upgrade-sub');
  if (sub) {
    const desc = featureName && _featureDescriptions[featureName];
    sub.textContent = desc
      ? desc
      : featureName
        ? featureName + ' is a Pro feature. Unlock everything with Prodify Pro.'
        : 'Unlock everything. Stay in flow.';
  }

  // Highlight the relevant feature row in the modal
  document.querySelectorAll('.upg-feat').forEach(el => {
    const label = el.querySelector('.upg-feat-label');
    const isMatch = label && featureName && label.textContent.toLowerCase().includes(featureName.toLowerCase().split(' ')[0]);
    el.style.background = isMatch ? 'var(--al)' : '';
    el.style.borderRadius = isMatch ? '8px' : '';
    el.style.fontWeight = isMatch ? '700' : '';
  });

  _syncUpgradeUI();
  _syncMobUpgradeUI();
  openMo('dsk-mo-upgrade');
}

function proGate(featureName, fn) {
  // Returns a function that checks pro before running
  return function(...args) {
    if (isPro()) { fn(...args); }
    else { showUpgradeModal(featureName); }
  };
}

function renderProBadge() {
  // Show/hide pro badge on profile pages
  document.querySelectorAll('.pro-badge').forEach(el => {
    el.style.display = isPro() ? 'inline-flex' : 'none';
  });
  document.querySelectorAll('.pro-upgrade-btn').forEach(el => {
    el.style.display = isPro() ? 'none' : 'flex';
  });
  document.querySelectorAll('.pro-active-indicator').forEach(el => {
    el.style.display = isPro() ? 'flex' : 'none';
  });
  if (typeof renderProBadgeRing === 'function') renderProBadgeRing();
}

// Hook into existing habitShowProGate to use the new modal
function _track(event, data) {
  try {
    if (typeof window.umami !== 'undefined') {
      window.umami.track(event, data);
    }
  } catch(e) {}
}

function habitShowProGate() {
  _track('upgrade_modal_shown', { feature: 'Unlimited Habits' });
  showUpgradeModal('Unlimited Habits');
}

// ═══════════════════════════════════════
// SESSION 8 — EXPORT DATA
// ═══════════════════════════════════════
function exportJSON() {
  const data = {
    exportedAt: new Date().toISOString(),
    tasks,
    journal,
    habits: prefs.habits || [],
    projects: subjects,
    calendarEvents: calEvs,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'prodify-export-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV() {
  if (!isPro()) { closeMo('mo-export'); showUpgradeModal('CSV Export'); return; }

  const esc2 = v => '"' + String(v||'').replace(/"/g,'""') + '"';
  const date = new Date().toISOString().slice(0,10);

  // Tasks sheet
  let csv = 'TASKS\r\n';
  csv += ['Text','Status','Due Date','Recurring','Created'].map(esc2).join(',') + '\r\n';
  tasks.forEach(t => {
    csv += [t.text, t.col==='todo'?'To Do':t.col==='inprog'?'In Progress':'Done', t.dueDate||'', t.recurring||'', t.date||''].map(esc2).join(',') + '\r\n';
  });

  csv += '\r\nJOURNAL\r\n';
  csv += ['Date','Mood','Entry'].map(esc2).join(',') + '\r\n';
  journal.forEach(j => {
    const moodLabel = (MLAB[j.mood]?.l) || '';
    csv += [j.date, moodLabel, j.text].map(esc2).join(',') + '\r\n';
  });

  csv += '\r\nHABITS\r\n';
  csv += ['Name','Emoji','Current Streak'].map(esc2).join(',') + '\r\n';
  (prefs.habits||[]).forEach(h => {
    csv += [h.name, h.emoji||'', habitStreak(h.id)].map(esc2).join(',') + '\r\n';
  });

  csv += '\r\nPROJECTS\r\n';
  csv += ['Name','Progress (%)'].map(esc2).join(',') + '\r\n';
  subjects.forEach(s => {
    csv += [s.name, s.progress||0].map(esc2).join(',') + '\r\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'prodify-' + date + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  closeMo('mo-export');
}

function exportPDF() {
  if (!isPro()) { closeMo('mo-export'); showUpgradeModal('PDF Export'); return; }
  closeMo('mo-export');

  const name = acc[cu]?.displayName || cu;
  const date = new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
  const moodLabel = m => { const e = MLAB[m]; return e ? e.e+' '+e.l : ''; };
  const colLabel = c => c==='todo'?'To Do':c==='inprog'?'In Progress':'Done';
  const tasksDone = tasks.filter(t=>t.col==='done').length;
  const habitsTotal = (prefs.habits||[]).length;
  const journalCount = journal.length;

  const taskRows = tasks.map(t =>
    `<tr><td>${t.text||''}</td><td><span class="badge badge-${t.col}">${colLabel(t.col)}</span></td><td>${t.dueDate||'—'}</td></tr>`
  ).join('');

  const journalRows = journal.slice(0,20).map(j =>
    `<div class="je"><div class="je-hd"><span>${moodLabel(j.mood)}</span><span class="je-date">${j.date}</span></div><div class="je-body">${j.text||''}</div></div>`
  ).join('');

  const habitRows = (prefs.habits||[]).map(h =>
    `<div class="habit-row"><span>${h.emoji||'•'} ${h.name}</span><span class="streak">🔥 ${habitStreak(h.id)} day streak</span></div>`
  ).join('');

  const projRows = subjects.map(s =>
    `<div class="proj-row"><span>${s.name}</span><div class="prog-bar"><div class="prog-fill" style="width:${s.progress||0}%;background:${s.color||'#3A7D5E'}"></div></div><span class="prog-lbl">${s.progress||0}%</span></div>`
  ).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Prodify Report — ${name}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1A1714;padding:48px;max-width:800px;margin:0 auto;font-size:13px;}
  .cover{border-bottom:3px solid #2A5C44;padding-bottom:28px;margin-bottom:36px;}
  .logo{font-size:20px;font-weight:800;color:#2A5C44;margin-bottom:16px;}
  .logo b{color:#1A1714;}
  h1{font-size:28px;font-weight:800;letter-spacing:-1px;margin-bottom:6px;}
  .meta{color:#9C978F;font-size:12px;}
  .stats{display:flex;gap:24px;margin-top:20px;}
  .stat{background:#F3F1EC;border-radius:12px;padding:14px 20px;flex:1;text-align:center;}
  .stat-n{font-size:24px;font-weight:800;color:#2A5C44;}
  .stat-l{font-size:11px;color:#9C978F;margin-top:2px;}
  h2{font-size:15px;font-weight:800;color:#1A1714;margin:32px 0 14px;padding-bottom:8px;border-bottom:1.5px solid #E3DED7;letter-spacing:-.3px;}
  table{width:100%;border-collapse:collapse;}
  th{text-align:left;font-size:11px;font-weight:700;color:#9C978F;padding:6px 10px;background:#F8F6F2;border-radius:6px;}
  td{padding:9px 10px;border-bottom:1px solid #F0EDE8;font-size:12px;vertical-align:top;}
  .badge{padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;}
  .badge-todo{background:#FBF2E1;color:#9A6818;}
  .badge-inprog{background:#EBF4EF;color:#2A5C44;}
  .badge-done{background:#F0EDE8;color:#9C978F;text-decoration:line-through;}
  .je{background:#F8F6F2;border-radius:10px;padding:14px 16px;margin-bottom:10px;}
  .je-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-weight:700;font-size:12px;}
  .je-date{color:#9C978F;font-weight:400;font-size:11px;}
  .je-body{font-size:12px;line-height:1.7;color:#5A5450;}
  .habit-row{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#F8F6F2;border-radius:10px;margin-bottom:8px;font-size:12px;font-weight:600;}
  .streak{color:#2A5C44;font-size:11px;}
  .proj-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #F0EDE8;}
  .proj-row span:first-child{flex:1;font-size:12px;font-weight:600;}
  .prog-bar{flex:2;height:6px;background:#E3DED7;border-radius:3px;overflow:hidden;}
  .prog-fill{height:100%;border-radius:3px;}
  .prog-lbl{font-size:11px;font-weight:700;color:#5A5450;width:36px;text-align:right;}
  .footer{margin-top:48px;padding-top:16px;border-top:1px solid #E3DED7;font-size:11px;color:#CEC9C1;text-align:center;}
  @media print{body{padding:24px;}h2{page-break-after:avoid;}.je,.habit-row{page-break-inside:avoid;}}
</style></head><body>
<div class="cover">
  <div class="logo">Pro<b>dify</b></div>
  <h1>Productivity Report</h1>
  <div class="meta">${name} &nbsp;·&nbsp; ${date}</div>
  <div class="stats">
    <div class="stat"><div class="stat-n">${tasks.length}</div><div class="stat-l">Total Tasks</div></div>
    <div class="stat"><div class="stat-n">${tasksDone}</div><div class="stat-l">Completed</div></div>
    <div class="stat"><div class="stat-n">${journalCount}</div><div class="stat-l">Journal Entries</div></div>
    <div class="stat"><div class="stat-n">${habitsTotal}</div><div class="stat-l">Active Habits</div></div>
  </div>
</div>
${tasks.length ? `<h2>Tasks</h2><table><thead><tr><th>Task</th><th>Status</th><th>Due</th></tr></thead><tbody>${taskRows}</tbody></table>`:''}
${journal.length ? `<h2>Journal${journal.length>20?' (latest 20 entries)':''}</h2>${journalRows}`:''}
${(prefs.habits||[]).length ? `<h2>Habits</h2>${habitRows}`:''}
${subjects.length ? `<h2>Projects</h2>${projRows}`:''}
<div class="footer">Generated by Prodify &nbsp;·&nbsp; prodify.cc &nbsp;·&nbsp; ${new Date().toISOString().slice(0,10)}</div>
</body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 600);
}

function showExportModal() {
  if (!isPro()) { showUpgradeModal('CSV & PDF Export'); return; }
  openMo('mo-export');
}

// SESSION 6 — FOCUS MODE
// ═══════════════════════════════════════════

let _fcsWid = null;
let _fcsIv  = null;

// ── Desktop: open overlay ──
function fcsOpen(wid) {
  _fcsWid = wid;
  const body = document.getElementById('fcs-body');
  if (!body) return;
  _fcsBuild(wid, body);
  openMo('fcs-ov');
  document.body.classList.add('in-focus');
  document.addEventListener('keydown', _fcsKey);
  // Prevent clicks inside the modal from bubbling to the overlay
  const mod = document.getElementById('fcs-mod');
  if (mod) mod.addEventListener('click', e => e.stopPropagation());
}

function fcsClose() {
  closeMo('fcs-ov');
  document.body.classList.remove('in-focus');
  document.removeEventListener('keydown', _fcsKey);
  clearInterval(_fcsIv); _fcsIv = null;
  // re-render source widget
  if (_fcsWid) {
    const w = widgets.find(x => x.id === _fcsWid);
    if (w) fillWBody(w);
  }
  _fcsWid = null;
}

// backdrop click disabled — use Exit Focus button only
function fcsExit(e) { /* no-op */ }

// Mobile focus-exit button stub — element is hidden via CSS on all platforms,
// but the onclick attribute must resolve to a function to avoid a TypeError
function fcsMobExit() { fcsClose(); }

function _fcsKey(e) { if (e.key === 'Escape') fcsClose(); }

function _fcsBuild(wid, body) {
  if (!TMS[wid]) TMS[wid] = {mode:0,sec:25*60,running:false,iv:null,sessions:0,custom:[25*60,20*60]};
  const ts = TMS[wid];
  const canEdit = TMODES[ts.mode] && !TMODES[ts.mode].locked && !ts.running;

  body.innerHTML = `
    <div style="text-align:center;margin-bottom:18px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;color:var(--ink4);">Focus Mode</div>
    </div>
    <div class="tmmodes" style="margin-bottom:14px;">
      ${TMODES.map((m,i) => `<button class="tmm${i===ts.mode?' on':''}" onclick="_fcsModeSet('${wid}',${i})">${m.l}</button>`).join('')}
    </div>
    <div class="tmdis" style="margin-bottom:14px;">
      <div class="tmtime${canEdit?' tmtime-edit':''}" id="fcs-time"
        style="font-size:clamp(52px,11vw,84px);letter-spacing:-3px;cursor:pointer;"
        onclick="_fcsEditTime('${wid}')">${fmtSec(ts.sec)}</div>
      <div class="tminputs" id="fcs-inputs">
<div style="display:flex;align-items:flex-end;justify-content:center;gap:4px;margin-bottom:10px;">
            <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
              <input id="tminp-hr-fcs" type="text" inputmode="numeric" min="0" max="23" placeholder="0"
                style="width:56px;font-size:24px;font-weight:800;text-align:center;border:2px solid var(--bdr);border-radius:10px;padding:6px 4px;background:var(--surf2);color:var(--ink);outline:none;font-family:inherit;"
                oninput="this.value=this.value.replace(/[^0-9]/g,\'\').slice(0,2)"
                onfocus="this.select();this.style.borderColor=\'var(--a2)\'" onblur="this.style.borderColor=\'var(--bdr)\'"
                onkeydown="if(event.key===\'Enter\'){event.preventDefault();_fcsConfirm(\'${wid}\');}"/>
              <span style="font-size:9px;font-weight:700;color:var(--ink4);letter-spacing:.5px;">HR</span>
            </div>
            <span style="font-size:24px;font-weight:800;color:var(--ink3);padding-bottom:16px;">:</span>
            <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
              <input id="tminp-min-fcs" type="text" inputmode="numeric" min="0" placeholder="00"
                style="width:56px;font-size:24px;font-weight:800;text-align:center;border:2px solid var(--bdr);border-radius:10px;padding:6px 4px;background:var(--surf2);color:var(--ink);outline:none;font-family:inherit;"
                oninput="this.value=this.value.replace(/[^0-9]/g,\'\').slice(0,4)"
                onfocus="this.select();this.style.borderColor=\'var(--a2)\'" onblur="this.style.borderColor=\'var(--bdr)\'"
                onkeydown="if(event.key===\'Enter\'){event.preventDefault();_fcsConfirm(\'${wid}\');}"/>
              <span style="font-size:9px;font-weight:700;color:var(--ink4);letter-spacing:.5px;">MIN</span>
            </div>
            <span style="font-size:24px;font-weight:800;color:var(--ink3);padding-bottom:16px;">:</span>
            <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
              <input id="tminp-sec-fcs" type="text" inputmode="numeric" min="0" placeholder="00"
                style="width:56px;font-size:24px;font-weight:800;text-align:center;border:2px solid var(--bdr);border-radius:10px;padding:6px 4px;background:var(--surf2);color:var(--ink);outline:none;font-family:inherit;"
                oninput="this.value=this.value.replace(/[^0-9]/g,\'\').slice(0,4)"
                onfocus="this.select();this.style.borderColor=\'var(--a2)\'" onblur="this.style.borderColor=\'var(--bdr)\'"
                onkeydown="if(event.key===\'Enter\'){event.preventDefault();_fcsConfirm(\'${wid}\');}"/>
              <span style="font-size:9px;font-weight:700;color:var(--ink4);letter-spacing:.5px;">SEC</span>
            </div>
          </div>
        <button class="tm-setbtn" onclick="_fcsConfirm(\'${wid}\')">Set time</button>
      </div>
    </div>
    <div class="tmctrl" style="margin-bottom:14px;">
      <button class="tm-resetbtn" style="width:44px;height:44px;font-size:20px;" onclick="_fcsReset('${wid}')">↺</button>
      <button class="tm-startbtn${ts.running?' stop':''}" id="fcs-btn" style="flex:1;" onclick="_fcsToggle('${wid}')">${ts.running?'Pause':'Start'}</button>
    </div>
    <div class="tmsess" id="fcs-sess" style="${ts.mode!==0?'display:none;':''}margin-bottom:14px;">
      ${Array.from({length:4},(_,i) => `<div class="tmsd${i<ts.sessions?' dn':''}"></div>`).join('')}
    </div>
    <div id="fcs-hist-wrap" style="${ts.mode!==0?'display:none;':''}background:var(--surf2);border:1px solid var(--bdr);border-radius:12px;padding:12px 14px;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:var(--ink3);margin-bottom:8px;">Session History</div>
      <div id="fcs-hist"></div>
    </div>`;

  _fcsRenderHist();

  clearInterval(_fcsIv);
  _fcsIv = setInterval(() => {
    const cts = TMS[wid]; if (!cts) return;
    const t = document.getElementById('fcs-time');
    const b = document.getElementById('fcs-btn');
    const s = document.getElementById('fcs-sess');
    if (t) t.textContent = fmtSec(cts.sec);
    if (b) { b.textContent = cts.running?'Pause':'Start'; b.classList.toggle('stop', cts.running); }
    if (s && cts.mode===0) s.innerHTML = Array.from({length:4},(_,i)=>`<div class="tmsd${i<cts.sessions?' dn':''}"></div>`).join('');
  }, 250);
}

function _fcsRenderHist() {
  const el = document.getElementById('fcs-hist'); if (!el) return;
  const today = pomGetToday(), week = pomGetWeek(), days = pomGetWeekData();
  const max = Math.max(...days.map(d=>d.count), 1);
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
      <div><div style="font-size:22px;font-weight:800;color:var(--ink);line-height:1;">${today}</div><div style="font-size:9px;font-weight:600;color:var(--ink3);margin-top:1px;">today</div></div>
      <div style="text-align:right;"><div style="font-size:22px;font-weight:800;color:var(--ink);line-height:1;">${week}</div><div style="font-size:9px;font-weight:600;color:var(--ink3);margin-top:1px;">this week</div></div>
    </div>
    <div style="display:flex;align-items:flex-end;gap:5px;height:40px;">
      ${days.map(d=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;">
        <div style="width:100%;border-radius:3px;background:var(--a2);opacity:${d.count?1:.18};height:${Math.max(d.count/max*30,d.count?4:3)}px;"></div>
        <div style="font-size:8px;font-weight:700;text-transform:uppercase;color:${d.today?'var(--a2)':'var(--ink4)'};">${d.label}</div>
      </div>`).join('')}
    </div>`;
}

function _fcsModeSet(wid,m) { setTMode(wid,m); const b=document.getElementById('fcs-body'); if(b)_fcsBuild(wid,b); }
function _fcsReset(wid)     { resetTimer(wid);  const b=document.getElementById('fcs-body'); if(b)_fcsBuild(wid,b); }
function _fcsToggle(wid) {
  timerBtn(wid);
  const ts=TMS[wid], b=document.getElementById('fcs-btn');
  if (b&&ts) { b.textContent=ts.running?'Pause':'Start'; b.classList.toggle('stop',ts.running); }
}
function _fcsEditTime(wid) {
  const ts=TMS[wid]; if(!ts||TMODES[ts.mode]?.locked||ts.running) return;
  const t=document.getElementById('fcs-time');
  const inp=document.getElementById('fcs-inputs');
  if(!t||!inp) return;
  const _fh=Math.floor(ts.sec/3600),_fm=Math.floor((ts.sec%3600)/60),_fs=ts.sec%60;
  const _fhi=document.getElementById('tminp-hr-fcs'),_fmi=document.getElementById('tminp-min-fcs'),_fsi=document.getElementById('tminp-sec-fcs');
  if(_fhi)_fhi.value=_fh||''; if(_fmi)_fmi.value=_fm||''; if(_fsi)_fsi.value=_fs||'';
  t.classList.add('hide'); inp.classList.add('show');
  const fcsbtn=document.getElementById('fcs-btn');if(fcsbtn)fcsbtn.style.display='none';
  setTimeout(()=>{if(_fhi)_fhi.focus();},50);
}
function _fcsConfirm(wid) {
  const _cfh=parseInt(document.getElementById('tminp-hr-fcs')?.value)||0;
  const _cfm=parseInt(document.getElementById('tminp-min-fcs')?.value)||0;
  const _cfs=parseInt(document.getElementById('tminp-sec-fcs')?.value)||0;
  const total=Math.min(_cfh*3600+_cfm*60+_cfs,86399); if(total<1) return;
  const ts=TMS[wid]; if(!ts) return;
  ts.custom[ts.mode]=total; ts.sec=total;
  const fcsbtn=document.getElementById('fcs-btn');if(fcsbtn)fcsbtn.style.display='';
  const b=document.getElementById('fcs-body'); if(b)_fcsBuild(wid,b);
}
function _fcsInpKey(e,wid) {
  if(e.key==='Enter'){e.preventDefault();_fcsConfirm(wid);}
  if(e.key==='Escape'){
    document.getElementById('fcs-time')?.classList.remove('hide');
    document.getElementById('fcs-inputs')?.classList.remove('show');
    const fcsbtn=document.getElementById('fcs-btn');if(fcsbtn)fcsbtn.style.display='';
  }
}

// ═══════════════════════════════════════
// PRO BADGE — VISUAL RING & GLOW
// ═══════════════════════════════════════
function renderProBadgeRing() {
  const pro = isPro();

  // Use current accent color for everyone — not just Pro users
  const accentKey = prefs.accentColor || prefs.accentKey || 'green';
  const colors = deriveAccent(accentKey);
  const a2 = colors.a2;
  const al = colors.al;

  // Inject dynamic keyframe
  let styleEl = document.getElementById('pro-ring-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'pro-ring-style';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = [
    '@keyframes pro-ring-pulse {',
    '  0%   { box-shadow: 0 0 0 2.5px '+a2+', 0 0 8px 2px '+al+'; }',
    '  50%  { box-shadow: 0 0 0 3px '+a2+', 0 0 16px 5px '+al+'; }',
    '  100% { box-shadow: 0 0 0 2.5px '+a2+', 0 0 8px 2px '+al+'; }',
    '}'
  ].join('\n');

  // Apply/remove ring on all avatars
  ['#sbav','#mob-av','#mob-av-hd-circle','.pbav','#ddav'].forEach(sel => {
    document.querySelectorAll(sel).forEach(el => el.classList.toggle('pro-ring', pro));
  });

  // Pro badge chips — adapt to accent color
  document.querySelectorAll('.pro-badge').forEach(el => {
    el.style.display = pro ? 'inline-flex' : 'none';
    if (pro) {
      el.style.background = 'linear-gradient(135deg, '+colors.a+', '+a2+')';
      el.style.boxShadow = '0 2px 10px '+al+', 0 0 0 1.5px '+a2+'40';
    }
  });

  // Update upgrade card accent colors
  document.querySelectorAll('.set-pro-card, .set-pro-active').forEach(el => {
    const icon = el.querySelector('.set-pro-icon');
    const cta = el.querySelector('.set-pro-cta');
    const title = el.querySelector('.set-pro-title');
    if (icon) { icon.style.background = al; icon.style.borderColor = a2; icon.style.color = a2; }
    if (cta) cta.style.color = a2;
    if (title && el.classList.contains('set-pro-active')) title.style.color = a2;
  });

  document.querySelectorAll('.pro-upgrade-btn').forEach(el => {
    el.style.display = pro ? 'none' : 'flex';
  });
  document.querySelectorAll('.pro-active-indicator').forEach(el => {
    el.style.display = pro ? 'flex' : 'none';
  });
}

// Override renderProBadge to also call ring version — handled by calling renderProBadgeRing() directly at launch

// ═══════════════════════════════════════
// CLOUD BACKUP HISTORY (PRO)
// ═══════════════════════════════════════
const BACKUP_MAX_DAYS = 7; // Capped to keep prefs size small — widgets/calEvs excluded from snapshots too

function backupSnapshotToday() {
  const today = new Date().toISOString().slice(0, 10);
  if (!prefs.backups) prefs.backups = [];
  // Only one snapshot per calendar day
  if (prefs.backups.length > 0 && prefs.backups[0].date === today) return;
  const snap = {
    date: today,
    ts: Date.now(),
    tasks: JSON.parse(JSON.stringify(tasks || [])),
    journal: JSON.parse(JSON.stringify(journal || [])),
    habits: JSON.parse(JSON.stringify(prefs.habits || [])),
    subjects: JSON.parse(JSON.stringify(subjects || [])),
    notes: JSON.parse(JSON.stringify(notes || {})),
  };
  prefs.backups.unshift(snap);
  if (prefs.backups.length > BACKUP_MAX_DAYS) prefs.backups = prefs.backups.slice(0, BACKUP_MAX_DAYS);
}

function showBackupModal() {
  if (!isPro()) { showUpgradeModal('Cloud Backup History'); return; }
  openMo('mo-backup');
  renderBackupList();
}

function renderBackupList() {
  const el = document.getElementById('mo-backup-list');
  if (!el) return;
  const backups = prefs.backups || [];
  if (backups.length === 0) {
    el.innerHTML = `<div style="text-align:center;padding:32px 0;color:var(--ink4);font-size:13px;">No backups yet.<br><span style="font-size:11px;">Snapshots are saved automatically each day.</span></div>`;
    return;
  }
  el.innerHTML = backups.map((b, i) => {
    const d = new Date(b.ts);
    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const taskCount = (b.tasks || []).length;
    const jCount = (b.journal || []).length;
    const hCount = (b.habits || []).length;
    return `<div class="backup-row" onclick="restoreBackup(${i})">
      <div class="backup-row-left">
        <div class="backup-row-date">${label}</div>
        <div class="backup-row-meta">${taskCount} tasks · ${jCount} journal entries · ${hCount} habits</div>
      </div>
      <button class="backup-restore-btn" onclick="event.stopPropagation();restoreBackup(${i})">Restore</button>
    </div>`;
  }).join('');
}

async function restoreBackup(idx) {
  const b = (prefs.backups || [])[idx];
  if (!b) return;
  const d = new Date(b.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const ok = await appConfirm(`Restore backup from ${d}? Your current data will be replaced.`);
  if (!ok) return;
  if (b.tasks)    { tasks = b.tasks;       acc[cu].tasks = tasks; }
  if (b.journal)  { journal = b.journal;   acc[cu].journal = journal; }
  if (b.subjects) { subjects = b.subjects; acc[cu].subjects = subjects; }
  if (b.calEvs)   { calEvs = b.calEvs;     acc[cu].calEvs = calEvs; }
  if (b.notes)    { notes = b.notes;       acc[cu].notes = notes; }
  if (b.habits)   { prefs.habits = b.habits; }
  closeMo('mo-backup');
  persist();
  renderAllTaskW(); renderCanvas(); updateAllStatsW(); updateFixedStats();
  renderFullCal();
}

// ═══════════════════════════════════════
// MULTI-DEVICE (PRO) — uses active_device_id column in Supabase
// ═══════════════════════════════════════
const _DEVICE_KEY = 'pd1_device_id';

function getOrCreateDeviceId() {
  let id = localStorage.getItem(_DEVICE_KEY);
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2,10) + '_' + Date.now().toString(36);
    localStorage.setItem(_DEVICE_KEY, id);
  }
  return id;
}

function getDeviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android.*Mobile/i.test(ua)) return 'Android Phone';
  if (/Android/i.test(ua)) return 'Android Tablet';
  if (/Mac/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows PC';
  return 'Browser';
}

// Check cloud active_device_id — returns true if this device can proceed
// Pro users bypass the 1-device limit entirely
const _DEVICE_REGISTERED_KEY = 'pd1_device_registered_at';
const _DEVICE_GRACE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function checkAndRegisterDevice(username) {
  const myId = getOrCreateDeviceId();
  const registeredAt = parseInt(localStorage.getItem(_DEVICE_REGISTERED_KEY) || '0', 10);
  const wasPreviouslyRegistered = registeredAt > 0 && (Date.now() - registeredAt) < _DEVICE_GRACE_MS;

  // Offline fallback — only allow if this device was successfully registered
  // within the last 7 days. Prevents bypassing by going offline.
  if (!sbReady) {
    console.warn('[Prodify] Offline device check — grace period:', wasPreviouslyRegistered);
    return wasPreviouslyRegistered;
  }

  try {
    const { data: row, error } = await sb.from('users')
      .select('active_device_id, is_pro, bypass_device_check')
      .eq('username', username)
      .maybeSingle();

    // DB error — fail closed. Grace period still applies.
    if (error) {
      console.warn('[Prodify] Device check DB error — blocking', error.message);
      return wasPreviouslyRegistered;
    }

    // Bypass flag — for dev/test accounts
    if (row?.bypass_device_check) return true;

    // Pro users always allowed — no device limit
    if (row?.is_pro) {
      await sb.from('users').update({ active_device_id: myId }).eq('username', username);
      localStorage.setItem(_DEVICE_REGISTERED_KEY, Date.now().toString());
      return true;
    }

    const activeId = row?.active_device_id || null;

    // Helper: update active_device_id, try by auth_id first (more RLS-friendly), fall back to username
    async function _setDeviceId(val) {
      // Try via auth_id (matches RLS policy auth.uid() = auth_id)
      const { data: { session } } = await sb.auth.getSession().catch(()=>({data:{session:null}}));
      if (session?.user?.id) {
        const { error, count } = await sb.from('users')
          .update({ active_device_id: val })
          .eq('auth_id', session.user.id)
          .select('active_device_id');
        if (!error) return true;
        console.warn('[Prodify] device update via auth_id failed:', error.message);
      }
      // Fallback: username-based update
      const { error } = await sb.from('users').update({ active_device_id: val }).eq('username', username);
      if (error) console.warn('[Prodify] device update via username failed:', error.message);
      return !error;
    }

    // CASE 1: Slot is free — claim it
    if (!activeId) {
      await _setDeviceId(myId);
      localStorage.setItem(_DEVICE_REGISTERED_KEY, Date.now().toString());
      return true;
    }

    // CASE 2: We are already the registered device — refresh stamp and allow
    if (activeId === myId) {
      localStorage.setItem(_DEVICE_REGISTERED_KEY, Date.now().toString());
      return true;
    }

    // CASE 3: A different device is registered.
    // BUT — if this browser was previously registered within the grace period,
    // it means the sign-out failed to clear the DB (race condition / RLS timing).
    // Reclaim the slot rather than blocking the legitimate user on their own browser.
    if (wasPreviouslyRegistered) {
      console.warn('[Prodify] Reclaiming device slot — sign-out likely failed to clear DB');
      await _setDeviceId(myId);
      localStorage.setItem(_DEVICE_REGISTERED_KEY, Date.now().toString());
      return true;
    }

    // CASE 4: Genuinely a different device with no prior registration — block it
    localStorage.removeItem(_DEVICE_REGISTERED_KEY);
    return false;

  } catch(e) {
    console.warn('[Prodify] Device check exception — blocking', e);
    return wasPreviouslyRegistered;
  }
}

// Clear active_device_id on sign out
async function unregisterDevice(username) {
  // Always clear the local registration timestamp so grace period doesn't apply after sign-out
  localStorage.removeItem(_DEVICE_REGISTERED_KEY);
  if (!sbReady || !username) return;
  try {
    // Skip the SELECT check — just unconditionally clear the slot.
    // The SELECT was unreliable because RLS can return empty rows (not an error)
    // when the JWT is mid-teardown, causing the conditional UPDATE to never fire.
    // It's safe to always clear here because unregisterDevice is only called on sign-out.
    // Try auth_id-based update first (more RLS-friendly), fall back to username
    const { data: { session } } = await sb.auth.getSession().catch(()=>({data:{session:null}}));
    let cleared = false;
    if (session?.user?.id) {
      const { error } = await sb.from('users').update({ active_device_id: null }).eq('auth_id', session.user.id);
      if (!error) cleared = true;
      else console.warn('[Prodify] unregisterDevice via auth_id failed:', error.message);
    }
    if (!cleared) {
      const { error } = await sb.from('users').update({ active_device_id: null }).eq('username', username);
      if (error) console.warn('[Prodify] unregisterDevice via username failed:', error.message);
    }
  } catch(e) { console.warn('[Prodify] unregisterDevice failed', e); }
}

function showMultiDeviceBlock() {
  if (document.getElementById('mo-multidevice')) return;
  const ov = document.createElement('div');
  ov.id = 'mo-multidevice';
  ov.className = 'ov open';
  ov.style.zIndex = '99999';
  ov.innerHTML =
    '<div class="mod" style="max-width:360px;text-align:center;padding:32px 28px;">' +
      '<div style="font-size:44px;margin-bottom:14px;">📱</div>' +
      '<div style="font-size:18px;font-weight:800;color:var(--ink);margin-bottom:10px;">Device limit reached</div>' +
      '<div style="font-size:13px;color:var(--ink3);line-height:1.65;margin-bottom:24px;">' +
        'Free plan supports <strong style="color:var(--ink);">1 active device</strong>.<br>' +
        'Sign out on your other device first, then try again.' +
      '</div>' +
      '<button class="btn" style="width:100%;padding:13px;font-size:14px;margin-bottom:10px;" onclick="document.getElementById(\'mo-multidevice\').style.display=\'none\';showUpgradeModal(\'Multi-Device Sync\');document.getElementById(\'dsk-mo-upgrade\').addEventListener(\'click\',function h(e){if(e.target===this){const b=document.getElementById(\'mo-multidevice\');if(b)b.style.display=\'\';this.removeEventListener(\'click\',h);}},{once:true})">✦ Upgrade to Pro</button>' +
      '<button class="bol" style="width:100%;padding:11px;font-size:13px;" onclick="document.getElementById(\'mo-multidevice\').remove();show(\'sl\')">Back to login</button>' +
    '</div>';
  document.body.appendChild(ov);
}

function showDevicesModal() {
  if (!isPro()) { showUpgradeModal('Multi-Device Sync'); return; }
  openMo('mo-devices');
  renderDevicesList();
}

async function renderDevicesList() {
  const el = document.getElementById('mo-devices-list');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--ink4);font-size:12px;">Loading...</div>';
  if (!sbReady) { el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--ink4);font-size:13px;">Not connected.</div>'; return; }
  try {
    const myId = getOrCreateDeviceId();
    const myName = getDeviceName();
    const myIcon = /iPhone|Android Phone/i.test(myName)?'📱':/iPad|Tablet/i.test(myName)?'📟':/Mac/i.test(myName)?'💻':/Windows/i.test(myName)?'🖥️':'💻';
    const { data: activeId, error: devErr } = await sb.rpc('get_active_device', { p_username: cu });
    if (devErr) throw devErr;

    // For Pro users or no registered device — just show this device as active
    if (!activeId || isPro()) {
      el.innerHTML =
        '<div class="device-row">' +
          '<div class="device-icon">' + myIcon + '</div>' +
          '<div style="flex:1;">' +
            '<div style="font-size:13px;font-weight:700;color:var(--ink);">' + myName + ' <span style="font-size:10px;color:var(--a2);font-weight:600;">(this device)</span></div>' +
            '<div style="font-size:11px;color:var(--ink4);margin-top:2px;">Currently active</div>' +
          '</div>' +
          '<div style="width:8px;height:8px;border-radius:50%;background:#22c55e;flex-shrink:0;"></div>' +
        '</div>' +
        (isPro() ? '<div style="margin-top:12px;padding:10px 12px;background:var(--al);border-radius:10px;font-size:11px;color:var(--a2);font-weight:600;">✦ Pro — unlimited devices</div>' : '');
      return;
    }

    const isMe = activeId === myId;
    const otherIcon = '💻';
    el.innerHTML =
      '<div class="device-row">' +
        '<div class="device-icon">' + (isMe ? myIcon : otherIcon) + '</div>' +
        '<div style="flex:1;">' +
          '<div style="font-size:13px;font-weight:700;color:var(--ink);">' + (isMe ? myName : 'Another device') + (isMe ? ' <span style="font-size:10px;color:var(--a2);font-weight:600;">(this device)</span>' : '') + '</div>' +
          '<div style="font-size:11px;color:var(--ink4);margin-top:2px;">' + (isMe ? 'Currently active' : 'Active on another device') + '</div>' +
        '</div>' +
        (isMe
          ? '<div style="width:8px;height:8px;border-radius:50%;background:#22c55e;flex-shrink:0;"></div>'
          : '<button class="device-remove-btn" onclick="forceRemoveOtherDevice()">Remove</button>') +
      '</div>';
  } catch(e) {
    console.error('[Prodify] renderDevicesList error:', e);
    el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--ink4);">Could not load devices.<br><span style="font-size:10px;">' + (e?.message||'') + '</span></div>';
  }
}

async function forceRemoveOtherDevice() {
  if (!sbReady || !cu) return;
  await sb.from('users').update({ active_device_id: null }).eq('username', cu);
  renderDevicesList();
}

// ═══════════════════════════════════════
// LANDING PAGE WAITLIST (no sign-in required)
// ═══════════════════════════════════════

function openLandingWaitlist() {
  // Reset to input state
  const joinState = document.getElementById('lw-join-state');
  const joinedState = document.getElementById('lw-joined-state');
  const input = document.getElementById('lw-email-input');
  const btn = document.getElementById('lw-submit-btn');
  const err = document.getElementById('lw-err');
  if (joinState) joinState.style.display = 'block';
  if (joinedState) joinedState.style.display = 'none';
  if (input) { input.value = ''; input.classList.remove('lw-error'); }
  if (btn) { btn.textContent = 'Join the waitlist'; btn.disabled = false; }
  if (err) err.style.display = 'none';
  openMo('mo-landing-waitlist');
}

function lwClearErr() {
  const err = document.getElementById('lw-err');
  const input = document.getElementById('lw-email-input');
  if (err) err.style.display = 'none';
  if (input) input.classList.remove('lw-error');
}

function lwShowErr(msg) {
  const err = document.getElementById('lw-err');
  const input = document.getElementById('lw-email-input');
  if (err) { err.textContent = msg; err.style.display = 'block'; }
  if (input) { input.classList.add('lw-error'); input.focus(); }
}

function lwIsValidEmail(email) {
  // RFC-5322 inspired — checks structure, domain, and TLD
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

async function lwSubmit() {
  const input = document.getElementById('lw-email-input');
  const btn = document.getElementById('lw-submit-btn');
  const email = (input?.value || '').trim().toLowerCase();

  // Client-side validation
  if (!email) { lwShowErr('Please enter your email address.'); return; }
  if (!lwIsValidEmail(email)) { lwShowErr('Please enter a valid email address.'); return; }

  btn.textContent = 'Joining…';
  btn.disabled = true;

  try {
    if (!sbReady) throw new Error('offline');

    // Check if already on waitlist
    const { data: existing } = await sb
      .from('waitlist')
      .select('id, position')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      lwShowSuccess(email, existing.position);
      return;
    }

    // Insert — position assigned server-side by DB trigger (same as in-app flow)
    const { data: inserted, error } = await sb
      .from('waitlist')
      .insert({ email, joined_at: new Date().toISOString() })
      .select('id, position')
      .maybeSingle();

    if (error) {
      // Race condition: unique constraint hit
      if (error.code === '23505') {
        const { data: raceWin } = await sb
          .from('waitlist')
          .select('id, position')
          .eq('email', email)
          .maybeSingle();
        if (raceWin) { lwShowSuccess(email, raceWin.position); return; }
      }
      throw error;
    }

    lwShowSuccess(email, inserted?.position || null);

  } catch(e) {
    btn.textContent = 'Join the waitlist';
    btn.disabled = false;
    const msg = e.message === 'offline'
      ? 'No connection. Please try again shortly.'
      : 'Something went wrong. Please try again.';
    lwShowErr(msg);
  }
}

function lwShowSuccess(email, position) {
  const joinState = document.getElementById('lw-join-state');
  const joinedState = document.getElementById('lw-joined-state');
  const posEl = document.getElementById('lw-position');
  const emailEl = document.getElementById('lw-joined-email');
  if (joinState) joinState.style.display = 'none';
  if (joinedState) joinedState.style.display = 'block';
  if (posEl) posEl.textContent = position ? '#' + position : '#—';
  if (emailEl) emailEl.textContent = email;
}


// ═══════════════════════════════════════
// PRO WELCOME — confetti + toast on upgrade
// ═══════════════════════════════════════
function showProWelcome() {
  // Toast
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,var(--a),var(--a2));color:#fff;font-size:14px;font-weight:700;padding:14px 28px;border-radius:100px;box-shadow:0 8px 32px rgba(0,0,0,.2);z-index:99999;pointer-events:none;white-space:nowrap;opacity:0;transition:opacity .3s;';
  toast.textContent = '✦ Welcome to Pro! All features are now unlocked.';
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  });

  // Confetti
  const colors = ['#3A7D5E','#4A9D74','#F5B800','#fff','#2A5C44'];
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    const size = Math.random() * 8 + 4;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const startX = Math.random() * window.innerWidth;
    const delay = Math.random() * 800;
    const duration = Math.random() * 1500 + 1000;
    el.style.cssText = `position:fixed;top:-10px;left:${startX}px;width:${size}px;height:${size}px;background:${color};border-radius:${Math.random()>0.5?'50%':'2px'};z-index:99998;pointer-events:none;opacity:1;`;
    document.body.appendChild(el);
    el.animate([
      { transform: `translateY(0) rotate(0deg)`, opacity: 1 },
      { transform: `translateY(${window.innerHeight + 20}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }
    ], { duration, delay, easing: 'cubic-bezier(.25,.46,.45,.94)', fill: 'forwards' })
      .onfinish = () => el.remove();
  }
}

// ═══════════════════════════════════════
// APP STREAK
// ═══════════════════════════════════════
const STREAK_KEY = 'pd1_app_streak';
const STREAK_LAST_KEY = 'pd1_app_streak_last';

function getAppStreak(){
  try{
    const streak = parseInt(localStorage.getItem(STREAK_KEY)||'0',10)||0;
    const last = localStorage.getItem(STREAK_LAST_KEY)||'';
    const today = new Date().toISOString().slice(0,10);
    const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
    if(last===today) return streak; // already opened today
    if(last===yesterday){
      // consecutive day — increment
      const newStreak = streak+1;
      localStorage.setItem(STREAK_KEY, String(newStreak));
      localStorage.setItem(STREAK_LAST_KEY, today);
      return newStreak;
    }
    // missed a day — reset
    localStorage.setItem(STREAK_KEY, '1');
    localStorage.setItem(STREAK_LAST_KEY, today);
    return 1;
  }catch(e){ return 0; }
}

function streakVisual(n){
  if(n<=0) return {icon:'🔥', color:'var(--ink4)', label:'0 day streak'};
  if(n<7)  return {icon:'🔥', color:'var(--ink3)',  label: n===1?'1 day streak':`${n} day streak`};
  if(n<30) return {icon:'🔥', color:'#D97706',      label:`${n} day streak`};
  if(n<100)return {icon:'🔥', color:'var(--a2)',     label:`${n} day streak`};
  return           {icon:'✨', color:'#B45309',      label:`${n} day streak`};
}

function renderCanvasStreak(){
  if(window._guestMode) return;
  const n = getAppStreak();
  const el = document.getElementById('flt-streak');
  if(!el) return;
  const v = streakVisual(n);
  el.innerHTML = `<span style="font-size:16px;line-height:1;">${v.icon}</span><span style="font-size:12px;font-weight:700;color:${v.color};letter-spacing:-.2px;">${v.label}</span>`;
  el.style.display = 'flex';
  if([7,30,100,365].includes(n)){
    setTimeout(()=>_showStreakMilestone(n), 600);
  }
}

function _showStreakMilestone(n){
  const msgs = {
    7:   {e:'🔥', t:'One week streak!',     s:"7 days in a row. Your streak is heating up — keep going and watch it change."},
    30:  {e:'🔥', t:'30 day streak!',        s:"A full month. Your streak just turned green. Don't stop now."},
    100: {e:'✨', t:'100 day streak!',       s:"Gold. You've earned it. This is exceptional."},
    365: {e:'👑', t:'One year streak!',      s:"A full year. Prodify is part of your life now."},
  };
  const m = msgs[n]; if(!m) return;
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:9000;background:var(--surf);border:1.5px solid var(--bdr);border-radius:16px;padding:14px 20px;box-shadow:0 8px 32px rgba(0,0,0,0.12);display:flex;align-items:center;gap:12px;white-space:nowrap;animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both;';
  toast.innerHTML = `<span style="font-size:24px;">${m.e}</span><div><div style="font-size:14px;font-weight:800;color:var(--ink);letter-spacing:-.3px;">${m.t}</div><div style="font-size:12px;color:var(--ink3);margin-top:2px;">${m.s}</div></div>`;
  document.body.appendChild(toast);
  setTimeout(()=>{ toast.style.transition='opacity .5s'; toast.style.opacity='0'; setTimeout(()=>toast.remove(),500); }, 4000);
}

// ── DESKTOP JOURNAL REFLECTION CARD ──
const _dskRefMoods = {};

function dskRefPickMood(m, wid) {
  _dskRefMoods[wid] = m;
  document.querySelectorAll(`#jw-ref-moods-${wid} .jw-ref-mood-btn`).forEach((btn, i) => {
    btn.classList.toggle('selected', i === m);
  });
}

function dskSaveReflection(wid) {
  const well = document.getElementById('jw-ref-well-' + wid)?.value.trim() || '';
  const mind = document.getElementById('jw-ref-mind-' + wid)?.value.trim() || '';
  const tomorrow = document.getElementById('jw-ref-tomorrow-' + wid)?.value.trim() || '';
  if (!well && !mind && !tomorrow) { showToast('Write at least one thought'); return; }
  const parts = [];
  if (well) parts.push('What went well: ' + well);
  if (mind) parts.push("What's on my mind: " + mind);
  if (tomorrow) parts.push('Tomorrow: ' + tomorrow);
  const text = parts.join('\n\n');
  const mood = _dskRefMoods[wid] || 0;
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  journal = journal.filter(j => !(j.date === todayStr && j.isReflection));
  const entry = { id: 'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,6), date: todayStr, content: text, text: text, mood, ts: Date.now(), isReflection: true };
  journal.unshift(entry);
  persist(); renderAllJournalW(); updateAllStatsW(); updateFixedStats();
  const _t=document.createElement('div');_t.style.cssText='position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:var(--a2);color:#fff;font-size:13px;font-weight:700;padding:10px 22px;border-radius:100px;z-index:99999;pointer-events:none;white-space:nowrap;opacity:0;transition:opacity .3s;';_t.textContent='Reflection saved!';document.body.appendChild(_t);setTimeout(()=>{_t.style.opacity='1';setTimeout(()=>{_t.style.opacity='0';setTimeout(()=>_t.remove(),300);},1800);},10);
  // Show done state
  const wrap = document.getElementById('jw-ref-wrap-' + wid);
  if (wrap) {
    wrap.innerHTML = `<div class="jw-ref-done"><div class="jw-ref-done-icon">${MLAB[mood].e}</div><div class="jw-ref-done-text">Today's reflection saved</div><button class="jw-ref-done-edit" onclick="dskEditReflection('${entry.id}','${wid}')">Edit</button></div>`;
  }
}

function dskEditReflection(id, wid) {
  const entry = (journal || []).find(e => e.id === id);
  if (!entry) return;
  _dskRefMoods[wid] = entry.mood || 0;
  const moodsHtml = MLAB.map((m, i) => `<button class="jw-ref-mood-btn${i === (entry.mood||0) ? ' selected' : ''}" onclick="dskRefPickMood(${i},'${wid}')">${m.e}</button>`).join('');
  const wrap = document.getElementById('jw-ref-wrap-' + wid);
  if (!wrap) return;
  wrap.innerHTML = `<div class="jw-reflection-card" id="jw-reflection-card-${wid}">
    <div class="jw-ref-date">${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>
    <div class="jw-ref-mood-row"><span class="jw-ref-label">How are you feeling?</span><div class="jw-ref-moods" id="jw-ref-moods-${wid}">${moodsHtml}</div></div>
    <div class="jw-ref-q"><label class="jw-ref-label">What went well today?</label><textarea class="jw-ref-ta" id="jw-ref-well-${wid}" placeholder="Something you're proud of..."></textarea></div>
    <div class="jw-ref-q"><label class="jw-ref-label">What's on your mind?</label><textarea class="jw-ref-ta" id="jw-ref-mind-${wid}" placeholder="Thoughts, feelings, anything..."></textarea></div>
    <div class="jw-ref-q"><label class="jw-ref-label">What would make tomorrow better?</label><textarea class="jw-ref-ta" id="jw-ref-tomorrow-${wid}" placeholder="One thing to focus on..."></textarea></div>
    <button class="jw-ref-save" onclick="dskSaveReflection('${wid}')">Save Reflection</button>
  </div>`;
  const text = entry.content || '';
  const sep = '\n\n';
  const wellIdx = text.indexOf('What went well: ');
  const mindIdx = text.indexOf("What's on my mind: ");
  const tomorrowIdx = text.indexOf('Tomorrow: ');
  function extractPart(startLabel, txt) {
    const idx = txt.indexOf(startLabel);
    if (idx === -1) return '';
    const after = txt.slice(idx + startLabel.length);
    const end = after.indexOf('\n\n');
    return end === -1 ? after : after.slice(0, end);
  }
  if (wellIdx !== -1) document.getElementById('jw-ref-well-' + wid).value = extractPart('What went well: ', text);
  if (mindIdx !== -1) document.getElementById('jw-ref-mind-' + wid).value = extractPart("What's on my mind: ", text);
  if (tomorrowIdx !== -1) document.getElementById('jw-ref-tomorrow-' + wid).value = extractPart('Tomorrow: ', text);
}

function dskInsertChecklist(wid) {
  const el = document.getElementById('nwta-' + wid);
  if (!el) return;
  el.focus();
  document.execCommand('insertHTML', false, '<div class="note-check-item"><label><input type="checkbox" onchange="this.closest(\'.note-check-item\').classList.toggle(\'checked\',this.checked)"><span> To do</span></label></div><br>');
}

// ── NOTES COLOR PICKER (desktop) ──
const _dskNoteActiveColors = {};

function dskToggleColorPicker(wid) {
  const picker = document.getElementById('nwcp-' + wid);
  if (!picker) return;
  const isOpen = picker.style.display === 'flex';
  // Close all other pickers first
  document.querySelectorAll('[id^="nwcp-"]').forEach(p => p.style.display = 'none');
  picker.style.display = isOpen ? 'none' : 'flex';
}

function dskApplyColor(wid, color) {
  _dskNoteActiveColors[wid] = color;
  const circle = document.getElementById('nw-color-circle-' + wid);
  if (circle) circle.setAttribute('fill', color);
  const el = document.getElementById('nwta-' + wid);
  if (el) { el.focus(); document.execCommand('foreColor', false, color); }
  const picker = document.getElementById('nwcp-' + wid);
  if (picker) picker.style.display = 'none';
}

function dskResetColor(wid) {
  _dskNoteActiveColors[wid] = null;
  const circle = document.getElementById('nw-color-circle-' + wid);
  if (circle) circle.setAttribute('fill', 'var(--ink)');
  const el = document.getElementById('nwta-' + wid);
  if (el) { el.focus(); document.execCommand('removeFormat'); }
  const picker = document.getElementById('nwcp-' + wid);
  if (picker) picker.style.display = 'none';
}

// Close color picker on outside click
document.addEventListener('click', function(e) {
  if (!e.target.closest('[id^="nwcp-"]') && !e.target.closest('[id^="nw-color-btn-"]')) {
    document.querySelectorAll('[id^="nwcp-"]').forEach(p => p.style.display = 'none');
  }
});


function showDskToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--a2);color:#fff;font-size:13px;font-weight:700;padding:10px 22px;border-radius:100px;z-index:99999;pointer-events:none;white-space:nowrap;opacity:0;transition:opacity .3s;';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '1'; setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 1800); }, 10);
}

// ── STICKY NOTE ──
const STICKY_COLORS = ['#fef9c3','#dcfce7','#dbeafe','#fce7f3','#ede9fe','#ffedd5'];

function pinStickyNote(wid, nid) {
  const note = notes.find(n => n.id === nid);
  if (!note) return;
  // Only 1 sticky per note — check if one already exists
  const existing = widgets.find(w => w.type === 'sticky' && w.noteRef === nid);
  if (existing) {
    // Highlight existing sticky
    const el = document.getElementById(existing.id);
    if (el) { el.style.outline = '2px solid var(--a2)'; setTimeout(() => el.style.outline = '', 1000); }
    showDskToast('Sticky already pinned!');
    return;
  }
  const srcW = widgets.find(w => w.id === wid);
  const x = srcW ? srcW.x + srcW.w + 20 : 100;
  const y = srcW ? srcW.y : 100;
  const stickyId = 'w' + Date.now().toString(36);
  const sticky = {
    id: stickyId, type: 'sticky',
    title: note.title || 'Sticky',
    content: note.content || '',
    noteRef: nid,
    color: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)],
    x, y, w: 220, h: 200, z: 500
  };
  widgets.push(sticky);
  persist();
  buildWidgetEl(sticky);
  showDskToast('Pinned as sticky note!');
}

function buildStickyW(body, w) {
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.background = w.color || '#fef9c3';
  body.style.borderRadius = '0 0 10px 10px';
  // Color picker row
  const colorDots = STICKY_COLORS.map(c =>
    `<button onmousedown="event.preventDefault();changeStickyColor('${w.id}','${c}')" style="width:14px;height:14px;border-radius:50%;background:${c};border:${c===w.color?'2px solid #333':'1.5px solid rgba(0,0,0,0.15)'};cursor:pointer;flex-shrink:0;transition:transform .15s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"></button>`
  ).join('');
  body.innerHTML = `
    <div style="display:flex;gap:4px;padding:6px 8px 4px;flex-wrap:wrap;align-items:center;border-bottom:1px solid rgba(0,0,0,0.08);">
      ${colorDots}
    </div>
    <div id="sticky-content-${w.id}" contenteditable="true" spellcheck="true"
      style="flex:1;padding:10px 12px 10px 24px;font-size:13px;line-height:1.6;outline:none;overflow:auto;font-family:inherit;color:#1a1a14;background:transparent;word-break:break-word;"
      oninput="saveStickyContent('${w.id}',this.innerHTML)"
      placeholder="Start typing…">${w.content || ''}</div>`;
}

function changeStickyColor(wid, color) {
  const w = widgets.find(x => x.id === wid);
  if (!w) return;
  w.color = color;
  persist();
  // Update CSS variable on widget element — drives both header and body via CSS
  const widgetEl = document.getElementById(wid);
  if (widgetEl) widgetEl.style.setProperty('--sticky-color', color);
  // Rebuild body with new color
  const body = document.getElementById('wb-' + wid);
  if (body) { body.innerHTML = ''; buildStickyW(body, w); body.style.background = color; }
  // Update header color to match
  const head = document.getElementById('wh-' + wid);
  if (head) head.style.background = color;
}

function saveStickyContent(wid, html) {
  const w = widgets.find(x => x.id === wid);
  if (!w) return;
  w.content = html;
  // Sync back to note
  if (w.noteRef) {
    const n = notes.find(x => x.id === w.noteRef);
    if (n) {
      n.content = html;
      n.updated = Date.now();
      // Update note editor if open
      widgets.filter(nw => nw.type === 'note').forEach(nw => {
        const ta = document.getElementById('nwta-' + nw.id);
        if (ta && nw._noteOpen === w.noteRef) ta.innerHTML = html;
      });
    }
  }
  clearTimeout(_noteTimer);
  _noteTimer = setTimeout(() => persistSilent(), 800);
}
