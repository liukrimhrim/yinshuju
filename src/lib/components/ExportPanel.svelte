<script lang="ts">
  import { app } from '../state.svelte';
  import { RATIO_PRESETS, planFor, exportImage, exportPdf } from '../export';

  let ratioId = $state('base');
  let customW = $state(16);
  let customH = $state(28);
  let format = $state<'png' | 'jpeg'>('png');
  let quality = $state(0.92);
  let scale = $state(3);
  let frameIdx = $state(0);
  let busy = $state(false);
  let status = $state('');
  let links = $state<{ name: string; url: string }[]>([]);

  const ratio = $derived(
    ratioId === 'custom'
      ? Math.max(0.2, Math.min(4, customW / Math.max(1, customH)))
      : (RATIO_PRESETS.find((r) => r.id === ratioId)?.ratio ?? 16 / 28),
  );
  const planned = $derived(planFor(app.exportCtx, ratio, app.sealFont));
  const frameCount = $derived(planned.frames.length);
  const safeFrame = $derived(Math.min(frameIdx, frameCount - 1));
  const previewSvg = $derived(planned.svgAt(planned.frames[safeFrame]!));

  function addLink(name: string, blob: Blob) {
    links = [...links.slice(-3), { name, url: URL.createObjectURL(blob) }];
  }

  const embedWarn = (ok: boolean) => (ok ? '' : ' ⚠ 字体切片缺失，未内嵌');
  const sealWarn = () =>
    app.sealMissing.some((m) => !app.seals[m.index]?.kaiFallback)
      ? ' ⚠ 印章缺字未退楷，将以虚框导出'
      : '';

  async function run(task: () => Promise<void>) {
    busy = true;
    try {
      await task();
    } catch (e) {
      status = 'ERROR: ' + (e as Error).message;
    }
    busy = false;
  }

  const doImage = () =>
    run(async () => {
      status = '渲染中…';
      const t0 = performance.now();
      const { blob, w, h, fontEmbedded } = await exportImage(
        app.exportCtx,
        ratio,
        planned.frames[safeFrame]!,
        { format, quality, scale },
      );
      const name = `${app.meta.banxinTitle || '印书局'}-${ratioId}.${format === 'png' ? 'png' : 'jpg'}`;
      addLink(name, blob);
      status = `${w}×${h} · ${(blob.size / 1024 / 1024).toFixed(2)}MB · ${Math.round(performance.now() - t0)}ms${embedWarn(fontEmbedded)}${sealWarn()}`;
    });

  const doPdf = () =>
    run(async () => {
      const t0 = performance.now();
      const { blob, fontEmbedded } = await exportPdf(
        app.exportCtx,
        scale,
        (done, total) => {
          status = `PDF ${done}/${total} 叶…`;
        },
      );
      addLink(`${app.meta.banxinTitle || '印书局'}.pdf`, blob);
      status = `PDF ${(blob.size / 1024 / 1024).toFixed(2)}MB · ${Math.round(performance.now() - t0)}ms${embedWarn(fontEmbedded)}${sealWarn()}`;
    });
</script>

<div class="panel">
  <section>
    <label for="e-ratio">画幅比例（自适应重排）</label>
    <select id="e-ratio" bind:value={ratioId}>
      {#each RATIO_PRESETS as r (r.id)}
        <option value={r.id}>{r.label}</option>
      {/each}
      <option value="custom">自定义</option>
    </select>
    {#if ratioId === 'custom'}
      <div class="row">
        <div>
          <label for="e-cw">宽</label>
          <input id="e-cw" type="number" min="1" bind:value={customW} />
        </div>
        <div>
          <label for="e-ch">高</label>
          <input id="e-ch" type="number" min="1" bind:value={customH} />
        </div>
      </div>
    {/if}
    <p class="hint">
      {planned.plan.mode === 'spread' ? '对开整叶' : '单半叶'} ·
      {planned.plan.grid.cols} 行 × {planned.plan.grid.charsPerCol} 字 · 共 {frameCount}
      版
    </p>
  </section>

  <div class="thumb">{@html previewSvg}</div>
  {#if frameCount > 1}
    <div class="nav">
      <button
        disabled={safeFrame === 0}
        onclick={() => (frameIdx = safeFrame - 1)}>‹</button
      >
      <span>{safeFrame + 1} / {frameCount}</span>
      <button
        disabled={safeFrame >= frameCount - 1}
        onclick={() => (frameIdx = safeFrame + 1)}
      >
        ›
      </button>
    </div>
  {/if}

  <section>
    <div class="row">
      <div>
        <label for="e-fmt">格式</label>
        <select id="e-fmt" bind:value={format}>
          <option value="png">PNG</option>
          <option value="jpeg">JPEG</option>
        </select>
      </div>
      <div>
        <label for="e-scale">倍率</label>
        <select id="e-scale" bind:value={scale}>
          <option value={2}>×2</option>
          <option value={3}>×3</option>
          <option value={4}>×4</option>
        </select>
      </div>
    </div>
    {#if format === 'jpeg'}
      <label for="e-q">质量 {quality.toFixed(2)}</label>
      <input
        id="e-q"
        type="range"
        min="0.5"
        max="1"
        step="0.02"
        bind:value={quality}
      />
    {/if}
  </section>

  <button disabled={busy} onclick={doImage}>导出本版图片</button>
  <button disabled={busy} onclick={doPdf}
    >导出 PDF（全部 {app.pages.length} 叶）</button
  >

  {#if status}<p class="status">{status}</p>{/if}
  <div class="links">
    {#each links as l (l.url)}
      <a href={l.url} download={l.name}>⬇ {l.name}</a>
    {/each}
  </div>
</div>

<style>
  .panel {
    padding: 14px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .row {
    display: flex;
    gap: 8px;
    margin-top: 6px;
  }
  .thumb :global(svg) {
    width: 100%;
    height: auto;
    max-height: 38vh;
    box-shadow: 0 2px 10px rgba(40, 30, 10, 0.25);
  }
  .nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    font-size: 12px;
    color: var(--muted);
  }
  .hint {
    margin: 6px 0 0;
    font-size: 11px;
    color: var(--muted);
  }
  .status {
    margin: 0;
    font: 11px/1.5 monospace;
    background: #fff;
    padding: 6px 8px;
    border-radius: 6px;
  }
  .links {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
  }
</style>
