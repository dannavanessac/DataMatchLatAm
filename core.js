/* DataMatch LatAm · núcleo compartido entre la app y la vista de administrador.
   Puntaje de match, explicaciones, perfiles de ejemplo y reentrenamiento del modelo. */
(function(){
const DM = {};

DM.DIMS = ["M","P","V","R","T","H"];
DM.W0 = {M:.20, P:.20, V:.15, R:.15, T:.15, H:.15};   // pesos iniciales del Taller 4 (prior)
DM.DIM_LABEL = {M:"Motivaciones y visión", P:"Estilo de trabajo", V:"Valores", R:"Tolerancia al riesgo", T:"Tiempo y compromiso", H:"Habilidades complementarias"};
DM.SKILLS = ["Programación","Análisis de datos","Machine learning","Desarrollo web","Diseño UX/UI","Investigación de usuarios","Producto","Finanzas","Ventas","Marketing digital","Operaciones","Comunicación y pitch"];
DM.ROLES = {tecnico:"Técnico", negocio:"Negocio", experiencia:"Experiencia de usuario"};
DM.ROLE_DESC = {tecnico:"Construye el producto", negocio:"Vende y consigue recursos", experiencia:"Diseña para el cliente"};
DM.ROLE_SHORT = {tecnico:"técnico", negocio:"de negocio", experiencia:"de experiencia de usuario"};
DM.IMPORTANCIA = [
  {k:"habilidades",t:"Habilidades técnicas",pro:true},{k:"experiencia",t:"Experiencia previa",pro:true},
  {k:"motivaciones",t:"Por qué quiere emprender"},{k:"valores",t:"Sus valores"},{k:"vision",t:"Qué quiere construir"},
  {k:"riesgo",t:"Cuánto riesgo asume"},{k:"compromiso",t:"Tiempo que puede dedicar"},{k:"comunicacion",t:"Cómo resuelve desacuerdos"}];
DM.MOTIV = {impacto:"impacto social",independencia:"independencia",ingresos:"ingresos",aprendizaje:"aprender",innovacion:"innovar"};
DM.VALORES = {transparencia:"transparencia",innovacion:"innovación",estabilidad:"estabilidad",ambicion:"ambición",impacto:"impacto social",aprendizaje:"aprendizaje constante"};
DM.AMB = {pequeno:"negocio pequeño y estable",regional:"empresa de crecimiento regional",alto:"startup de alto crecimiento"};
DM.AMB_I = {pequeno:0,regional:1,alto:2};
DM.HOR = {"6m":"6 meses","1-2a":"1 a 2 años","3a":"3 años o más"};
DM.CONF = {evitar:"evitar el conflicto",negociar:"negociar",consenso:"buscar consenso",confrontar:"confrontar directamente"};
DM.ETAPAS = {idea:"Definiendo la idea",validando:"Hablando con clientes",prototipo:"Construyendo el prototipo",clientes:"Con primeros clientes",pausa:"En pausa o disuelto"};
DM.PRICES = [9900,19900,29900];

/* Perfiles de ejemplo (ficticios). Permiten probar la app cuando aún hay pocos usuarios reales. */
DM.EJEMPLOS = [
 {id:"ej01",nombre:"Laura",carrera:"Administración de Empresas",universidad:"U. del Rosario",ciudad:"Bogotá",role:"negocio",skills:["Ventas","Finanzas","Comunicación y pitch"],apertura:4,organizacion:5,decision:2,conflicto:"negociar",comunicacion:"directa",motivaciones:["independencia","impacto"],ambicion:"alto",horizonte:"3a",valores:["transparencia","ambicion","impacto"],riesgo:4,escenario:"proyecto",horas:20,dedicacion:"parcial"},
 {id:"ej02",nombre:"Santiago",carrera:"Ingeniería de Sistemas",universidad:"U. de los Andes",ciudad:"Bogotá",role:"tecnico",skills:["Programación","Desarrollo web","Machine learning"],apertura:5,organizacion:3,decision:1,conflicto:"confrontar",comunicacion:"directa",motivaciones:["innovacion","ingresos"],ambicion:"alto",horizonte:"1-2a",valores:["innovacion","ambicion","aprendizaje"],riesgo:5,escenario:"proyecto",horas:25,dedicacion:"parcial"},
 {id:"ej03",nombre:"Valentina",carrera:"Diseño Industrial",universidad:"U. Nacional",ciudad:"Bogotá",role:"experiencia",skills:["Diseño UX/UI","Investigación de usuarios","Producto"],apertura:5,organizacion:4,decision:4,conflicto:"consenso",comunicacion:"diplomatica",motivaciones:["impacto","aprendizaje"],ambicion:"regional",horizonte:"3a",valores:["impacto","transparencia","aprendizaje"],riesgo:3,escenario:"proyecto",horas:15,dedicacion:"parcial"},
 {id:"ej04",nombre:"Mateo",carrera:"Economía",universidad:"U. Externado",ciudad:"Bogotá",role:"negocio",skills:["Finanzas","Análisis de datos","Operaciones"],apertura:3,organizacion:5,decision:4,conflicto:"negociar",comunicacion:"diplomatica",motivaciones:["ingresos","independencia"],ambicion:"regional",horizonte:"1-2a",valores:["estabilidad","transparencia","ambicion"],riesgo:2,escenario:"estable",horas:10,dedicacion:"parcial"},
 {id:"ej05",nombre:"Camila",carrera:"Mercadeo y Publicidad",universidad:"U. Javeriana",ciudad:"Bogotá",role:"negocio",skills:["Marketing digital","Ventas","Comunicación y pitch"],apertura:5,organizacion:3,decision:2,conflicto:"negociar",comunicacion:"directa",motivaciones:["independencia","innovacion"],ambicion:"alto",horizonte:"3a",valores:["ambicion","innovacion","transparencia"],riesgo:4,escenario:"proyecto",horas:30,dedicacion:"completa"},
 {id:"ej06",nombre:"Andrés",carrera:"Ciencia de Datos",universidad:"U. EAFIT",ciudad:"Medellín",role:"tecnico",skills:["Análisis de datos","Machine learning","Programación"],apertura:4,organizacion:4,decision:3,conflicto:"consenso",comunicacion:"diplomatica",motivaciones:["aprendizaje","impacto"],ambicion:"regional",horizonte:"1-2a",valores:["aprendizaje","impacto","transparencia"],riesgo:3,escenario:"estable",horas:12,dedicacion:"parcial"},
 {id:"ej07",nombre:"Isabela",carrera:"Ingeniería Industrial",universidad:"U. de Antioquia",ciudad:"Medellín",role:"negocio",skills:["Operaciones","Producto","Finanzas"],apertura:4,organizacion:5,decision:3,conflicto:"negociar",comunicacion:"directa",motivaciones:["impacto","independencia"],ambicion:"alto",horizonte:"3a",valores:["impacto","ambicion","transparencia"],riesgo:4,escenario:"proyecto",horas:20,dedicacion:"parcial"},
 {id:"ej08",nombre:"Tomás",carrera:"Diseño Gráfico",universidad:"U. Pontificia Bolivariana",ciudad:"Medellín",role:"experiencia",skills:["Diseño UX/UI","Marketing digital","Comunicación y pitch"],apertura:5,organizacion:2,decision:2,conflicto:"evitar",comunicacion:"diplomatica",motivaciones:["innovacion","independencia"],ambicion:"regional",horizonte:"6m",valores:["innovacion","aprendizaje","estabilidad"],riesgo:3,escenario:"estable",horas:8,dedicacion:"parcial"},
 {id:"ej09",nombre:"Sara",carrera:"Estadística",universidad:"U. Nacional",ciudad:"Medellín",role:"tecnico",skills:["Análisis de datos","Programación","Investigación de usuarios"],apertura:3,organizacion:5,decision:4,conflicto:"consenso",comunicacion:"diplomatica",motivaciones:["impacto","aprendizaje"],ambicion:"pequeno",horizonte:"1-2a",valores:["estabilidad","transparencia","impacto"],riesgo:2,escenario:"estable",horas:10,dedicacion:"parcial"},
 {id:"ej10",nombre:"Juliana",carrera:"Negocios Internacionales",universidad:"U. EAFIT",ciudad:"Medellín",role:"negocio",skills:["Ventas","Comunicación y pitch","Operaciones"],apertura:4,organizacion:4,decision:1,conflicto:"confrontar",comunicacion:"directa",motivaciones:["ingresos","independencia"],ambicion:"alto",horizonte:"3a",valores:["ambicion","innovacion","estabilidad"],riesgo:5,escenario:"proyecto",horas:35,dedicacion:"completa"},
 {id:"ej11",nombre:"Felipe",carrera:"Ingeniería de Software",universidad:"U. Javeriana",ciudad:"Bogotá",role:"tecnico",skills:["Desarrollo web","Programación","Producto"],apertura:4,organizacion:4,decision:3,conflicto:"negociar",comunicacion:"directa",motivaciones:["innovacion","independencia"],ambicion:"alto",horizonte:"3a",valores:["innovacion","transparencia","ambicion"],riesgo:4,escenario:"proyecto",horas:20,dedicacion:"parcial"},
 {id:"ej12",nombre:"Daniela",carrera:"Psicología",universidad:"U. Externado",ciudad:"Bogotá",role:"experiencia",skills:["Investigación de usuarios","Comunicación y pitch","Producto"],apertura:4,organizacion:4,decision:4,conflicto:"consenso",comunicacion:"diplomatica",motivaciones:["impacto","aprendizaje"],ambicion:"regional",horizonte:"1-2a",valores:["impacto","transparencia","aprendizaje"],riesgo:3,escenario:"proyecto",horas:15,dedicacion:"parcial"}
].map(p=>({...p, ejemplo:true, completo:true}));

/* ---------- Similitud por dimensión (0 a 1) ---------- */
const sim5 = (a,b) => 1 - Math.abs(a-b)/4;
const inter = (a,b) => (a||[]).filter(x => (b||[]).includes(x));
DM.inter = inter;
function conflictCompat(a,b){
  if(a===b) return 1;
  const s=[a,b].sort().join("|");
  return ({"consenso|negociar":.9,"confrontar|negociar":.6,"confrontar|consenso":.5,"confrontar|evitar":.2,"consenso|evitar":.6,"evitar|negociar":.6})[s] ?? .6;
}
DM.conflictCompat = conflictCompat;
DM.dims = function(me, o){
  const P = (sim5(me.apertura,o.apertura)+sim5(me.organizacion,o.organizacion)+sim5(me.decision,o.decision)+conflictCompat(me.conflicto,o.conflicto)+(me.comunicacion===o.comunicacion?1:.6))/5;
  const M = .45*(1-Math.abs(DM.AMB_I[me.ambicion]-DM.AMB_I[o.ambicion])/2) + .35*(inter(me.motivaciones,o.motivaciones).length/2) + .20*(me.horizonte===o.horizonte?1:.4);
  const V = .2 + .8*inter(me.valores,o.valores).length/3;
  const R = .7*sim5(me.riesgo,o.riesgo) + .3*(me.escenario===o.escenario?1:.3);
  const T = .7*(Math.min(me.horas,o.horas)/Math.max(me.horas,o.horas)) + .3*(me.dedicacion===o.dedicacion?1:.4);
  const roleS = o.role===me.seeks ? 1 : (o.role!==me.role ? .6 : .2);
  const newSkills = (o.skills||[]).filter(s => !(me.skills||[]).includes(s)).length / Math.max((o.skills||[]).length,1);
  const H = .6*roleS + .4*newSkills;
  const r = x => Math.round(x*1000)/1000;
  return {M:r(M),P:r(P),V:r(V),R:r(R),T:r(T),H:r(H)};
};
DM.score = (d, w) => Math.round(100*DM.DIMS.reduce((s,k)=>s+(w[k]??DM.W0[k])*d[k],0));

/* ---------- Explicación en lenguaje claro ---------- */
DM.explain = function(me, o, d){
  const why=[], aporta=[], conversar=[];
  const mot = inter(me.motivaciones,o.motivaciones).map(k=>DM.MOTIV[k]);
  if(me.ambicion===o.ambicion) why.push(`Los dos quieren construir una ${DM.AMB[o.ambicion]}.`);
  if(mot.length) why.push(`Comparten la motivación de ${mot.join(" y ")}.`);
  const vals = inter(me.valores,o.valores).map(k=>DM.VALORES[k]);
  if(vals.length) why.push(`Coinciden en ${vals.length===1?"un valor":"valores"}: ${vals.join(", ")}.`);
  if(d.R>=.8) why.push("Asumen riesgos de forma parecida.");
  if(d.T>=.8) why.push(`Tienen un tiempo similar: ${me.horas} y ${o.horas} horas por semana.`);
  if(d.P>=.8) why.push("Trabajan con un estilo parecido.");
  if(!why.length) why.push("Coinciden poco en visión; el match se apoya sobre todo en lo que se complementan.");
  if(o.role===me.seeks) aporta.push(`Cubre el rol ${DM.ROLE_SHORT[o.role]} que buscas.`);
  else if(o.role!==me.role) aporta.push(`Tiene un perfil ${DM.ROLE_SHORT[o.role]}, distinto al tuyo.`);
  else aporta.push(`Tiene tu mismo perfil (${DM.ROLE_SHORT[o.role]}): suma, pero no cubre lo que te falta.`);
  const theirs = (o.skills||[]).filter(s=>!(me.skills||[]).includes(s));
  const mine = (me.skills||[]).filter(s=>!(o.skills||[]).includes(s));
  if(theirs.length) aporta.push(`${o.nombre} aporta ${theirs.join(", ").toLowerCase()}.`);
  if(mine.length) aporta.push(`Tú aportas ${mine.slice(0,3).join(", ").toLowerCase()}.`);
  if(Math.abs(me.decision-o.decision)>=2){
    const lab = v => v<=2 ? "decidir rápido" : v>=4 ? "decidir por consenso" : "un punto medio";
    conversar.push(`Tú prefieres ${lab(me.decision)} y ${o.nombre}, ${lab(o.decision)}. Acuerden cómo decidirán.`);
  }
  const ratio = Math.min(me.horas,o.horas)/Math.max(me.horas,o.horas);
  if(ratio<.6) conversar.push(`Disponibilidad distinta: ${me.horas} frente a ${o.horas} horas por semana.`);
  else if(me.dedicacion!==o.dedicacion) conversar.push("Uno espera dedicación completa y el otro parcial.");
  if(Math.abs(me.riesgo-o.riesgo)>=2) conversar.push("Asumen el riesgo de forma distinta. Hablen de cuánto tiempo aguantarían sin ingresos.");
  if(me.ambicion!==o.ambicion) conversar.push(`Tú buscas una ${DM.AMB[me.ambicion]} y ${o.nombre}, una ${DM.AMB[o.ambicion]}.`);
  if(conflictCompat(me.conflicto,o.conflicto)<=.5) conversar.push(`Ante un desacuerdo, tú tiendes a ${DM.CONF[me.conflicto]} y ${o.nombre}, a ${DM.CONF[o.conflicto]}.`);
  if(!vals.length) conversar.push("No coinciden en valores. Conversen qué esperan del proyecto.");
  if(!conversar.length) conversar.push("No vemos fricciones fuertes. Igual, acuerden roles y participación antes de empezar.");
  return {why, aporta, conversar};
};

/* ---------- Reentrenamiento ----------
   Cada conexión guarda las 6 similitudes (d) del par. Las etiquetas salen de lo que hacen las personas:
   la calificación del match (1–5), si la solicitud se acepta o rechaza y, con más peso, la satisfacción
   del equipo en sus encuestas de seguimiento. Los pesos se estiman con una regresión ridge con prior en
   los pesos iniciales (equivale a un modelo bayesiano con prior normal): con pocos datos el modelo se
   queda cerca de los pesos del Taller 4 y se aleja a medida que hay evidencia. */
DM.LAMBDA = 4;
DM.RETRAIN_EVERY = 3;
DM.examples = function(conexiones, encuestas){
  const ex = [];
  const byCon = {};
  (encuestas||[]).forEach(e=>{ if(e.conexion) (byCon[e.conexion]=byCon[e.conexion]||[]).push(e); });
  (conexiones||[]).forEach(c=>{
    if(!c.d) return;
    const x = DM.DIMS.map(k=>c.d[k]);
    if(c.ajuste) ex.push({x, y:(c.ajuste-1)/4, w:1, src:"calificación", id:c.id});
    if(c.estado==="aceptada") ex.push({x, y:.75, w:.5, src:"aceptada", id:c.id});
    if(c.estado==="rechazada") ex.push({x, y:.2, w:.5, src:"rechazada", id:c.id});
    (byCon[c.id]||[]).forEach(e=>{
      if(e.satisfaccionSocio) ex.push({x, y:(e.satisfaccionSocio-1)/4, w:2, src:"encuesta de equipo", id:c.id});
      if(e.sigueJuntos===false) ex.push({x, y:.1, w:1, src:"equipo disuelto", id:c.id});
    });
  });
  return ex;
};
function solve(A, b){
  const n=b.length, M=A.map((r,i)=>[...r,b[i]]);
  for(let i=0;i<n;i++){
    let p=i; for(let r=i+1;r<n;r++) if(Math.abs(M[r][i])>Math.abs(M[p][i])) p=r;
    [M[i],M[p]]=[M[p],M[i]];
    if(Math.abs(M[i][i])<1e-12) return null;
    for(let r=0;r<n;r++){ if(r===i) continue; const f=M[r][i]/M[i][i]; for(let c=i;c<=n;c++) M[r][c]-=f*M[i][c]; }
  }
  return M.map((r,i)=>r[n]/r[i]);
}
DM.evaluate = function(ex, w){
  if(!ex.length) return {mae:null, r:null};
  const wv = DM.DIMS.map(k=>w[k]);
  const pred = ex.map(e=>e.x.reduce((s,v,i)=>s+v*wv[i],0)), y = ex.map(e=>e.y);
  const mae = pred.reduce((s,p,i)=>s+Math.abs(p-y[i]),0)/ex.length;
  return {mae:Math.round(mae*1000)/1000, r:DM.pearson(pred,y)};
};
DM.train = function(ex, prior){
  const p = prior||DM.W0, k=DM.DIMS.length, L=DM.LAMBDA;
  const A = Array.from({length:k},(_,i)=>Array.from({length:k},(_,j)=>i===j?L:0));
  const b = DM.DIMS.map(d=>L*p[d]);
  ex.forEach(e=>{ for(let i=0;i<k;i++){ b[i]+=e.w*e.x[i]*e.y; for(let j=0;j<k;j++) A[i][j]+=e.w*e.x[i]*e.x[j]; } });
  let beta = solve(A,b) || DM.DIMS.map(d=>p[d]);
  beta = beta.map(v=>Math.max(v,.02));
  const s = beta.reduce((a,v)=>a+v,0);
  const w = Object.fromEntries(DM.DIMS.map((d,i)=>[d, Math.round(1000*beta[i]/s)/1000]));
  return w;
};
DM.pearson = function(xs,ys){
  const n=xs.length; if(n<3) return null;
  const mx=xs.reduce((a,b)=>a+b)/n, my=ys.reduce((a,b)=>a+b)/n;
  let sxy=0,sx=0,sy=0; for(let i=0;i<n;i++){ sxy+=(xs[i]-mx)*(ys[i]-my); sx+=(xs[i]-mx)**2; sy+=(ys[i]-my)**2; }
  return sx&&sy ? Math.round(1000*sxy/Math.sqrt(sx*sy))/1000 : null;
};
DM.initialModel = () => ({version:0, pesos:{...DM.W0}, n:0, entrenadoEn:null, mae:null, r:null, historial:[{version:0, pesos:{...DM.W0}, n:0, fecha:null, mae:null, r:null, nota:"Pesos iniciales del Taller 4"}]});
DM.retrain = function(model, conexiones, encuestas, nota){
  const m = model || DM.initialModel();
  const ex = DM.examples(conexiones, encuestas);
  const pesos = DM.train(ex, DM.W0);
  const ev = DM.evaluate(ex, pesos), before = DM.evaluate(ex, m.pesos);
  const v = (m.version||0)+1, fecha = new Date().toISOString();
  const entry = {version:v, pesos, n:ex.length, fecha, mae:ev.mae, r:ev.r, maeAnterior:before.mae, nota:nota||"Reentrenamiento automático"};
  return {version:v, pesos, n:ex.length, entrenadoEn:fecha, mae:ev.mae, r:ev.r, historial:[...(m.historial||[]), entry].slice(-50)};
};
DM.needsRetrain = (model, conexiones, encuestas) => DM.examples(conexiones, encuestas).length - ((model&&model.n)||0) >= DM.RETRAIN_EVERY;

/* ---------- Arquetipo emprendedor ---------- */
DM.ARQ = {
  explorador:{n:"Explorador estratégico", d:"Ves oportunidades donde otros ven riesgo y te mueves rápido.", encaja:"constructor", color:"#FF5B3A"},
  constructor:{n:"Constructor metódico", d:"Conviertes ideas en planes y cumples lo que prometes.", encaja:"explorador", color:"#17153B"},
  impulsor:{n:"Impulsor de impacto", d:"Te mueve resolver problemas reales y piensas a largo plazo.", encaja:"estratega", color:"#14A37E"},
  estratega:{n:"Estratega comercial", d:"Piensas en clientes, ventas y crecimiento desde el primer día.", encaja:"impulsor", color:"#5B5FEF"}
};
/* Referentes con una trayectoria pública parecida a cada arquetipo (comparación orientativa) */
DM.ARQ_REF = {
  explorador:[
    {n:"Marcos Galperin", r:"Fundó Mercado Libre en 1999, cuando casi nadie en Latinoamérica compraba por internet."},
    {n:"Steve Jobs", r:"Apostó por productos que el mercado todavía no pedía, como el iPhone."}],
  constructor:[
    {n:"Steve Wozniak", r:"Diseñó y construyó los primeros computadores de Apple mientras Jobs abría el mercado."},
    {n:"Ingvar Kamprad", r:"Hizo de IKEA una máquina de procesos: diseño, logística y costos bajo control."}],
  impulsor:[
    {n:"Muhammad Yunus", r:"Creó el Grameen Bank para dar microcréditos a quienes la banca dejaba por fuera."},
    {n:"Yvon Chouinard", r:"Construyó Patagonia con el medio ambiente en el centro del negocio."}],
  estratega:[
    {n:"Sara Blakely", r:"Fundó Spanx vendiendo ella misma, tienda por tienda, antes de tener inversionistas."},
    {n:"Ray Kroc", r:"Vio el potencial comercial de McDonald's y lo convirtió en una franquicia mundial."}]
};

/* Avatares ilustrados de cada arquetipo (personajes originales) */
DM.ARQ_SVG = function(k, size=120){
  const face = (skin, x=80, y=70) => `<circle cx="${x}" cy="${y}" r="24" fill="${skin}"/><circle cx="${x-8}" cy="${y+2}" r="2.6" fill="#17153B"/><circle cx="${x+8}" cy="${y+2}" r="2.6" fill="#17153B"/><path d="M${x-8} ${y+11} Q${x} ${y+18} ${x+8} ${y+11}" stroke="#17153B" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="${x-14}" cy="${y+9}" r="3.4" fill="#FF8A70" opacity=".55"/><circle cx="${x+14}" cy="${y+9}" r="3.4" fill="#FF8A70" opacity=".55"/>`;
  const body = (c) => `<path d="M40 160 C40 120 56 104 80 104 C104 104 120 120 120 160 Z" fill="${c}"/>`;
  const wrap = (bg, inner, label) => `<svg width="${size}" height="${size}" viewBox="0 0 160 160" role="img" aria-label="${label}"><defs><clipPath id="cl-${k}-${size}"><circle cx="80" cy="80" r="80"/></clipPath></defs><g clip-path="url(#cl-${k}-${size})"><rect width="160" height="160" fill="${bg}"/>${inner}</g></svg>`;
  if(k==="explorador") return wrap("#FF5B3A", `
    <path d="M128 18 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z" fill="#FFC93C"/><circle cx="30" cy="34" r="4" fill="#FFE9E3"/>
    ${body("#17153B")}<path d="M66 104 L80 124 L94 104" fill="#FFFFFF"/>
    ${face("#C68642")}
    <path d="M56 64 C54 42 74 36 88 40 C100 43 108 52 104 64 C96 54 82 52 70 58 Z" fill="#2B1B12"/>
    <g transform="rotate(-35 104 112)"><rect x="88" y="105" width="14" height="14" rx="3" fill="#FFE9E3"/><rect x="100" y="102" width="22" height="20" rx="4" fill="#FFC93C"/><rect x="120" y="98" width="24" height="28" rx="5" fill="#FFC93C"/><rect x="118" y="98" width="5" height="28" fill="#E5A800"/><ellipse cx="144" cy="112" rx="4" ry="14" fill="#FFFFFF"/></g><path d="M100 126 L94 160 M100 126 L112 160" stroke="#FFE9E3" stroke-width="3.4" stroke-linecap="round"/>`, "Avatar del Explorador estratégico");
  if(k==="constructor") return wrap("#17153B", `
    <rect x="116" y="112" width="30" height="22" rx="4" fill="#FF5B3A"/><rect x="120" y="90" width="26" height="22" rx="4" fill="#14A37E"/><rect x="118" y="68" width="22" height="22" rx="4" fill="#FFFFFF"/>
    ${body("#FFC93C")}<rect x="62" y="114" width="36" height="8" rx="3" fill="#17153B" opacity=".25"/>
    ${face("#F1C27D")}
    <path d="M54 66 C54 44 66 36 80 36 C94 36 106 44 106 66 Z" fill="#FFC93C"/><rect x="50" y="62" width="60" height="8" rx="4" fill="#E5A800"/><rect x="77" y="38" width="6" height="26" rx="3" fill="#E5A800"/>`, "Avatar del Constructor metódico");
  if(k==="impulsor") return wrap("#14A37E", `
    <path d="M22 40 c0-6 8-8 10-2 c2-6 10-4 10 2 c0 6-10 12-10 12 s-10-6-10-12z" fill="#FFE9E3"/>
    ${body("#FFFFFF")}
    ${face("#8D5524")}
    <g fill="#17153B"><circle cx="58" cy="56" r="10"/><circle cx="68" cy="44" r="11"/><circle cx="82" cy="40" r="12"/><circle cx="96" cy="45" r="11"/><circle cx="103" cy="57" r="9"/></g>
    <path d="M66 140 h28 l-4 20 h-20z" fill="#FF5B3A"/><path d="M80 140 V118" stroke="#0B6B52" stroke-width="4"/><path d="M80 126 C70 126 64 118 64 110 C74 110 80 116 80 126z" fill="#FFC93C"/><path d="M80 120 C90 120 98 112 98 102 C86 102 80 110 80 120z" fill="#FFC93C"/>`, "Avatar del Impulsor de impacto");
  return wrap("#5B5FEF", `
    <g transform="translate(112 22)"><rect width="36" height="30" rx="6" fill="#FFFFFF"/><path d="M6 22 L14 15 L20 19 L30 8" stroke="#FF5B3A" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 8 h6 v6" stroke="#FF5B3A" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
    ${body("#17153B")}<path d="M70 104 L80 118 L90 104" fill="#FFFFFF"/><path d="M80 112 l5 8 -5 18 -5 -18z" fill="#FF5B3A"/>
    ${face("#E0AC69")}
    <path d="M56 62 C56 44 68 38 80 38 C94 38 104 46 104 60 C98 52 86 50 74 52 C66 54 60 58 56 62z" fill="#3A2A1E"/><path d="M104 60 C106 70 104 80 100 86 L100 62z" fill="#3A2A1E"/>
    <g fill="none" stroke="#17153B" stroke-width="2.6"><circle cx="72" cy="72" r="7"/><circle cx="88" cy="72" r="7"/><path d="M79 72 h2"/></g>`, "Avatar del Estratega comercial");
};

DM.arquetipo = function(r){
  const has = (a,k) => (a||[]).includes(k);
  const s = {
    explorador: (r.apertura-3) + (r.riesgo-3) + (r.ambicion==="alto"?1.5:0) + (r.escenario==="proyecto"?1:0) + (r.decision<=2?.5:0),
    constructor: (r.organizacion-3) + (3-r.riesgo)*.8 + (r.escenario==="estable"?1:0) + (r.decision>=4?.7:0) + (r.ambicion!=="alto"?.5:0),
    impulsor: (has(r.motivaciones,"impacto")?1.5:0) + (has(r.valores,"impacto")?1:0) + (r.horizonte==="3a"?.7:0) + (r.comunicacion==="diplomatica"?.5:0) + (r.conflicto==="consenso"?.5:0),
    estratega: (has(r.motivaciones,"ingresos")?1:0) + (has(r.motivaciones,"independencia")?.7:0) + (r.role==="negocio"?1.2:0) + (r.comunicacion==="directa"?.5:0) + (r.ambicion==="alto"?.7:0) + ((has(r.skills,"Ventas")||has(r.skills,"Marketing digital"))?.6:0)
  };
  return Object.entries(s).sort((a,b)=>b[1]-a[1])[0][0];
};
DM.rasgos = function(r){
  const out = [];
  out.push(r.decision<=2 ? "Decides rápido y ajustas sobre la marcha." : r.decision>=4 ? "Prefieres decidir en equipo y con calma." : "Equilibras rapidez y consenso al decidir.");
  out.push(r.riesgo>=4 ? "Te sientes cómodo con la incertidumbre." : r.riesgo<=2 ? "Te gusta tener la información antes de arriesgar." : "Asumes riesgos medidos.");
  out.push(`Puedes darle ${r.horas} horas por semana a un proyecto${r.dedicacion==="completa"?", con dedicación completa":""}.`);
  return out;
};

/* ---------- Contraseña y foto ---------- */
/* En Vercel la contraseña la maneja Supabase Auth (window.DMUserAuth). En el prototipo de claude.ai,
   que no tiene servicio de autenticación, se guarda solo un hash SHA-256 con sal, nunca el texto. */
DM.hashPass = async (salt, pass) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + ":" + pass));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("");
};
DM.localAuth = {
  async register(p, pass){ p.salt = Math.random().toString(36).slice(2,12); p.passHash = await DM.hashPass(p.salt, pass); return {ok:true}; },
  async login(p, pass){ if(!p.passHash) return {ok:true, legacy:true}; return {ok: await DM.hashPass(p.salt, pass) === p.passHash}; }
};
/* Recorta al centro y reduce la foto a 256×256 en JPEG (unos 20–30 KB) */
DM.photoFromFile = file => new Promise((resolve, reject) => {
  if(!file || !/^image\//.test(file.type)) return reject(new Error("Elige una imagen (JPG, PNG o WEBP)."));
  if(file.size > 12*1024*1024) return reject(new Error("La imagen pesa más de 12 MB. Elige una más liviana."));
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => {
    const s = Math.min(img.width, img.height), c = document.createElement("canvas"); c.width = c.height = 256;
    c.getContext("2d").drawImage(img, (img.width-s)/2, (img.height-s)/2, s, s, 0, 0, 256, 256);
    URL.revokeObjectURL(url); resolve(c.toDataURL("image/jpeg", .82));
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No pudimos leer esa imagen. Prueba con otra.")); };
  img.src = url;
});

/* ---------- Utilidades ---------- */
/* Enlace de invitación: en Streamlit va como ?ref=, en Vercel y claude.ai como #ref- */
DM.refLink = id => (window.DATAMATCH_CONFIG && window.DATAMATCH_CONFIG.REF_QUERY) ? `${DM.APP_URL}?ref=${id}` : `${DM.APP_URL}#ref-${id}`;
DM.APP_URL = window.DATAMATCH_CONFIG ? (window.DATAMATCH_CONFIG.APP_URL || location.origin + "/") : "https://claude.ai/artifact/AT1pYicrE9jLsAZhbPvAda";
DM.esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
DM.money = n => "$"+Number(n).toLocaleString("es-CO");
DM.uid = p => p+"-"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
DM.initials = n => String(n||"?").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
DM.AVATAR = ["#FF5B3A","#17153B","#19B58C","#F2A900","#5B5FEF","#E0457B"];
DM.avatarColor = id => DM.AVATAR[[...String(id)].reduce((a,c)=>a+c.charCodeAt(0),0)%DM.AVATAR.length];
DM.logo = (size=34, dark=false) => `<svg width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true"><path d="M11 6h12a9 9 0 0 1 8.6 6.4A9.5 9.5 0 0 0 31 27.6 9 9 0 0 1 23 34H11a9 9 0 0 1-9-9V15a9 9 0 0 1 9-9z" fill="${dark?"#FFFFFF":"#17153B"}"/><circle cx="31" cy="20" r="6.6" fill="#FF5B3A"/></svg>`;
DM.fmtDate = iso => iso ? new Date(iso).toLocaleDateString("es-CO",{day:"numeric",month:"short"}) : "–";

/* ---------- Conexión a la base de datos ---------- */
DM.connect = async function(){
  let db=null, user=null, canWrite=false, isAdmin=false;
  try{
    [db,user] = await Promise.all([claude.use("db"), claude.use("user")]);
    let w = user ? user.can("data.write") : null; if(w&&w.then) w=await w;
    canWrite = !!db && w!==false;
    let a = user ? user.canEdit() : false; if(a&&a.then) a=await a;
    let o = user ? user.isOwner() : false; if(o&&o.then) o=await o;
    isAdmin = !!(a||o);
  }catch(e){}
  return {db,user,canWrite,isAdmin};
};
/* Escucha una colección y entrega su lista de documentos */
DM.listen = function(db, path, cb){
  let done=false; const t=setTimeout(()=>{ if(!done) cb(null,"timeout"); },10000);
  return db.collection(path).onSnapshot(s=>{ done=true; clearTimeout(t); cb(s.docs.map(d=>d.data())); }, e=>{ done=true; clearTimeout(t); cb(null,e&&e.code); });
};

window.DM = DM;
})();
