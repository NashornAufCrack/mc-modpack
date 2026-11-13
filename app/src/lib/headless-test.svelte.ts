// Headless-Test Runner: Triggert den GitHub Actions Workflow via API
// und fragt den Live-Status (Queued -> Running -> Success/Failed) ab.

export class HeadlessTester {
  state = $state<"idle" | "dispatching" | "queued" | "running" | "success" | "failed">("idle");
  progress = $state<string>("");
  runUrl = $state<string>("");
  lastTestedSignature = $state<string>("");
  error = $state<string>("");

  readonly repo = "NashornAufCrack/mc-modpack";
  readonly workflow = "runtime-test.yml";
  hasToken = $state(false);

  constructor() {
    try {
      this.hasToken = !!sessionStorage.getItem("mk_gh_pat")?.trim();
    } catch {}
  }

  // Eigenes GitHub-PAT nur für diese Sitzung im Browser des Nutzers (kein Token im Bundle!)
  private get token(): string {
    try {
      const custom = sessionStorage.getItem("mk_gh_pat");
      return custom ? custom.trim() : "";
    } catch {
      return "";
    }
  }

  setToken(raw: string) {
    const val = raw.trim();
    try {
      if (val) sessionStorage.setItem("mk_gh_pat", val);
      else sessionStorage.removeItem("mk_gh_pat");
    } catch {}
    this.hasToken = !!val;
    this.error = "";
  }

  get isBusy() {
    return this.state === "dispatching" || this.state === "queued" || this.state === "running";
  }

  getSignature(mods: string[], resourcepacks: string[]) {
    return [...mods].sort().join(",") + "::" + [...resourcepacks].join(",");
  }

  isTested(mods: string[], resourcepacks: string[]) {
    return this.lastTestedSignature !== "" && this.lastTestedSignature === this.getSignature(mods, resourcepacks);
  }

  async runTest(mods: string[], resourcepacks: string[]) {
    if (this.isBusy) return;
    if (!this.token) {
      this.state = "failed";
      this.error = "Kein GitHub-Token im Browser hinterlegt.";
      return;
    }
    const sig = this.getSignature(mods, resourcepacks);
    this.state = "dispatching";
    this.progress = "Starte Cloud-Runner auf GitHub Actions (Dauer: ca. 2–5 Min)...";
    this.error = "";
    this.runUrl = "";

    try {
      const dispatchUrl = `https://api.github.com/repos/${this.repo}/actions/workflows/${this.workflow}/dispatches`;
      const res = await fetch(dispatchUrl, {
        method: "POST",
        headers: {
          "Accept": "application/vnd.github+json",
          "Authorization": `Bearer ${this.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            preset: "custom",
            mods: JSON.stringify(mods),
            resourcepacks: JSON.stringify(resourcepacks)
          }
        })
      });

      if (!res.ok && res.status !== 204) {
        const txt = await res.text();
        throw new Error(`GitHub API Fehler (${res.status}): ${txt}`);
      }

      this.state = "queued";
      this.progress = "Test in Warteschlange... (Gesamtdauer ca. 2–5 Min)";

      // Run-ID finden durch Polling (bis zu 25 Versuche = 50s)
      const startTime = Date.now();
      let runId: number | null = null;

      for (let attempt = 0; attempt < 25; attempt++) {
        await new Promise(r => setTimeout(r, 2000));
        const runsUrl = `https://api.github.com/repos/${this.repo}/actions/workflows/${this.workflow}/runs?event=workflow_dispatch&per_page=3`;
        const rRes = await fetch(runsUrl, {
          headers: {
            "Accept": "application/vnd.github+json",
            "Authorization": `Bearer ${this.token}`
          }
        });
        if (rRes.ok) {
          const data = await rRes.json();
          const runs = data.workflow_runs || [];
          const recentRun = runs.find((r: any) => new Date(r.created_at).getTime() >= startTime - 20000);
          if (recentRun) {
            runId = recentRun.id;
            this.runUrl = recentRun.html_url;
            break;
          }
        }
      }

      if (!runId) {
        this.progress = "Test gestartet! Bitte prüfe den Live-Status direkt auf GitHub Actions.";
        this.runUrl = `https://github.com/${this.repo}/actions/workflows/${this.workflow}`;
        this.state = "running";
        return;
      }

      // Live-Polling des Runs bis zum Abschluss mit echten Schritt-Informationen & Live-Uhr
      this.state = "running";
      let pollCount = 0;

      while (true) {
        await new Promise(r => setTimeout(r, 3500));
        pollCount++;

        const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
        const m = Math.floor(elapsedSec / 60);
        const s = elapsedSec % 60;
        const timeStr = `${m}m ${s < 10 ? "0" + s : s}s`;

        // 1. Run-Gesamtstatus abfragen
        const checkRes = await fetch(`https://api.github.com/repos/${this.repo}/actions/runs/${runId}`, {
          headers: {
            "Accept": "application/vnd.github+json",
            "Authorization": `Bearer ${this.token}`
          }
        });

        if (!checkRes.ok) continue;
        const runData = await checkRes.json();
        this.runUrl = runData.html_url;

        if (runData.status === "in_progress" || runData.status === "queued") {
          let stepText = runData.status === "queued" ? "In Warteschlange..." : "Initialisiere Runner...";

          // 2. Detaillierten Schritt aus den Jobs abfragen
          try {
            const jobsRes = await fetch(`https://api.github.com/repos/${this.repo}/actions/runs/${runId}/jobs`, {
              headers: {
                "Accept": "application/vnd.github+json",
                "Authorization": `Bearer ${this.token}`
              }
            });
            if (jobsRes.ok) {
              const jData = await jobsRes.json();
              const jobs = jData.jobs || [];
              const activeJob = jobs.find((j: any) => j.status === "in_progress") || jobs[jobs.length - 1];
              if (activeJob) {
                const activeStep = (activeJob.steps || []).find((st: any) => st.status === "in_progress");
                if (activeStep) {
                  const sn = activeStep.name;
                  if (sn.includes("Test-Umgebung") || sn.includes("JARs") || sn.includes("ZIPs")) {
                    stepText = "Lade Mods & Resource-Packs herunter...";
                  } else if (sn.includes("Mesa") || sn.includes("Treiber")) {
                    stepText = "Richte Mesa-Software-GL & Xvfb ein...";
                  } else if (sn.includes("Headless Minecraft Client")) {
                    stepText = "Minecraft Client aktiv: Testwelt, Chunks & 3D-Models laufen...";
                  } else {
                    stepText = sn;
                  }
                } else if (activeJob.status === "completed") {
                  stepText = "Schließe Test ab...";
                }
              }
            }
          } catch {}

          this.progress = `⏳ ${timeStr} (ca. 2–5 Min) · ${stepText}`;
        } else if (runData.status === "completed") {
          if (runData.conclusion === "success") {
            this.state = "success";
            this.lastTestedSignature = sig;
            this.progress = `✓ Headless-Stresstest erfolgreich bestanden in ${timeStr}! Welt & Models 100 % stabil.`;
          } else {
            this.state = "failed";
            this.error = "Der Stresstest hat einen Fehler gemeldet. Bitte prüfe das GitHub-Log.";
          }
          break;
        }

        // Timeout nach 10 Minuten
        if (pollCount > 150) {
          this.state = "failed";
          this.error = "Zeitüberschreitung (10 Min) beim Warten auf das Testergebnis.";
          break;
        }
      }
    } catch (e: any) {
      this.state = "failed";
      this.error = e.message || String(e);
    }
  }
}

export const headlessTester = new HeadlessTester();
