<script lang="ts">
  import { app } from '../state.svelte';
</script>

<div class="editor">
  <div class="meta">
    <div>
      <label for="m-title">书名·卷次（首行顶格）</label>
      <input id="m-title" bind:value={app.meta.title} />
    </div>
    <div>
      <label for="m-author">著者（次行低格）</label>
      <input id="m-author" bind:value={app.meta.author} />
    </div>
    <div class="row">
      <div>
        <label for="m-bt">版心简名</label>
        <input id="m-bt" bind:value={app.meta.banxinTitle} />
      </div>
      <div>
        <label for="m-bj">版心卷次</label>
        <input id="m-bj" bind:value={app.meta.banxinJuan} />
      </div>
    </div>
  </div>
  <label for="m-body">正文</label>
  <textarea id="m-body" bind:value={app.text} spellcheck="false"></textarea>
  <p class="hint">
    （括号）＝双行夹注 · 标点自动化作句读圈点 · 空行＝提行 · #行＝篇题
  </p>
</div>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    flex: 1;
    padding: 14px 18px;
    gap: 10px;
  }
  .meta {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .row {
    display: flex;
    gap: 8px;
  }
  textarea {
    flex: 1;
    min-height: 260px;
    resize: vertical;
    line-height: 1.9;
  }
  .hint {
    margin: 0;
    font-size: 11px;
    color: var(--muted);
  }
</style>
