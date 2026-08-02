<script lang="ts">
  import { app } from '../state.svelte';
  import { exportImage, exportPdf } from '../export';
  import { RATIO_PRESETS } from '../engine/geometry';

  let format = $state<'png' | 'jpeg'>('png');
  let quality = $state(0.92);
  let scale = $state(3);
  let busy = $state(false);
  let status = $state('');
  let links = $state<{ name: string; url: string }[]>([]);

  // 预览即导出：画幅、行格、当前版全部取自预览
  const frameCount = $derived(Math.ceil(app.pages.length / app.step));

  // 导出即存盘（与「导出 .txt」一致）；链接留着以便重下
  function addLink(name: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    links = [...links.slice(-3), { name, url }];
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
        app.ratio,
        app.curIdx,
        { format, quality, scale },
      );
      const name = `${app.meta.banxinTitle || '印书局'}-${app.ratioId}.${format === 'png' ? 'png' : 'jpg'}`;
      addLink(name, blob);
      status = `${w}×${h} · ${(blob.size / 1024 / 1024).toFixed(2)}MB · ${Math.round(performance.now() - t0)}ms${embedWarn(fontEmbedded)}${sealWarn()}`;
    });

  async function doPrint() {
    app.printSvgs = app.buildPrintSvgs();
    window.addEventListener('afterprint', () => (app.printSvgs = null), {
      once: true,
    });
    await new Promise((r) => setTimeout(r, 50));
    await document.fonts.ready;
    window.print();
  }

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
    <label for="e-ratio">画幅比例（预览同步重排）</label>
    <select id="e-ratio" bind:value={app.ratioId}>
      {#each RATIO_PRESETS as r (r.id)}
        <option value={r.id}>{r.label}</option>
      {/each}
      <option value="custom">自定义</option>
    </select>
    {#if app.ratioId === 'custom'}
      <div class="row">
        <div>
          <label for="e-cw">宽</label>
          <input id="e-cw" type="number" min="1" bind:value={app.customW} />
        </div>
        <div>
          <label for="e-ch">高</label>
          <input id="e-ch" type="number" min="1" bind:value={app.customH} />
        </div>
      </div>
    {/if}
    <p class="hint">
      {app.plan.mode === 'spread' ? '对开整叶' : '单半叶'} ·
      {app.plan.grid.cols} 行 × {app.plan.grid.charsPerCol} 字 · 共 {frameCount}
      版（导出上方预览中的当前版）
    </p>
  </section>

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
  <button disabled={busy} onclick={doPrint}>打印（Chrome 矢量 PDF 增强）</button
  >
  <p class="hint">打印出口仅 Chrome 保证 16×28cm 精确开本与矢量文字。</p>

  {#if status}<p class="status">{status}</p>{/if}
  {#if links.length}
    <div class="links">
      <span class="saved">已存入浏览器下载目录；点击可重下：</span>
      {#each links as l (l.url)}
        <a href={l.url} download={l.name}>⬇ {l.name}</a>
      {/each}
    </div>
  {/if}
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
  .saved {
    font-size: 11px;
    color: var(--muted);
  }
</style>
