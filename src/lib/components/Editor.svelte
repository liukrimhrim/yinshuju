<script lang="ts">
  import { app } from '../state.svelte';

  let fileInput: HTMLInputElement;

  function exportTxt() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([app.text], { type: 'text/plain' }));
    a.download = `${app.meta.title || '印书局'}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importTxt(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (file) app.text = await file.text();
    fileInput.value = '';
  }
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
    （括号）＝双行夹注 · *小字* · **大字** · 《书名》［专名］｛圈注｝＜点注＞ ·
    标点自动化作句读圈点 · 空行＝提行（多空一行＝空一列） · #行＝篇题
  </p>
  <div class="io">
    <button onclick={() => fileInput.click()}>导入 .txt</button>
    <button onclick={exportTxt}>导出 .txt</button>
    <input
      type="file"
      accept=".txt,text/plain"
      hidden
      bind:this={fileInput}
      onchange={importTxt}
    />
  </div>
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
  .io {
    display: flex;
    gap: 8px;
  }
  .io button {
    flex: 1;
  }
</style>
