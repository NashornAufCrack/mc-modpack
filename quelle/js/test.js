/* Test */
const TESTSEED="-4172144997902289642";
const KIT="https://nashornaufcrack.github.io/mc-modpack/downloads/Test-Kit.zip";
let lastFps=null;
function renderTest(){
  $("view-test").innerHTML=`<p class="catnote lead">Ein Test dauert 3 Minuten und läuft immer gleich ab: Ein Datapack fliegt dich automatisch über dieselbe Strecke (Tag, Nacht, Regen), ein kleines Windows-Programm misst dabei jedes einzelne Bild. Du trägst nichts von Hand ein, du lädst nur die Messdatei hoch.</p>
  <ol class="steps">
   <li><b>Test-Kit laden</b><span><a class="btn" href="${KIT}">Test-Kit herunterladen</a> (Benchmark-Datapack, FPS-Messung.bat, Anleitung). Beim Export „Test-Kit beilegen“ anhaken, dann ist auch spark im Pack.</span></li>
   <li><b>Einmal starten</b><span>Pack importieren, Minecraft einmal bis ins Hauptmenü starten.</span></li>
   <li><b>Testwelt</b><span>Neue Welt: Seed <code>${TESTSEED}</code>, Kreativ, Cheats an. Unter „Datenpakete“ die Datei Benchmark-Datapack.zip hineinziehen. Nach dem Erstellen 1–2 Minuten warten (Fernsicht lädt).</span></li>
   <li><b>Messen</b><span>FPS-Messung.bat starten (Admin bestätigen). Im Spiel: <code>/function bench:start</code> und <code>/sparkc profiler start --timeout 180</code>, dann in der .bat eine Taste drücken.</span></li>
   <li><b>Hochladen</b><span>Nach 3 Minuten: fps.csv hier hochladen und den spark-Link aus dem Chat einfügen.</span></li>
  </ol>
  <div class="logbox"><label class="file" for="t-csv">fps.csv wählen<input type="file" id="t-csv" accept=".csv,text/csv"></label><span class="hint" id="t-csvout">Noch keine Messung.</span>
  <label class="fld" for="t-link">spark-Link</label><input id="t-link" placeholder="https://spark.lucko.me/…">
  <label class="fld" for="t-note">Was ist dir aufgefallen? (Ruckler, Grafikfehler …)</label><textarea id="t-note" rows="3"></textarea>
  <div class="row-actions"><button class="btn primary" id="t-save">Ergebnis speichern</button><span class="hint" id="t-status"></span></div></div>
  <h2>Auswerten lassen</h2><p class="catnote">Der Text unten enthält dein Pack, deine Hardware und die Messwerte. Gib ihn mir oder deiner eigenen KI. Die Antwort ist ein Code-Block, den du hier wieder einfügst: Die Website setzt die Vorschläge dann selbst um (Mods tauschen, Einstellungen ändern).</p>
  <div class="row-actions"><button class="btn" id="t-prompt">Text für die KI erzeugen</button><button class="btn" data-tool="ai">KI-Antwort einfügen</button></div>
  <textarea id="t-prompttxt" rows="8" hidden readonly></textarea><div id="t-hist"></div>`;
  try{ const h=JSON.parse(localStorage.getItem("mk-tests")||"[]"); $("t-hist").innerHTML=h.length?`<h3>Bisherige Tests</h3><ul class="dl-list">`+h.map(t=>`<li>${new Date(t.at).toLocaleDateString("de-DE")}: Ø ${esc(t.avg)} FPS · 1 % Tief ${esc(t.low1)} · ${esc(t.n||"?")} Mods ${t.link?`· <a href="${esc(t.link)}" target="_blank" rel="noopener">spark</a>`:""} ${esc(t.note||"")}</li>`).join("")+`</ul>`:""; }catch(e){}
}
function parseFps(txt){
  const lines=txt.split(/\r?\n/).filter(Boolean); const head=lines[0].split(",");
  const col=["MsBetweenPresents","FrameTime","MsBetweenDisplayChange","msBetweenPresents"].map(c=>head.indexOf(c)).find(i=>i>=0);
  if(col===undefined) return null;
  const ft=lines.slice(1).map(l=>Number(l.split(",")[col])).filter(v=>v>0&&v<1000); if(ft.length<50) return null;
  const avg=1000/(ft.reduce((a,b)=>a+b,0)/ft.length); const s=[...ft].sort((a,b)=>b-a); const p=q=>{ const k=s.slice(0,Math.max(1,Math.floor(s.length*q))); return 1000/(k.reduce((a,b)=>a+b,0)/k.length); };
  return {avg:Math.round(avg),low1:Math.round(p(.01)),low01:Math.round(p(.001)),frames:ft.length,stutter:s.filter(v=>v>50).length};
}
async function saveTest(){
  const r=resolve(); const t={at:new Date().toISOString(),link:$("t-link").value.trim(),note:$("t-note").value.trim(),mods:[...sel],n:r.mods.size,...(lastFps||{}),hw:wizA,by:myId||null};
  if(t.link&&!/^https:\/\/spark\.lucko\.me\//.test(t.link)){ $("t-status").textContent="Der Link sollte mit https://spark.lucko.me/ beginnen."; return; }
  if(!lastFps){ $("t-status").textContent="Bitte zuerst die fps.csv hochladen."; return; }
  try{ const h=JSON.parse(localStorage.getItem("mk-tests")||"[]"); h.unshift(t); localStorage.setItem("mk-tests",JSON.stringify(h.slice(0,20))); }catch(e){}
  let shared=false; if(db&&mode==="shared"){ try{ await db.collection("tests").add(t); shared=true; }catch(e){} }
  $("t-status").textContent=shared?"Gespeichert. Claude kann das Ergebnis jetzt lesen.":"Gespeichert."; renderTest();
}
function aiPrompt(){
  const r=resolve(); const t=lastFps||(()=>{ try{ return JSON.parse(localStorage.getItem("mk-tests")||"[]")[0]; }catch(e){ return null; } })();
  const groups=GROUPS.map(g=>`- ${g.titel}: ${g.mods.join(", ")}`).join("\n");
  return `Du hilfst beim Optimieren eines Minecraft-Modpacks (Fabric, MC 26.3).

HARDWARE: Grafikkarte ${wizA.vendor||"?"} ${wizA.gpu||"?"}, RAM ${wizA.ram||"?"} GB, Monitor ${wizA.w||"?"}x${wizA.h||"?"} @ ${wizA.hz||"?"} Hz, G-Sync/FreeSync: ${wizA.sync||"?"}, Ziel: ${wizA.fps==="60"?"stabile 60 FPS":"Monitor-Hz"}
MESSUNG (3-Minuten-Flug, gleiche Strecke): ${t?`Ø ${t.avg} FPS, 1 %-Tief ${t.low1} FPS, 0,1 %-Tief ${t.low01} FPS, ${t.stutter} Ruckler über 50 ms`:"noch keine"}${$("t-link")&&$("t-link").value?`\nSPARK-PROFIL: ${$("t-link").value}`:""}${$("t-note")&&$("t-note").value?`\nBEOBACHTUNG: ${$("t-note").value}`:""}

MODS IM PACK (Slug: Name):
${[...r.mods].map(s=>`${s}: ${NAME(s)}`).join("\n")}

GRUPPEN, AUS DENEN NUR EINER ERLAUBT IST:
${groups}

AUFGABE: Finde die wahrscheinlichsten Ursachen für fehlende FPS oder Ruckler und schlage höchstens 8 konkrete Änderungen vor. Erkläre jede in einem Satz auf Deutsch. Gib am Ende GENAU EINEN Codeblock mit diesem JSON zurück (nur Slugs aus der Liste oben oder von modrinth.com):
\`\`\`json
{"aktionen":[
 {"typ":"entfernen","slug":"…","grund":"…"},
 {"typ":"hinzufuegen","slug":"…","grund":"…"},
 {"typ":"einstellung","slug":"_base","key":"renderDistance","wert":12,"grund":"…"},
 {"typ":"einstellung","slug":"photon-shader","key":"shadowDistance","wert":128,"grund":"…"}
]}
\`\`\`
Erlaubte Einstellungen mit slug "_base": renderDistance, simulationDistance, maxFps. Für Mods: Schlüssel aus deren Config-Datei.`;
}
function aiHtml(){ return `<p class="catnote">Füge hier die Antwort deiner KI ein (der ganze Text geht, die Website sucht sich den JSON-Block selbst heraus). Du siehst vorher, was geändert wird.</p><textarea id="ai-in" rows="8" placeholder='{"aktionen":[…]}'></textarea><div class="row-actions"><button class="btn" id="ai-check">Prüfen</button></div><div id="ai-out"></div>`; }
let aiPlan=null;
function aiCheck(){
  const raw=$("ai-in").value; const m=raw.match(/\{[\s\S]*"aktionen"[\s\S]*\}/); aiPlan=null;
  try{ const j=JSON.parse(m?m[0]:raw); const ok=[],bad=[];
    for(const a of j.aktionen||[]){ if((a.typ==="entfernen"||a.typ==="hinzufuegen")&&BY[a.slug]) ok.push(a); else if(a.typ==="einstellung"&&(a.slug==="_base"?BASE.items.some(i=>i.k===a.key):(SETDEF[a.slug]&&SETDEF[a.slug].items.some(i=>i.k===a.key))||(X.cfgs[a.slug]||[]).some(f=>f.items.some(i=>i.k===a.key)))) ok.push(a); else bad.push(a); }
    aiPlan=ok; $("ai-out").innerHTML=`<ul class="dl-list">`+ok.map(a=>`<li><span class="tag ${a.typ==="entfernen"?"K":a.typ==="hinzufuegen"?"A":"T"}">${esc(a.typ)}</span> ${esc(a.slug==="_base"?"Grundeinstellung":NAME(a.slug))}${a.key?` · ${esc(a.key)} = ${esc(a.wert)}`:""} <span class="hint">${esc(a.grund||"")}</span></li>`).join("")+`</ul>${bad.length?`<p class="hint">${bad.length} Vorschläge ignoriert (unbekannter Mod oder Schlüssel).</p>`:""}${ok.length?`<button class="btn primary" id="ai-apply">${ok.length} Änderungen übernehmen</button>`:""}`;
  }catch(e){ $("ai-out").innerHTML=`<p class="srv R">Kein gültiger JSON-Block gefunden.</p>`; }
}
function aiApply(){ if(!aiPlan) return; for(const a of aiPlan){
    if(a.typ==="entfernen"&&!LOCKED.has(a.slug)) sel.delete(a.slug);
    else if(a.typ==="hinzufuegen"){ clashes(a.slug).forEach(c=>{ if(!LOCKED.has(c.y)) sel.delete(c.y); }); sel.add(a.slug); }
    else if(a.typ==="einstellung"){ const isG=a.slug!=="_base"&&!(SETDEF[a.slug]&&SETDEF[a.slug].items.some(i=>i.k===a.key)); if(isG){ const f=X.cfgs[a.slug].find(f=>f.items.some(i=>i.k===a.key)); cfg={...cfg,[a.slug]:{...(cfg[a.slug]||{}),["@"+f.file+"|"+a.key]:a.wert}}; } else setCv(a.slug,a.key,a.wert); } }
  saveSel(); $("tool").close(); renderBuild(); $("t-status")&&($("t-status").textContent=`${aiPlan.length} Änderungen übernommen. Jetzt neu exportieren und erneut testen.`); }
