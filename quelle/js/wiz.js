/* Assistent */
let wizA={};
const SHADERS=[["photon-shader","Photon","Realistisches Licht, schöne Wolken und Wasser. Unser Standard ab Oberklasse-Grafikkarte.",2],["complementary-reimagined","Complementary Reimagined","Sehr beliebt, nah an Vanilla, viele Einstellungen. Ab Mittelklasse.",1],["solas-shader","Solas","Stimmungsvoll und schnell. Gut für Mittelklasse.",1],["bsl-shaders","BSL","Klassiker, solide auf fast jeder Karte.",0],["i-like-vanilla","I Like Vanilla","Ganz leicht: etwas Licht und Schatten, kaum FPS-Verlust. Für schwächere PCs.",0],["pegasus","Pegasus","Schnell mit vielen Stil-Optionen.",0],["mellow","Mellow","Gemalter Look, eher künstlerisch.",1],["bliss-shader","Bliss","Sehr realistisch, aber anspruchsvoll. Nur High-End.",3],["complementary-unbound","Complementary Unbound","Wie Reimagined, aber kräftiger und moderner.",2]];
function gpuScore(){ const g={low:0,mid:1,high:2,top:3}[wizA.gpu||"high"]; const px=(Number(wizA.w||2560)*Number(wizA.h||1440))/(2560*1440); return Math.max(0,Math.min(3,g-(px>1.6?1:px<0.7?-1:0)+((wizA.fps||"hz")==="60"?1:0)-(Number(wizA.hz||144)>165?1:0))); }
const WEX=(t,s)=>`<p class="wex">${t}</p>${s?`<div class="thumbs wimg">${thumbs(s,3)}</div>`:""}`;
function renderWiz(){
  const sc=gpuScore(); const rec=SHADERS.filter(x=>BY[x[0]]).filter(x=>x[3]<=sc).sort((a,b)=>b[3]-a[3]);
  const q=(k,title,ex,opts)=>`<fieldset class="wq"><legend>${title}</legend>${ex||""}${opts.map(([v,l])=>`<label class="chk"><input type="radio" name="w-${k}" value="${v}" ${wizA[k]===v?"checked":""}> ${l}</label>`).join("")}</fieldset>`;
  let h=`<p class="catnote">Beantworte ein paar Fragen. Danach sind Leistungs-Mods, Grafik, FPS-Limit und Arbeitsspeicher automatisch passend eingestellt. Du kannst alles später ändern.</p>`;
  h+=q("srv","1. Wo spielst du?",WEX("Auf einem normalen (Vanilla-)Server dürfen nur Mods laufen, die allein auf deinem PC arbeiten. Gameplay- und Welt-Mods bräuchten den Mod auch auf dem Server."),[["vanilla","Auf dem Vanilla-Server von Freunden"],["own","Einzelspieler oder eigener Server mit Mods"]]);
  h+=q("vendor","2. Hersteller der Grafikkarte",WEX("Wichtig für einige Leistungs-Mods: Nvidium macht NVIDIA-Karten deutlich schneller, läuft aber nur dort."),[["nvidia","NVIDIA (GeForce)"],["amd","AMD (Radeon)"],["intel","Intel / Laptop-Grafik"]]);
  h+=q("gpu","3. Wie stark ist die Grafikkarte?","",[["low","Einsteiger (z. B. GTX 1060, RX 580, Laptop)"],["mid","Mittelklasse (RTX 3060/4060, RX 6600–7600)"],["high","Oberklasse (RTX 3080/4070 Ti, RX 6800+)"],["top","High-End (RTX 4080/5080+, RX 7900+)"]]);
  h+=q("ram","4. Arbeitsspeicher im PC",WEX("Minecraft bekommt davon höchstens die Hälfte, damit Windows und Discord flüssig bleiben."),[["8","8 GB"],["16","16 GB"],["32","32 GB"],["64","64 GB oder mehr"]]);
  h+=`<fieldset class="wq"><legend>5. Monitor</legend>${WEX("Auflösung und Bildwiederholrate bestimmen, wie viel die Grafikkarte leisten muss und wo das FPS-Limit liegt.")}<div class="tgrid"><label class="fld">Breite (Pixel)<input id="w-w" inputmode="numeric" value="${esc(wizA.w||2560)}"></label><label class="fld">Höhe (Pixel)<input id="w-h" inputmode="numeric" value="${esc(wizA.h||1440)}"></label><label class="fld">Bildwiederholrate (Hz)<input id="w-hz" inputmode="numeric" value="${esc(wizA.hz||144)}"></label></div><p class="hint">Typisch: 1920×1080, 2560×1440, 3440×1440, 3840×2160 · 60, 144, 165, 240 Hz</p>
    ${["yes","no"].map(v=>`<label class="chk"><input type="radio" name="w-sync" value="${v}" ${wizA.sync===v?"checked":""}> ${v==="yes"?"G-Sync / FreeSync vorhanden":"Kein G-Sync / FreeSync oder weiß nicht"}</label>`).join("")}</fieldset>`;
  h+=q("fps","6. Ziel-FPS",WEX("Mehr FPS = flüssiger. Weniger FPS erlauben mehr Grafik."),[["hz","So hoch wie mein Monitor kann"],["60","Stabile 60 reichen, lieber schöner"]]);
  h+=q("shader","7. Shader?",WEX("Shader berechnen Licht, Schatten, Wasser und Himmel neu, das sieht viel schöner aus, kostet aber am meisten Leistung.","photon-shader"),[["yes","Ja, Shader"],["no","Nein, lieber mehr FPS"]]);
  h+=`<fieldset class="wq" ${wizA.shader==="yes"?"":"hidden"} id="w-shaderpick"><legend>Welcher Shader?</legend><p class="wex">Passend zu deiner Grafikkarte und Auflösung empfohlen (oben = beste Wahl):</p>${(rec.length?rec:SHADERS.slice(4,5)).map(([s,n,t],i)=>`<label class="chk"><input type="radio" name="w-shaderpack" value="${s}" ${(wizA.shaderpack||rec[0]&&rec[0][0])===s?"checked":""}> <b>${esc(n)}</b>${i===0?` <span class="role K">empfohlen</span>`:""} <span class="hint">${esc(t)}</span></label>`).join("")}</fieldset>`;
  h+=q("lod","8. Fernsicht?",WEX("Fernsicht (Voxy) zeigt Berge und Landschaft weit hinter der normalen Sichtweite, als vereinfachtes Modell. Sieht großartig aus, braucht etwas Grafikspeicher und beim ersten Besuch kurz Rechenzeit.","voxy"),[["voxy","Ja, Fernsicht mit Voxy"],["none","Nein"]]);
  h+=q("anim","9. Spieler-Animationen?",WEX("Punchy animiert deine Hände und Items in der Ego-Sicht: Schwerter schwingen, Essen wird zum Mund geführt, Tränke werden getrunken. Dazu passende Packs für Laternen, Essen usw.","punchy-fpa"),[["punchy","Ja, Punchy"],["none","Nein, Vanilla-Animationen"]]);
  h+=q("feel","10. Wie nah an Vanilla?",WEX("Bestimmt, wie viele Vorschläge über Optik hinausgehen."),[["pure","Fast wie Vanilla, nur schöner"],["plus","Vanilla+ mit Komfort"],["more","Gern auch neuer Inhalt"]]);
  h+=`<div class="row-actions"><button class="btn primary" id="wiz-go">Pack zusammenstellen</button><span class="hint">Leistungs-Mods, Grafik, FPS-Limit und Arbeitsspeicher werden automatisch gesetzt. Alles andere sind Vorschläge.</span></div>`;
  $("wiz-body").innerHTML=h;
}
function wizRead(){ document.querySelectorAll("#wiz-body input[type=radio]:checked").forEach(c=>wizA[c.name.slice(2)]=c.value); ["w","h","hz"].forEach(k=>{ const v=$("w-"+k); if(v&&v.value) wizA[k]=v.value.replace(/\D/g,""); }); }
function applyHardware(){
  const sc=gpuScore(), hz=Number(wizA.hz||144), fpsHigh=(wizA.fps||"hz")==="hz";
  const P=[{sm:1024,sd:96,cl:false,wc:false,taau:true,vx:8,rd:10},{sm:2048,sd:128,cl:false,wc:true,taau:false,vx:12,rd:12},{sm:2048,sd:160,cl:true,wc:true,taau:false,vx:16,rd:16},{sm:3072,sd:192,cl:true,wc:true,taau:false,vx:24,rd:16}][sc];
  const fpsLim=fpsHigh?(wizA.sync==="yes"?Math.max(60,hz-4):hz):60; const opt=BASE.items.find(i=>i.k==="maxFps"); if(!opt.o.includes(fpsLim)){ opt.o=[...opt.o,fpsLim].sort((a,b)=>a-b); }
  cfg={...cfg,_base:{...(cfg._base||{}),maxFps:fpsLim,renderDistance:P.rd},"photon-shader":{...(cfg["photon-shader"]||{}),shadowMapResolution:P.sm,shadowDistance:P.sd,COLORED_LIGHTS:P.cl,WATER_CAUSTICS:P.wc,TAAU:P.taau},voxy:{...(cfg.voxy||{}),section_render_distance:P.vx}};
  // Leistung automatisch
  const nv=wizA.vendor==="nvidia"&&(wizA.gpu||"high")!=="low";
  nv&&BY.nvidium?sel.add("nvidium"):sel.delete("nvidium");
  for(const g of GROUPS) if(g.id==="particleperf"&&!g.mods.some(s=>sel.has(s))&&BY["smart-particles"]) sel.add("smart-particles");
  saveSel();
}
function wizRun(){
  wizRead(); const ms=modStatus(); const s=new Set();
  for(const m of MODS){ if(LOCKED.has(m.slug)||m.cat==="S"||m.cat==="P") continue;
    if(wizA.srv==="vanilla"&&m.ampel==="R") continue;
    if(m.cat==="G"||m.cat==="T"){ if(wizA.srv==="vanilla"||wizA.feel==="pure") continue; if(wizA.feel==="plus"&&m.cat==="T"&&m.rolle!=="K") continue; }
    if(m.pt==="s") continue;
    const rec=m.rolle==="K"||(ms[m.slug]&&ms[m.slug].state==="drin"); if(!rec) continue; if(ms[m.slug]&&ms[m.slug].state==="weg") continue;
    s.add(m.slug); }
  if(wizA.shader==="yes"){ const sp=wizA.shaderpack||"photon-shader"; if(BY[sp]) s.add(sp); }
  if(wizA.lod==="none") ["voxy","living-horizon","voxy-extra","voxy-worldgen"].forEach(x=>s.delete(x)); else if(BY.voxy) s.add("voxy");
  if(wizA.anim==="none") MODS.filter(m=>m.sub==="Spieler-Animation"||m.sub==="Punchy-Packs").forEach(m=>s.delete(m.slug));
  // Gruppen: nie zwei Vorschläge aus derselben Gruppe
  for(const g of GROUPS){ const hit=g.mods.filter(x=>s.has(x)); hit.slice(1).forEach(x=>s.delete(x)); }
  applyHardware(); wizSug=s; s.forEach(x=>{ if(!clashes(x).length) sel.add(x); }); saveSel();
  bst.f=new Set(); $("wiz").close(); renderBuild();
  $("blist").insertAdjacentHTML("afterbegin",`<div class="sugbar"><b>Fertig.</b> ${s.size} passende Mods und Packs sind ausgewählt, Leistung und Grafik eingestellt (FPS-Limit ${cv("_base","maxFps")}, ${ramGB(resolve())} GB RAM). Ändere einfach, was dir nicht gefällt.</div>`);
}
/* Vorlagen */
function preset(p){
  sel=new Set(LOCKED);
  if(p==="perf"){ ["dynamic-fps","entityculling","moreculling","immediatelyfast","modernfix-mvus","badoptimizations","lithium","ferrite-core","krypton","c2me-fabric","scalablelux","sodium-extra","reeses-sodium-options"].forEach(s=>BY[s]&&sel.add(s)); }
  else{ for(const m of MODS){ if(m.rolle!=="K"||m.cat==="S"||m.pt==="s") continue; if(p==="visual"&&(m.cat==="G"||m.cat==="T"||m.ampel==="R")) continue; if(!clashes(m.slug).length) sel.add(m.slug); } if(BY["photon-shader"]) sel.add("photon-shader"); }
  saveSel(); renderBuild();
}
