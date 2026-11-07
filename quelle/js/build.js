let sel=new Set(LOCKED), bst={q:"",f:new Set()}, wizSug=new Set();
const PT_T={m:"Mods",s:"Shader",r:"Resource Packs",d:"Datapacks"};
const TABNOTE={m:"Mods verändern das Spiel selbst. Oben nach Leistung, Optik, Gameplay, Welt und Server-Technik filtern.",s:"Shader berechnen Licht, Schatten, Wasser und Himmel neu. Es ist immer nur einer aktiv. Iris (der Shader-Lader) kommt automatisch mit.",r:"Resource Packs tauschen Texturen, 3D-Modelle und Sounds aus. Die Reihenfolge setzt die Website automatisch richtig.",d:"Datapacks ändern Welt-Generierung oder Spielregeln. Sie wirken nur in neuen Welten."};
const SUBS=[["P","Leistung"],["V","Optik & Sound"],["G","Gameplay"],["T","Welt & Terrain"],["S","Server & Technik"]];
const XF=[["sel","Ausgewählt"],["rec","Empfohlen"],["van","Läuft auf Vanilla-Server"],["sug","Assistent-Vorschläge"]];
const GROUPS=DEC.gruppen||[]; const GROUPOF={}; GROUPS.forEach(g=>g.mods.forEach(s=>GROUPOF[s]=g));
let bt="m", bsub=null;
function saveSel(){ try{ localStorage.setItem("mk-sel2",JSON.stringify({s:[...sel],c:cfg,w:wizA})); }catch(e){} }
function loadSel(){
  const hm=location.hash.match(/^#pack-([0-9a-z.]+)$/); if(hm){ try{ sel=new Set([...LOCKED,...hm[1].split(".").map(x=>MODS[parseInt(x,36)]&&MODS[parseInt(x,36)].slug).filter(Boolean)]); return true; }catch(e){} }
  try{ const v=JSON.parse(localStorage.getItem("mk-sel2")||"null"); if(v&&v.s){ sel=new Set([...LOCKED,...v.s.filter(s=>BY[s])]); cfg=v.c||{}; wizA=v.w||{}; return true; } }catch(e){} return false;
}
const IMPLICIT={"fresh-animations":["entity-model-features","entitytexturefeatures"],"fresh-animations-extensions":["fresh-animations"],"fa-player-extension":["fresh-animations"],"just-expressions":["entity-model-features"],"hyper-punchy":["punchy-fpa"],"fresh-food-for-hyper-punchy":["hyper-punchy"],"punchymoves":["fluid-foolish"],"connected-paths":["continuity"],"new-glowing-ores":["continuity"],"euphoria-patches":["complementary-reimagined"],"detailed-animations":["entity-model-features","entitytexturefeatures"],"als-piglins-revamped-x-fresh-animations":["fresh-animations"],"als-zombies-revamped-x-fresh-animations":["fresh-animations"],"als-enderman-revamped-x-fresh-animations":["fresh-animations"],"als-skeletons-revamped-x-fresh-animations":["fresh-animations"],"assorted-allays-x-fresh-animations":["fresh-animations"],"bare-bones-x-fresh-animations":["fresh-animations"],"fresh-skeleton-physics":["fresh-animations"]};
function implicit(s){ const m=BY[s]; return (IMPLICIT[s]||[]).concat(m&&m.pt==="s"?["iris"]:[]).concat(X.rpo[s]?["respackopts"]:[]); }
function resolve(){
  const out=new Set(), libs=new Set(); const stack=[...sel];
  while(stack.length){ const s=stack.pop(); if(out.has(s)||libs.has(s)) continue; const f=FILES[s]; if(!f) continue; if(BY[s]) out.add(s); else libs.add(s); for(const d of f[5].concat(implicit(s))) stack.push(d); }
  return {mods:out,libs};
}
/* Konflikte von x gegen die aktuelle Auswahl */
function clashes(x,within){
  const S=within||sel; const res=[];
  const g=GROUPOF[x]; if(g) for(const y of g.mods) if(y!==x&&S.has(y)) res.push({y,text:g.text,art:"D",grp:g});
  for(const r of DEC.beziehungen){ if((r.art==="K"||r.art==="D")&&!r.erledigt&&r.mods.includes(x)) for(const y of r.mods) if(y!==x&&S.has(y)&&!res.some(c=>c.y===y)) res.push({y,text:r.text,art:r.art}); }
  for(const d of DEC.entscheidungen){ const ox=d.optionen.filter(o=>o.behalten.includes(x)); if(!ox.length) continue;
    for(const o of d.optionen){ if(ox.includes(o)) continue; for(const y of o.behalten) if(y!==x&&S.has(y)&&!ox.some(a=>a.behalten.includes(y))&&!res.some(c=>c.y===y)) res.push({y,text:d.frage,art:d.art,dec:d}); } }
  return res;
}
function problems(){ const out=[], seen=new Set(); for(const s of sel) for(const c of clashes(s)){ const k=[s,c.y].sort().join("|"); if(!seen.has(k)){ seen.add(k); out.push({a:s,b:c.y,art:c.art,text:c.text}); } } return out; }
function relInfo(x){
  const out=[];
  const g=GROUPOF[x]; if(g) out.push({art:"D",others:g.mods.filter(y=>y!==x),text:"Nur eins wählbar: "+g.text});
  for(const r of DEC.beziehungen) if(r.mods.includes(x)) out.push({art:r.erledigt?"S":r.art,others:r.mods.filter(y=>y!==x),text:(r.erledigt?"Geregelt: ":"")+r.text});
  for(const d of DEC.entscheidungen){ const ox=d.optionen.filter(o=>o.behalten.includes(x)); if(!ox.length) continue; const others=[...new Set(d.optionen.filter(o=>!ox.includes(o)).flatMap(o=>o.behalten))].filter(y=>y!==x); if(others.length) out.push({art:d.art,others,text:d.titel+": "+d.frage,dec:d.id}); }
  return out;
}
function thumbs(s,n){ const m=BY[s]; const im=(m&&m.img||[]).slice(0,n||1); return im.length?im.map((u,i)=>`<img src="${u}" alt="" loading="lazy" data-zoom="${s}|${i}" onerror="this.remove()">`).join(""):`<span class="noimg">${esc(PT_T[(m&&m.pt)||"m"])}</span>`; }
function askConflict(x,cl){
  return new Promise(res=>{
    const dlg=$("ask"); const ys=[...new Set(cl.map(c=>c.y))];
    $("ask-title").textContent=`${NAME(x)} oder ${ys.map(NAME).join(", ")}?`;
    const opt=s=>{ const m=BY[s]; const d=cl.find(c=>c.dec)&&cl.find(c=>c.dec).dec; const o=d&&d.optionen.find(o=>o.behalten.includes(s));
      return `<div class="cmpcard"><div class="thumbs big">${thumbs(s,3)}</div><b>${esc(m.name)}</b><p>${esc(m.notiz)}</p>${o?`<ul class="pro">${o.pro.map(p=>`<li>${esc(p)}</li>`).join("")}</ul><ul class="con">${o.contra.map(p=>`<li>${esc(p)}</li>`).join("")}</ul>`:""}<p class="hint">${m.downloadsK?fmt(m.downloadsK)+" Downloads":""}${COST[s]>=5?" · kostet spürbar FPS":""}</p></div>`; };
    $("ask-body").innerHTML=`<p>${[...new Set(cl.map(c=>c.text))].map(esc).join(" ")}</p><div class="cmp2">${opt(x)}${ys.map(opt).join("")}</div><p class="hint">Beide zusammen geht nicht. Welche soll ins Pack?</p>`;
    $("ask-btns").innerHTML=`<button class="btn primary" data-a="new">${esc(NAME(x))} nehmen</button><button class="btn" data-a="old">${esc(ys.map(NAME).join(", "))} behalten</button>`;
    $("ask-btns").onclick=e=>{ const b=e.target.closest("[data-a]"); if(!b) return; dlg.close(); res({a:b.dataset.a,ys}); };
    dlg.onclose=()=>res({a:"old",ys});
    dlg.showModal();
  });
}
async function pick(x,on){
  if(!on){ if(LOCKED.has(x)) return; sel.delete(x); saveSel(); renderBuild(); if($("detail").open) openMod(x); return; }
  const cl=clashes(x);
  if(cl.length){ const r=await askConflict(x,cl); if(r.a!=="new"){ renderBuild(); return; } r.ys.forEach(y=>{ if(!LOCKED.has(y)) sel.delete(y); }); }
  sel.add(x); saveSel(); renderBuild(); if($("detail").open) openMod(x);
}
function matchF(m){
  if((m.pt||"m")!==bt) return false;
  if(bt==="m"&&bsub&&m.cat!==bsub) return false;
  const t={sel:()=>sel.has(m.slug),rec:()=>m.rolle==="K",van:()=>m.ampel!=="R"&&m.cat!=="S",sug:()=>wizSug.has(m.slug)};
  return [...bst.f].every(k=>t[k]?t[k]():true);
}
const hasCfg=s=>!!(SETDEF[s]||X.cfgs[s]||X.rpo[s]);
function card(m){
  const on=sel.has(m.slug), lk=LOCKED.has(m.slug);
  return `<div class="card${on?" on":""}${lk?" lk":""}" data-card="${m.slug}" role="button" tabindex="0" aria-pressed="${on}">
  <div class="thumbs">${thumbs(m.slug,3)}</div>
  <div class="cbody"><span class="cname">${esc(m.name)}</span><span class="cnote">${esc(m.notiz)}</span>
  <span class="cmeta">${lk?`<span class="role K">immer dabei</span>`:m.rolle==="K"?`<span class="role K">empfohlen</span>`:""}${m.ampel==="R"?`<span class="pill R"><span class="dot R"></span>Server nötig</span>`:""}${hasCfg(m.slug)?`<span class="role">einstellbar</span>`:""}${COST[m.slug]>=5?`<span class="role">kostet FPS</span>`:""}${wizSug.has(m.slug)&&!on?`<span class="role sug">Vorschlag</span>`:""}</span></div>
  <span class="ccheck" aria-hidden="true">${on?"✓":"+"}</span><button class="cinfo" data-mod="${m.slug}">Details</button></div>`;
}
const ord=(a,b)=>(b.rolle==="K")-(a.rolle==="K")||(b.downloadsK||0)-(a.downloadsK||0);
function renderBuild(){
  $("btabs").innerHTML=Object.entries(PT_T).map(([k,l])=>{ const n=MODS.filter(m=>(m.pt||"m")===k&&FILES[m.slug]).length; const s=MODS.filter(m=>(m.pt||"m")===k&&sel.has(m.slug)).length; return `<button class="btab" data-bt="${k}" aria-pressed="${bt===k}">${l}<small>${s} von ${n}</small></button>`; }).join("");
  $("fg").innerHTML=(bt==="m"?`<button class="chip" data-sub="" aria-pressed="${!bsub}">Alle</button>`+SUBS.map(([k,l])=>`<button class="chip" data-sub="${k}" aria-pressed="${bsub===k}">${l}</button>`).join("")+`<span class="sep"></span>`:"")+XF.map(([k,l])=>k==="sug"&&!wizSug.size?"":`<button class="chip" data-filter="${k}" aria-pressed="${bst.f.has(k)}">${l}</button>`).join("");
  $("tabnote").textContent=bt==="m"&&bsub?CATS[bsub].n:TABNOTE[bt];
  const q=bst.q.toLowerCase(); const list=MODS.filter(m=>FILES[m.slug]&&matchF(m)&&(!q||(m.name+" "+m.sub+" "+m.notiz+" "+m.slug).toLowerCase().includes(q)));
  const ids=new Set(list.map(m=>m.slug)); let h="";
  const gs=GROUPS.filter(g=>g.mods.some(s=>ids.has(s))); const inG=new Set(gs.flatMap(g=>g.mods));
  if(gs.length) h+=`<h3>Nur eins wählbar <small>Vergleich nebeneinander</small></h3>`+gs.map(g=>`<div class="grp"><div class="ghead"><b>${esc(g.titel)}</b><span>${esc(g.text)}</span></div><div class="cards">${g.mods.filter(s=>BY[s]&&FILES[s]).map(s=>card(BY[s])).join("")}</div></div>`).join("");
  for(const c of (bt==="m"?["P","V","G","T","S"]:[null])){
    const l2=list.filter(m=>!inG.has(m.slug)&&(c===null||m.cat===c)).sort(ord); if(!l2.length) continue;
    const bysub={}; l2.forEach(m=>(bysub[m.sub]=bysub[m.sub]||[]).push(m));
    for(const [sb,ms] of Object.entries(bysub)) h+=`<h3>${c&&!bsub?esc(CATS[c].t)+" · ":""}${esc(sb)} <small>${ms.length}</small></h3><div class="cards">`+ms.map(card).join("")+`</div>`;
  }
  $("blist").innerHTML=h||`<div class="empty">Nichts gefunden. Nimm einen Filter heraus.</div>`;
  renderSide();
}
function packLoad(mods){ const c=[...mods].reduce((a,s)=>a+cost(s),0); return {c,l:c<15?["Leicht","G"]:c<30?["Mittel","Y"]:["Schwer","R"]}; }
function renderSide(){
  const r=resolve(); const all=new Set([...r.mods,...r.libs]);
  const red=[...r.mods].filter(s=>BY[s].ampel==="R"&&BY[s].cat!=="S"); const size=[...all].reduce((a,s)=>a+(FILES[s]?FILES[s][4]:0),0);
  const cnt=t=>[...r.mods].filter(s=>(BY[s].pt||"m")===t).length; const pl=packLoad(r.mods);
  const pr=problems(); const kc=keyConflicts().length;
  const need=[]; for(const rr of DEC.beziehungen) if(rr.art==="A"){ const [a,...rest]=rr.mods; if(sel.has(a)&&rest.some(s=>BY[s]&&!all.has(s))) need.push(NAME(a)+" braucht: "+rest.filter(s=>!all.has(s)).map(NAME).join(", ")); }
  $("mbar").innerHTML=`<b>${r.mods.size} im Pack</b><span>${pl.l[0]} · ${pr.length?pr.length+" Konflikte":"alles klar"}</span><span>Ansehen ↓</span>`;
  $("bside").innerHTML=`<h2>Dein Pack</h2>
   <div class="stats"><div><b>${cnt("m")}</b><span>Mods</span></div><div><b>${cnt("r")}</b><span>Packs</span></div><div><b>${cnt("s")}</b><span>Shader</span></div><div><b>${r.libs.size}</b><span>Bibliotheken</span></div></div>
   <div class="load"><span>Leistungsbedarf</span><div class="meter"><i class="${pl.l[1]}" style="width:${Math.min(100,pl.c/45*100)}%"></i></div><b class="${pl.l[1]}">${pl.l[0]}</b></div>
   <p class="hint">ca. ${(size/1048576).toFixed(0)} MB · Arbeitsspeicher <b>${ramGB(r)} GB</b> (steckt in der Prism-Datei)</p>
   <p class="srv ${red.length?"R":"G"}">${red.length?`${red.length} Mod${red.length===1?" braucht":"s brauchen"} einen eigenen Server.`:"Läuft auf jedem Vanilla-Server."}</p>
   ${pr.length?`<h3>Konflikte (${pr.length})</h3><ul class="warn">`+pr.map(x=>`<li><span class="tag ${x.art}">${ART[x.art]}</span> ${esc(NAME(x.a))} + ${esc(NAME(x.b))} <button class="btn sm" data-fix="${x.a}|${x.b}">Klären</button></li>`).join("")+`</ul>`:`<p class="ok">Keine Konflikte, keine Doppelungen.</p>`}
   ${need.length?`<ul class="warn">${need.map(t=>`<li><span class="tag A">fehlt</span> ${esc(t)}</li>`).join("")}</ul>`:""}
   <div class="tools"><button class="btn" data-tool="keys">Tastatur${kc?` <span class="tag K">${kc}</span>`:""}</button><button class="btn" data-tool="rp">Pack-Reihenfolge</button><button class="btn" data-tool="base">Grundeinstellungen</button></div>
   <label class="fld" for="packname">Name</label><input id="packname" value="${esc(cfg._name||"Mein Pack")}">
   <label class="chk"><input type="checkbox" id="withcfg" checked> Einstellungen und Tastenbelegung beilegen</label>
   <label class="chk"><input type="checkbox" id="testkit" ${sel.has("spark")?"checked":""}> Test-Kit (spark) beilegen</label>
   <button class="btn primary big" id="export-prism">Für Prism herunterladen</button>
   <button class="btn" id="export">.mrpack für Modrinth App</button>
   <button class="btn" id="export-srv">Server-Pack</button>
   <p class="hint" id="exp-status"></p>
   <button class="btn" id="upd">Auf Updates prüfen</button><div id="upd-out" class="hint"></div>`;
}
/* Detail-Popup */
function cfgInput(attr,t,v,o){ return t==="bool"?`<input type="checkbox" ${attr} ${v?"checked":""}>`:o?`<select ${attr}>${o.map(x=>`<option ${String(v)===String(x)?"selected":""}>${esc(x)}</option>`).join("")}</select>`:`<input ${attr} value="${esc(v)}" ${t==="num"?'inputmode="decimal"':""} size="8">`; }
function autoVal(slug,file,k){ const r=X.prules.find(p=>p.slug===slug&&p.file===file&&p.k===k&&p.wenn.every(s=>sel.has(s))); return r?r:undefined; }
function gval(slug,file,i){ const id="@"+file+"|"+i.k; if(cfg[slug]&&id in cfg[slug]) return cfg[slug][id]; const a=autoVal(slug,file,i.k); return a?a.v:i.d; }
function allCfgHtml(slug){
  const fs=X.cfgs[slug]; if(!fs) return "";
  return fs.map(f=>`<details class="chg"><summary>Alle Einstellungen aus <code>${esc(f.file)}</code> <small>${f.items.length}</small></summary><input type="search" data-cfs placeholder="Einstellung suchen …" aria-label="Einstellung suchen"><div class="ckeys">`+f.items.map(i=>{ const a=autoVal(slug,f.file,i.k); const id="@"+f.file+"|"+i.k; const ch=cfg[slug]&&id in cfg[slug];
    return `<label class="crow${ch?" changed":""}" data-name="${esc((i.k+" "+(i.h||"")).toLowerCase())}"><span>${esc(i.k)}${i.h?`<small>${esc(i.h)}</small>`:""}${a&&!ch?`<small class="auto">Automatisch angepasst: ${esc(a.text)}</small>`:""}</span>${cfgInput(`data-gcfg="${slug}|${f.file}|${i.k}"`,i.t,gval(slug,f.file,i),i.o)}</label>`; }).join("")+`</div><p class="hint">Werte stammen aus der echten Config-Datei dieser Mod-Version. Geänderte Werte werden beim Export mitgeliefert.</p></details>`).join("");
}
function rpoHtml(slug){
  const r=X.rpo[slug]; if(!r) return "";
  const flat=[]; (function walk(o,p){ for(const [k,v] of Object.entries(o)){ if(v&&typeof v==="object") walk(v,p+k+"."); else flat.push([p+k,v]); } })(r.data,"");
  return `<h3>Pack-Optionen <small>Respackopts</small></h3><p class="hint">Dieses Resource Pack hat eigene Schalter. Voreinstellung = deine Werte aus „Test Claude“.</p><div class="ckeys">`+flat.map(([k,v])=>{ const id="@rpo|"+k; const cur=cfg[slug]&&id in cfg[slug]?cfg[slug][id]:v; return `<label class="crow"><span>${esc(k.replace(/\./g," › "))}</span>${cfgInput(`data-rpo="${slug}|${k}"`,typeof v==="boolean"?"bool":typeof v==="number"?"num":"str",cur)}</label>`; }).join("")+`</div>`;
}
function openMod(slug){
  const m=BY[slug]; if(!m) return; const on=sel.has(slug); const d=X.details[slug]||{};
  $("detail-title").textContent=m.name;
  let h=m.img&&m.img.length?`<div class="gal">${m.img.map((u,i)=>`<img src="${u}" alt="" loading="lazy" data-zoom="${slug}|${i}" onerror="this.remove()">`).join("")}</div>`:"";
  if(d.yt&&d.yt.length) h+=`<div class="vids">${d.yt.map(v=>`<a class="vid" href="https://www.youtube.com/watch?v=${v}" target="_blank" rel="noopener"><img src="https://i.ytimg.com/vi/${v}/mqdefault.jpg" alt="" onerror="this.remove()"><span>▶ Video ansehen</span></a>`).join("")}</div>`;
  h+=`<p class="lead2">${esc(m.notiz)}</p>`;
  h+=`<p><span class="pill ${m.ampel}"><span class="dot ${m.ampel}"></span>${AMP[m.ampel]}</span> <span class="hint">${esc(PT_T[m.pt||"m"])} · ${esc(CATS[m.cat].t)} · ${esc(m.sub)} · Version ${esc(FILES[slug]?FILES[slug][6]:"–")}${m.downloadsK?" · "+fmt(m.downloadsK)+" Downloads":""}</span></p>`;
  if(d.txt) h+=`<details class="chg"><summary>Ausführlich (Projektseite, Englisch)</summary><div class="body">${esc(d.txt).replace(/\n/g,"<br>")}</div></details>`;
  { const deps=FILES[slug]?FILES[slug][5].concat(implicit(slug)):[]; if(deps.length) h+=`<p class="hint">Bringt automatisch mit: ${[...new Set(deps)].map(x=>esc(FILES[x]&&FILES[x][7]||NAME(x))).join(", ")}</p>`; }
  const ri=relInfo(slug);
  if(ri.length) h+=`<h3>Verträglichkeit</h3><ul class="dl-list">`+ri.map(x=>{ const st=x.others.map(y=>`${esc(NAME(y))}${sel.has(y)?` <span class="stat ${x.art==="K"||x.art==="D"?"weg":"drin"}">gewählt</span>`:""}`).join(", "); return `<li><span class="tag ${x.art}">${ART[x.art]}</span> ${st}: ${esc(x.text)}</li>`; }).join("")+`</ul>`;
  const ar=X.prules.filter(p=>p.slug===slug); if(ar.length) h+=`<p class="hint">Wird automatisch angepasst, sobald passende Mods dabei sind: ${ar.map(p=>esc(p.text)).join(" ")}</p>`;
  if(SETDEF[slug]) h+=`<h3>Wichtigste Einstellungen</h3>`+editorHtml(slug);
  h+=allCfgHtml(slug)+rpoHtml(slug);
  h+=`<div class="row-actions">${LOCKED.has(slug)?`<span class="role K">immer dabei</span>`:`<button class="btn primary" data-toggle="${slug}">${on?"Aus dem Pack entfernen":"Zum Pack hinzufügen"}</button>`}<a class="btn" href="https://modrinth.com/project/${slug}" target="_blank" rel="noopener">Auf Modrinth ansehen</a></div>`;
  $("detail-body").innerHTML=h; if(!$("detail").open) $("detail").showModal();
}
/* Bilder groß */
let lb={s:null,i:0};
function openLb(s,i){ const m=BY[s]; if(!m||!m.img||!m.img.length) return; lb={s,i:(i+m.img.length)%m.img.length}; $("lb-img").src=m.img[lb.i]; $("lb-cap").textContent=`${m.name} · Bild ${lb.i+1} von ${m.img.length}`; $("lb-link").href=`https://modrinth.com/project/${s}/gallery`; if(!$("lightbox").open) $("lightbox").showModal(); }
