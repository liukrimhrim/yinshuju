<script lang="ts">
  import { app } from '../state.svelte';
  import Reader from './Reader.svelte';

  let spread = $state(false);
  let reading = $state(false);

  // 画幅本身即对开时（方形/横幅）无需手动切换
  const auto = $derived(app.plan.mode === 'spread');
  const frames = $derived(Math.ceil(app.pages.length / app.step));
</script>

{#if reading}
  <Reader onclose={() => (reading = false)} />
{/if}

<div class="preview">
  <div class="page">
    {#if spread && !auto}
      {@html app.svgSpread}
    {:else}
      {@html app.svg}
    {/if}
  </div>
  <div class="nav">
    {#if frames > 1}
      <button
        disabled={app.curIdx === 0}
        onclick={() => (app.pageIdx = app.curIdx - app.step)}
      >
        ‹ 前{auto ? '版' : '叶'}
      </button>
      <span>
        第 {Math.floor(app.curIdx / app.step) + 1} / {frames}
        {auto ? '版' : '叶'}
      </span>
      <button
        disabled={app.curIdx + app.step >= app.pages.length}
        onclick={() => (app.pageIdx = app.curIdx + app.step)}
      >
        后{auto ? '版' : '叶'} ›
      </button>
    {/if}
    {#if !auto}
      <button class:on={spread} onclick={() => (spread = !spread)}>对开</button>
    {/if}
    <button onclick={() => (reading = true)}>阅读</button>
  </div>
</div>

<style>
  .preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    gap: 12px;
    height: 100%;
    box-sizing: border-box;
  }
  /* 画幅比例由 svg 的 viewBox 决定，只给上限、不定死高宽 */
  .page {
    display: flex;
    justify-content: center;
    width: 100%;
    min-height: 0;
    flex: 0 1 auto;
  }
  .page :global(svg) {
    display: block;
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: min(100%, 1050px);
    box-shadow: 0 3px 18px rgba(40, 30, 10, 0.28);
  }
  .nav {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 13px;
    color: var(--muted);
  }
</style>
