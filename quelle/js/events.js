window.addEventListener("hashchange",route);
/* Klick neben ein Popup schließt es */
document.querySelectorAll("dialog").forEach(d=>d.addEventListener("click",e=>{ if(e.target!==d) return; const r=d.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) d.close(); }));
document.addEventListener("keydown",e=>{ if($("lightbox").open&&(e.key==="ArrowRight"||e.key==="ArrowLeft")) openLb(lb.s,lb.i+(e.key==="ArrowRight"?1:-1)); const c=e.target.closest&&e.target.closest("[data-card]"); if(c&&(e.key==="Enter"||e.key===" ")){ e.preventDefault(); pick(c.dataset.card,!sel.has(c.dataset.card)); } });
document.addEventListener("click",e=>{
  const z=e.target.closest("[data-zoom]"); if(z){ e.stopPropagation(); const [s,i]=z.dataset.zoom.split("|"); openLb(s,Number(i)); return; }
  if(e.target.closest("#lb-prev")){ openLb(lb.s,lb.i-1); return; } if(e.target.closest("#lb-next")){ openLb(lb.s,lb.i+1); return; }
  if(e.target.closest("[data-close]")){ e.target.closest("dialog").close(); return; }
  const t=e.target.closest("[data-choose],[data-reset],[data-detail],[data-jump],a[data-g],[data-mod],[data-toggle],[data-filter],[data-sub],[data-bt],[data-cfgreset],[data-tool],[data-kk],[data-kreset],[data-rpmv],[data-preset],[data-fix],#kfix,#rp-auto,#export,#export-srv,#export-prism,#upd,#wiz-open,#wiz-close,#wiz-go,#share,#reset-all,#t-save,#t-prompt,#ai-check,#ai-apply,#mbar,.sum,[data-card]"); if(!t) return;
  if(t.id==="t-save"){ saveTest(); return; }
  if(t.id==="t-prompt"){ const ta=$("t-prompttxt"); ta.value=aiPrompt(); ta.hidden=false; ta.select(); try{ navigator.clipboard.writeText(ta.value); $("t-status").textContent="Text kopiert. In den Chat oder deine KI einfügen."; }catch(e){} return; }
  if(t.id==="ai-check"){ aiCheck(); return; } if(t.id==="ai-apply"){ aiApply(); return; }
  if(t.id==="mbar"){ e.preventDefault(); $("bside").scrollIntoView({behavior:"smooth"}); return; }
  if(t.dataset.mod){ openMod(t.dataset.mod); return; }
  if(t.dataset.card){ const s=t.dataset.card; if(LOCKED.has(s)){ openMod(s); return; } pick(s,!sel.has(s)); return; }
  if(t.dataset.toggle){ pick(t.dataset.toggle,!sel.has(t.dataset.toggle)); return; }
  if(t.dataset.bt){ bt=t.dataset.bt; bsub=null; renderBuild(); return; }
  if(t.dataset.sub!==undefined){ bsub=t.dataset.sub||null; renderBuild(); return; }
  if(t.dataset.filter){ const k=t.dataset.filter; bst.f.has(k)?bst.f.delete(k):bst.f.add(k); renderBuild(); return; }
  if(t.dataset.preset){ preset(t.dataset.preset); return; }
  if(t.dataset.fix){ const [a,b]=t.dataset.fix.split("|"); sel.delete(b); pick(b,true); return; }
  if(t.dataset.tool){ openTool(t.dataset.tool); return; }
  if(t.dataset.kk){ kSel=kSel===t.dataset.kk?null:t.dataset.kk; renderTool(); return; }
  if(t.dataset.kreset){ const c={...(cfg._keys||{})}; delete c[t.dataset.kreset]; cfg={...cfg,_keys:c}; saveSel(); renderTool(); renderSide(); return; }
  if(t.id==="kfix"){ autoFixKeys(); renderTool(); renderSide(); return; }
  if(t.dataset.rpmv){ const [s,d]=t.dataset.rpmv.split("|"); const r=resolve(); const o=rpTopDown([...r.mods].filter(x=>BY[x].pt==="r")); const i=o.indexOf(s), j=i+Number(d); if(j<0||j>=o.length) return; [o[i],o[j]]=[o[j],o[i]]; cfg={...cfg,_rpord:o}; saveSel(); renderTool(); return; }
  if(t.id==="rp-auto"){ const c={...cfg}; delete c._rpord; cfg=c; saveSel(); renderTool(); return; }
  if(t.dataset.cfgreset){ const [s,k]=t.dataset.cfgreset.split("|"); const c={...(cfg[s]||{})}; delete c[k]; cfg={...cfg,[s]:c}; saveSel(); if(s==="_base") renderTool(); else openMod(s); return; }
  if(t.id==="export"){ exportPack(false); return; } if(t.id==="export-srv"){ exportPack(true); return; } if(t.id==="export-prism"){ exportPrism(); return; }
  if(t.id==="upd"){ checkUpdates(); return; }
  if(t.id==="wiz-open"){ renderWiz(); $("wiz").showModal(); return; }
  if(t.id==="wiz-close"){ $("wiz").close(); return; }
  if(t.id==="wiz-go"){ wizRun(); return; }
  if(t.id==="reset-all"){ if(!confirmReset()) return; return; }
  if(t.id==="share"){ const code=[...sel].filter(s=>!LOCKED.has(s)).map(s=>MODS.findIndex(m=>m.slug===s).toString(36)).join("."); const url=location.href.split("#")[0]+"#pack-"+code; const so=$("share-out"); if(location.host.endsWith("github.io")){ navigator.clipboard.writeText(url).then(()=>so.textContent="Link kopiert.",()=>so.textContent=url); } else so.textContent="Teilen-Links funktionieren auf der GitHub-Seite."; return; }
  if(t.dataset.choose){ choose(t.dataset.choose,t.dataset.opt); }
  else if(t.dataset.reset){ resetChoice(t.dataset.reset); }
  else if(t.dataset.detail){ openMod(t.dataset.detail); }
  else if(t.dataset.jump){ e.preventDefault(); $("detail").close(); st.openOnly=false; renderDecisions(); location.hash="entscheidungen"; route(); setTimeout(()=>{const el=$("dec-"+t.dataset.jump); if(el) el.scrollIntoView({block:"start"});},0); }
  else if(t.dataset.g){ e.preventDefault(); if(location.hash!=="#einstellungen") location.hash="einstellungen"; route(); setTimeout(()=>{const el=$("g-"+t.dataset.g); if(el) el.scrollIntoView({block:"start"});},0); }
  else if(t.classList.contains("sum")){ st.cat=st.cat===t.dataset.cat?null:t.dataset.cat; saveFilter(); renderCatalog(); }
});
let resetArmed=0;
function confirmReset(){ const b=$("reset-all"); if(Date.now()-resetArmed>4000){ resetArmed=Date.now(); b.textContent="Wirklich alles löschen? Nochmal klicken"; setTimeout(()=>{ b.textContent="Alles zurücksetzen"; },4000); return false; }
  try{ Object.keys(localStorage).filter(k=>k.startsWith("mk-")).forEach(k=>localStorage.removeItem(k)); }catch(e){}
  sel=new Set(LOCKED); cfg={}; wizA={}; wizSug=new Set(); bst={q:"",f:new Set()}; bt="m"; bsub=null; choices={}; st.cat=null; st.q="";
  b.textContent="Alles zurücksetzen"; $("share-out").textContent="Alles auf Anfang: Auswahl, Einstellungen, Tasten, Assistent und Tests gelöscht."; renderAll(); renderBuild(); return true; }
