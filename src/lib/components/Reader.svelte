<script lang="ts">
  import { app } from '../state.svelte';

  let { onclose }: { onclose: () => void } = $props();

  // 页序右起：向左翻=下一叶。左缘/←/左滑 → 后叶；右缘/→/右滑 → 前叶
  function next() {
    if (app.curIdx + app.step < app.pages.length)
      app.pageIdx = app.curIdx + app.step;
  }
  function prev() {
    if (app.curIdx > 0) app.pageIdx = app.curIdx - app.step;
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') next();
    else if (e.key === 'ArrowRight') prev();
    else if (e.key === 'Escape') onclose();
  }
  let touchX = 0;
  function onTouchStart(e: TouchEvent) {
    touchX = e.touches[0]?.clientX ?? 0;
  }
  function onTouchEnd(e: TouchEvent) {
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX;
    if (dx < -40) next();
    else if (dx > 40) prev();
  }
</script>

<svelte:window onkeydown={onKey} />

<div
  class="reader"
  role="document"
  ontouchstart={onTouchStart}
  ontouchend={onTouchEnd}
>
  <div class="page">{@html app.svg}</div>
  <button class="zone left" aria-label="后叶" onclick={next}></button>
  <button class="zone right" aria-label="前叶" onclick={prev}></button>
  <button class="close" aria-label="退出阅读" onclick={onclose}>×</button>
  <div class="folio">
    第 {Math.floor(app.curIdx / app.step) + 1} / {Math.ceil(
      app.pages.length / app.step,
    )}
    {app.plan.mode === 'spread' ? '版' : '叶'}
  </div>
</div>

<style>
  .reader {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: #14110c;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .page {
    width: 100vw;
    display: flex;
    justify-content: center;
  }
  .page :global(svg) {
    display: block;
    width: auto;
    height: auto;
    max-width: 100vw;
    max-height: 100vh;
  }
  .zone {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 28%;
    background: none;
    border: none;
    cursor: pointer;
  }
  .zone.left {
    left: 0;
  }
  .zone.right {
    right: 0;
  }
  .close {
    position: absolute;
    top: 14px;
    right: 16px;
    width: 40px;
    height: 40px;
    border-radius: 20px;
    border: none;
    font-size: 20px;
    background: rgba(255, 255, 255, 0.14);
    color: #eee;
  }
  .folio {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    color: #a89f8d;
    font-size: 12px;
  }
</style>
