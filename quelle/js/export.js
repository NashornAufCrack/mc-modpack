/* Export */
function fmtVal(v,t,fmt,orig){ if(t==="bool"||typeof v==="boolean") return String(v===true||v==="true"); if(t==="num"||typeof v==="number"){ const s=String(Number(v)); return /^-?\d+\.\d+/.test(String(orig).trim())&&!s.includes(".")?s+".0":s; } return fmt==="props"?String(v):JSON.stringify(String(v)); }
function patchText(t,fmt,k,val){
  const esc2=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  if(fmt==="toml"||fmt==="props"){ const p=k.split("."); const key=fmt==="toml"?p.pop():k; let a=0,b=t.length;
    if(fmt==="toml"&&p.length){ const m=t.match(new RegExp("^\\s*\\["+esc2(p.join("."))+"\\]\\s*$","m")); if(!m) return t; a=m.index+m[0].length; const n=t.slice(a).search(/^\s*\[/m); if(n>=0) b=a+n; }
    return t.slice(0,a)+t.slice(a,b).replace(new RegExp('^(\\s*"?'+esc2(key)+'"?\\s*[=:]\\s*)(.*)$',"m"),(m0,g1,g2)=>g1+(typeof val==="function"?val(g2):val))+t.slice(b); }
  return t.replace(new RegExp('^(\\s*"?'+esc2(k)+'"?\\s*:\\s*)([^,\\n]*)',"m"),(m0,g1,g2)=>g1+(typeof val==="function"?val(g2):val));
}
/* alle Dateien einer Mod mit Änderungen: {pfad: inhalt} */
function modFiles(slug){
  const out={}; const fs=X.cfgs[slug]||[];
  for(const f of fs){
    const ch={}; for(const i of f.items){ const id="@"+f.file+"|"+i.k; if(cfg[slug]&&id in cfg[slug]) ch[i.k]=[cfg[slug][id],i.t]; else { const a=autoVal(slug,f.file,i.k); if(a) ch[i.k]=[a.v,i.t]; } }
    if(SETDEF[slug]&&SETDEF[slug].file===f.file&&(cfg[slug]&&Object.keys(cfg[slug]).some(k=>k[0]!=="@")||slug==="voxy")) for(const i of SETDEF[slug].items){ let v=cv(slug,i.k); if(i.inv) v=!v; ch[i.k]=[v,i.t==="bool"?"bool":i.s?"str":"num"]; }
    if(!Object.keys(ch).length) continue;
    let t=X.tpl[f.file];
    if(f.fmt==="json"){ const o=JSON.parse(t); for(const [k,[v,ty]] of Object.entries(ch)){ const p=k.split("."); let c=o; while(p.length>1){ const q=p.shift(); c[q]=c[q]||{}; c=c[q]; } c[p[0]]=ty==="bool"?(v===true||v==="true"):ty==="num"?Number(v):v; } t=JSON.stringify(o,null,2); }
    else for(const [k,[v,ty]] of Object.entries(ch)) t=patchText(t,f.fmt,k,orig=>fmtVal(v,ty,f.fmt,orig));
    out["config/"+f.file]=t;
  }
  if(SETDEF[slug]&&!out["config/"+SETDEF[slug].file]&&!fs.some(f=>f.file===SETDEF[slug].file)){ const c=buildConfig(slug); if(c&&(cfg[slug]&&Object.keys(cfg[slug]).length||slug==="voxy")) out["config/"+SETDEF[slug].file]=c; }
  if(X.rpo[slug]&&FILES[slug]){ const d=JSON.parse(JSON.stringify(X.rpo[slug].data)); for(const [id,v] of Object.entries(cfg[slug]||{})) if(id.startsWith("@rpo|")){ const p=id.slice(5).split("."); let c=d; while(p.length>1) c=c[p.shift()]; c[p[0]]=v; } out["resourcepacks/"+decodeURIComponent(FILES[slug][1])+".rpo"]=JSON.stringify(d,null,2); }
  return out;
}
function rpOrder(rps){ return ["vanilla",...rpTopDown(rps).reverse().map(s=>"file/"+decodeURIComponent(FILES[s][1]))]; }
function optionsTxt(r){ const B=k=>cv("_base",k); const rps=[...r.mods].filter(s=>BY[s].pt==="r");
  return [`renderDistance:${B("renderDistance")}`,`simulationDistance:${B("simulationDistance")}`,`maxFps:${B("maxFps")}`,"enableVsync:false","mipmapLevels:4","biomeBlendRadius:2","resourcePacks:"+JSON.stringify(rpOrder(rps)),...keyLines()].join("\n")+"\n"; }
function packFiles(r,server){
  const files={};
  if(server) return files;
  files["options.txt"]=optionsTxt(r);
  files["config/defaultoptions/options.txt"]=files["options.txt"];
  const kl2=keyLines(); if(kl2.length) files["config/defaultoptions/keybindings.txt"]=kl2.join("\n")+"\n";
  if(r.mods.has("iris")){ const sp=[...r.mods].find(s=>BY[s].pt==="s"); if(sp){ const pf=decodeURIComponent(FILES[sp][1]); files["config/iris.properties"]="enableShaders=true\nshaderPack="+pf+"\n";
    if(sp==="photon-shader") files["shaderpacks/"+pf+".txt"]=SETDEF["photon-shader"].items.map(i=>{const v=cv("photon-shader",i.k); return i.k+"="+(i.f?i.f(Number(v)):v);}).join("\n")+"\n"; } }
  for(const s of r.mods) Object.assign(files,modFiles(s));
  files["LIES-MICH.txt"]=`Erstellt mit dem Mod-Katalog 26.3 (${new Date().toLocaleDateString("de-DE")}).\nEinstellungen und Tastenbelegung sind schon gesetzt. Zurück auf diese Werte: Default Options (config/defaultoptions).\nFeste Versionen: Sodium 0.9.2, Iris 1.11.7, Voxy 0.2.20-beta, Photon v1.4. Nur zusammen aktualisieren.\nArbeitsspeicher: ${ramGB(r)} GB.\n`;
  if(r.mods.has("spark")) files["TEST-ANLEITUNG.txt"]="Test-Kit: "+KIT+"\nSeed: "+TESTSEED+"\n";
  return files;
}
function exportSet(server){
  const r=resolve(); let all=[...r.mods,...r.libs];
  if(server){ const keep=new Set(); const stack=[...r.mods].filter(s=>BY[s].ampel==="R"||BY[s].ampel==="Y").concat(MODS.filter(m=>m.cat==="S"&&FILES[m.slug]&&m.slug!=="voxy-server-side"||(m.slug==="voxy-server-side"&&r.mods.has("voxy"))).map(m=>m.slug)); while(stack.length){ const s=stack.pop(); if(keep.has(s)||!FILES[s]) continue; if(BY[s]&&BY[s].pt!=="m"&&BY[s].pt!=="d") continue; keep.add(s); FILES[s][5].forEach(d=>stack.push(d)); } all=[...keep]; }
  return {r,all};
}
const dirOf=s=>{ const t=BY[s]?BY[s].pt:(FILES[s][8]||"m"); return t==="r"?"resourcepacks":t==="s"?"shaderpacks":t==="d"?"datapacks":"mods"; };
async function saveBlob(blob,fname,st2,hint){
  const dl=window.claude&&window.claude.use?await window.claude.use("downloads"):null; let ok=false;
  if(dl){ try{ const res=await dl.save({filename:fname,data:blob}); ok=res&&res.status==="saved"; st2.textContent=ok?`Gespeichert: ${fname}. ${hint}`:"Abgebrochen."; }catch(e){ st2.textContent="Speichern hat nicht geklappt."; } }
  else{ const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=fname; document.body.appendChild(a); a.click(); a.remove(); ok=true; st2.textContent=`Heruntergeladen: ${fname}. ${hint}`; }
  return ok;
}
function guard(st2){ const pr=problems(); if(pr.length){ st2.innerHTML=`<span class="srv R">Erst die ${pr.length} Konflikte klären (oben in „Dein Pack“). Im fertigen Pack darf nichts doppelt sein.</span>`; return false; } return true; }
async function exportPack(server){
  const st2=$("exp-status"); if(!guard(st2)) return; st2.textContent="Pack wird gebaut …";
  if(!window.JSZip){ st2.textContent="Die Zip-Bibliothek konnte nicht geladen werden. Seite neu laden."; return; }
  const {r,all}=exportSet(server); const name=($("packname").value||"Mein Pack").trim()+(server?" Server":"");
  const env=s=>{ const m=BY[s]; const a=m?m.ampel:"Y"; return {client:m&&m.cat==="S"?"optional":"required",server:a==="G"?"unsupported":a==="R"||(m&&m.cat==="S")?"required":"optional"}; };
  const files=all.filter(s=>!(server&&dirOf(s)==="datapacks")).map(s=>{const f=FILES[s]; return {path:dirOf(s)+"/"+decodeURIComponent(f[1]),hashes:{sha1:f[2],sha512:f[3]},env:env(s),downloads:[f[0]],fileSize:f[4]};});
  const index={formatVersion:1,game:"minecraft",versionId:"1.0.0",name,summary:"Erstellt mit dem Mod-Katalog 26.3",files,dependencies:{minecraft:"26.3","fabric-loader":"0.20.1"}};
  const zip=new JSZip(); zip.file("modrinth.index.json",JSON.stringify(index,null,2));
  if($("withcfg").checked) for(const [p,c] of Object.entries(packFiles(r,server))) zip.file("overrides/"+p,c);
  const blob=await zip.generateAsync({type:"blob",compression:"DEFLATE"});
  const ok=await saveBlob(blob,name.replace(/[^\w\- ]+/g,"").replace(/\s+/g,"-")+".mrpack",st2,server?"Auf dem Server mit einem .mrpack-Installer einrichten.":`Modrinth App: Datei hineinziehen. Danach Arbeitsspeicher auf ${ramGB(r)} GB stellen (Instanz › Einstellungen › Java).`);
  if(ok&&!server){ try{ localStorage.setItem("mk-last",JSON.stringify({at:new Date().toISOString(),f:Object.fromEntries([...r.mods].map(s=>[s,FILES[s][6]]))})); }catch(e){} }
  if(ok&&db&&mode==="shared"){ try{ await db.doc("packs/letzter").set({name,slugs:[...sel],cfg,by:myId||null,at:new Date().toISOString()}); }catch(e){} }
}
async function exportPrism(){
  const st2=$("exp-status"); if(!guard(st2)) return;
  if(!window.JSZip){ st2.textContent="Die Zip-Bibliothek konnte nicht geladen werden."; return; }
  const {r,all}=exportSet(false); const name=($("packname").value||"Mein Pack").trim(); const zip=new JSZip();
  zip.file("instance.cfg",`[General]\nConfigVersion=1.2\nInstanceType=OneSix\nname=${name}\nOverrideMemory=true\nMaxMemAlloc=${ramGB(r)*1024}\nMinMemAlloc=1024\nnotes=Erstellt mit dem Mod-Katalog 26.3\n`);
  zip.file("mmc-pack.json",JSON.stringify({components:[{uid:"net.minecraft",version:"26.3",important:true},{uid:"net.fabricmc.fabric-loader",version:"0.20.1"}],formatVersion:1},null,1));
  if($("withcfg").checked) for(const [p,c] of Object.entries(packFiles(r,false))) zip.file(".minecraft/"+p,c);
  let done=0, fail=[]; const list=all.filter(s=>dirOf(s)!=="datapacks");
  const one=async s=>{ const f=FILES[s]; try{ const res=await fetch(f[0]); if(!res.ok) throw 0; zip.file(".minecraft/"+dirOf(s)+"/"+decodeURIComponent(f[1]),await res.arrayBuffer()); }catch(e){ fail.push(NAME(s)); } done++; st2.textContent=`Lade Dateien von Modrinth: ${done} von ${list.length} …`; };
  const q=[...list]; await Promise.all(Array.from({length:6},async()=>{ while(q.length) await one(q.shift()); }));
  if(fail.length){ st2.innerHTML=`<span class="srv R">${fail.length} Dateien nicht ladbar (${esc(fail.slice(0,5).join(", "))}). Nimm stattdessen die .mrpack-Datei.</span>`; return; }
  st2.textContent="Packe die Instanz …"; const blob=await zip.generateAsync({type:"blob",compression:"STORE"});
  await saveBlob(blob,name.replace(/[^\w\- ]+/g,"").replace(/\s+/g,"-")+"-Prism.zip",st2,`Prism: Instanz hinzufügen › Importieren › Datei wählen. Arbeitsspeicher (${ramGB(r)} GB) ist schon eingestellt.`);
}
