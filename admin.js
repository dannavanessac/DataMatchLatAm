/* DataMatch LatAm · vista de administrador (lee la misma base de datos que la app) */
(function(){
const {esc} = DM;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let ENV = {}, D = {perfiles:[], conexiones:[], encuestas:[], modelo:null}, sec = "resumen", q = "", loaded = false, downloads = null;
const SECS = {resumen:"Resumen", perfiles:"Perfiles", conexiones:"Matches y equipos", encuestas:"Satisfacción", modelo:"Modelo de matching", exportar:"Exportar datos"};

const avg = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : null;
const pct = (a,b) => b ? Math.round(100*a/b) : null;
const f1 = v => v===null||v===undefined ? "–" : (Math.round(v*10)/10).toLocaleString("es-CO");
const pill = (v, goal, inv) => v===null||v===undefined ? `<span class="pill na">Sin datos</span>` : ((inv? v<=goal : v>=goal) ? `<span class="pill ok">Cumple la meta</span>` : `<span class="pill no">Bajo la meta</span>`);
const profileById = id => D.perfiles.find(p=>p.id===id) || DM.EJEMPLOS.find(p=>p.id===id);
const nameOf = id => profileById(id)?.nombre || "Eliminado";
const NOPRO = k => !DM.IMPORTANCIA.find(i=>i.k===k)?.pro;
const model = () => D.modelo || DM.initialModel();

function metrics(){
  const P=D.perfiles, C=D.conexiones, E=D.encuestas;
  const comp = P.filter(p=>p.completo);
  const times = comp.map(p=>(new Date(p.cuestionarioFin)-new Date(p.cuestionarioInicio))/60000).filter(t=>t>0&&t<120);
  const imp = P.filter(p=>(p.importancia||[]).length);
  const actors = new Set(C.filter(c=>c.ajuste||c.estado!=="ninguna").map(c=>c.de));
  const solicit = new Set(C.filter(c=>c.estado!=="ninguna").map(c=>c.de));
  const realPairs = C.filter(c=>!c.paraEjemplo && !c.deEjemplo && c.estado!=="ninguna");
  const acc = realPairs.filter(c=>c.estado==="aceptada").length;
  const resp = realPairs.filter(c=>c.estado==="aceptada"||c.estado==="rechazada").length;
  const teams = C.filter(c=>c.estado==="aceptada");
  const teamsReal = teams.filter(c=>!c.paraEjemplo && !c.deEjemplo);
  const eq = E.filter(e=>e.tipo==="equipo"), npsv = E.filter(e=>e.nps!==null&&e.nps!==undefined).map(e=>e.nps);
  const nps = npsv.length ? Math.round(100*(npsv.filter(v=>v>=9).length - npsv.filter(v=>v<=6).length)/npsv.length) : null;
  const rated = C.filter(c=>c.ajuste);
  const withPlan = P.filter(p=>p.plan);
  const surveyed = new Set(eq.map(e=>e.perfil));
  const teamMembers = new Set(teams.flatMap(c=>[c.de,c.para]));
  return {
    registrados:P.length, nuevos7:P.filter(p=>Date.now()-new Date(p.creado)<7*864e5).length,
    completos:comp.length, pctComp:pct(comp.length,P.length), tiempo:avg(times),
    pctImp:pct(imp.filter(p=>p.importancia.filter(NOPRO).length>=3).length, imp.length),
    pctSolic:pct(comp.filter(p=>solicit.has(p.id)).length, comp.length),
    aceptacion:pct(acc,resp), equipos:teams.length, equiposReal:teamsReal.length,
    socio:avg(eq.map(e=>e.satisfaccionSocio).filter(Boolean)), app:avg(E.map(e=>e.satisfaccionApp).filter(Boolean)), nps, nNps:npsv.length,
    ajuste:avg(rated.map(c=>c.ajuste)), rAjuste:DM.pearson(rated.map(c=>c.score), rated.map(c=>c.ajuste)), nRated:rated.length,
    premium:pct(withPlan.filter(p=>p.plan==="premium").length, withPlan.length),
    referidos:P.filter(p=>p.referidoPor).length, pctRef:pct(P.filter(p=>p.referidoPor).length,P.length),
    conMensaje:pct(C.filter(c=>c.de&&!c.deEjemplo&&c.estado!=="ninguna"&&c.mensaje).length, C.filter(c=>!c.deEjemplo&&c.estado!=="ninguna").length),
    funnel:[["Se registraron",P.length],["Completaron su perfil",comp.length],["Calificaron o pidieron un match",comp.filter(p=>actors.has(p.id)).length],["Formaron equipo",comp.filter(p=>teamMembers.has(p.id)).length],["Enviaron seguimiento",comp.filter(p=>surveyed.has(p.id)).length]]
  };
}
const kpi = (v,t,goal,status="") => `<div class="kpi"><span class="v">${v}</span><span class="t">${t}</span>${goal?`<span class="g">${/^[≥≤]/.test(goal)?"Meta: ":""}${goal}</span>`:""}${status}</div>`;

function signupsChart(){
  const days = Array.from({length:14},(_,i)=>{ const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-13+i); return d; });
  const counts = days.map(d=>D.perfiles.filter(p=>{ const c=new Date(p.creado); c.setHours(0,0,0,0); return +c===+d; }).length);
  const max = Math.max(1,...counts), W=560, H=180, bw=W/14;
  const top = Math.max(2, Math.ceil(max/2)*2);
  return `<svg viewBox="0 0 ${W} ${H+28}" role="img" aria-label="Registros por día en los últimos 14 días">
    <line x1="0" x2="${W}" y1="${H}" y2="${H}" stroke="#E6E3F1"/>
    <line x1="0" x2="${W}" y1="${H/2}" y2="${H/2}" stroke="#E6E3F1" stroke-dasharray="3 4"/>
    <text x="0" y="${H/2-4}" font-size="11" fill="#8A88A6">${top/2}</text><text x="0" y="12" font-size="11" fill="#8A88A6">${top}</text>
    ${counts.map((c,i)=>{ const h=c/top*H; return `<rect x="${i*bw+6}" y="${H-h}" width="${bw-12}" height="${h}" rx="5" fill="${i===13?"#FF5B3A":"#17153B"}"><title>${days[i].toLocaleDateString("es-CO")}: ${c}</title></rect>${c?`<text x="${i*bw+bw/2}" y="${H-h-5}" font-size="11" text-anchor="middle" fill="#17153B" font-weight="700">${c}</text>`:""}`; }).join("")}
    ${days.map((d,i)=> i%2===1||i===13 ? `<text x="${i*bw+bw/2}" y="${H+18}" font-size="11" text-anchor="middle" fill="#4B4970">${d.getDate()}/${d.getMonth()+1}</text>`:"").join("")}
  </svg>`;
}

function arqPanel(){
  const comp = D.perfiles.filter(p=>p.completo); const n=comp.length;
  const rows = Object.entries(DM.ARQ).map(([k,a])=>[a,comp.filter(p=>(p.arquetipo||DM.arquetipo(p))===k).length]);
  const max = Math.max(1,...rows.map(r=>r[1]));
  return n ? `<div class="funnel">${rows.map(([a,v])=>`<div class="f"><span>${esc(a.n)}</span><div class="track"><div class="fill" style="width:${v/max*100}%;background:${a.color}"></div></div><span class="v">${v} · ${pct(v,n)}%</span></div>`).join("")}</div>` : `<p class="note">Aparecerán cuando los usuarios completen su perfil.</p>`;
}
function refPanel(){
  const cnt = {}; D.perfiles.forEach(p=>{ if(p.referidoPor) cnt[p.referidoPor]=(cnt[p.referidoPor]||0)+1; });
  const top = Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,5);
  return top.length ? `<div class="tablewrap"><table><thead><tr><th>Usuario</th><th class="r">Invitados registrados</th></tr></thead><tbody>${top.map(([id,v])=>`<tr><td>${esc(nameOf(id))}</td><td class="r">${v}</td></tr>`).join("")}</tbody></table></div>` : `<p class="note">Nadie se ha registrado todavía con un enlace de invitación. Cada usuario tiene el suyo en Mi equipo.</p>`;
}
function vResumen(){
  const m = metrics(), mo = model();
  const fmax = Math.max(1, m.funnel[0][1]);
  const byVar = ["explicado","porcentaje"].map(v=>{
    const ps = D.perfiles.filter(p=>p.completo && p.variante===v), ids=new Set(ps.map(p=>p.id));
    const cs = D.conexiones.filter(c=>ids.has(c.de));
    return {v, n:ps.length, ajuste:avg(cs.map(c=>c.ajuste).filter(Boolean)), solic:pct(ps.filter(p=>cs.some(c=>c.de===p.id&&c.estado!=="ninguna")).length, ps.length), vio:v==="porcentaje"?pct(ps.filter(p=>cs.some(c=>c.de===p.id&&c.vioExplicacion)).length, ps.length):null};
  });
  const byPrice = DM.PRICES.map(p=>{ const g=D.perfiles.filter(x=>x.plan&&x.precio===p); return {p,n:g.length,pro:g.filter(x=>x.plan==="premium").length}; });
  return `
  <div class="kpis">
    ${kpi(m.registrados,"Usuarios registrados","",`<span class="pill na">+${m.nuevos7} en 7 días</span>`)}
    ${kpi(m.pctComp===null?"–":m.pctComp+" %","Completan el perfil","≥ 80 %",pill(m.pctComp,80))}
    ${kpi(m.tiempo===null?"–":f1(m.tiempo)+" min","Tiempo del cuestionario","≤ 8 min",pill(m.tiempo,8,true))}
    ${kpi(m.pctImp===null?"–":m.pctImp+" %","Valoran 3+ dimensiones no profesionales","≥ 60 %",pill(m.pctImp,60))}
    ${kpi(m.pctSolic===null?"–":m.pctSolic+" %","Piden conectar con un match","≥ 60 %",pill(m.pctSolic,60))}
    ${kpi(m.aceptacion===null?"–":m.aceptacion+" %","Solicitudes aceptadas (perfiles reales)")}
    ${kpi(m.equiposReal,"Equipos formados",`${m.equipos-m.equiposReal} más con perfiles de ejemplo`)}
    ${kpi(m.nps===null?"–":m.nps,"NPS",`${m.nNps} respuestas`, m.nps===null?"":`<span class="pill ${m.nps>0?"ok":"no"}">${m.nps>0?"Positivo":"Negativo"}</span>`)}
    ${kpi(m.socio===null?"–":f1(m.socio)+" / 5","Satisfacción con el socio")}
    ${kpi(m.app===null?"–":f1(m.app)+" / 5","Satisfacción con la app")}
    ${kpi(m.ajuste===null?"–":f1(m.ajuste)+" / 5","Calificación de los matches",`${m.nRated} calificaciones`)}
    ${kpi(m.premium===null?"–":m.premium+" %","Eligen premium")}
    ${kpi(m.referidos,"Llegaron por invitación",m.pctRef===null?"":`${m.pctRef} % de los registros`)}
  </div>
  <div class="cols2">
    <div class="panel"><h3>Embudo de usuarios</h3><div class="funnel">${m.funnel.map(([t,v])=>`<div class="f"><span>${t}</span><div class="track"><div class="fill" style="width:${v/fmax*100}%"></div></div><span class="v">${v}${m.funnel[0][1]?` · ${pct(v,m.funnel[0][1])}%`:""}</span></div>`).join("")}</div></div>
    <div class="panel chart"><h3>Registros por día, últimos 14 días</h3>${signupsChart()}</div>
  </div>
  <div class="cols2">
    <div class="panel"><h3>Prueba A/B: explicación del match</h3>
      <div class="tablewrap"><table><thead><tr><th>Variante</th><th class="r">Usuarios</th><th class="r">Calificación</th><th class="r">Piden conectar</th><th class="r">Abrieron el porqué</th></tr></thead>
      <tbody>${byVar.map(b=>`<tr><td>${b.v==="explicado"?"Explicación visible":"Solo puntaje"}</td><td class="r">${b.n}</td><td class="r">${f1(b.ajuste)}</td><td class="r">${b.solic===null?"–":b.solic+" %"}</td><td class="r">${b.v==="porcentaje"?(b.vio===null?"–":b.vio+" %"):"No aplica"}</td></tr>`).join("")}</tbody></table></div></div>
    <div class="panel"><h3>Prueba de precio del plan premium</h3>
      <div class="tablewrap"><table><thead><tr><th class="r">Precio al mes</th><th class="r">Eligieron plan</th><th class="r">Premium</th><th class="r">Conversión</th></tr></thead>
      <tbody>${byPrice.map(b=>`<tr><td class="r">${DM.money(b.p)}</td><td class="r">${b.n}</td><td class="r">${b.pro}</td><td class="r">${b.n?pct(b.pro,b.n)+" %":"–"}</td></tr>`).join("")}</tbody></table></div></div>
  </div>
  <div class="cols2">
    <div class="panel"><h3>Arquetipos de los usuarios</h3>${arqPanel()}</div>
    <div class="panel"><h3>Quiénes traen más usuarios</h3>${refPanel()}</div>
  </div>
  <div class="panel"><h3>Modelo de matching</h3><p class="muted">Versión ${mo.version}, entrenada con ${mo.n} señales${mo.entrenadoEn?` el ${DM.fmtDate(mo.entrenadoEn)}`:""}. Correlación entre puntaje y calificación de los usuarios: <b>${m.rAjuste===null?"sin datos suficientes":m.rAjuste}</b>.</p><div class="row"><button class="btn sm" data-sec="modelo">Ver el modelo</button></div></div>`;
}

function vPerfiles(){
  const rows = D.perfiles.filter(p=>!q || [p.nombre,p.email,p.carrera,p.universidad,p.ciudad].join(" ").toLowerCase().includes(q.toLowerCase())).sort((a,b)=>String(b.creado).localeCompare(String(a.creado)));
  return `<div class="row"><input type="search" id="q" placeholder="Buscar por nombre, correo, carrera o universidad" value="${esc(q)}" style="max-width:420px" aria-label="Buscar perfiles"><span class="note">${rows.length} de ${D.perfiles.length} perfiles</span></div>
  <div class="tablewrap"><table><thead><tr><th>Nombre</th><th>Correo</th><th>Carrera</th><th>Universidad</th><th>Ciudad</th><th>Arquetipo</th><th>Cubre</th><th>Busca</th><th class="r">Horas</th><th>Perfil</th><th>Variante</th><th>Plan</th><th class="r">Precio</th><th class="r">Conexiones</th><th>Invitado por</th><th>Registro</th></tr></thead>
  <tbody>${rows.length?rows.map(p=>`<tr class="click" data-p="${p.id}" tabindex="0"><td><b>${esc(p.nombre)}</b></td><td>${esc(p.email)}</td><td>${esc(p.carrera||"–")}</td><td>${esc(p.universidad||"–")}</td><td>${esc(p.ciudad||"–")}</td><td>${p.completo?esc(DM.ARQ[p.arquetipo||DM.arquetipo(p)].n):"–"}</td><td>${p.role?DM.ROLES[p.role]:"–"}</td><td>${p.seeks?DM.ROLES[p.seeks]:"–"}</td><td class="r">${p.completo?p.horas:"–"}</td><td>${p.completo?`<span class="pill ok">Completo</span>`:`<span class="pill no">Incompleto</span>`}</td><td>${p.variante==="explicado"?"Explicación":"Solo puntaje"}</td><td>${p.plan||"–"}</td><td class="r">${DM.money(p.precio)}</td><td class="r">${D.conexiones.filter(c=>c.de===p.id||c.para===p.id).length}</td><td>${p.referidoPor?esc(nameOf(p.referidoPor)):"–"}</td><td>${DM.fmtDate(p.creado)}</td></tr>`).join(""):`<tr><td colspan="16">Todavía no hay perfiles. Crea una cuenta en la app para ver el primero aquí.</td></tr>`}</tbody></table></div>`;
}
function drawer(id){
  const p = D.perfiles.find(x=>x.id===id); if(!p) return;
  const cs = D.conexiones.filter(c=>c.de===id||c.para===id), es = D.encuestas.filter(e=>e.perfil===id);
  const el = document.createElement("aside"); el.className="drawer"; el.setAttribute("aria-label","Detalle del perfil");
  el.innerHTML = `<div class="row" style="justify-content:space-between"><div class="row">${p.foto?`<img class="av lg" src="${esc(p.foto)}" alt="">`:`<span class="av lg" style="background:${DM.avatarColor(p.id)}">${esc(DM.initials(p.nombre))}</span>`}<div><h3>${esc(p.nombre)}</h3><p class="note">${esc(p.email)}</p></div></div><button class="btn sm" id="dx">Cerrar</button></div>
  <dl class="kv">
    <dt>Arquetipo</dt><dd>${p.completo?esc(DM.ARQ[p.arquetipo||DM.arquetipo(p)].n):"–"}</dd><dt>Contraseña</dt><dd>${p.auth||p.passHash?"Configurada":"Sin contraseña (cuenta anterior)"}</dd><dt>WhatsApp</dt><dd>${esc(p.whatsapp||"–")}</dd><dt>Invitado por</dt><dd>${p.referidoPor?esc(nameOf(p.referidoPor)):"–"}</dd><dt>Carrera</dt><dd>${esc(p.carrera||"–")} · ${esc(p.universidad||"")}</dd><dt>Ciudad</dt><dd>${esc(p.ciudad||"–")}</dd>
    <dt>Habilidades</dt><dd>${esc((p.skills||[]).join(", ")||"–")}</dd><dt>Cubre / busca</dt><dd>${p.role?DM.ROLES[p.role]:"–"} / ${p.seeks?DM.ROLES[p.seeks]:"–"}</dd>
    <dt>Le importa</dt><dd>${esc((p.importancia||[]).map(k=>DM.IMPORTANCIA.find(i=>i.k===k)?.t).join(", ")||"–")}</dd>
    <dt>Estilo</dt><dd>Apertura ${p.apertura??"–"} · Organización ${p.organizacion??"–"} · Decisión ${p.decision??"–"} · ${esc(DM.CONF[p.conflicto]||"–")} · ${p.comunicacion||"–"}</dd>
    <dt>Motivación</dt><dd>${esc((p.motivaciones||[]).map(k=>DM.MOTIV[k]).join(", ")||"–")} · ${esc(DM.AMB[p.ambicion]||"")} · ${esc(DM.HOR[p.horizonte]||"")}</dd>
    <dt>Valores</dt><dd>${esc((p.valores||[]).map(k=>DM.VALORES[k]).join(", ")||"–")}</dd>
    <dt>Riesgo</dt><dd>${p.riesgo??"–"} · ${p.escenario==="proyecto"?"se la juega por el proyecto":p.escenario==="estable"?"prefiere el trabajo estable":"–"}</dd>
    <dt>Tiempo</dt><dd>${p.completo?`${p.horas} h/semana · ${p.dedicacion}`:"–"}</dd>
    <dt>Plan</dt><dd>${p.plan||"Sin elegir"} · precio de prueba ${DM.money(p.precio)}${p.motivoNoPago?` · “${esc(p.motivoNoPago)}”`:""}</dd>
  </dl>
  <h3>Conexiones (${cs.length})</h3>
  <div class="tablewrap"><table><thead><tr><th>Con</th><th class="r">Puntaje</th><th class="r">Calif.</th><th>Estado</th></tr></thead><tbody>${cs.map(c=>`<tr><td>${esc(nameOf(c.de===id?c.para:c.de))}${c.paraEjemplo?" (ejemplo)":""}</td><td class="r">${c.score}</td><td class="r">${c.ajuste||"–"}</td><td>${c.estado}</td></tr>`).join("")||`<tr><td colspan="4">Sin conexiones</td></tr>`}</tbody></table></div>
  <h3>Encuestas (${es.length})</h3>
  ${es.map(e=>`<div class="card soft" style="padding:14px;gap:6px"><b>${e.tipo==="app"?"Sobre la app":"Seguimiento de equipo"} · ${DM.fmtDate(e.creado)}</b><span class="note">${e.tipo==="equipo"?`${esc(DM.ETAPAS[e.etapa]||"")} · socio ${e.satisfaccionSocio}/5 · ${e.sigueJuntos?"siguen juntos":"se separaron"} · `:""}app ${e.satisfaccionApp}/5 · NPS ${e.nps}</span>${e.comentario?`<span>“${esc(e.comentario)}”</span>`:""}</div>`).join("")||`<p class="note">Sin encuestas</p>`}`;
  document.body.appendChild(el);
  $("#dx").onclick = () => el.remove(); $("#dx").focus();
  el.addEventListener("keydown", e => { if(e.key==="Escape") el.remove(); });
}

function vConexiones(){
  const rows = D.conexiones.slice().sort((a,b)=>String(b.actualizado||b.creado).localeCompare(String(a.actualizado||a.creado)));
  const st = {ninguna:"Solo calificó",pendiente:"Pendiente",aceptada:"Equipo",rechazada:"Rechazada"};
  return `<p class="muted">Cada fila es un par visto por un usuario. Las 6 similitudes son las variables con las que se reentrena el modelo.</p>
  <div class="tablewrap"><table><thead><tr><th>De</th><th>Para</th><th class="r">Puntaje</th><th class="r">Calif.</th><th>Estado</th>${DM.DIMS.map(k=>`<th class="r" title="${DM.DIM_LABEL[k]}">${k}</th>`).join("")}<th class="r">Modelo</th><th>Fecha</th><th>Mensaje</th></tr></thead>
  <tbody>${rows.length?rows.map(c=>`<tr><td>${esc(nameOf(c.de))}${c.deEjemplo?' <span class="pill na">ejemplo</span>':""}</td><td>${esc(nameOf(c.para))}${c.paraEjemplo?' <span class="pill na">ejemplo</span>':""}</td><td class="r">${c.score}</td><td class="r">${c.ajuste||"–"}</td><td>${st[c.estado]||c.estado}${c.respuestaSimulada?" (simulada)":""}${c.disuelto?" · disuelto":""}</td>${DM.DIMS.map(k=>`<td class="r">${Math.round((c.d?.[k]||0)*100)}</td>`).join("")}<td class="r">v${c.modeloVersion??0}</td><td>${DM.fmtDate(c.actualizado||c.creado)}</td><td class="wrap">${esc(c.mensaje||"")}</td></tr>`).join(""):`<tr><td colspan="15">Todavía no hay matches calificados ni solicitudes.</td></tr>`}</tbody></table></div>
  <p class="note">M motivaciones y visión · P estilo de trabajo · V valores · R riesgo · T tiempo y compromiso · H habilidades complementarias.</p>`;
}

function vEncuestas(){
  const E = D.encuestas.slice().sort((a,b)=>b.creado.localeCompare(a.creado)), eq=E.filter(e=>e.tipo==="equipo"), m=metrics();
  const etapas = Object.keys(DM.ETAPAS).map(k=>[DM.ETAPAS[k], eq.filter(e=>e.etapa===k).length]);
  const emax = Math.max(1,...etapas.map(x=>x[1]));
  return `<div class="kpis">
    ${kpi(E.length,"Encuestas recibidas",`${eq.length} de equipos · ${E.length-eq.length} sobre la app`)}
    ${kpi(m.socio===null?"–":f1(m.socio)+" / 5","Satisfacción con el socio")}
    ${kpi(m.app===null?"–":f1(m.app)+" / 5","Satisfacción con la app")}
    ${kpi(m.nps===null?"–":m.nps,"NPS","Promotores (9–10) menos detractores (0–6)")}
    ${kpi(eq.length?pct(eq.filter(e=>e.sigueJuntos).length,eq.length)+" %":"–","Equipos que siguen juntos")}
  </div>
  <div class="panel"><h3>¿En qué etapa están los equipos?</h3><div class="funnel">${etapas.map(([t,v])=>`<div class="f"><span>${t}</span><div class="track"><div class="fill" style="width:${v/emax*100}%"></div></div><span class="v">${v}</span></div>`).join("")}</div></div>
  <div class="tablewrap"><table><thead><tr><th>Fecha</th><th>Usuario</th><th>Tipo</th><th>Con</th><th>Etapa</th><th class="r">Socio</th><th>¿Juntos?</th><th class="r">App</th><th class="r">NPS</th><th>Comentario</th></tr></thead>
  <tbody>${E.length?E.map(e=>{ const c=D.conexiones.find(x=>x.id===e.conexion); const other=c?(c.de===e.perfil?c.para:c.de):null; return `<tr><td>${DM.fmtDate(e.creado)}</td><td>${esc(nameOf(e.perfil))}</td><td>${e.tipo==="app"?"App":"Equipo"}</td><td>${other?esc(nameOf(other)):"–"}</td><td>${esc(DM.ETAPAS[e.etapa]||"–")}</td><td class="r">${e.satisfaccionSocio??"–"}</td><td>${e.tipo==="equipo"?(e.sigueJuntos?"Sí":"No"):"–"}</td><td class="r">${e.satisfaccionApp??"–"}</td><td class="r">${e.nps??"–"}</td><td class="wrap">${esc(e.comentario||"")}</td></tr>`; }).join(""):`<tr><td colspan="10">Todavía no hay encuestas.</td></tr>`}</tbody></table></div>`;
}

function weightsChart(h){
  const W=640, H=220, L=36, R=86, n=h.length;
  const colors = {M:"#FF5B3A",P:"#17153B",V:"#14A37E",R:"#F2A900",T:"#5B5FEF",H:"#E0457B"};
  const maxW = Math.max(.3, ...h.flatMap(x=>DM.DIMS.map(k=>x.pesos[k])));
  const top = Math.ceil(maxW*20)/20;
  const xs = i => n<=1 ? L+(W-L-R)/2 : L + i*(W-L-R)/(n-1);
  const ys = v => 10 + (H-20)*(1-v/top);
  const grid = [0, top/2, top].map(v=>`<line x1="${L}" x2="${W-R}" y1="${ys(v)}" y2="${ys(v)}" stroke="#E6E3F1"/><text x="${L-6}" y="${ys(v)+4}" font-size="11" text-anchor="end" fill="#8A88A6">${Math.round(v*100)}%</text>`).join("");
  const lines = DM.DIMS.map(k=>{ const pts=h.map((x,i)=>`${xs(i)},${ys(x.pesos[k])}`).join(" "); const last=h[n-1].pesos[k];
    return `<polyline points="${pts}" fill="none" stroke="${colors[k]}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="${xs(n-1)}" cy="${ys(last)}" r="4" fill="${colors[k]}"/>`; }).join("");
  // etiquetas finales separadas para que no se solapen
  const ends = DM.DIMS.map(k=>({k, y:ys(h[n-1].pesos[k]), v:h[n-1].pesos[k]})).sort((a,b)=>a.y-b.y);
  for(let i=1;i<ends.length;i++) if(ends[i].y-ends[i-1].y<14) ends[i].y=ends[i-1].y+14;
  const labels = ends.map(e=>`<text x="${W-R+10}" y="${e.y+4}" font-size="11.5" font-weight="700" fill="${colors[e.k]}">${e.k} ${Math.round(e.v*100)}%</text>`).join("");
  const xl = h.map((x,i)=> (n<=8 || i%Math.ceil(n/8)===0 || i===n-1) ? `<text x="${xs(i)}" y="${H+16}" font-size="11" text-anchor="middle" fill="#4B4970">v${x.version}</text>`:"").join("");
  return `<svg viewBox="0 0 ${W} ${H+24}" role="img" aria-label="Evolución de los pesos del modelo por versión">${grid}${lines}${labels}${xl}</svg>
  <div class="legend">${DM.DIMS.map(k=>`<span><i style="background:${colors[k]}"></i>${k} · ${DM.DIM_LABEL[k]}</span>`).join("")}</div>`;
}
function vModelo(){
  const mo = model(), ex = DM.examples(D.conexiones, D.encuestas);
  const src = {}; ex.forEach(e=>src[e.src]=(src[e.src]||0)+1);
  const pending = ex.length - (mo.n||0);
  const h = mo.historial && mo.historial.length ? mo.historial : DM.initialModel().historial;
  return `<div class="kpis">
    ${kpi("v"+mo.version,"Versión en uso",mo.entrenadoEn?`Entrenada el ${new Date(mo.entrenadoEn).toLocaleString("es-CO")}`:"Pesos iniciales del Taller 4")}
    ${kpi(mo.n,"Señales usadas",`${Math.max(0,pending)} nuevas desde el último entrenamiento`)}
    ${kpi(mo.mae===null?"–":f1(mo.mae*100)+" pts","Error medio del modelo","Diferencia promedio entre puntaje y satisfacción observada (0–100)")}
    ${kpi(mo.r===null?"–":mo.r,"Correlación","Puntaje vs. satisfacción observada")}
  </div>
  <div class="cols2">
    <div class="panel"><h3>Pesos actuales frente a los iniciales</h3>
      <div class="wbars">${DM.DIMS.map(k=>`<div class="wbar"><span>${DM.DIM_LABEL[k]}</span><div class="track"><div class="fill" style="width:${mo.pesos[k]/.4*100}%"></div><div class="mark" style="left:${DM.W0[k]/.4*100}%" title="Peso inicial ${Math.round(DM.W0[k]*100)}%"></div></div><span class="v">${Math.round(mo.pesos[k]*1000)/10}%</span></div>`).join("")}</div>
      <div class="legend"><span><i style="background:#FF5B3A"></i>Peso actual</span><span><i style="background:#17153B;width:3px"></i>Peso inicial (Taller 4)</span></div>
      <div class="row"><button class="btn primary sm" id="retrain" ${ex.length?"":"disabled"}>Reentrenar ahora</button><button class="btn sm" id="reset">Volver a los pesos iniciales</button><span class="note" id="rmsg"></span></div>
    </div>
    <div class="panel"><h3>Cómo aprende</h3>
      <p class="muted">Cada par que alguien ve guarda sus 6 similitudes. Las señales de lo que hacen las personas enseñan al modelo qué pesa más:</p>
      <div class="tablewrap"><table><thead><tr><th>Señal</th><th class="r">Valor</th><th class="r">Peso</th><th class="r">Hoy</th></tr></thead><tbody>
        <tr><td>Calificación del match (1–5)</td><td class="r">0 a 1</td><td class="r">1</td><td class="r">${src["calificación"]||0}</td></tr>
        <tr><td>Solicitud aceptada</td><td class="r">0,75</td><td class="r">0,5</td><td class="r">${src["aceptada"]||0}</td></tr>
        <tr><td>Solicitud rechazada</td><td class="r">0,2</td><td class="r">0,5</td><td class="r">${src["rechazada"]||0}</td></tr>
        <tr><td>Satisfacción con el socio (encuesta)</td><td class="r">0 a 1</td><td class="r">2</td><td class="r">${src["encuesta de equipo"]||0}</td></tr>
        <tr><td>Equipo disuelto</td><td class="r">0,1</td><td class="r">1</td><td class="r">${src["equipo disuelto"]||0}</td></tr>
      </tbody></table></div>
      <p class="note">Método: regresión ridge con prior en los pesos iniciales (λ = ${DM.LAMBDA}), equivalente a un modelo bayesiano con prior normal. Con pocos datos el modelo se queda cerca de los pesos del Taller 4. Se reentrena solo cada ${DM.RETRAIN_EVERY} señales nuevas.</p>
    </div>
  </div>
  <div class="panel chart"><h3>Evolución de los pesos por versión</h3>${weightsChart(h)}</div>
  <div class="panel"><h3>Historial de versiones</h3><div class="tablewrap"><table><thead><tr><th>Versión</th><th>Fecha</th><th class="r">Señales</th>${DM.DIMS.map(k=>`<th class="r">${k}</th>`).join("")}<th class="r">Error antes</th><th class="r">Error después</th><th>Nota</th></tr></thead>
  <tbody>${h.slice().reverse().map(x=>`<tr><td>v${x.version}</td><td>${x.fecha?new Date(x.fecha).toLocaleString("es-CO"):"–"}</td><td class="r">${x.n}</td>${DM.DIMS.map(k=>`<td class="r">${Math.round(x.pesos[k]*1000)/10}%</td>`).join("")}<td class="r">${x.maeAnterior==null?"–":f1(x.maeAnterior*100)}</td><td class="r">${x.mae==null?"–":f1(x.mae*100)}</td><td>${esc(x.nota||"")}</td></tr>`).join("")}</tbody></table></div></div>`;
}

const TABLES = {
  perfiles: () => { const cols=["id","nombre","email","whatsapp","creado","completo","arquetipo","referidoPor","carrera","universidad","ciudad","role","seeks","skills","importancia","apertura","organizacion","decision","conflicto","comunicacion","motivaciones","ambicion","horizonte","valores","riesgo","escenario","horas","dedicacion","cuestionarioInicio","cuestionarioFin","variante","precio","plan","motivoNoPago"]; return [cols, ...D.perfiles.map(p=>cols.map(c=>Array.isArray(p[c])?p[c].join("; "):p[c]))]; },
  conexiones: () => { const cols=["id","de","para","paraEjemplo","deEjemplo","score","ajuste","estado","respuestaSimulada","disuelto","vioExplicacion","mensaje","modeloVersion",...DM.DIMS.map(k=>"d_"+k),"creado","actualizado"]; return [cols, ...D.conexiones.map(c=>cols.map(k=>k.startsWith("d_")?c.d?.[k.slice(2)]:c[k]))]; },
  encuestas: () => { const cols=["id","perfil","tipo","conexion","creado","etapa","sigueJuntos","satisfaccionSocio","satisfaccionApp","nps","comentario"]; return [cols, ...D.encuestas.map(e=>cols.map(c=>e[c]))]; }
};
const toCSV = rows => "﻿"+rows.map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n");
function vExportar(){
  const item = (k,t,n) => `<div class="team"><span class="av" style="background:var(--ink)">${k==="todo"?"{ }":"CSV"}</span><div><b>${t}</b><p class="note">${n}</p></div><div class="row"><button class="btn primary sm" data-dl="${k}">Descargar</button><button class="btn sm" data-cp="${k}">Copiar</button></div></div>`;
  return `<p class="muted">Los CSV abren directo en Excel o Google Sheets. El JSON trae todo, incluido el historial del modelo, para analizarlo en Python o R.</p>
  <div class="stack">
    ${item("perfiles","perfiles.csv",`${D.perfiles.length} perfiles con todas sus respuestas`)}
    ${item("conexiones","conexiones.csv",`${D.conexiones.length} pares con puntaje, calificación, estado y las 6 similitudes`)}
    ${item("encuestas","encuestas.csv",`${D.encuestas.length} encuestas de satisfacción`)}
    ${item("todo","datamatch.json","Todo: perfiles, conexiones, encuestas y modelo")}
  </div><p class="note" id="xmsg"></p>`;
}
function payload(k){
  if(k==="todo") return {name:`datamatch-${new Date().toISOString().slice(0,10)}.json`, data:JSON.stringify({exportado:new Date().toISOString(), ...D, modelo:model()},null,2), type:"application/json"};
  return {name:`${k}.csv`, data:toCSV(TABLES[k]()), type:"text/csv"};
}

function render(){
  if(location.hash!=="#admin") return;
  const root = $("#root");
  if(!loaded){ root.innerHTML = `<div class="page"><div class="narrow"><h2>Cargando el panel…</h2></div></div>`; return; }
  if(ENV.db && !ENV.isAdmin && window.DMAuth){
    root.innerHTML = `<div class="page"><div class="narrow"><div class="stack"><span class="kicker">Administración</span><h2>Entra al panel del equipo</h2></div>
      <form class="card" id="lf" novalidate><label class="field" for="le">Correo<input type="email" id="le" autocomplete="username"></label>
      <label class="field" for="lp">Contraseña<input type="password" id="lp" autocomplete="current-password" style="font:inherit;background:var(--soft);border:2px solid transparent;border-radius:14px;padding:12px 14px"></label>
      <p class="err" id="lerr"></p><div class="row"><button class="btn primary" type="submit">Entrar</button><a class="btn link" href="#">Volver a la app</a></div></form></div></div>`;
    $("#lf").onsubmit = async e => { e.preventDefault(); $("#lerr").textContent=""; const r = await window.DMAuth.signIn($("#le").value.trim(), $("#lp").value); if(r.error) $("#lerr").textContent = "Correo o contraseña incorrectos."; else location.reload(); };
    return;
  }
  if(!ENV.db || !ENV.isAdmin){
    root.innerHTML = `<div class="page"><div class="narrow"><div class="stack"><span class="kicker">Administración</span><h2>Esta vista es solo para el equipo</h2><p class="muted">${!ENV.db?"El registro de datos no está disponible en esta vista. Ábrela desde la cuenta dueña de la app.":"Tu cuenta no tiene permisos de administración."}</p><div class="row"><a class="btn" href="#">Ir a la app</a></div></div></div></div>`; return;
  }
  const body = {resumen:vResumen, perfiles:vPerfiles, conexiones:vConexiones, encuestas:vEncuestas, modelo:vModelo, exportar:vExportar}[sec]();
  root.innerHTML = `<div class="admin-shell">
    <aside class="side"><a class="brand" href="#">${DM.logo(30,true)}<span>DataMatch <b>Admin</b></span></a>
      <nav aria-label="Secciones">${Object.entries(SECS).map(([k,t])=>`<button data-sec="${k}" ${sec===k?'aria-current="page"':""}>${t}</button>`).join("")}</nav>
      <p class="small">Los datos se actualizan en vivo. <a href="#" style="color:#fff">Abrir la app</a>${window.DMAuth?` · <a href="#" id="logoutAdm" style="color:#fff">Cerrar sesión</a>`:""}</p></aside>
    <main class="admin-main"><div class="admin-head"><div class="stack" style="gap:6px"><span class="kicker">Panel de administración</span><h2>${SECS[sec]}</h2></div><span class="note">Actualizado ${new Date().toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"})}</span></div>${body}</main>
  </div>`;
  $$("[data-sec]").forEach(b=>b.onclick=()=>{ sec=b.dataset.sec; render(); window.scrollTo(0,0); });
  if($("#logoutAdm")) $("#logoutAdm").onclick = async e => { e.preventDefault(); await window.DMAuth.signOut(); location.hash=""; location.reload(); };
  if(sec==="perfiles"){
    const qi=$("#q"); qi.oninput=()=>{ q=qi.value; const pos=qi.selectionStart; render(); const n=$("#q"); n.focus(); n.setSelectionRange(pos,pos); };
    $$("tr[data-p]").forEach(r=>{ r.onclick=()=>drawer(r.dataset.p); r.onkeydown=e=>{ if(e.key==="Enter") drawer(r.dataset.p); }; });
  }
  if(sec==="modelo"){
    $("#retrain").onclick = async () => { const m=DM.retrain(model(), D.conexiones, D.encuestas, "Reentrenamiento manual"); D.modelo={...m,id:"actual"}; await ENV.db.collection("modelo").doc("actual").set(JSON.parse(JSON.stringify(D.modelo))).catch(()=>{}); render(); };
    $("#reset").onclick = async () => { const base=model(); const v=(base.version||0)+1; const entry={version:v,pesos:{...DM.W0},n:0,fecha:new Date().toISOString(),mae:null,r:null,nota:"Restablecido a pesos iniciales"}; D.modelo={...base,id:"actual",version:v,pesos:{...DM.W0},n:0,entrenadoEn:entry.fecha,mae:null,r:null,historial:[...(base.historial||DM.initialModel().historial),entry].slice(-50)}; await ENV.db.collection("modelo").doc("actual").set(JSON.parse(JSON.stringify(D.modelo))).catch(()=>{}); render(); };
  }
  if(sec==="exportar"){
    $$("[data-dl]").forEach(b=>b.onclick=async()=>{ const p=payload(b.dataset.dl); try{ if(!downloads) throw 0; await downloads.save({filename:p.name, data:new Blob([p.data],{type:p.type})}); $("#xmsg").textContent=`${p.name} listo.`; }catch(e){ $("#xmsg").textContent="La descarga no se completó. Usa Copiar y pégalo en Excel o en un archivo de texto."; } });
    $$("[data-cp]").forEach(b=>b.onclick=async()=>{ const p=payload(b.dataset.cp); try{ await navigator.clipboard.writeText(p.data); $("#xmsg").textContent="Copiado al portapapeles."; }catch(e){ $("#xmsg").textContent="No se pudo copiar."; } });
  }
}
let raf = null;
const later = () => { if(raf) return; raf = setTimeout(()=>{ raf=null; if(location.hash==="#admin" && !document.querySelector(".drawer") && document.activeElement?.id!=="q") render(); },300); };

window.Admin = {
  show(){ render(); },
  async start(){
    render();
    ENV = await DM.connect();
    try{ downloads = await claude.use("downloads"); }catch(e){}
    if(!ENV.db){ loaded=true; render(); return; }
    let pending=4; const first=()=>{ if(--pending===0){ loaded=true; render(); } };
    ["perfiles","conexiones","encuestas"].forEach(c=>{ let f=true; DM.listen(ENV.db,c,docs=>{ if(docs) D[c]=docs; if(f){f=false;first();} else later(); }); });
    let f=true; DM.listen(ENV.db,"modelo",docs=>{ if(docs) D.modelo=docs.find(d=>d.id==="actual")||null; if(f){f=false;first();} else later(); });
  }
};
})();
