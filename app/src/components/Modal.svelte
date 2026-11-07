<script lang="ts">
  import type { Snippet } from "svelte";
  let { open = $bindable(false), title, width = "760px", onclose, head, children, foot }:
    { open: boolean; title: string; width?: string; onclose?: () => void; head?: Snippet; children: Snippet; foot?: Snippet } = $props();
  let dlg: HTMLDialogElement;
  $effect(() => { if (!dlg) return; if (open && !dlg.open) dlg.showModal(); else if (!open && dlg.open) dlg.close(); });
  // Fallback für Browser ohne closedby: Klick auf den Hintergrund schließt
  function backdrop(e: MouseEvent) {
    if ("closedBy" in HTMLDialogElement.prototype || e.target !== dlg) return;
    const r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
  }
</script>

<dialog bind:this={dlg} class="modal" closedby="any" style="--w:{width}" aria-label={title}
  onclose={() => { open = false; onclose?.(); }} onclick={backdrop}>
  {#if open}
    <header class="modal-head">
      <h2>{title}</h2>
      {@render head?.()}
      <button class="btn ghost sm" onclick={() => (open = false)} aria-label="Schließen">✕</button>
    </header>
    <div class="modal-body">{@render children()}</div>
    {#if foot}<footer class="modal-foot">{@render foot()}</footer>{/if}
  {/if}
</dialog>