$("q").addEventListener("input",e=>{ st.q=e.target.value.trim(); renderCatalog(); });
["core","vanilla","hide"].forEach(k=>$("f-"+k).onclick=()=>{ st[k]=!st[k]; saveFilter(); renderCatalog(); });
document.addEventListener("change",e=>{
  if(e.target.id==="t-csv"){ const f=e.target.files[0]; if(!f) return; f.text().then(txt=>{ lastFps=parseFps(txt); $("t-csvout").textContent=lastFps?`Ø ${lastFps.avg} FPS · 1 %-Tief ${lastFps.low1} · 0,1 %-Tief ${lastFps.low01} · ${lastFps.stutter} Ruckler über 50 ms (${lastFps.frames} Bilder)`:"Diese Datei kenne ich nicht. Bitte die fps.csv aus dem Test-Kit nehmen."; }); return; }
  if(e.target.id==="packname"){ cfg={...cfg,_name:e.target.value}; saveSel(); return; }
  if(e.target.name==="w-shader"){ wizRead(); renderWiz(); return; }
  if(e.target.name==="w-gpu"||e.target.name==="w-fps"){ wizRead(); renderWiz(); return; }
  const g=e.target.closest("[data-cfg]"); if(g){ const [s,k]=g.dataset.cfg.split("|"); const def=(s==="_base"?BASE:SETDEF[s]).items.find(i=>i.k===k); setCv(s,k,def.t==="bool"?g.checked:def.t==="range"?Number(g.value):(isNaN(Number(g.value))?g.value:Number(g.value))); if(s==="_base") renderTool(); else openMod(s); return; }
  const gg=e.target.closest("[data-gcfg]"); if(gg){ const [s,file,k]=gg.dataset.gcfg.split("|"); const it=X.cfgs[s].find(f=>f.file===file).items.find(i=>i.k===k); const v=it.t==="bool"?gg.checked:it.t==="num"?Number(gg.value.replace(",",".")):gg.value; cfg={...cfg,[s]:{...(cfg[s]||{}),["@"+file+"|"+k]:v}}; saveSel(); gg.closest(".crow").classList.add("changed"); return; }
  const rp=e.target.closest("[data-rpo]"); if(rp){ const [s,k]=rp.dataset.rpo.split("|"); const v=rp.type==="checkbox"?rp.checked:isNaN(Number(rp.value))?rp.value:Number(rp.value); cfg={...cfg,[s]:{...(cfg[s]||{}),["@rpo|"+k]:v}}; saveSel(); return; }
  if(e.target.id==="testkit"){ e.target.checked?sel.add("spark"):sel.delete("spark"); saveSel(); renderBuild(); return; }
  const kk=e.target.closest("[data-key]"); if(kk){ cfg={...cfg,_keys:{...(cfg._keys||{}),[kk.dataset.key]:kk.value}}; saveSel(); renderTool(); renderSide(); }
});
document.addEventListener("input",e=>{ const g=e.target.closest('input[type=range][data-cfg]'); if(g&&g.nextElementSibling) g.nextElementSibling.textContent=Number(g.value).toFixed(2);
  if(e.target.matches("[data-cfs]")){ const q=e.target.value.toLowerCase(); e.target.nextElementSibling.querySelectorAll(".crow").forEach(r=>r.hidden=q&&!r.dataset.name.includes(q)); } });
$("bq").addEventListener("input",e=>{ bst.q=e.target.value.trim(); renderBuild(); });
$("d-open").onclick=()=>{ st.openOnly=!st.openOnly; saveFilter(); renderDecisions(); };
