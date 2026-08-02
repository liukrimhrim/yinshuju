<script lang="ts">
  import { app } from './lib/state.svelte';
  import { loadS2T } from './lib/convert';
  import { exportImage } from './lib/export';
  import { BASE_RATIO } from './lib/engine/geometry';

  let selftest = $state<{ ok: boolean; detail: string; url?: string } | null>(
    null,
  );
  $effect(() => {
    if (!new URLSearchParams(location.search).has('selftest')) return;
    exportImage(app.exportCtx, BASE_RATIO, 0, {
      format: 'png',
      quality: 0.92,
      scale: 2,
    })
      .then(({ blob, w, h, fontEmbedded }) => {
        selftest = {
          ok: fontEmbedded,
          detail: `SELFTEST ${fontEmbedded ? 'OK' : 'DEGRADED'} ${w}x${h} ${Math.round(blob.size / 1024)}KB`,
          url: URL.createObjectURL(blob),
        };
      })
      .catch(
        (e) =>
          (selftest = {
            ok: false,
            detail: 'SELFTEST FAIL: ' + (e as Error).message,
          }),
      );
  });
  import Editor from './lib/components/Editor.svelte';
  import ParamsPanel from './lib/components/ParamsPanel.svelte';
  import Preview from './lib/components/Preview.svelte';
  import ExportPanel from './lib/components/ExportPanel.svelte';

  let tab = $state<'text' | 'params' | 'export'>('text');
  $effect(() => app.persist());
  $effect(() => {
    if (app.seals.length) app.ensureSealFont();
  });
  $effect(() => {
    if (app.convertS2T && !app.s2t) loadS2T().then((c) => (app.s2t = c));
  });
</script>

{#if app.printSvgs}
  <div class="print-root">
    {#each app.printSvgs as s, i (i)}
      <div class="print-page">{@html s}</div>
    {/each}
  </div>
{/if}

{#if selftest}
  <div class="selftest" class:fail={!selftest.ok}>
    <strong>{selftest.detail}</strong>
    {#if selftest.url}<img src={selftest.url} alt="导出自测结果" />{/if}
  </div>
{/if}

<div class="shell">
  <aside>
    <header>
      <h1>印书局</h1>
      <p>把一段文字，印成一叶古书</p>
    </header>
    <nav>
      <button class:on={tab === 'text'} onclick={() => (tab = 'text')}
        >正文</button
      >
      <button class:on={tab === 'params'} onclick={() => (tab = 'params')}
        >版式</button
      >
      <button class:on={tab === 'export'} onclick={() => (tab = 'export')}
        >导出</button
      >
    </nav>
    {#if tab === 'text'}
      <Editor />
    {:else if tab === 'params'}
      <ParamsPanel />
    {:else}
      <ExportPanel />
    {/if}
  </aside>
  <main>
    <Preview />
  </main>
</div>

<style>
  .shell {
    display: flex;
    height: 100vh;
  }
  aside {
    width: 360px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    background: var(--panel);
    border-right: 1px solid var(--border);
    overflow-y: auto;
  }
  header {
    padding: 18px 18px 8px;
  }
  h1 {
    margin: 0;
    font-size: 22px;
    letter-spacing: 0.3em;
  }
  header p {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--muted);
  }
  nav {
    display: flex;
    gap: 6px;
    padding: 10px 18px;
    border-bottom: 1px solid var(--border);
  }
  nav button {
    flex: 1;
  }
  main {
    flex: 1;
    overflow: auto;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }
  .selftest {
    position: fixed;
    inset: 0;
    z-index: 90;
    background: #0f2e18;
    color: #d6f5dd;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 16px;
    overflow: auto;
    font-size: 18px;
  }
  .print-root {
    display: none;
  }
  @media print {
    .shell,
    .selftest {
      display: none !important;
    }
    .print-root {
      display: block;
    }
    .print-page {
      page-break-after: always;
    }
    .print-page :global(svg) {
      display: block;
      width: 16cm;
      height: 28cm;
    }
  }
  .selftest.fail {
    background: #3a1210;
    color: #ffd9d4;
  }
  .selftest img {
    max-height: 82vh;
    max-width: 92vw;
  }
  @media (max-width: 760px) {
    .shell {
      flex-direction: column-reverse;
    }
    aside {
      width: 100%;
      max-height: 45vh;
      border-right: none;
      border-top: 1px solid var(--border);
    }
  }
</style>
