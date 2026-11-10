/* DataMatch LatAm · app para emprendedores */
(function(){
const {esc} = DM;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const val = n => { const e=document.querySelector(`input[name="${n}"]:checked`); return e?e.value:null; };
const vals = n => $$(`input[name="${n}"]:checked`).map(e=>e.value);
const now = () => new Date().toISOString();
const DAY = 864e5, REMIND_DAYS = 14;

let ENV = {db:null,user:null,canWrite:false,isAdmin:false};
const DATA = {perfiles:[], conexiones:[], encuestas:[], modelo:null};
let view = "landing", onb = null, meId = null, dialog = false, ready = false, refBy = null;
let filt = {role:"", ciudad:"", horas:0, reales:false}, shown = 6;

try{ meId = localStorage.getItem("dm_me"); refBy = localStorage.getItem("dm_ref"); }catch(e){}
const refIn = window.DATAMATCH_REF || (location.hash.startsWith("#ref-") ? location.hash.slice(5) : null);
if(refIn && /^[\w-]{3,40}$/.test(refIn)){ refBy = refIn; try{ localStorage.setItem("dm_ref",refBy); }catch(e){} }
const setMe = id => { meId=id; try{ id?localStorage.setItem("dm_me",id):localStorage.removeItem("dm_me"); }catch(e){} };
const me = () => DATA.perfiles.find(p=>p.id===meId) || null;
const model = () => DATA.modelo || DM.initialModel();
const profileById = id => DATA.perfiles.find(p=>p.id===id) || DM.EJEMPLOS.find(p=>p.id===id);
const arqOf = p => p.arquetipo || (p.completo ? DM.arquetipo(p) : null);

/* ---------- Escritura ---------- */
const queues = {};
function put(coll, doc){
  if(coll==="modelo") DATA.modelo = doc;
  else { const list=DATA[coll], i=list.findIndex(x=>x.id===doc.id); if(i>=0) list[i]=doc; else list.push(doc); }
  if(!(ENV.db && ENV.canWrite)) return Promise.resolve();
  const key = coll+"/"+doc.id, body = JSON.parse(JSON.stringify(doc));
  queues[key] = (queues[key]||Promise.resolve()).then(()=>ENV.db.collection(coll).doc(doc.id).set(body)).catch(e=>{
    if(e&&e.code==="quota_exceeded") toast("La base de datos está llena. Avísale al equipo.");
    else if(e&&e.code==="invalid_argument"){ ENV.canWrite=false; renderSaveState(); }
  });
  return queues[key];
}
function del(coll, id){
  DATA[coll] = DATA[coll].filter(x=>x.id!==id);
  if(ENV.db && ENV.canWrite) return ENV.db.collection(coll).doc(id).delete().catch(()=>{});
}
function maybeRetrain(){
  if(DM.needsRetrain(model(), DATA.conexiones, DATA.encuestas)){
    const m = DM.retrain(model(), DATA.conexiones, DATA.encuestas, "Reentrenamiento automático");
    put("modelo", {...m, id:"actual"});
  }
}

/* ---------- Utilidades de interfaz ---------- */
function toast(msg){
  $$(".toast").forEach(x=>x.remove());
  const t=document.createElement("div"); t.className="toast"; t.setAttribute("role","status"); t.textContent=msg;
  document.body.appendChild(t); setTimeout(()=>t.remove(),3400);
}
async function copy(text, okMsg){ try{ await navigator.clipboard.writeText(text); toast(okMsg||"Copiado."); }catch(e){ toast("No se pudo copiar. Selecciona el texto y cópialo."); } }
const avatar = (p, cls="") => p.foto ? `<img class="av ${cls}" src="${esc(p.foto)}" alt="Foto de ${esc(p.nombre)}">` : `<span class="av ${cls}" style="background:${DM.avatarColor(p.id)}">${esc(DM.initials(p.nombre))}</span>`;
const AUTH = window.DMUserAuth || null;
const passField = (id, label, hint, ac) => `<label class="field" for="${id}">${label}${hint?`<small>${hint}</small>`:""}<span class="pw"><input type="password" id="${id}" minlength="8" maxlength="72" autocomplete="${ac}"><button type="button" class="btn link pwt" data-pw="${id}" aria-label="Mostrar contraseña">Mostrar</button></span></label>`;
function bindPw(){ $$("[data-pw]").forEach(b=>b.onclick=()=>{ const i=document.getElementById(b.dataset.pw); const show=i.type==="password"; i.type=show?"text":"password"; b.textContent=show?"Ocultar":"Mostrar"; b.setAttribute("aria-label",show?"Ocultar contraseña":"Mostrar contraseña"); }); }
function bindPhoto(onPhoto){
  const inp=$("#foto"); if(!inp) return;
  inp.onchange = async () => { const f=inp.files[0]; if(!f) return; $("#ferr").textContent="";
    try{ const d=await DM.photoFromFile(f); $("#fprev").innerHTML=`<img class="av lg" src="${d}" alt="Vista previa de tu foto">`; onPhoto(d); }catch(e){ $("#ferr").textContent=e.message; } };
}
const photoField = (current, label="Foto de perfil") => `<div class="field"><span>${label} <small>Opcional. Se recorta en círculo.</small></span>
  <div class="row"><span id="fprev">${current?`<img class="av lg" src="${esc(current)}" alt="Tu foto">`:`<span class="av lg" style="background:var(--soft);color:var(--ink-3)">+</span>`}</span>
  <label class="btn sm" for="foto">${current?"Cambiar foto":"Subir foto"}<input type="file" id="foto" accept="image/*" class="sr"></label>${current?`<button type="button" class="btn link" id="fdel">Quitar foto</button>`:""}</div>
  <p class="err" id="ferr"></p></div>`;
function radio(name, opts, v, cls="opts"){
  return `<div class="${cls}">${Object.entries(opts).map(([k,t],i)=>{ const [a,b]=Array.isArray(t)?t:[t,""]; return `<label class="opt" for="${name}-${i}"><input type="radio" id="${name}-${i}" name="${name}" value="${esc(k)}" ${v===k?"checked":""}><span class="opt-col">${esc(a)}${b?`<span class="sub">${esc(b)}</span>`:""}</span></label>`; }).join("")}</div>`;
}
function scale(name, v, lo, hi, n=5, start=1){
  const nums = Array.from({length:n},(_,i)=>i+start);
  return `<div class="scale ${n===11?"s11":""}">${nums.map(k=>`<label class="opt" for="${name}-${k}"><input type="radio" id="${name}-${k}" name="${name}" value="${k}" ${v==k?"checked":""}>${k}</label>`).join("")}</div><div class="scale-ends"><span>${esc(lo)}</span><span>${esc(hi)}</span></div>`;
}
function checks(name, opts, vs){
  return `<div class="chips">${Object.entries(opts).map(([k,t],i)=>`<label class="chip" for="${name}-${i}"><input type="checkbox" id="${name}-${i}" name="${name}" value="${esc(k)}" ${(vs||[]).includes(k)?"checked":""}>${esc(t)}</label>`).join("")}</div>`;
}
function openDialog(html, mount){
  dialog = true;
  const back = document.createElement("div"); back.className="dialog-back";
  back.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlgT">${html}</div>`;
  document.body.appendChild(back);
  const close = () => { back.remove(); dialog=false; };
  back.onclick = e => { if(e.target===back) close(); };
  back.addEventListener("keydown", e => { if(e.key==="Escape") close(); });
  mount(back, close);
  (back.querySelector("textarea,input")||back.querySelector("button"))?.focus();
}
function go(v){ view=v; render(); window.scrollTo(0,0); }
const okPhone = s => !s || /^\+?[\d\s-]{7,16}$/.test(s);

/* ---------- Conexiones y recordatorios ---------- */
const received = () => DATA.conexiones.filter(c=>c.para===meId && c.estado==="pendiente");
const sent = () => DATA.conexiones.filter(c=>c.de===meId && c.estado==="pendiente");
const teams = () => DATA.conexiones.filter(c=>(c.de===meId||c.para===meId) && c.estado==="aceptada" && !c.disuelto);
const partnerOf = c => profileById(c.de===meId?c.para:c.de) || {id:"x",nombre:"Perfil eliminado",carrera:""};
const lastSurvey = c => DATA.encuestas.filter(e=>e.conexion===c.id && e.perfil===meId).sort((a,b)=>b.creado.localeCompare(a.creado))[0];
function dueTeams(){
  return teams().filter(c=>{ const l=lastSurvey(c); return !l || Date.now()-new Date(l.creado) >= REMIND_DAYS*DAY; });
}
function reminderBanner(){
  const d = dueTeams(); if(!d.length) return "";
  const c = d[0], p = partnerOf(c), l = lastSurvey(c);
  const since = Math.floor((Date.now()-new Date(l?l.creado:(c.aceptada||c.actualizado)))/DAY);
  const txt = l ? `Han pasado ${since} días desde tu último seguimiento.` : since>=1 ? `Formaron equipo hace ${since} ${since===1?"día":"días"}.` : "Acaban de formar equipo.";
  return `<div class="card soft" style="border-left:6px solid var(--sun)"><div class="row" style="justify-content:space-between"><div class="row">${avatar(p)}<div><b>¿Cómo va tu equipo con ${esc(p.nombre)}?</b><p class="note">${txt} Cuéntanos en 1 minuto.</p></div></div><button class="btn primary sm" data-survey="${c.id}">Responder</button></div></div>`;
}

/* ---------- Navegación ---------- */
function nav(){
  const m = me();
  const nR = m ? received().length : 0, nD = m ? dueTeams().length : 0;
  const badge = n => n?`<span class="badge">${n}</span>`:"";
  const tab = (v,t,extra="") => `<button class="tab" data-go="${v}" ${view===v?'aria-current="page"':""}>${t}${extra}</button>`;
  const right = m && m.completo
    ? `${tab("matches","Matches")}${tab("solicitudes","Solicitudes",badge(nR))}${tab("equipo","Mi equipo",badge(nD))}${tab("perfil","Mi perfil")}${ENV.isAdmin?`<a class="tab hide-sm" href="#admin">Admin</a>`:""}`
    : m ? `<button class="tab" data-act="logout">Salir</button>`
    : `<a class="tab hide-sm" href="#como">Cómo funciona</a><a class="tab hide-sm" href="#casos">Casos</a><button class="tab" data-go="entrar">Entrar</button><button class="btn primary sm" data-go="registro">Crear cuenta</button>`;
  return `<header class="nav"><div class="wrap"><button class="brand" data-home>${DM.logo()}<span>DataMatch <b>LatAm</b></span></button><nav class="nav-links" aria-label="Principal">${right}</nav></div></header>`;
}
function bindCommon(){
  $$("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
  $$("[data-home]").forEach(b=>b.onclick=()=>go(me()&&me().completo?"matches":"landing"));
  $$('[data-act="logout"]').forEach(b=>b.onclick=()=>{ setMe(null); onb=null; if(AUTH) AUTH.signOut(); go("landing"); });
  $$('a[href="#como"],a[href="#casos"]').forEach(a=>a.onclick=e=>{ e.preventDefault(); if(view!=="landing") go("landing"); setTimeout(()=>document.getElementById(a.getAttribute("href").slice(1))?.scrollIntoView({behavior:"smooth"}),30); });
  $$("[data-survey]").forEach(b=>b.onclick=()=>openSurvey(b.dataset.survey));
}
function renderSaveState(){ const n=$("#saveNote"); if(n) n.textContent = saveText(); }
const saveText = () => !ready ? "Conectando…" : (ENV.db&&ENV.canWrite) ? "Tus datos se guardan en DataMatch." : "Modo demostración: tus datos no se guardan al cerrar.";

/* ---------- Landing ---------- */
const CASOS = [
  {a:{id:"c1a",nombre:"Mariana"},b:{id:"c1b",nombre:"Julián"},q:"Yo tenía el modelo de datos; Julián sabía venderlo. El match nos avisó que él decide rápido y yo no, y eso lo hablamos desde el primer día.",p:"Ciencia de Datos + Administración · Bogotá. Hoy prueban una app de rutas de reciclaje con conjuntos residenciales."},
  {a:{id:"c2a",nombre:"Camilo"},b:{id:"c2b",nombre:"Sofía"},q:"Lo que más nos sirvió fue ver la disponibilidad. Acordamos horas y roles por escrito antes de arrancar.",p:"Ingeniería de Sistemas + Diseño · Medellín. Lanzaron una herramienta de turnos para tiendas de barrio."},
  {a:{id:"c3a",nombre:"Paula"},b:{id:"c3b",nombre:"Esteban"},q:"Nos conocimos en un hackathon y no volvimos a hablar. DataMatch nos volvió a juntar con un 91 de compatibilidad.",p:"Estadística + Economía · Bogotá. Preparan juntos su postulación a una incubadora universitaria."}
];
function vLanding(){
  const d1 = DM.EJEMPLOS[2], d2 = DM.EJEMPLOS[5];
  const inviter = refBy ? profileById(refBy) : null;
  return `${nav()}
  <section class="hero"><div class="wrap">
    <div>
      <span class="kicker">${inviter?`${esc(inviter.nombre)} te invitó a DataMatch`:"Para estudiantes que quieren emprender"}</span>
      <h1 style="margin-top:14px">Emprende con quien <em>encaja.</em></h1>
      <p class="lead">Te recomendamos cofundadores que complementan lo que sabes, comparten tu visión y tienen tiempo para construir contigo. Y te explicamos por qué.</p>
      <div class="row"><button class="btn primary" data-go="registro">Crear mi perfil gratis</button><button class="btn" data-go="entrar">Ya tengo cuenta</button></div>
      <p class="note" style="margin-top:14px">Toma unos 6 minutos. Al final descubres tu arquetipo emprendedor.</p>
    </div>
    <div class="demo" aria-label="Ejemplo de match entre dos perfiles">
      <div class="pc a"><div class="who">${avatar(d1)}<div><b>${d1.nombre}</b><br><small>${d1.carrera}</small></div></div><div class="tags"><span class="tag">Diseño UX/UI</span><span class="tag time">15 h/sem</span></div></div>
      <div class="bubble"><div><b>87</b><span>encajan</span></div></div>
      <div class="pc b"><div class="who">${avatar(d2)}<div><b>${d2.nombre}</b><br><small>${d2.carrera}</small></div></div><div class="tags"><span class="tag">Machine learning</span><span class="tag time">12 h/sem</span></div></div>
      <span class="tagx">Ejemplo ilustrativo</span>
    </div>
  </div></section>
  <section class="band soft" id="como"><div class="wrap">
    <span class="kicker">Cómo funciona</span>
    <h2 style="margin-top:10px">Tres pasos. Cero jerga.</h2>
    <div class="steps">
      <div class="step"><span class="n">1</span><h3>Cuéntanos quién eres</h3><p class="muted">Tu carrera, lo que sabes hacer y el rol que buscas en un socio.</p></div>
      <div class="step"><span class="n">2</span><h3>Responde 14 preguntas</h3><p class="muted">Cómo trabajas, qué te mueve, cuánto riesgo asumes y cuánto tiempo tienes. Lo que un CV no muestra.</p></div>
      <div class="step"><span class="n">3</span><h3>Conecta con tu match</h3><p class="muted">Ves por qué encajan, le escribes y, si acepta, reciben sus datos de contacto.</p></div>
    </div>
  </div></section>
  <section class="band ink" id="casos"><div class="wrap">
    <span class="kicker" style="color:var(--sun)">Casos</span>
    <h2 style="margin-top:10px">Equipos que encajaron</h2>
    <div class="cases">${CASOS.map(c=>`<article class="case">
      <div class="pair">${avatar(c.a)}${avatar(c.b)}<b>${esc(c.a.nombre)} y ${esc(c.b.nombre)}</b></div>
      <blockquote>“${esc(c.q)}”</blockquote><p>${esc(c.p)}</p><span class="lbl">Historia ilustrativa del prototipo</span></article>`).join("")}</div>
  </div></section>
  <section class="band coral"><div class="wrap cta-end">
    <h2 style="max-width:16ch">Tu próximo socio ya está buscando a alguien como tú.</h2>
    <button class="btn" data-go="registro">Crear mi perfil</button>
  </div></section>
  <footer class="foot"><div class="wrap"><span>DataMatch LatAm · Prototipo del Grupo 2 · Universidad Externado de Colombia · <a href="#admin">Acceso del equipo</a></span><span id="saveNote">${saveText()}</span></div></footer>`;
}

/* ---------- Registro y entrada ---------- */
function vRegistro(){
  return `${nav()}<div class="page"><div class="narrow">
    <div class="stack"><span class="kicker">Crear cuenta</span><h2>Empecemos por lo básico</h2></div>
    <form class="card" id="f" novalidate>
      <label class="field" for="nombre">¿Cómo te llamas?<input type="text" id="nombre" maxlength="40" autocomplete="given-name"></label>
      <label class="field" for="email">Correo<input type="email" id="email" maxlength="80" autocomplete="email"></label>
      <div class="grid2">${passField("pass","Contraseña","","new-password")}${passField("pass2","Repite la contraseña","","new-password")}</div><p class="note" style="margin-top:-8px">Mínimo 8 caracteres.</p>
      ${photoField(null)}
      <label class="field" for="wa">WhatsApp <small>Opcional. Solo lo ve quien acepte formar equipo contigo.</small><input type="text" id="wa" maxlength="18" inputmode="tel" placeholder="+57 300 000 0000"></label>
      <label class="opt" for="ok"><input type="checkbox" id="ok"><span class="opt-col">Autorizo el tratamiento de mis datos según la Ley 1581 de 2012<span class="sub">Solo los usamos para recomendarte cofundadores. No los vendemos. Puedes borrarlos cuando quieras.</span></span></label>
      <p class="err" id="err"></p>
      <div class="row"><button class="btn primary" type="submit">Crear cuenta</button><button class="btn link" type="button" data-go="entrar">Ya tengo cuenta</button></div>
      <p class="note">${saveText()}</p>
    </form></div></div>`;
}
function bindRegistro(){
  let foto = null; bindPhoto(d => foto = d); bindPw();
  $("#f").onsubmit = async e => {
    e.preventDefault();
    const nombre=$("#nombre").value.trim(), email=$("#email").value.trim().toLowerCase(), wa=$("#wa").value.trim(), pass=$("#pass").value, pass2=$("#pass2").value;
    if(!nombre) return $("#err").textContent="Escribe tu nombre.";
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return $("#err").textContent="Revisa tu correo: parece incompleto.";
    if(pass.length<8) return $("#err").textContent="Tu contraseña debe tener al menos 8 caracteres.";
    if(pass!==pass2) return $("#err").textContent="Las contraseñas no coinciden.";
    if(!okPhone(wa)) return $("#err").textContent="Revisa tu WhatsApp: usa solo números, espacios o el signo +.";
    if(!$("#ok").checked) return $("#err").textContent="Para crear tu cuenta necesitamos tu autorización.";
    if(DATA.perfiles.some(p=>p.email===email)){ $("#err").innerHTML=`Ya hay una cuenta con ese correo. <button class="btn link" type="button" id="toLogin">Entrar</button>`; $("#toLogin").onclick=()=>go("entrar"); return; }
    const p = {id:DM.uid("u"), nombre, email, whatsapp:wa, creado:now(), consentimiento:true, completo:false,
      variante: Math.random()<.5?"explicado":"porcentaje", precio: DM.PRICES[Math.floor(Math.random()*3)], plan:null,
      referidoPor: refBy && refBy!=="" ? refBy : null, foto, skills:[], importancia:[], motivaciones:[], valores:[], horas:15};
    const btn=$("#f button[type=submit]"); btn.disabled=true; btn.textContent="Creando tu cuenta…";
    if(AUTH){
      const r = await AUTH.signUp(email, pass);
      if(r.error){ btn.disabled=false; btn.textContent="Crear cuenta"; $("#err").textContent = /registered|exists/i.test(r.error.message||"") ? "Ya hay una cuenta con ese correo. Entra con tu contraseña." : /password/i.test(r.error.message||"") ? "Esa contraseña es muy débil. Usa al menos 8 caracteres con letras y números." : "No pudimos crear la cuenta. Intenta de nuevo en un momento."; return; }
      p.auth = true;
    } else await DM.localAuth.register(p, pass);
    put("perfiles", p); setMe(p.id); startOnboarding();
  };
}
function vEntrar(){
  return `${nav()}<div class="page"><div class="narrow">
    <div class="stack"><span class="kicker">Entrar</span><h2>Qué bueno verte de nuevo</h2></div>
    <form class="card" id="f" novalidate>
      <label class="field" for="email">Tu correo<input type="email" id="email" maxlength="80" autocomplete="email"></label>
      ${passField("pass","Contraseña","","current-password")}
      <p class="err" id="err"></p>
      <div class="row"><button class="btn primary" type="submit">Entrar</button><button class="btn link" type="button" data-go="registro">Crear una cuenta</button></div>
      <p class="note">¿Olvidaste tu contraseña? Escríbele al equipo de DataMatch y te ayudamos a recuperarla.</p>
    </form></div></div>`;
}
function bindEntrar(){
  bindPw();
  $("#f").onsubmit = async e => {
    e.preventDefault();
    const email=$("#email").value.trim().toLowerCase(), pass=$("#pass").value;
    if(!ready) return $("#err").textContent="Todavía estamos cargando las cuentas. Intenta de nuevo en unos segundos.";
    let p = DATA.perfiles.find(x=>x.email===email);
    const bad = () => $("#err").textContent="Correo o contraseña incorrectos.";
    if(AUTH){
      const r = await AUTH.signIn(email, pass);
      if(r.error){
        if(p && !p.auth && pass.length>=8){ const s = await AUTH.signUp(email, pass); if(s.error) return bad(); p = {...p, auth:true}; put("perfiles", p); toast("Guardamos la contraseña para tu cuenta."); }
        else return /confirm/i.test(r.error.message||"") ? $("#err").textContent="Confirma tu correo con el enlace que te enviamos y vuelve a intentarlo." : bad();
      }
      if(!p) return $("#err").textContent="Tu acceso funciona, pero no encontramos tu perfil. Crea una cuenta nueva.";
    } else {
      if(!p) return bad();
      const r = await DM.localAuth.login(p, pass);
      if(!r.ok) return bad();
      if(r.legacy){ if(pass.length<8) return $("#err").textContent="Tu cuenta aún no tiene contraseña. Elige una de al menos 8 caracteres."; p = {...p}; await DM.localAuth.register(p, pass); put("perfiles", p); toast("Guardamos la contraseña para tu cuenta."); }
    }
    setMe(p.id); if(p.completo) go("matches"); else startOnboarding();
  };
}

/* ---------- Perfil y cuestionario ---------- */
const STEPS = [
  {k:"perfil",t:"Tu perfil"},
  {k:"importancia",t:"Lo que te importa"},
  {k:"P",t:"Cómo trabajas",why:"Dos socios con ritmos muy distintos chocan en el día a día. Aquí detectamos esas diferencias antes de empezar."},
  {k:"M",t:"Qué te mueve",why:"Si uno quiere un negocio pequeño y el otro una startup que levante inversión, la sociedad se rompe pronto."},
  {k:"V",t:"Tus valores",why:"Los valores compartidos generan confianza cuando toca tomar decisiones difíciles."},
  {k:"R",t:"Riesgo",why:"Cuánta incertidumbre asumirías, por ejemplo meses sin ingresos."},
  {k:"T",t:"Tu tiempo",why:"Un perfil excelente no sirve si no tiene tiempo. Esto aparecerá en tu tarjeta."}
];
function startOnboarding(){ onb={i:0, d:JSON.parse(JSON.stringify(me())), inicio:now()}; go("onboarding"); }
function stepHTML(k, r){
  const roleOpts = Object.fromEntries(Object.keys(DM.ROLES).map(k=>[k,[DM.ROLES[k],DM.ROLE_DESC[k]]]));
  if(k==="perfil") return `
    <div class="grid2">
      <label class="field" for="carrera">Carrera<input type="text" id="carrera" maxlength="50" value="${esc(r.carrera||"")}" placeholder="Ciencia de Datos"></label>
      <label class="field" for="universidad">Universidad<input type="text" id="universidad" maxlength="50" value="${esc(r.universidad||"")}"></label>
    </div>
    <label class="field" for="ciudad">Ciudad<select id="ciudad">${["Bogotá","Medellín","Otra ciudad"].map(c=>`<option ${r.ciudad===c?"selected":""}>${c}</option>`).join("")}</select></label>
    <fieldset><legend>¿Qué sabes hacer? <span class="note">Elige de 2 a 4</span></legend>${checks("skills",Object.fromEntries(DM.SKILLS.map(s=>[s,s])),r.skills)}</fieldset>
    <fieldset><legend>¿Qué rol cubres en un equipo?</legend>${radio("role",roleOpts,r.role,"opts cols")}</fieldset>
    <fieldset><legend>¿Qué rol buscas en tu cofundador?</legend>${radio("seeks",roleOpts,r.seeks,"opts cols")}</fieldset>`;
  if(k==="importancia") return `<fieldset><legend>Antes de asociarte con alguien, ¿qué tendrías en cuenta? <span class="note">Marca todo lo que aplique</span></legend>${checks("imp",Object.fromEntries(DM.IMPORTANCIA.map(i=>[i.k,i.t])),r.importancia)}</fieldset>`;
  if(k==="P") return `
    <fieldset><legend>Me gusta probar métodos que nunca he usado.</legend>${scale("apertura",r.apertura,"Nada que ver conmigo","Muy yo")}</fieldset>
    <fieldset><legend>Cuando me comprometo con algo, lo termino a tiempo.</legend>${scale("organizacion",r.organizacion,"Nada que ver conmigo","Muy yo")}</fieldset>
    <fieldset><legend>Para decisiones importantes, prefiero…</legend>${scale("decision",r.decision,"Decidir rápido","Decidir por consenso")}</fieldset>
    <fieldset><legend>Si no estoy de acuerdo con mi socio, tiendo a…</legend>${radio("conflicto",DM.CONF,r.conflicto)}</fieldset>
    <fieldset><legend>Cuando hablo, soy más bien…</legend>${radio("comunicacion",{directa:["Directo","Digo lo que pienso sin rodeos"],diplomatica:["Diplomático","Cuido cómo lo digo"]},r.comunicacion)}</fieldset>`;
  if(k==="M") return `
    <fieldset><legend>¿Por qué quieres emprender? <span class="note">Elige 2</span></legend>${checks("motivaciones",DM.MOTIV,r.motivaciones)}</fieldset>
    <fieldset><legend>¿Qué quieres construir?</legend>${radio("ambicion",{pequeno:"Un negocio pequeño y estable",regional:"Una empresa que crezca en la región",alto:"Una startup de alto crecimiento que busque inversión"},r.ambicion)}</fieldset>
    <fieldset><legend>¿Cuánto tiempo te ves en el proyecto?</legend>${radio("horizonte",DM.HOR,r.horizonte,"opts cols")}</fieldset>`;
  if(k==="V") return `<fieldset><legend>Elige los 3 valores que más pesan en tu forma de trabajar</legend>${checks("valores",DM.VALORES,r.valores)}</fieldset>`;
  if(k==="R") return `
    <fieldset><legend>Me siento cómodo decidiendo sin tener toda la información.</legend>${scale("riesgo",r.riesgo,"Nada que ver conmigo","Muy yo")}</fieldset>
    <fieldset><legend>Te ofrecen un trabajo estable justo cuando tu proyecto necesita 6 meses más sin ingresos. ¿Qué haces?</legend>${radio("escenario",{estable:"Acepto el trabajo y sigo el proyecto en mi tiempo libre",proyecto:"Rechazo el trabajo y me la juego por el proyecto"},r.escenario)}</fieldset>`;
  return `
    <fieldset><legend>¿Cuántas horas por semana le puedes dar al proyecto?</legend>
      <input type="range" id="horas" min="2" max="40" value="${r.horas||15}" aria-label="Horas por semana">
      <p><span class="num" id="horasV" style="font-size:2rem;font-weight:800">${r.horas||15}</span> <b>horas por semana</b></p></fieldset>
    <fieldset><legend>Este año, tu dedicación sería…</legend>${radio("dedicacion",{parcial:["Parcial","Mientras estudio o trabajo"],completa:["Completa","El proyecto sería lo principal"]},r.dedicacion)}</fieldset>`;
}
function readStep(k, r){
  const n=x=>{const v=val(x);return v===null?null:Number(v)};
  if(k==="perfil"){
    const o={carrera:$("#carrera").value.trim(),universidad:$("#universidad").value.trim(),ciudad:$("#ciudad").value,skills:vals("skills"),role:val("role"),seeks:val("seeks")};
    if(!o.carrera) return "Escribe tu carrera.";
    if(o.skills.length<2||o.skills.length>4) return "Elige entre 2 y 4 cosas que sabes hacer.";
    if(!o.role||!o.seeks) return "Cuéntanos qué rol cubres y cuál buscas.";
    Object.assign(r,o);
  }
  if(k==="importancia"){ const v=vals("imp"); if(!v.length) return "Marca al menos una opción."; r.importancia=v; }
  if(k==="P"){ const o={apertura:n("apertura"),organizacion:n("organizacion"),decision:n("decision"),conflicto:val("conflicto"),comunicacion:val("comunicacion")}; if(Object.values(o).some(v=>v===null)) return "Te falta responder alguna pregunta."; Object.assign(r,o); }
  if(k==="M"){ const m=vals("motivaciones"); if(m.length!==2) return "Elige exactamente 2 motivaciones."; const a=val("ambicion"),h=val("horizonte"); if(!a||!h) return "Te falta responder alguna pregunta."; Object.assign(r,{motivaciones:m,ambicion:a,horizonte:h}); }
  if(k==="V"){ const v=vals("valores"); if(v.length!==3) return "Elige exactamente 3 valores."; r.valores=v; }
  if(k==="R"){ const ri=n("riesgo"),e=val("escenario"); if(ri===null||!e) return "Te falta responder alguna pregunta."; Object.assign(r,{riesgo:ri,escenario:e}); }
  if(k==="T"){ const d=val("dedicacion"); if(!d) return "Cuéntanos tu dedicación."; Object.assign(r,{horas:Number($("#horas").value),dedicacion:d}); }
  return null;
}
function vOnboarding(){
  const s = STEPS[onb.i];
  return `${nav()}<div class="page"><div class="narrow">
    <div class="progress" aria-label="Paso ${onb.i+1} de ${STEPS.length}">${STEPS.map((_,i)=>`<span class="${i<onb.i?"done":i===onb.i?"on":""}"></span>`).join("")}</div>
    <div class="stack"><span class="kicker">Paso ${onb.i+1} de ${STEPS.length}</span><h2>${s.t}</h2>${s.why?`<p class="why">${s.why}</p>`:""}</div>
    <div class="card">${stepHTML(s.k,onb.d)}
      <p class="err" id="err"></p>
      <div class="row"><button class="btn primary" id="next">${onb.i<STEPS.length-1?"Siguiente":"Descubrir mi arquetipo"}</button>${onb.i>0?`<button class="btn link" id="back">Atrás</button>`:""}</div>
    </div></div></div>`;
}
function bindOnboarding(){
  const s = STEPS[onb.i];
  if(s.k==="T") $("#horas").oninput = e => $("#horasV").textContent = e.target.value;
  if($("#back")) $("#back").onclick = () => { onb.i--; render(); window.scrollTo(0,0); };
  $("#next").onclick = () => {
    const e = readStep(s.k, onb.d); if(e){ $("#err").textContent=e; return; }
    if(onb.i<STEPS.length-1){ onb.i++; render(); window.scrollTo(0,0); return; }
    const first = !onb.d.completo;
    const p = {...onb.d, completo:true, arquetipo:DM.arquetipo(onb.d), cuestionarioInicio:onb.d.cuestionarioInicio||onb.inicio, cuestionarioFin:onb.d.cuestionarioFin||now(), actualizado:now()};
    put("perfiles", p); onb=null;
    if(first) seedExampleRequests();
    go("arquetipo");
  };
}

/* ---------- Arquetipo ---------- */
function vArquetipo(){
  const m=me(), a=DM.ARQ[arqOf(m)], b=DM.ARQ[a.encaja];
  return `${nav()}<div class="page"><div class="narrow" style="max-width:760px">
    <span class="kicker">Tu arquetipo emprendedor</span>
    <div class="card" style="border:2px solid var(--ink);box-shadow:8px 8px 0 ${a.color};gap:20px">
      <div class="row" style="gap:22px">${DM.ARQ_SVG(arqOf(m),120)}<h1 style="font-size:clamp(1.9rem,5vw,3rem);flex:1;min-width:220px">${esc(a.n)}</h1></div>
      <p class="lead" style="font-size:1.2rem">${esc(a.d)}</p>
      <ul style="margin:0;padding-left:20px;display:grid;gap:6px">${DM.rasgos(m).map(t=>`<li>${esc(t)}</li>`).join("")}</ul>
      <p class="why">Sueles encajar con un <b>${esc(b.n)}</b>: ${esc(b.d.charAt(0).toLowerCase()+b.d.slice(1))}</p>
      ${refsHTML(arqOf(m))}
      <div class="row"><button class="btn primary" data-go="matches">Ver mis matches</button><button class="btn" id="share">Compartir mi arquetipo</button></div>
    </div></div></div>`;
}
function refsHTML(k){
  return `<div class="stack" style="gap:10px"><b>Emprendedores con un perfil parecido</b><div class="refs">${DM.ARQ_REF[k].map(r=>`<div class="ref"><b>${esc(r.n)}</b><span>${esc(r.r)}</span></div>`).join("")}</div><p class="note">Comparación orientativa basada en su trayectoria pública.</p></div>`;
}
const shareText = m => `Soy ${DM.ARQ[arqOf(m)].n} en DataMatch LatAm. Descubre tu arquetipo y encuentra a tu cofundador: ${DM.refLink(m.id)}`;
function bindArquetipo(){ $("#share").onclick = () => copy(shareText(me()), "Texto copiado. Pégalo en WhatsApp o en tus redes."); }

/* Perfiles de ejemplo que te escriben, para que la bandeja tenga contenido desde el primer día */
function seedExampleRequests(){
  const m=me(); if(!m || m.ejemplosEnviados) return;
  const msg = (o) => o.role==="tecnico" ? `Vi que te interesa construir algo serio. Yo me encargo de ${o.skills[0].toLowerCase()} y tu perfil complementa el mío. ¿Hablamos?`
    : o.role==="negocio" ? `Me encargo de la parte comercial y creo que encajamos. Tengo ${o.horas} horas a la semana para arrancar. ¿Te animas?`
    : `Me gusta diseñar productos que la gente sí usa. Creo que con lo que tú sabes podemos hacer algo bueno.`;
  const w=model().pesos;
  const picks = DM.EJEMPLOS.map(o=>{ const d=DM.dims(o,m); return {o,d,score:DM.score(d,w)}; }).filter(x=>x.o.role!==m.role).sort((a,b)=>b.score-a.score).slice(0,2);
  picks.forEach((x,i)=>put("conexiones",{id:`${x.o.id}__${m.id}`, de:x.o.id, para:m.id, deEjemplo:true, d:x.d, score:x.score, modeloVersion:model().version, estado:"pendiente", mensaje:msg(x.o), creado:now(), solicitada:new Date(Date.now()-(i+1)*36e5).toISOString()}));
  put("perfiles",{...me(), ejemplosEnviados:true});
}

/* ---------- Matches ---------- */
const conFor = other => DATA.conexiones.find(c=>c.id===`${meId}__${other.id}`) || null;
const incomingFrom = other => DATA.conexiones.find(c=>c.id===`${other.id}__${meId}`) || null;
function ensureCon(other, d, score){
  const c = conFor(other) || {id:`${meId}__${other.id}`, de:meId, para:other.id, paraEjemplo:!!other.ejemplo, d, score, modeloVersion:model().version, estado:"ninguna", creado:now()};
  return {...c};
}
function pool(){
  const m=me(), w=model().pesos;
  return [...DATA.perfiles.filter(p=>p.completo && p.id!==m.id), ...DM.EJEMPLOS]
    .map(o=>{ const d=DM.dims(m,o); return {o,d,score:DM.score(d,w)}; }).sort((a,b)=>b.score-a.score);
}
function filtered(){
  return pool().filter(({o})=>(!filt.role||o.role===filt.role) && (!filt.ciudad||o.ciudad===filt.ciudad) && (o.horas>=filt.horas) && (!filt.reales||!o.ejemplo));
}
function matchCard(x, i){
  const m=me(), o=x.o, c=conFor(o), inc=incomingFrom(o), ex=DM.explain(m,o,x.d), arq=DM.ARQ[arqOf(o)];
  const show = m.variante==="explicado" || (c&&c.vioExplicacion);
  const lvl = v => v>=.75?"":v>=.55?"mid":"low";
  const estado = (inc&&inc.estado==="aceptada") ? "aceptada" : (c?.estado||"ninguna");
  const btn = estado==="aceptada" ? `<button class="btn dark sm" data-go="equipo">Ya son equipo</button>`
    : inc&&inc.estado==="pendiente" ? `<button class="btn primary sm" data-go="solicitudes">Te escribió: responder</button>`
    : estado==="pendiente" ? `<button class="btn sm" disabled>Solicitud enviada</button>`
    : estado==="rechazada" ? `<span class="note">No aceptó la solicitud</span>`
    : `<button class="btn primary sm" data-connect="${o.id}">Quiero conectar</button>`;
  return `<article class="match ${i===0?"first":""}">
    <div class="mhead">${avatar(o,"lg")}
      <div class="stack" style="gap:2px"><h3>${esc(o.nombre)}</h3><p>${[o.carrera,o.universidad,o.ciudad].filter(Boolean).map(esc).join(" · ")}</p></div>
      <div class="ring" style="--v:${x.score}"><div><span><b>${x.score}</b><small>de 100</small></span></div></div>
    </div>
    <div class="tags">${arq?`<span class="tag" style="background:${arq.color};color:#fff">${esc(arq.n)}</span>`:""}<span class="tag time">${o.horas} h/semana · ${o.dedicacion==="completa"?"dedicación completa":"parcial"}</span><span class="tag">Rol ${DM.ROLE_SHORT[o.role]}</span>${(o.skills||[]).map(s=>`<span class="tag">${esc(s)}</span>`).join("")}${o.ejemplo?`<span class="tag ex">Perfil de ejemplo</span>`:`<span class="tag real">Perfil real</span>`}</div>
    ${show?`<div class="bars">${DM.DIMS.map(k=>`<div class="bar"><span>${DM.DIM_LABEL[k]}</span><div class="track"><div class="fill ${lvl(x.d[k])}" style="width:${Math.round(x.d[k]*100)}%"></div></div><span class="v">${Math.round(x.d[k]*100)}</span></div>`).join("")}</div>
    <div class="explain">
      <section><h4>Por qué encajan</h4><ul>${ex.why.map(t=>`<li>${esc(t)}</li>`).join("")}</ul></section>
      <section><h4>Qué aporta cada uno</h4><ul>${ex.aporta.map(t=>`<li>${esc(t)}</li>`).join("")}</ul></section>
      <section><h4>Hablen de esto antes</h4><ul>${ex.conversar.map(t=>`<li>${esc(t)}</li>`).join("")}</ul></section>
    </div>`:`<button class="btn sm" data-why="${o.id}" style="justify-self:start">Ver por qué encajan</button>`}
    <div class="mfoot">
      <div class="row" style="gap:8px"><span class="note">¿Qué tan buen match te parece?</span><div class="stars" role="group" aria-label="Califica este match">${[1,2,3,4,5].map(n=>`<button aria-label="${n} de 5" data-rate="${o.id}" data-n="${n}" class="${(c?.ajuste||0)>=n?"on":""}">★</button>`).join("")}</div></div>
      ${btn}
    </div>
  </article>`;
}
function filtersHTML(total){
  const m=me(), active = filt.role||filt.ciudad||filt.horas||filt.reales;
  return `<details class="card soft" ${active?"open":""} style="gap:14px"><summary style="cursor:pointer;font-weight:800">Filtrar matches${active?" · activos":""} <span class="tag ex" style="margin-left:8px">Premium · gratis durante el piloto</span></summary>
    <div class="grid2" style="margin-top:14px">
      <label class="field" for="fRole">Rol<select id="fRole"><option value="">Cualquier rol</option>${Object.entries(DM.ROLES).map(([k,t])=>`<option value="${k}" ${filt.role===k?"selected":""}>${t}${k===m.seeks?" (el que buscas)":""}</option>`).join("")}</select></label>
      <label class="field" for="fCity">Ciudad<select id="fCity"><option value="">Cualquier ciudad</option>${["Bogotá","Medellín","Otra ciudad"].map(c=>`<option ${filt.ciudad===c?"selected":""}>${c}</option>`).join("")}</select></label>
    </div>
    <label class="field" for="fHoras"><span>Disponibilidad mínima: <span id="fHorasV">${filt.horas}</span> horas por semana</span><input type="range" id="fHoras" min="0" max="35" step="5" value="${filt.horas}"></label>
    <label class="opt" for="fReal"><input type="checkbox" id="fReal" ${filt.reales?"checked":""}><span>Mostrar solo perfiles reales</span></label>
    <div class="row"><span class="note">${total} ${total===1?"persona cumple":"personas cumplen"} estos filtros.</span>${active?`<button class="btn link" id="fClear">Quitar filtros</button>`:""}</div>
  </details>`;
}
function vMatches(){
  const m=me(), all=filtered(), list=all.slice(0,shown), mo=model();
  const real = DATA.perfiles.filter(p=>p.completo && p.id!==m.id).length, nR=received().length;
  return `${nav()}<div class="page"><div class="wrap stack" style="gap:24px;max-width:860px">
    <div class="stack"><span class="kicker">Hola, ${esc(m.nombre)}</span><h2>Estas personas encajan contigo</h2>
    <p class="muted">El puntaje es una orientación para empezar la conversación, no un veredicto. ${real?`Hay ${real} ${real===1?"perfil real":"perfiles reales"} y 12 de ejemplo.`:"Mientras llegan más usuarios, también ves perfiles de ejemplo."}</p>
    <p class="note">Modelo v${mo.version} · aprendió de ${mo.n} ${mo.n===1?"señal":"señales"} de la comunidad. Tus calificaciones lo mejoran.</p></div>
    ${nR?`<div class="card soft" style="border-left:6px solid var(--coral)"><div class="row" style="justify-content:space-between"><div><b>${nR} ${nR===1?"persona quiere":"personas quieren"} conectar contigo</b><p class="note">Revisa sus mensajes en Solicitudes.</p></div><button class="btn primary sm" data-go="solicitudes">Ver solicitudes</button></div></div>`:""}
    ${reminderBanner()}
    ${filtersHTML(all.length)}
    <div class="matches">${list.length?list.map(matchCard).join(""):`<div class="empty"><b>Nadie cumple estos filtros</b><p>Prueba con menos horas o con cualquier ciudad.</p></div>`}</div>
    ${all.length>shown?`<div class="row" style="justify-content:center"><button class="btn" id="more">Ver más matches (${all.length-shown} más)</button></div>`:""}
  </div></div>`;
}
function bindMatches(){
  const find = id => pool().find(x=>x.o.id===id);
  $$("[data-why]").forEach(b=>b.onclick=()=>{ const x=find(b.dataset.why); const c=ensureCon(x.o,x.d,x.score); c.vioExplicacion=true; c.actualizado=now(); put("conexiones",c); render(); });
  $$("[data-rate]").forEach(b=>b.onclick=()=>{ const x=find(b.dataset.rate); const c=ensureCon(x.o,x.d,x.score); c.ajuste=Number(b.dataset.n); c.d=x.d; c.score=x.score; c.actualizado=now(); put("conexiones",c); maybeRetrain(); render(); toast("Gracias. Con esto el modelo aprende."); });
  $$("[data-connect]").forEach(b=>b.onclick=()=>openConnect(find(b.dataset.connect)));
  const refilter = () => { shown=6; render(); };
  $("#fRole").onchange = e => { filt.role=e.target.value; refilter(); };
  $("#fCity").onchange = e => { filt.ciudad=e.target.value; refilter(); };
  $("#fHoras").oninput = e => $("#fHorasV").textContent = e.target.value;
  $("#fHoras").onchange = e => { filt.horas=Number(e.target.value); refilter(); };
  $("#fReal").onchange = e => { filt.reales=e.target.checked; refilter(); };
  if($("#fClear")) $("#fClear").onclick = () => { filt={role:"",ciudad:"",horas:0,reales:false}; refilter(); };
  if($("#more")) $("#more").onclick = () => { shown+=6; render(); };
}
function openConnect(x){
  const o=x.o;
  openDialog(`<div class="stack"><span class="kicker">Solicitud de conexión</span><h2 id="dlgT" style="font-size:1.5rem">Escríbele a ${esc(o.nombre)}</h2><p class="muted">Cuéntale por qué quieres conectar. Un mensaje concreto tiene más probabilidad de recibir un sí.</p></div>
    <label class="field" for="msg">Tu mensaje<textarea id="msg" maxlength="280" placeholder="Hola, vi que sabes de ${esc((o.skills[0]||"").toLowerCase())}. Tengo una idea sobre… y creo que encajamos porque…"></textarea><small><span id="cnt">0</span>/280</small></label>
    <p class="err" id="derr"></p>
    <div class="row"><button class="btn primary" id="send">Enviar solicitud</button><button class="btn link" id="cancel">Cancelar</button></div>`,
  (box, close) => {
    const ta = box.querySelector("#msg");
    ta.oninput = () => box.querySelector("#cnt").textContent = ta.value.length;
    box.querySelector("#cancel").onclick = close;
    box.querySelector("#send").onclick = () => {
      const t = ta.value.trim(); if(t.length<10){ box.querySelector("#derr").textContent="Escribe al menos una frase corta."; return; }
      const c=ensureCon(o,x.d,x.score); Object.assign(c,{estado:"pendiente", mensaje:t, solicitada:now(), actualizado:now()});
      put("conexiones",c); close(); render();
      if(o.ejemplo){
        setTimeout(()=>{ const cc={...conFor(o), estado:"aceptada", respuestaSimulada:true, aceptada:now()}; put("conexiones",cc); maybeRetrain(); if(!dialog && ["matches","equipo","solicitudes"].includes(view)) render(); toast(`${o.nombre} aceptó. Es un perfil de ejemplo y acepta automáticamente.`); },1400);
      } else toast(`Le enviamos tu mensaje a ${o.nombre}.`);
    };
  });
}

/* ---------- Solicitudes ---------- */
function vSolicitudes(){
  const R = received().sort((a,b)=>String(b.solicitada||b.creado).localeCompare(String(a.solicitada||a.creado))), S = sent();
  const card = (c, incoming) => { const p = profileById(incoming?c.de:c.para) || {id:"x",nombre:"Perfil"}; const arq=DM.ARQ[arqOf(p)];
    return `<article class="match" style="gap:14px">
      <div class="mhead">${avatar(p,"lg")}<div class="stack" style="gap:2px"><h3>${esc(p.nombre)}</h3><p>${esc(p.carrera||"")} · ${esc(p.ciudad||"")}${p.ejemplo?' · <span class="tag ex">Perfil de ejemplo</span>':""}</p></div><div class="ring" style="--v:${c.score}"><div><span><b>${c.score}</b><small>de 100</small></span></div></div></div>
      ${arq?`<div class="tags"><span class="tag" style="background:${arq.color};color:#fff">${esc(arq.n)}</span><span class="tag time">${p.horas} h/semana</span>${(p.skills||[]).map(s=>`<span class="tag">${esc(s)}</span>`).join("")}</div>`:""}
      ${c.mensaje?`<blockquote style="margin:0;padding:14px 16px;background:var(--soft);border-radius:16px;font-weight:600">“${esc(c.mensaje)}”</blockquote>`:""}
      <div class="mfoot"><span class="note">${incoming?"Te escribió":"Enviada"} el ${DM.fmtDate(c.solicitada||c.creado)}</span>
      ${incoming?`<div class="row"><button class="btn sm" data-rej="${c.id}">No por ahora</button><button class="btn primary sm" data-acc="${c.id}">Aceptar y formar equipo</button></div>`:`<span class="tag">Esperando respuesta</span>`}</div>
    </article>`; };
  return `${nav()}<div class="page"><div class="wrap stack" style="gap:26px;max-width:860px">
    <div class="stack"><span class="kicker">Solicitudes</span><h2>Quieren conectar contigo</h2><p class="muted">Si aceptas, los dos verán el correo y el WhatsApp del otro en Mi equipo.</p></div>
    ${R.length?`<div class="matches">${R.map(c=>card(c,true)).join("")}</div>`:`<div class="empty"><b>No tienes solicitudes nuevas</b><p>Cuando alguien quiera conectar contigo, aparecerá aquí con su mensaje.</p><button class="btn primary sm" data-go="matches">Buscar en mis matches</button></div>`}
    ${S.length?`<section class="stack"><h3>Enviadas</h3><div class="matches">${S.map(c=>card(c,false)).join("")}</div></section>`:""}
  </div></div>`;
}
function bindSolicitudes(){
  $$("[data-acc]").forEach(b=>b.onclick=()=>{ const c={...DATA.conexiones.find(x=>x.id===b.dataset.acc), estado:"aceptada", aceptada:now(), actualizado:now()}; put("conexiones",c); maybeRetrain(); toast("¡Ahora son equipo! Ya pueden ver sus datos de contacto."); go("equipo"); });
  $$("[data-rej]").forEach(b=>b.onclick=()=>{ const c={...DATA.conexiones.find(x=>x.id===b.dataset.rej), estado:"rechazada", actualizado:now()}; put("conexiones",c); maybeRetrain(); render(); toast("Listo. No le avisaremos."); });
}

/* ---------- Mi equipo ---------- */
function contactHTML(p){
  if(p.ejemplo) return `<p class="note">Perfil de ejemplo: no tiene datos de contacto.</p>`;
  const line = (label, v) => `<div class="row" style="gap:8px"><span class="note" style="min-width:76px">${label}</span><b>${esc(v)}</b><button class="btn link" data-copy="${esc(v)}">Copiar</button></div>`;
  return `<div class="stack" style="gap:2px">${line("Correo",p.email)}${p.whatsapp?line("WhatsApp",p.whatsapp):`<p class="note">No compartió WhatsApp.</p>`}</div>`;
}
function vEquipo(){
  const E = teams(), m=me();
  const appS = DATA.encuestas.filter(e=>e.perfil===meId && e.tipo==="app").length;
  const refs = DATA.perfiles.filter(p=>p.referidoPor===meId).length;
  return `${nav()}<div class="page"><div class="wrap stack" style="gap:26px;max-width:860px">
    <div class="stack"><span class="kicker">Mi equipo</span><h2>Con quién estás construyendo</h2></div>
    ${reminderBanner()}
    ${E.length?E.map(c=>{const p=partnerOf(c), l=lastSurvey(c); return `<article class="match" style="gap:14px">
      <div class="mhead">${avatar(p,"lg")}<div class="stack" style="gap:2px"><h3>${esc(p.nombre)}</h3><p>${esc(p.carrera||"")} · Equipo desde ${DM.fmtDate(c.aceptada||c.actualizado)}</p></div><span class="tag time">${l?`${esc(DM.ETAPAS[l.etapa]||"")} · ${l.satisfaccionSocio}/5`:"Sin seguimiento"}</span></div>
      ${contactHTML(p)}
      <div class="mfoot"><span class="note">${l?`Último seguimiento: ${DM.fmtDate(l.creado)}`:"Aún no nos cuentas cómo va."}</span><button class="btn ${l?"":"primary"} sm" data-survey="${c.id}">¿Cómo va el equipo?</button></div>
    </article>`;}).join("")
      :`<div class="empty"><b>Todavía no tienes equipo</b><p>Escríbele a alguien desde tus matches o acepta una solicitud.</p><div class="row"><button class="btn primary sm" data-go="matches">Ver mis matches</button><button class="btn sm" data-go="solicitudes">Ver solicitudes</button></div></div>`}
    <div class="cols2" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px">
      <section class="card soft"><div class="stack"><h3>Invita a un compañero</h3><p class="muted">Entre más personas de tu carrera y tu universidad haya, mejores son los matches para todos.${refs?` Ya se ${refs===1?"unió 1 persona":`unieron ${refs} personas`} con tu enlace.`:""}</p></div>
        <div class="row"><button class="btn dark sm" id="invite">Copiar mi enlace de invitación</button></div></section>
      <section class="card soft"><div class="stack"><h3>¿Qué tal te parece DataMatch?</h3><p class="muted">Dos minutos para ayudarnos a mejorar${appS?`. Ya respondiste ${appS} ${appS===1?"vez":"veces"}, gracias`:""}.</p></div>
        <div class="row"><button class="btn dark sm" data-survey="app">Calificar la app</button></div></section>
    </div>
  </div></div>`;
}
const inviteText = m => `Estoy usando DataMatch LatAm para encontrar cofundadores. Crea tu perfil y mira con quién encajas: ${DM.refLink(m.id)}`;
function bindEquipo(){
  $$("[data-copy]").forEach(b=>b.onclick=()=>copy(b.dataset.copy,"Copiado."));
  $("#invite").onclick = () => copy(inviteText(me()), "Enlace copiado. Compártelo por WhatsApp.");
}
function openSurvey(conId){
  const isApp = conId==="app";
  const c = isApp?null:DATA.conexiones.find(x=>x.id===conId);
  const p = c ? partnerOf(c) : null;
  openDialog(`<div class="stack"><span class="kicker">${isApp?"Tu opinión":"Seguimiento del equipo"}</span><h2 id="dlgT" style="font-size:1.5rem">${isApp?"¿Qué tal DataMatch?":`¿Cómo va tu equipo con ${esc(p?.nombre||"")}?`}</h2></div>
    ${isApp?"":`<fieldset><legend>¿En qué etapa está el proyecto?</legend>${radio("etapa",DM.ETAPAS,null)}</fieldset>
    <fieldset><legend>¿Siguen trabajando juntos?</legend>${radio("juntos",{si:"Sí",no:"No"},null,"opts cols")}</fieldset>
    <fieldset><legend>¿Qué tan satisfecho estás con tu socio?</legend>${scale("socio",null,"Nada","Mucho")}</fieldset>`}
    <fieldset><legend>¿Qué tan satisfecho estás con la app?</legend>${scale("app",null,"Nada","Mucho")}</fieldset>
    <fieldset><legend>¿Qué tan probable es que recomiendes DataMatch a un amigo?</legend>${scale("nps",null,"Nada probable","Muy probable",11,0)}</fieldset>
    <label class="field" for="com">¿Algo que quieras contarnos?<textarea id="com" maxlength="500"></textarea></label>
    <p class="err" id="derr"></p>
    <div class="row"><button class="btn primary" id="dsave">Enviar</button><button class="btn link" id="dclose">Cancelar</button></div>`,
  (box, close) => {
    box.querySelector("#dclose").onclick = close;
    box.querySelector("#dsave").onclick = () => {
      const app=val("app"), nps=val("nps");
      const e = {id:DM.uid("e"), perfil:meId, tipo:isApp?"app":"equipo", conexion:isApp?null:conId, creado:now(), satisfaccionApp:app?Number(app):null, nps:nps!==null?Number(nps):null, comentario:box.querySelector("#com").value.trim()};
      if(!isApp){ const et=val("etapa"), j=val("juntos"), s=val("socio"); if(!et||!j||!s){ box.querySelector("#derr").textContent="Responde etapa, si siguen juntos y tu satisfacción con tu socio."; return; } Object.assign(e,{etapa:et, sigueJuntos:j==="si", satisfaccionSocio:Number(s)}); }
      if(!app||nps===null){ box.querySelector("#derr").textContent="Califica la app y dinos si la recomendarías."; return; }
      put("encuestas", e);
      if(!isApp && e.sigueJuntos===false) put("conexiones",{...c, disuelto:true, actualizado:now()});
      maybeRetrain(); close(); render(); toast("¡Gracias! Te volveremos a preguntar en dos semanas.");
    };
  });
}

/* ---------- Mi perfil y planes ---------- */
function vPerfil(){
  const m=me(), a=DM.ARQ[arqOf(m)];
  return `${nav()}<div class="page"><div class="wrap stack" style="gap:24px;max-width:860px">
    <div class="row" style="gap:16px">${avatar(m,"lg")}<div class="stack" style="gap:2px"><h2>${esc(m.nombre)}</h2><p class="muted">${[m.carrera,m.universidad,m.ciudad].filter(Boolean).map(esc).join(" · ")}</p></div></div>
    <div class="card" style="border:2px solid var(--ink);box-shadow:6px 6px 0 ${a.color}">
      <div class="arq-head">${DM.ARQ_SVG(arqOf(m),132)}<div class="stack" style="gap:6px"><span class="kicker">Tu arquetipo</span><h3 style="font-size:1.6rem">${esc(a.n)}</h3><p class="muted">${esc(a.d)}</p></div></div>
      ${refsHTML(arqOf(m))}
      <div class="tags"><span class="tag time">${m.horas} h/semana · ${m.dedicacion==="completa"?"completa":"parcial"}</span><span class="tag">Cubro: ${DM.ROLES[m.role]}</span><span class="tag">Busco: ${DM.ROLES[m.seeks]}</span>${(m.skills||[]).map(s=>`<span class="tag">${esc(s)}</span>`).join("")}</div>
      <div class="row"><button class="btn sm" id="edit">Editar mis respuestas</button><button class="btn sm" id="share">Compartir mi arquetipo</button></div>
    </div>
    <form class="card" id="cf" novalidate><h3>Tu foto y tus datos de contacto</h3>
      ${photoField(m.foto)}
      <p class="note">El correo y el WhatsApp solo los ve quien forme equipo contigo. Tu foto la ven todos.</p>
      <div class="grid2"><label class="field" for="cEmail">Correo<input type="email" id="cEmail" value="${esc(m.email)}" disabled></label>
      <label class="field" for="cWa">WhatsApp<input type="text" id="cWa" maxlength="18" inputmode="tel" value="${esc(m.whatsapp||"")}" placeholder="+57 300 000 0000"></label></div>
      <p class="err" id="cerr"></p><div class="row"><button class="btn sm" type="submit">Guardar</button></div></form>
    <section class="stack"><h3>Tu plan</h3>
      <div class="plans">
        <div class="plan"><h3>Gratis</h3><div class="price">$0</div><ul><li>Tu perfil y tu arquetipo</li><li>6 matches con explicación</li><li>Solicitudes y seguimiento de tu equipo</li></ul>
          <button class="btn sm" id="pfree" ${m.plan==="gratis"?"disabled":""}>${m.plan==="gratis"?"Tu plan actual":"Seguir gratis"}</button></div>
        <div class="plan pro"><h3>Premium</h3><div class="price num">${DM.money(m.precio)}<small> COP/mes</small></div><ul><li>Matches ilimitados</li><li>Filtros por rol, ciudad y disponibilidad</li><li>Reporte completo de fortalezas y fricciones</li><li>Destacar tu perfil ante otros</li></ul>
          <button class="btn primary sm" id="ppro" ${m.plan==="premium"?"disabled":""}>${m.plan==="premium"?"Tu plan actual":"Pasar a premium"}</button></div>
      </div>
      <p class="note">Prototipo: no se hace ningún cobro y las funciones premium están abiertas durante el piloto. Si tu universidad tiene licencia, premium es gratis para ti.</p>
      <div class="card soft ${m.plan==="gratis"&&!m.motivoNoPago?"":"hidden"}"><label class="field" for="motivo">¿Qué tendría que pasar para que pagaras premium?<textarea id="motivo" maxlength="400"></textarea></label><div class="row"><button class="btn dark sm" id="smotivo">Enviar</button></div></div>
    </section>
    <section class="card"><h3>Tus datos</h3><p class="muted">Puedes borrar tu cuenta y todas tus respuestas cuando quieras.</p>
      <div class="row"><button class="btn sm" data-act="logout">Cerrar sesión</button><button class="btn link" id="delask">Eliminar mi cuenta</button></div>
      <div class="hidden stack" id="delbox"><p><b>¿Seguro?</b> Se borran tu perfil, tus conexiones y tus encuestas.</p><div class="row"><button class="btn primary sm" id="delyes">Sí, eliminar</button><button class="btn link" id="delno">Cancelar</button></div></div>
    </section>
  </div></div>`;
}
function bindPerfil(){
  const m=me();
  $("#edit").onclick = () => startOnboarding();
  $("#share").onclick = () => copy(shareText(m), "Texto copiado. Pégalo en WhatsApp o en tus redes.");
  bindPhoto(d => { put("perfiles",{...me(), foto:d}); toast("Foto actualizada."); render(); });
  if($("#fdel")) $("#fdel").onclick = () => { put("perfiles",{...me(), foto:null}); toast("Quitamos tu foto."); render(); };
  $("#cf").onsubmit = e => { e.preventDefault(); const wa=$("#cWa").value.trim(); if(!okPhone(wa)) return $("#cerr").textContent="Usa solo números, espacios o el signo +."; put("perfiles",{...me(), whatsapp:wa}); toast("Datos de contacto guardados."); render(); };
  $("#ppro").onclick = () => { put("perfiles",{...m, plan:"premium", planElegido:now()}); render(); toast("Elegiste premium. En el prototipo no se cobra nada."); };
  $("#pfree").onclick = () => { put("perfiles",{...m, plan:"gratis", planElegido:now()}); render(); };
  if($("#smotivo")) $("#smotivo").onclick = () => { put("perfiles",{...me(), motivoNoPago:$("#motivo").value.trim()||"(sin respuesta)"}); render(); toast("Gracias por contarnos."); };
  $("#delask").onclick = () => $("#delbox").classList.remove("hidden");
  $("#delno").onclick = () => $("#delbox").classList.add("hidden");
  $("#delyes").onclick = async () => {
    const id=m.id;
    for(const c of DATA.conexiones.filter(c=>c.de===id||c.para===id)) await del("conexiones",c.id);
    for(const e of DATA.encuestas.filter(e=>e.perfil===id)) await del("encuestas",e.id);
    await del("perfiles",id); setMe(null); go("landing"); toast("Tu cuenta fue eliminada.");
  };
}

/* ---------- Render ---------- */
const LOGGED = ["matches","solicitudes","equipo","perfil","arquetipo"];
function render(){
  if(location.hash==="#admin") return;
  const root = $("#root"), m = me();
  if(m && !m.completo && view!=="onboarding" && !onb){ startOnboarding(); return; }
  if(LOGGED.includes(view) && !(m&&m.completo)) view = "landing";
  if(view==="onboarding" && !onb) view = m&&m.completo ? "matches" : "landing";
  const V = {landing:[vLanding], registro:[vRegistro,bindRegistro], entrar:[vEntrar,bindEntrar], onboarding:[vOnboarding,bindOnboarding], arquetipo:[vArquetipo,bindArquetipo], matches:[vMatches,bindMatches], solicitudes:[vSolicitudes,bindSolicitudes], equipo:[vEquipo,bindEquipo], perfil:[vPerfil,bindPerfil]}[view];
  root.innerHTML = V[0]();
  bindCommon(); if(V[1]) V[1]();
}
/* Al llegar datos nuevos solo se repinta donde no hay un formulario a medio llenar */
function onData(){
  if(location.hash==="#admin") return;
  const busy = dialog || ["registro","entrar","onboarding"].includes(view) || document.activeElement?.matches?.("input,textarea,select");
  if(!busy) render(); else renderSaveState();
}

window.App = {
  show(){ render(); },
  async start(){
    if(meId) view = "matches";
    render();
    ENV = await DM.connect();
    const finish = async () => { ready=true; if(meId && !me()) setMe(null);
      if(!meId && AUTH){ const em = await AUTH.email(); const p = em && DATA.perfiles.find(x=>x.email===em); if(p) setMe(p.id); } if(me()&&me().completo&&view==="landing") view="matches"; render(); };
    if(ENV.db){
      let pending = 4; const first = () => { if(--pending===0) finish(); };
      ["perfiles","conexiones","encuestas"].forEach(c=>{ let f=true; DM.listen(ENV.db,c,docs=>{ if(docs) DATA[c]=docs; if(f){f=false;first();} else onData(); }); });
      let f=true; DM.listen(ENV.db,"modelo",docs=>{ if(docs) DATA.modelo = docs.find(d=>d.id==="actual")||null; if(f){f=false;first();} else onData(); });
    } else await finish();
  }
};
})();
