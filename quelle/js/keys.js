/* Tastatur: Standardbelegungen stammen aus der echten options.txt deines Packs */
const KEYDB=X.keys.map(([id,def,mod,ctx])=>({id,def,mod,ctx}));
const LBL={"z":"Y","y":"Z","semicolon":"Ö","apostrophe":"Ä","left.bracket":"Ü","right.bracket":"+","minus":"ß","equal":"´","grave.accent":"^","slash":"-","backslash":"#","world.2":"<","left.shift":"Shift","right.shift":"Shift","left.control":"Strg","right.control":"Strg","left.alt":"Alt","right.alt":"AltGr","space":"Leertaste","tab":"Tab","caps.lock":"Feststell","enter":"Enter","backspace":"⌫","escape":"Esc","left.win":"Win","maus.left":"Maus links","maus.right":"Maus rechts","maus.middle":"Mausrad","maus.4":"Maus 4","maus.5":"Maus 5","comma":",","period":".","insert":"Einfg","delete":"Entf","home":"Pos1","end":"Ende","page.up":"Bild↑","page.down":"Bild↓","up":"↑","down":"↓","left":"←","right":"→"};
const kl=k=>k?(LBL[k]||k.toUpperCase()):"–";
const KB=[["escape","f1","f2","f3","f4","f5","f6","f7","f8","f9","f10","f11","f12"],["grave.accent","1","2","3","4","5","6","7","8","9","0","minus","equal","backspace"],["tab","q","w","e","r","t","y","u","i","o","p","left.bracket","right.bracket"],["caps.lock","a","s","d","f","g","h","j","k","l","semicolon","apostrophe","backslash","enter"],["left.shift","world.2","z","x","c","v","b","n","m","comma","period","slash","right.shift"],["left.control","left.win","left.alt","space","right.alt","right.control"],["maus.left","maus.middle","maus.right","maus.4","maus.5","insert","delete","home","end","page.up","page.down"]];
const KALL=KB.flat();
const KEYIMPORTANT=new Set(["zoomify.key.zoom","key.diorama.open_map","key.voice_chat","key.freecam.toggle","key.chesttracker.open_gui","key.jade.show_overlay","key.crawl","key.carry.desc"]);
let kSel=null;
function kv(id){ const c=cfg._keys||{}; if(id in c) return c[id]; const k=KEYDB.find(x=>x.id===id); return k?k.def:""; }
function activeKeys(){ return KEYDB.filter(k=>(k.mod==="vanilla"||k.mod==="vanilla-f3")?true:sel.has(k.mod)); }
function keyConflicts(){ const m={}; for(const k of activeKeys()){ if(k.ctx==="f3") continue; const v=kv(k.id); if(!v) continue; const key=k.ctx+"|"+v; (m[key]=m[key]||[]).push(k); } return Object.entries(m).filter(([v,l])=>l.length>1).map(([v,l])=>[v.split("|")[1],l,v.split("|")[0]]); }
const kname=v=>v.startsWith("maus.")?"key.mouse."+v.slice(5):"key.keyboard."+v;
function keyLines(){ const c=cfg._keys||{}; return Object.keys(c).filter(id=>activeKeys().some(k=>k.id===id)).map(id=>`key_${id}:${c[id]?kname(c[id]):"key.keyboard.unknown"}`); }
function kLabel(k){ return (k.mod==="vanilla"?"Minecraft":NAME(k.mod))+": "+k.id.replace(/^(key|keybind|keybinding)\./,"").replace(/^[^.]+\./,"").replace(/[._]/g," "); }
function autoFixKeys(){
  const c={...(cfg._keys||{})};
  for(const [v,l] of keyConflicts()){
    const keep=l.find(k=>k.mod==="vanilla")||l.find(k=>KEYIMPORTANT.has(k.id))||l[0];
    for(const k of l) if(k!==keep) c[k.id]="";
  }
  cfg={...cfg,_keys:c}; saveSel();
}
function keysHtml(){
  const conf=keyConflicts(); const act=activeKeys(); const used={};
  for(const k of act){ if(k.ctx==="f3") continue; const v=kv(k.id); if(v) (used[v]=used[v]||[]).push(k); }
  const bad=new Set(conf.map(c=>c[0]));
  const kb=KB.map(row=>`<div class="kbrow">`+row.map(k=>`<button class="kk${bad.has(k)?" bad":used[k]?" used":""}${kSel===k?" cur":""} k-${k.replace(/\./g,"_")}" data-kk="${k}" title="${esc((used[k]||[]).map(kLabel).join("\n"))}">${esc(kl(k))}${used[k]?`<i>${used[k].length}</i>`:""}</button>`).join("")+`</div>`).join("");
  let h=`<p class="catnote">So ist deine Tastatur mit diesem Pack belegt. Rot = doppelt belegt (gleiche Situation, z. B. beide im Spiel). Nur wichtige Tasten werden vorbelegt, alles andere stellst du im Spiel unter Optionen › Steuerung ein.</p>
  ${conf.length?`<p class="srv R">${conf.length} Doppelbelegung${conf.length===1?"":"en"} <button class="btn sm" id="kfix">Automatisch lösen</button></p>`:`<p class="ok">Keine Doppelbelegungen.</p>`}
  <div class="kbd">${kb}</div><p class="hint">Grau = frei · grün = belegt · rot = doppelt. Taste anklicken, um zu sehen und zu ändern, was darauf liegt.</p>`;
  if(kSel){ const on=(used[kSel]||[]); h+=`<h3>Taste ${esc(kl(kSel))}</h3>`+(on.length?`<div class="keys">`+on.map(k=>`<label class="krow${bad.has(kSel)?" bad":""}"><span>${esc(kLabel(k))}<small>${k.ctx==="menu"?"in Menüs":"im Spiel"}</small></span><select data-key="${k.id}"><option value="">– keine (im Spiel selbst belegen) –</option>${KALL.map(o=>`<option value="${o}" ${o===kv(k.id)?"selected":""}>${esc(kl(o))}${used[o]&&o!==kv(k.id)?" (belegt)":""}</option>`).join("")}</select></label>`).join("")+`</div>`:`<p class="hint">Frei.</p>`); }
  if(conf.length) h+=`<h3>Doppelt belegt</h3><ul class="dl-list">`+conf.map(([v,l])=>`<li><b>${esc(kl(v))}</b>: ${l.map(k=>esc(kLabel(k))).join(" · ")}</li>`).join("")+`</ul>`;
  const changed=Object.entries(cfg._keys||{}); if(changed.length) h+=`<h3>Von dir/automatisch geändert</h3><ul class="dl-list">`+changed.map(([id,v])=>{ const k=KEYDB.find(x=>x.id===id); return k?`<li>${esc(kLabel(k))}: ${esc(kl(k.def))} → ${v?esc(kl(v)):"nicht belegt"} <button class="btn sm" data-kreset="${id}">zurück</button></li>`:""; }).join("")+`</ul>`;
  return h;
}
/* Resource-Pack-Reihenfolge (oben = höchste Priorität) */
const RPRANK=[["fresh-flower-pots","round-trees","fresh-skeleton-physics"],["fresh-animations-extensions","fa-player-extension","just-expressions","detailed-animations","als-piglins-revamped-x-fresh-animations","als-zombies-revamped-x-fresh-animations","als-enderman-revamped-x-fresh-animations","als-skeletons-revamped-x-fresh-animations","assorted-allays-x-fresh-animations","bare-bones-x-fresh-animations","als-creepers-revamped"],["fresh-animations"],["fresh-food-for-hyper-punchy","hyper-punchy","fluid-foolish","theones-eating-animation-pack"],["fresh-food","fresh-flowers-and-plants","fresh-ores-and-ingots","fresh-buckets","fresh-music-discs","just-3d-potions","glowing-3d-totem","refined-buckets","findreks-3d-buckets-and-fish","fyoncles-3d-trims","glowing-3d-armor","3d-flint-steel-for-punchy","animated-3d-wind-charge-compatible-with-punchy","luminous-lanterns","drigo-3d-lanterns-x-punchy","tools-and-utils","bray-cyber-3d-enchanted-books","nautilus3d"],["rainbows-foliage","sunbathing-godrays","visual-effects-plus"],["better-lanterns","torches-reimagined","weskersons-torches","rays-3d-rails","3d-ladders","rays-3d-ladders","3d-crops","fancy-crops","3d-bamboo-shoots","fancy-beds","os-colorful-grasses","connected-paths","fast-better-grass","better-leaves","fancyfast-bushy-leaves","3d-default","animated-items","xk-redstone-display","excalibur-lootr-support"],["even-better-enchants","beautiful-enchanted-books","enchanted-books-re-covered","visual-armor-trims","emissive-trims","glowing-glints","new-glowing-ores","low-on-fire","low-shield-pack","blinking-ender-eyes","dramatic-skys"],["icons","recolourful-containers-gui","clearer-slot-highlight","shrimps-immersive-interfaces","default-dark-mode"],["vvi","enhanced-audio","gentler-weather-sounds"],["vanilla-exp","xalis-enhanced-vanilla","faithful-32x","faithful-64x"]];
function rpAuto(rps){ const rank=s=>{ const i=RPRANK.findIndex(g=>g.includes(s)); return i<0?6:i; }; const flat=RPRANK.flat(); return [...rps].sort((a,b)=>rank(a)-rank(b)||flat.indexOf(a)-flat.indexOf(b)); }
function rpTopDown(rps){ const auto=rpAuto(rps); const man=(cfg._rpord||[]).filter(s=>rps.includes(s)); if(!man.length) return auto; return [...man,...auto.filter(s=>!man.includes(s))]; }
function rpHtml(){
  const r=resolve(); const rps=[...r.mods].filter(s=>BY[s].pt==="r"); const o=rpTopDown(rps);
  if(!o.length) return `<p class="hint">Noch keine Resource Packs gewählt.</p>`;
  return `<p class="catnote">Oben gewinnt: Wenn zwei Packs dieselbe Datei ändern, zählt das obere. Die Website sortiert nach den Regeln der Pack-Autoren (Erweiterungen über ihrem Basis-Pack, Komplett-Texturen ganz unten). Die Reihenfolge landet beim Export in der options.txt, das Spiel startet also direkt richtig.</p><ol class="rpo">`+o.map((s,i)=>`<li><span class="thumbs">${thumbs(s,1)}</span><span>${esc(NAME(s))}</span><span class="rpbtn"><button class="btn sm" data-rpmv="${s}|-1" ${i?"":"disabled"} aria-label="nach oben">↑</button><button class="btn sm" data-rpmv="${s}|1" ${i<o.length-1?"":"disabled"} aria-label="nach unten">↓</button></span></li>`).join("")+`</ol>${(cfg._rpord||[]).length?`<button class="btn" id="rp-auto">Wieder automatisch sortieren</button>`:""}`;
}
function openTool(t){ kSel=null; $("tool-title").textContent={keys:"Tastenbelegung",rp:"Resource-Pack-Reihenfolge",base:"Grundeinstellungen",ai:"KI-Antwort übernehmen"}[t]; $("tool").dataset.t=t; renderTool(); if(!$("tool").open) $("tool").showModal(); }
function renderTool(){ const t=$("tool").dataset.t; $("tool-body").innerHTML=t==="keys"?keysHtml():t==="rp"?rpHtml():t==="base"?editorHtml("_base"):aiHtml(); }
/* RAM */
function ramGB(r){ const n=r.mods.size+r.libs.size; let g=n<60?4:n<120?6:n<250?8:10; if(r.mods.has("voxy")||r.mods.has("distanthorizons")) g+=1; if([...r.mods].some(s=>BY[s]&&/faithful-64x/.test(s))) g+=1; const sys=Number(wizA.ram||0); if(sys) g=Math.min(g,Math.floor(sys/2)); return Math.max(3,Math.min(g,12)); }
