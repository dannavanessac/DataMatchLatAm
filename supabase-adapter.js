/* DataMatch LatAm · conexión con Supabase
   La app se escribió contra una interfaz de "colecciones y documentos" (claude.use("db")).
   Este archivo implementa esa misma interfaz sobre una tabla de Supabase, así el resto del
   código no cambia. Todos los documentos viven en la tabla public.docs (coleccion, id, data). */
(function(){
  const cfg = window.DATAMATCH_CONFIG || {};
  const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !/PEGA/.test(cfg.SUPABASE_URL + cfg.SUPABASE_ANON_KEY);
  const sb = configured && window.supabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  if(!sb) console.warn("DataMatch: Supabase no está configurado. La app funciona en modo demostración.");

  const snap = rows => ({ docs: rows.map(r => ({ id: r.id, exists: true, data: () => r.data, metadata: {fromCache:false, hasPendingWrites:false} })), size: rows.length, empty: !rows.length });
  const fail = (error) => { const e = new Error(error?.message || "Error de base de datos"); e.code = "unavailable"; return e; };

  async function fetchAll(coleccion){
    const out = []; let from = 0;
    for(;;){
      const { data, error } = await sb.from("docs").select("id,data").eq("coleccion", coleccion).range(from, from + 999);
      if(error) throw fail(error);
      out.push(...data); if(data.length < 1000) return out; from += 1000;
    }
  }

  const db = sb && {
    collection(coleccion){
      return {
        doc(id){
          return {
            id,
            async set(data){ const { error } = await sb.from("docs").upsert({ coleccion, id, data, updated_at: new Date().toISOString() }); if(error) throw fail(error); },
            async delete(){ const { error } = await sb.from("docs").delete().eq("coleccion", coleccion).eq("id", id); if(error) throw fail(error); },
            async get(){ const { data, error } = await sb.from("docs").select("data").eq("coleccion", coleccion).eq("id", id).maybeSingle(); if(error) throw fail(error); return { id, exists: !!data, data: () => data?.data }; }
          };
        },
        async get(){ return snap(await fetchAll(coleccion)); },
        onSnapshot(next, onError){
          let alive = true, timer = null;
          const load = () => fetchAll(coleccion).then(rows => { if(alive) next(snap(rows)); }).catch(e => { if(alive && onError) onError(e); });
          load();
          const ch = sb.channel("docs-" + coleccion + "-" + Math.random().toString(36).slice(2,8))
            .on("postgres_changes", { event: "*", schema: "public", table: "docs", filter: "coleccion=eq." + coleccion }, () => { clearTimeout(timer); timer = setTimeout(load, 250); })
            .subscribe();
          const poll = setInterval(load, 30000);   // respaldo por si el tiempo real se corta
          return () => { alive = false; clearInterval(poll); clearTimeout(timer); sb.removeChannel(ch); };
        }
      };
    }
  };

  /* Cuentas con contraseña (Supabase Auth). Administración = correos listados en config.js > ADMINS */
  let session = null;
  const ready = sb ? sb.auth.getSession().then(r => { session = r.data.session; }) : Promise.resolve();
  const admins = (cfg.ADMINS || []).map(e => String(e).trim().toLowerCase());
  const isAdmin = async () => { await ready; return !!session && admins.includes((session.user?.email || "").toLowerCase()); };
  const user = { can: () => true, canEdit: isAdmin, isOwner: isAdmin };
  window.DMUserAuth = sb ? {
    signUp: (email, password) => sb.auth.signUp({ email, password }),
    signIn: (email, password) => sb.auth.signInWithPassword({ email, password }),
    signOut: () => sb.auth.signOut(),
    email: async () => { await ready; return session?.user?.email?.toLowerCase() || null; }
  } : null;
  window.DMAuth = sb ? { signIn: window.DMUserAuth.signIn, signOut: window.DMUserAuth.signOut } : null;

  /* Descargas normales del navegador */
  const downloads = {
    async save({ filename, data }){
      const blob = data instanceof Blob ? data : new Blob([data]);
      const url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return { status: "saved" };
    }
  };

  window.claude = { use: async name => name === "db" ? (db || null) : name === "user" ? user : name === "downloads" ? downloads : null };
})();
