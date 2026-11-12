/* ---------- builder ---------- */
const COST={"photon-shader":8,"complementary-reimagined":7,"complementary-unbound":8,"bliss-shader":9,"solas-shader":5,"bsl-shaders":5,"i-like-vanilla":3,"steadfast-shaders":3,"voxy":4,"distanthorizons":5,"living-horizon":3,"physicsmod":8,"particle-rain":3,"subtle-effects":2,"sound-physics-remastered":3,"fresh-animations":3,"fresh-animations-extensions":2,"fresh-animations-objects":2,"wakes":2,"better-smoke":2,"particle-interactions":2,"atmospherics":2,"immersive-storms":2,"chunks-fade-in":2,"spatial-gui":1,"diorama-map":2,"xaeros-world-map":2,"journeymap":3,"grassier-grass":2,"os-colorful-grasses":2,"round-trees":1,"lambdabettergrass":1,"visuality":1,"fallingleaves":1,"windy":1,"ambientsounds":1,"presence-footsteps":1,"punchy-fpa":1,"punchymoves":1,"3dskinlayers":1,"enchanted-fishing-line":1};
const BOOST=new Set(["sodium","lithium","ferrite-core","immediatelyfast","entityculling","moreculling","modernfix-mvus","badoptimizations","dynamic-fps","krypton","c2me-fabric","scalablelux","better-block-entities","ggtu"]);
const cost=s=>BOOST.has(s)?0:(COST[s]??1);
const LOCKED=new Set(MODS.filter(m=>m.cat==="P"&&m.rolle==="K").map(m=>m.slug));
/* settings editors: verified keys (Photon source, Voxy source, options.txt) */
const SHADER_LOD_FOG_DEFAULTS={
  "photon-shader":{BORDER_FOG:false,OVERWORLD_FOG_INTENSITY:"0.00",AIR_FOG_RAYLEIGH_DENSITY:"0.000",AIR_FOG_MIE_DENSITY_MORNING:"0.000",AIR_FOG_MIE_DENSITY_NOON:"0.000",AIR_FOG_MIE_DENSITY_EVENING:"0.000",AIR_FOG_MIE_DENSITY_MIDNIGHT:"0.000"},
  "complementary-reimagined":{BORDER_FOG:false,ATM_FOG_MULT:"0.50",ATM_FOG_DISTANCE:300},
  "complementary-unbound":{BORDER_FOG:false,ATM_FOG_MULT:"0.50",ATM_FOG_DISTANCE:300},
  "bliss-shader":{BorderFog:false,Haze_amount:"0.0",TOD_Fog_mult:"0.0"},
  "solas-shader":{DISTANT_FADE:false,FOG_DENSITY:"0.0"},
  "bsl-shaders":{FAR_VANILLA_FOG:0,FOG_DENSITY:"0.00",FOG_HEIGHT:false},
  "i-like-vanilla":{BORDER_FOG_ENABLED:false,DAY_ATMOSPHERIC_FOG_DENSITY:"0.0",NIGHT_ATMOSPHERIC_FOG_DENSITY:"0.0",SUNRISE_ATMOSPHERIC_FOG_DENSITY:"0.0"},
  "steadfast-shaders":{BORDER_FOG:false,ATMOSPHERE_FOG_STRENGTH_NOON:"0.0"},
  "pegasus":{FOG:0,EXPONENTIAL_FOG_:0,BORDER_FOG_START:100},
  "mellow":{BORDER_FOG:false,ATMOSPHERIC_FOG:false,ATM_FOG_STRENGTH:"0.0"},
  "makeup-ultra-fast-shaders":{FOG_ACTIVE:false,FOG_ADJUST:"20.0"},
  "astralex":{FOG:false,OVERWORLD_FOG_DENSITY:"0.0",BORDER_FOG:false},
  "noble":{AIR_FOG:0,BORDER_FOG:false},
  "sildurs-vibrant-shaders":{Fog:false,wFogDensity:"0.00"},
  "lumenite-shaders":{AERIAL_PERSPECTIVE:0,FOG:0},
  "beautify-shaders":{ATMOSPHERIC_FOG:false,FOG_DENSITY:"0.0"},
  "lumarit":{FOG:false,FOG_DENSITY:"0.0"},
  "shiroi-visuals":{VOLUMETRIC_FOG:false,FOG_DENSITY_MUL:"0.0"},
  "komorebi-shaders":{BORDER_FOG:false,FOG_DENSITY:"0.0",MORNING_FOG:false,RAIN_FOG:false}
};
const SETDEF={
 "photon-shader":{file:"Photon-Shader-Datei",items:[
  {k:"COLORED_LIGHTS",t:"bool",d:true,l:"Farbiges Licht",h:"Fackeln, Lava und Redstone färben ihre Umgebung. Kostet etwas Leistung, sieht aber am meisten nach „Ultra“ aus."},
  {k:"WATER_CAUSTICS",t:"bool",d:true,l:"Wasser-Kaustiken",h:"Tanzende Lichtmuster unter Wasser. Kostet wenig."},
  {k:"shadowMapResolution",t:"sel",o:[1024,2048,3072,4096],d:2048,l:"Schattenauflösung",h:"Höher = schärfere Schattenkanten. Bei 1440p reicht 2048."},
  {k:"shadowDistance",t:"sel",o:[96,128,160,192,256],d:160,f:v=>v.toFixed(1),l:"Schattendistanz (Blöcke)",h:"Wie weit Schatten reichen. Die wichtigste Stellschraube für FPS."},
  {k:"BLOOM_INTENSITY",t:"range",min:0,max:1.5,step:.05,d:.8,f:v=>Number(v).toFixed(2),l:"Bloom",h:"Leuchten um helle Stellen. Weniger wirkt vanilla-näher."},
  {k:"AURORA_NORMAL",t:"sel",o:["AURORA_NEVER","AURORA_RARELY","AURORA_ALWAYS"],ol:["Nie","Selten","Immer"],d:"AURORA_RARELY",l:"Polarlichter",h:"Polarlichter am Nachthimmel."},
  {k:"BLOCKY_CLOUDS",t:"bool",d:false,l:"Blockwolken",h:"An = eckige Wolken wie in Vanilla, aus = weiche volumetrische Wolken."},
  {k:"HANDHELD_LIGHTING",t:"bool",d:false,l:"Licht in der Hand (Photon)",h:"Aus lassen, wenn LambDynamicLights drin ist, sonst doppelt hell."},
  {k:"DESERT_SANDSTORM",t:"bool",d:false,l:"Sandsturm (Photon)",h:"Aus lassen, wenn Particle Rain drin ist, das macht eigene Sandstürme."},
  {k:"TAAU",t:"bool",d:false,l:"Upscaling (TAAU)",h:"Rendert intern kleiner und rechnet hoch. Nur einschalten, wenn FPS fehlen."},
  {k:"MOTION_BLUR",t:"bool",d:false,l:"Bewegungsunschärfe",h:"Filmischer Look, stört beim normalen Spielen."}]},
 "voxy":{file:"config/voxy-config.json",items:[
  {k:"section_render_distance",t:"sel",o:[8,12,16,24,32],ol:["256 Chunks","384 Chunks","512 Chunks","768 Chunks","1024 Chunks"],d:16,l:"Fernsicht",h:"Wie weit Voxy die Landschaft zeigt. 512 ist ein guter Start für eine 3080."},
  {k:"sub_division_size",t:"sel",o:[32,48,64,96,128],d:64,l:"Detail in der Ferne",h:"Kleiner = detailreicher in der Ferne, kostet Leistung."},
  {k:"use_sodium",t:"bool",d:true,l:"Sodium-Threads mitnutzen",h:"Laut Voxy weniger Ruckler beim schnellen Fliegen."}]}
};
const BASE={items:[
  {k:"renderDistance",t:"sel",o:[8,10,12,16,20,24],d:16,l:"Sichtweite (Chunks)",h:"Normale Sichtweite. Dahinter übernimmt Voxy."},
  {k:"simulationDistance",t:"sel",o:[6,8,10,12],d:10,l:"Simulationsdistanz",h:"Wie weit die Welt aktiv ist. Weniger entlastet die CPU."},
  {k:"maxFps",t:"sel",o:[60,120,140,165,240,260],ol:["60","120","140","165","240","Unbegrenzt"],d:140,l:"FPS-Limit",h:"Mit G-Sync knapp unter der Bildwiederholrate: 140 bei 144 Hz."}]};
