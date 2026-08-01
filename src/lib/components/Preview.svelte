<script lang="ts">
  import { app } from '../state.svelte';
  import Reader from './Reader.svelte';

  let spread = $state(false);
  let reading = $state(false);
</script>

{#if reading}
  <Reader onclose={() => (reading = false)} />
{/if}

<div class="preview">
  <div class="page" class:spread>
    {#if spread}
      {@html app.svgSpread}
    {:else}
      {@html app.svg}
    {/if}
  </div>
  <div class="nav">
    {#if app.pages.length > 1}
      <button
        disabled={app.curIdx === 0}
        onclick={() => (app.pageIdx = app.curIdx - 1)}
      >
        ‹ 前叶
      </button>
      <span>第 {app.curIdx + 1} / {app.pages.length} 叶</span>
      <button
        disabled={app.curIdx >= app.pages.length - 1}
        onclick={() => (app.pageIdx = app.curIdx + 1)}
      >
        后叶 ›
      </button>
    {/if}
    <button class:on={spread} onclick={() => (spread = !spread)}>对开</button>
    <button onclick={() => (reading = true)}>阅读</button>
  </div>
</div>

<style>
  .preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    gap: 12px;
  }
  .page {
    display: flex;
  }
  .page :global(svg) {
    height: min(86vh, 1050px);
    box-shadow: 0 3px 18px rgba(40, 30, 10, 0.28);
  }
  .page.spread :global(svg) {
    height: min(78vh, 880px);
  }
  .nav {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 13px;
    color: var(--muted);
  }
  @media (max-width: 760px) {
    .page :global(svg) {
      height: auto;
      width: min(92vw, 480px);
    }
    .page.spread :global(svg) {
      width: 92vw;
    }
  }
</style>
