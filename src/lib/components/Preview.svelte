<script lang="ts">
  import { app } from '../state.svelte';
</script>

<div class="preview">
  <div class="page">
    <!-- eslint-disable-next-line svelte/no-at-html-tags — svg 由引擎生成，文本已转义 -->
    {@html app.svg}
  </div>
  {#if app.pages.length > 1}
    <div class="nav">
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
    </div>
  {/if}
</div>

<style>
  .preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    gap: 12px;
  }
  .page :global(svg) {
    height: min(88vh, 1050px);
    box-shadow: 0 3px 18px rgba(40, 30, 10, 0.28);
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
  }
</style>