let cfg={};
function cv(slug,k){ const def=(slug==="_base"?BASE:SETDEF[slug]).items.find(i=>i.k===k); return cfg[slug]&&k in cfg[slug]?cfg[slug][k]:def.d; }
function setCv(slug,k,v){ cfg={...cfg,[slug]:{...(cfg[slug]||{}),[k]:v}}; saveSel(); }
function editorHtml(slug){
  const def=slug==="_base"?BASE:SETDEF[slug]; if(!def) return "";
  return `<div class="ed" data-ed="${slug}">`+def.items.map(i=>{ const v=cv(slug,i.k); let c="";
    if(i.t==="bool") c=`<input type="checkbox" data-cfg="${slug}|${i.k}" ${v?"checked":""}>`;
    else if(i.t==="sel") c=`<select data-cfg="${slug}|${i.k}">`+i.o.map((o,n)=>`<option value="${o}" ${String(o)===String(v)?"selected":""}>${esc(i.ol?i.ol[n]:o)}</option>`).join("")+`</select>`;
    else c=`<input type="range" min="${i.min}" max="${i.max}" step="${i.step}" value="${v}" data-cfg="${slug}|${i.k}"><output>${Number(v).toFixed(2)}</output>`;
    return `<div class="eitem"><label><span class="el">${esc(i.l)}</span>${c}</label><p class="eh">${esc(i.h)}${String(v)!==String(i.d)?` <button class="link" data-cfgreset="${slug}|${i.k}">Standard</button>`:""}</p></div>`;}).join("")+`</div>`;
}
let sel=new Set(LOCKED), bst={q:"",f:new Set()}, wizSug=new Set();
const FILTERS=[["sel","Ausgewählt"],["rec","Empfohlen"],["new","Neu & gehypt"],["G","Nur Client"],["R","Server nötig"],["P","Performance"],["V","Optik & Sound"],["G-cat","Gameplay"],["T","Welt & Terrain"],["m","Mods"],["s","Shader"],["r","Resource Packs"],["sug","Assistent-Vorschläge"]];
function saveSel(){ try{ localStorage.setItem("mk-sel2",JSON.stringify({s:[...sel],c:cfg})); }catch(e){} }
function loadSel(){
  const hm=location.hash.match(/^#pack-([0-9a-z.]+)$/); if(hm){ try{ sel=new Set([...LOCKED,...hm[1].split(".").map(x=>MODS[parseInt(x,36)]&&MODS[parseInt(x,36)].slug).filter(Boolean)]); return true; }catch(e){} }
  try{ const v=JSON.parse(localStorage.getItem("mk-sel2")||"null"); if(v&&v.s){ sel=new Set([...LOCKED,...v.s.filter(s=>BY[s])]); cfg=v.c||{}; return true; } }catch(e){} return false;
}
function resolve(){
  const out=new Set(), libs=new Set(); const stack=[...sel];
  while(stack.length){ const s=stack.pop(); if(out.has(s)||libs.has(s)) continue; const f=FILES[s]; if(!f) continue; if(BY[s]) out.add(s); else libs.add(s); for(const d of f[5]) stack.push(d); }
  return {mods:out,libs};
}
/* conflicts of slug x against current selection */
function clashes(x){
  const res=[];
  for(const r of DEC.beziehungen){ if((r.art==="K"||r.art==="D")&&!r.erledigt&&r.mods.includes(x)) for(const y of r.mods) if(y!==x&&sel.has(y)) res.push({y,text:r.text,art:r.art}); }
  for(const d of DEC.entscheidungen){ const ox=d.optionen.filter(o=>o.behalten.includes(x)); if(!ox.length) continue;
    for(const o of d.optionen){ if(ox.includes(o)) continue; for(const y of o.behalten) if(y!==x&&sel.has(y)&&!ox.some(a=>a.behalten.includes(y))&&!res.some(c=>c.y===y)) res.push({y,text:d.frage,art:d.art,dec:d}); } }
  return res;
}
function relInfo(x){ // for popup: live status
  const out=[];
  for(const r of DEC.beziehungen) if(r.mods.includes(x)) out.push({art:r.erledigt?"S":r.art,others:r.mods.filter(y=>y!==x),text:(r.erledigt?"Geregelt: ":"")+r.text});
  for(const d of DEC.entscheidungen){ const ox=d.optionen.filter(o=>o.behalten.includes(x)); if(!ox.length) continue; const others=[...new Set(d.optionen.filter(o=>!ox.includes(o)).flatMap(o=>o.behalten))].filter(y=>y!==x); if(others.length) out.push({art:d.art,others,text:d.titel+": "+d.frage,dec:d.id}); }
  return out;
}
function askConflict(x,cl){
  return new Promise(res=>{
    const dlg=$("ask"); const ys=[...new Set(cl.map(c=>c.y))];
    $("ask-title").textContent=`${NAME(x)} überschneidet sich`;
    $("ask-body").innerHTML=cl.map(c=>`<p><span class="tag ${c.art}">${ART[c.art]}</span> <b>${esc(NAME(x))}</b> und <b>${esc(NAME(c.y))}</b>: ${esc(c.text)}</p>`).join("")+(cl[0].dec?(()=>{const d=cl[0].dec; const o=d.optionen.find(o=>o.behalten.includes(x)); return o?`<div class="cmp"><div><b>${esc(o.label)}</b><ul class="pro">${o.pro.map(p=>`<li>${esc(p)}</li>`).join("")}</ul><ul class="con">${o.contra.map(p=>`<li>${esc(p)}</li>`).join("")}</ul></div>`+d.optionen.filter(q=>q!==o&&q.behalten.some(y=>ys.includes(y))).map(q=>`<div><b>${esc(q.label)}</b><ul class="pro">${q.pro.map(p=>`<li>${esc(p)}</li>`).join("")}</ul><ul class="con">${q.contra.map(p=>`<li>${esc(p)}</li>`).join("")}</ul></div>`).join("")+`</div>`:"";})():"")+`<p class="hint">Welche soll bleiben?</p>`;
    $("ask-btns").innerHTML=`<button class="btn primary" data-a="new">${esc(NAME(x))} nehmen</button><button class="btn" data-a="old">${esc(ys.map(NAME).join(", "))} behalten</button><button class="btn" data-a="both">Beide behalten</button>`;
    $("ask-btns").onclick=e=>{ const b=e.target.closest("[data-a]"); if(!b) return; dlg.close(); res({a:b.dataset.a,ys}); };
    dlg.showModal();
  });
}
async function pick(x,on){
  if(!on){ if(LOCKED.has(x)) return; sel.delete(x); saveSel(); renderBuild(); return; }
  const cl=clashes(x);
  if(cl.length){ const r=await askConflict(x,cl); if(r.a==="old"){ renderBuild(); return; } if(r.a==="new") r.ys.forEach(y=>{ if(!LOCKED.has(y)) sel.delete(y); }); }
  sel.add(x); saveSel(); renderBuild(); if($("detail").open) openMod(x);
}
function matchF(m){
  const f=bst.f; if(!f.size) return true; const tests={sel:()=>sel.has(m.slug),rec:()=>m.rolle==="K",new:()=>m.quellen.some(q=>q==="NEU"||q==="Video"||q==="PC"),G:()=>m.ampel==="G"||m.ampel==="Y",R:()=>m.ampel==="R",P:()=>m.cat==="P",V:()=>m.cat==="V","G-cat":()=>m.cat==="G",T:()=>m.cat==="T",m:()=>m.pt==="m",s:()=>m.pt==="s",r:()=>m.pt==="r",sug:()=>wizSug.has(m.slug)};
  return [...f].every(k=>tests[k]());
}
function renderBuild(){
  $("fg").innerHTML=FILTERS.map(([k,l])=>k==="sug"&&!wizSug.size?"":`<button class="chip" data-filter="${k}" aria-pressed="${bst.f.has(k)}">${l}</button>`).join("");
  const q=bst.q.toLowerCase(); let h="";
  for(const [k,c] of Object.entries(CATS)){
    const list=MODS.filter(m=>m.cat===k&&FILES[m.slug]&&matchF(m)&&(!q||(m.name+" "+m.sub+" "+m.notiz).toLowerCase().includes(q))); if(!list.length) continue;
    h+=`<h3>${c.t}</h3><div class="list">`+list.map(m=>{const on=sel.has(m.slug), lk=LOCKED.has(m.slug), cl=!on&&clashes(m.slug).length;
      const img=m.img&&m.img[0]?`<img class="mini" src="${m.img[0]}" alt="" loading="lazy" onerror="this.remove()">`:"";
      return `<div class="brow${on?" on":""}"><input type="checkbox" aria-label="${esc(m.name)} auswählen" data-pick="${m.slug}" ${on?"checked":""} ${lk?"disabled":""}>${img}<button class="bname link2" data-mod="${m.slug}">${esc(m.name)}</button><span class="bnote">${esc(m.notiz)}</span><span class="bmeta"><span class="pill ${m.ampel}"><span class="dot ${m.ampel}"></span>${AMP[m.ampel]}</span>${lk?`<span class="role K">fest</span>`:m.rolle==="K"?`<span class="role K">empfohlen</span>`:""}${wizSug.has(m.slug)&&!on?`<span class="role sug">Vorschlag</span>`:""}${cl?`<span class="stat weg">überschneidet sich</span>`:""}${SETDEF[m.slug]?`<span class="role">einstellbar</span>`:""}</span></div>`;}).join("")+`</div>`;
  }
  $("blist").innerHTML=h||`<div class="empty">Nichts gefunden. Nimm einen Filter heraus.</div>`;
  renderSide();
}
function packLoad(mods){ const c=[...mods].reduce((a,s)=>a+cost(s),0); return {c,l:c<15?["Leicht","G"]:c<30?["Mittel","Y"]:["Schwer","R"]}; }
function renderSide(){
  const r=resolve(); const all=new Set([...r.mods,...r.libs]);
  const red=[...r.mods].filter(s=>BY[s].ampel==="R"); const size=[...all].reduce((a,s)=>a+(FILES[s]?FILES[s][4]:0),0);
  const cnt=t=>[...r.mods].filter(s=>BY[s].pt===t).length; const pl=packLoad(r.mods);
  const ws=[]; const seen=new Set();
  for(const s of sel){ for(const c of clashes(s)){ const key=[s,c.y].sort().join("|"); if(!seen.has(key)){ seen.add(key); ws.push({art:c.art,text:`${NAME(s)} + ${NAME(c.y)}: ${c.text}`}); } } }
  for(const rr of DEC.beziehungen) if(rr.art==="A"){ const [a,...rest]=rr.mods; if(sel.has(a)&&rest.some(s=>BY[s]&&!all.has(s))) ws.push({art:"A",text:NAME(a)+" braucht: "+rest.filter(s=>!all.has(s)).map(NAME).join(", ")}); }
  let log=""; try{ const last=JSON.parse(localStorage.getItem("mk-last")||"null"); if(last){ const add=[...r.mods].filter(s=>!last.f[s]), rem=Object.keys(last.f).filter(s=>BY[s]&&!r.mods.has(s)), up=[...r.mods].filter(s=>last.f[s]&&last.f[s]!==FILES[s][6]); if(add.length||rem.length||up.length) log=`<details class="chg"><summary>Seit deinem letzten Export (${new Date(last.at).toLocaleDateString("de-DE")})</summary>${add.length?`<p>+ ${add.map(NAME).map(esc).join(", ")}</p>`:""}${rem.length?`<p>− ${rem.map(NAME).map(esc).join(", ")}</p>`:""}${up.length?`<p>↑ ${up.map(s=>esc(NAME(s))+" "+esc(FILES[s][6])).join(", ")}</p>`:""}</details>`; } }catch(e){}
  $("bside").innerHTML=`<h2>Dein Pack</h2>
   <div class="stats"><div><b>${cnt("m")}</b><span>Mods</span></div><div><b>${cnt("r")}</b><span>Resource Packs</span></div><div><b>${cnt("s")}</b><span>Shader</span></div><div><b>${r.libs.size}</b><span>Bibliotheken</span></div></div>
   <div class="load"><span>Leistungsbedarf</span><div class="meter"><i class="${pl.l[1]}" style="width:${Math.min(100,pl.c/45*100)}%"></i></div><b class="${pl.l[1]}">${pl.l[0]}</b></div>
   <p class="hint">ca. ${(size/1048576).toFixed(0)} MB · Fabric Loader 0.20.1 · MC 26.3</p>
   <p class="srv ${red.length?"R":"G"}">${red.length?`Braucht einen eigenen Server: ${red.length} Mod${red.length===1?"":"s"} müssen auch auf den Server.`:"Läuft auf jedem Vanilla-Server."}</p>
   ${ws.length?`<h3>Zu klären (${ws.length})</h3><ul class="warn">`+ws.map(x=>`<li><span class="tag ${x.art}">${ART[x.art]}</span> ${esc(x.text)}</li>`).join("")+`</ul>`:`<p class="ok">Keine offenen Überschneidungen.</p>`}
   ${log}
   <details class="chg"><summary>Grundeinstellungen</summary>${editorHtml("_base")}</details>
   <label class="fld" for="packname">Name</label><input id="packname" value="Mein Pack">
   <label class="chk"><input type="checkbox" id="withcfg" checked> Einstellungen beilegen</label>
   <button class="btn primary big" id="export">.mrpack herunterladen</button>
   ${red.length?`<button class="btn" id="export-srv">Server-Pack herunterladen</button>`:""}
   <p class="hint" id="exp-status"></p>
   <button class="btn" id="upd">Auf Updates prüfen</button><div id="upd-out" class="hint"></div>`;
}
function openMod(slug){
  const m=BY[slug]; if(!m) return; const on=sel.has(slug);
  $("detail-title").textContent=m.name;
  let h=m.img&&m.img.length?`<div class="gal">${m.img.map(u=>`<a href="${galUrl(slug)}" target="_blank" rel="noopener"><img src="${u}" alt="" loading="lazy" onerror="this.parentNode.remove()"></a>`).join("")}</div>`:"";
  h+=`<p>${esc(m.notiz)}</p><p><span class="pill ${m.ampel}"><span class="dot ${m.ampel}"></span>${AMP[m.ampel]}</span> <span class="hint">${esc(CATS[m.cat].t)} · ${esc(m.sub)} · Version ${esc(FILES[slug]?FILES[slug][6]:"–")}</span></p><p>${previewLinks(slug)} · <a href="https://modrinth.com/project/${slug}" target="_blank" rel="noopener">Modrinth</a></p>`;
  if(FILES[slug]&&FILES[slug][5].length) h+=`<p class="hint">Bringt automatisch mit: ${FILES[slug][5].map(d=>esc(FILES[d]&&FILES[d][7]||NAME(d))).join(", ")}</p>`;
  const ri=relInfo(slug);
  if(ri.length) h+=`<h3>Verträglichkeit</h3><ul class="dl-list">`+ri.map(x=>{ const st=x.others.map(y=>`${esc(NAME(y))}${sel.has(y)?` <span class="stat ${x.art==="K"||x.art==="D"?"weg":"drin"}">gewählt</span>`:""}`).join(", "); return `<li><span class="tag ${x.art}">${ART[x.art]}</span> ${st}: ${esc(x.text)}</li>`; }).join("")+`</ul>`;
  else h+=`<p class="ok">Keine bekannten Überschneidungen.</p>`;
  if(SETDEF[slug]) h+=`<h3>Einstellungen</h3><p class="hint">Landen beim Export im Pack (${esc(SETDEF[slug].file)}).</p>`+editorHtml(slug);
  h+=`<div class="row-actions">${LOCKED.has(slug)?`<span class="role K">fest im Pack</span>`:`<button class="btn primary" data-toggle="${slug}">${on?"Aus dem Pack entfernen":"Zum Pack hinzufügen"}</button>`}</div>`;
  $("detail-body").innerHTML=h; if(!$("detail").open) $("detail").showModal();
}
/* assistant */
const WIZ=[
 {k:"srv",q:"Wo spielst du?",o:[["vanilla","Auf dem Vanilla-Server meiner Freunde"],["own","Singleplayer oder eigener Server"]]},
 {k:"feel",q:"Wie nah an Vanilla soll es bleiben?",o:[["pure","Fast wie Vanilla, nur schöner"],["plus","Vanilla+ mit Komfort"],["more","Gern auch neuer Inhalt"]]},
 {k:"shader",q:"Shader?",o:[["photon","Ja, Photon"],["none","Nein, lieber mehr FPS"]]},
 {k:"lod",q:"Fernsicht?",o:[["voxy","Ja, Voxy"],["none","Nein"]]},
 {k:"anim",q:"Spieler-Animationen?",o:[["punchy","Punchy"],["none","Keine"]]}];
let wizA={};
function renderWiz(){
  $("wiz-body").innerHTML=WIZ.map(w=>`<fieldset class="wq"><legend>${esc(w.q)}</legend>${w.o.map(([v,l])=>`<label class="chk"><input type="radio" name="w-${w.k}" value="${v}" ${wizA[w.k]===v?"checked":""}> ${esc(l)}</label>`).join("")}</fieldset>`).join("")+`<div class="row-actions"><button class="btn primary" id="wiz-go">Vorschläge zeigen</button><span class="hint">Es wird nichts automatisch angehakt.</span></div>`;
}
function wizRun(){
  WIZ.forEach(w=>{ const c=document.querySelector(`input[name="w-${w.k}"]:checked`); if(c) wizA[w.k]=c.value; });
  const ms=modStatus(); const s=new Set();
  for(const m of MODS){ if(LOCKED.has(m.slug)) continue;
    if(wizA.srv==="vanilla"&&m.ampel==="R") continue;
    if(m.cat==="G"||m.cat==="T"){ if(wizA.srv==="vanilla"||wizA.feel==="pure") continue; if(wizA.feel==="plus"&&m.cat==="T"&&m.rolle!=="K") continue; }
    const rec=m.rolle==="K"||(ms[m.slug]&&ms[m.slug].state==="drin"); if(!rec) continue; if(ms[m.slug]&&ms[m.slug].state==="weg") continue;
    s.add(m.slug); }
  if(wizA.shader==="none") ["iris","photon-shader"].forEach(x=>s.delete(x));
  if(wizA.lod==="none") s.delete("voxy"), s.delete("living-horizon");
  if(wizA.anim==="none") MODS.filter(m=>m.sub==="Spieler-Animation"||m.sub==="Punchy-Packs").forEach(m=>s.delete(m.slug));
  wizSug=s; bst.f=new Set(["sug"]); $("wiz").close(); renderBuild();
  $("blist").insertAdjacentHTML("afterbegin",`<div class="sugbar"><b>${s.size} Vorschläge</b> passend zu deinen Antworten. Klick auf die Namen, um sie anzusehen.<button class="btn primary" id="sug-all">Alle Vorschläge übernehmen</button></div>`);
}
/* export */
const PRIO=["fresh-animations-objects","fresh-animations-extensions","fa-player-extension","fresh-animations-emissive","fresh-animations","hyper-punchy","fluid-foolish","fresh-food-for-hyper-punchy"];
function rpOrder(rps){ const top=rps.filter(s=>PRIO.includes(s)).sort((a,b)=>PRIO.indexOf(b)-PRIO.indexOf(a)); const rest=rps.filter(s=>!PRIO.includes(s)); return ["vanilla",...rest.map(s=>"file/"+decodeURIComponent(FILES[s][1])),...top.map(s=>"file/"+decodeURIComponent(FILES[s][1]))]; }
async function exportPack(server){
  const st2=$("exp-status"); st2.textContent="Pack wird gebaut …";
  if(!window.JSZip){ st2.textContent="Die Zip-Bibliothek konnte nicht geladen werden. Seite neu laden."; return; }
  const r=resolve(); let all=[...r.mods,...r.libs];
  if(server){ const keep=new Set(); const stack=[...r.mods].filter(s=>BY[s].ampel==="R"||BY[s].ampel==="Y"); while(stack.length){ const s=stack.pop(); if(keep.has(s)||!FILES[s]) continue; if(BY[s]&&BY[s].pt!=="m") continue; keep.add(s); FILES[s][5].forEach(d=>stack.push(d)); } all=[...keep]; }
  const name=($("packname").value||"Mein Pack").trim()+(server?" Server":"");
  const env=s=>{ const m=BY[s]; const a=m?m.ampel:"Y"; return {client:"required",server:a==="G"?"unsupported":a==="R"?"required":"optional"}; };
  const dir=s=>{ const t=BY[s]?BY[s].pt:(FILES[s][8]||"m"); return t==="r"?"resourcepacks":t==="s"?"shaderpacks":"mods"; };
  const files=all.map(s=>{const f=FILES[s]; return {path:dir(s)+"/"+decodeURIComponent(f[1]),hashes:{sha1:f[2],sha512:f[3]},env:env(s),downloads:[f[0]],fileSize:f[4]};});
  const index={formatVersion:1,game:"minecraft",versionId:"1.0.0",name,summary:"Erstellt mit dem Mod-Katalog 26.3",files,dependencies:{minecraft:"26.3","fabric-loader":"0.20.1"}};
  const zip=new JSZip(); zip.file("modrinth.index.json",JSON.stringify(index,null,2));
  if($("withcfg").checked&&!server){
    const rps=[...r.mods].filter(s=>BY[s].pt==="r"); const B=k=>cv("_base",k);
    zip.file("overrides/config/yosbr/options.txt",[`renderDistance:${B("renderDistance")}`,`simulationDistance:${B("simulationDistance")}`,`maxFps:${B("maxFps")}`,"enableVsync:false",'renderClouds:"false"',"mipmapLevels:4","biomeBlendRadius:2","resourcePacks:"+JSON.stringify(rpOrder(rps))].join("\n")+"\n");
    if(r.mods.has("iris")){
      const sp=[...r.mods].find(s=>BY[s].pt==="s");
      if(sp){
        const pf=decodeURIComponent(FILES[sp][1]);
        zip.file("overrides/config/yosbr/config/iris.properties","enableShaders=true\nshaderPack="+pf+"\n");
        const sMap=new Map(); const sLOD=SHADER_LOD_FOG_DEFAULTS[sp]||{}; for(const [k,v] of Object.entries(sLOD)) sMap.set(k,String(v));
        const sItems=(SETDEF[sp]&&SETDEF[sp].items)||[]; for(const i of sItems){ const v=cv(sp,i.k); sMap.set(i.k,String(i.f?i.f(Number(v)):v)); }
        if(sMap.size>0) zip.file("overrides/shaderpacks/"+pf+".txt",[...sMap.entries()].map(([k,v])=>k+"="+v).join("\n")+"\n");
      }
    }
    if(r.mods.has("voxy")) zip.file("overrides/config/yosbr/config/voxy-config.json",JSON.stringify({enabled:true,enable_rendering:true,ingest_enabled:true,section_render_distance:Number(cv("voxy","section_render_distance")),sub_division_size:Number(cv("voxy","sub_division_size")),dont_use_sodium_builder_threads:!cv("voxy","use_sodium")},null,2));
    zip.file("overrides/LIES-MICH.txt","Erstellt mit dem Mod-Katalog 26.3.\nStandard-Einstellungen liegen in config/yosbr/ und überschreiben nie deine eigenen.\nFeste Versionen: Sodium 0.9.2, Iris 1.11.7, Voxy 0.2.20-beta, Photon v1.4. Nur zusammen aktualisieren.\n");
  }
  const blob=await zip.generateAsync({type:"blob",compression:"DEFLATE"});
  const fname=name.replace(/[^\w\- ]+/g,"").replace(/\s+/g,"-")+".mrpack";
  const dl=window.claude&&window.claude.use?await window.claude.use("downloads"):null;
  let ok=false;
  if(dl){ try{ const res=await dl.save({filename:fname,data:blob}); ok=res&&res.status==="saved"; st2.textContent=ok?`Gespeichert: ${fname}`:"Abgebrochen."; }catch(e){ st2.textContent="Speichern hat nicht geklappt."; } }
  else{ const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=fname; document.body.appendChild(a); a.click(); a.remove(); ok=true; st2.textContent=`Heruntergeladen: ${fname}. In Prism: Instanz hinzufügen → Importieren.`; }
  if(ok&&!server){ try{ localStorage.setItem("mk-last",JSON.stringify({at:new Date().toISOString(),f:Object.fromEntries([...r.mods].map(s=>[s,FILES[s][6]]))})); }catch(e){} }
  if(ok&&db&&mode==="shared"){ try{ await db.doc("packs/letzter").set({name,slugs:[...sel],cfg,by:myId||null,at:new Date().toISOString()}); }catch(e){} }
}
const PINNED=["sodium","iris","voxy","photon-shader"];
async function checkUpdates(){
  const out=$("upd-out"); out.textContent="Frage Modrinth …";
  const r=resolve(); const mods=[...r.mods,...r.libs].filter(s=>(BY[s]?BY[s].pt:"m")==="m");
  try{
    const res=await fetch("https://api.modrinth.com/v2/version_files/update",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({hashes:mods.map(s=>FILES[s][2]),algorithm:"sha1",loaders:["fabric"],game_versions:["26.3"]})});
    const data=await res.json(); const upd=[]; mods.forEach(s=>{ const v=data[FILES[s][2]]; if(v&&v.version_number!==FILES[s][6]) upd.push([s,v.version_number,v.version_type]); });
    out.innerHTML= upd.length ? `<b>${upd.length} Updates</b><ul class="dl-list">`+upd.map(([s,v,t])=>`<li>${esc(BY[s]?BY[s].name:FILES[s][7]||s)}: ${esc(FILES[s][6])} → ${esc(v)}${t!=="release"?" (Beta)":""}${PINNED.includes(s)?` <span class="tag K">fest</span>`:""}</li>`).join("")+`</ul>` : "Alles aktuell.";
  }catch(e){ out.textContent="Modrinth ist von hier aus nicht erreichbar. Auf der GitHub-Seite funktioniert die Prüfung."; }
}
async function loadUpdateReport(){
  try{ const r=await fetch("data/updates.json",{cache:"no-store"}); if(!r.ok) return; const u=await r.json();
    const n=u.next; $("upd-banner").innerHTML=`<div class="sugbar"><span>Automatische Prüfung vom ${new Date(u.checked).toLocaleDateString("de-DE")}: <b>${u.updates.length}</b> Updates für 26.3.${n?` Bereit für <b>${esc(n.version)}</b>: ${n.ready} von ${n.total} Mods.`:""}</span></div>`; }catch(e){}
}
