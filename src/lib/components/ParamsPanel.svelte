<script lang="ts">
  import { app } from '../state.svelte';
  import { THEMES, FONTS } from '../engine/themes';
  import { SEAL_SLOTS, type SealSpec } from '../seal';

  function addSeal() {
    app.seals = [
      ...app.seals,
      {
        text: '',
        style: 'zhu',
        shape: 'square',
        slot: 'tiantou',
        kaiFallback: false,
      },
    ];
  }
  function removeSeal(i: number) {
    app.seals = app.seals.filter((_, x) => x !== i);
  }
  const missingOf = (i: number) =>
    app.sealMissing.find((m) => m.index === i)?.chars.join(' ') ?? '';

  const PRESETS = [
    { label: '黄善夫本 · 十行十八字', cols: 10, chars: 18 },
    { label: '殿本岳氏 · 八行十七字', cols: 8, chars: 17 },
    { label: '蜀大字本 · 九行十六字', cols: 9, chars: 16 },
    { label: '小字本 · 十四行廿四字', cols: 14, chars: 24 },
  ];
  const COLOR_LABELS: [keyof typeof app.palette, string][] = [
    ['paper', '纸'],
    ['text', '正文'],
    ['note', '夹注'],
    ['mark', '圈点'],
    ['frame', '版框'],
    ['line', '界行'],
    ['seal', '印'],
  ];

  let presetIdx = $derived(
    PRESETS.findIndex(
      (p) => p.cols === app.cols && p.chars === app.charsPerCol,
    ),
  );
  // 版式规范票：常用域半叶 8–15 行 × 行 16–22 字
  let outOfCanon = $derived(
    presetIdx === -1 &&
      (app.cols < 8 ||
        app.cols > 15 ||
        app.charsPerCol < 16 ||
        app.charsPerCol > 22),
  );

  function pickPreset(e: Event) {
    const i = Number((e.currentTarget as HTMLSelectElement).value);
    const p = PRESETS[i];
    if (p) {
      app.cols = p.cols;
      app.charsPerCol = p.chars;
    }
  }
</script>

<div class="panel">
  <section>
    <label for="p-theme">主题</label>
    <div class="themes" id="p-theme">
      {#each THEMES as t (t.id)}
        <button
          class:on={app.themeId === t.id}
          onclick={() => app.applyTheme(t.id)}>{t.name}</button
        >
      {/each}
    </div>
  </section>

  <section>
    <label for="p-colors">颜色（逐色可调，主题即预设）</label>
    <div class="colors" id="p-colors">
      {#each COLOR_LABELS as [key, label] (key)}
        <div class="color">
          <input
            type="color"
            bind:value={app.palette[key]}
            aria-label={label}
          />
          <span>{label}</span>
        </div>
      {/each}
    </div>
  </section>

  <section>
    <label for="p-grid">行格（半叶）</label>
    <select id="p-grid" value={String(presetIdx)} onchange={pickPreset}>
      <option value="-1" disabled={presetIdx !== -1}>自定义</option>
      {#each PRESETS as p, i (p.label)}
        <option value={String(i)}>{p.label}</option>
      {/each}
    </select>
    <div class="row">
      <div>
        <label for="p-cols">行数（列）</label>
        <input
          id="p-cols"
          type="number"
          min="4"
          max="20"
          bind:value={app.cols}
        />
      </div>
      <div>
        <label for="p-chars">每行字数</label>
        <input
          id="p-chars"
          type="number"
          min="8"
          max="27"
          bind:value={app.charsPerCol}
        />
      </div>
    </div>
    {#if outOfCanon}
      <p class="warn">超出常见刻本制式（8–15 行 × 16–22 字），照排不误</p>
    {/if}
  </section>

  <section>
    <label for="p-font">字体</label>
    <select id="p-font" bind:value={app.fontId}>
      {#each FONTS as f (f.id)}
        <option value={f.id}>{f.label}</option>
      {/each}
    </select>
  </section>

  {#if app.theme.texture}
    <section>
      <label for="p-tex"
        >做旧强度 {app.textureStrength === 0
          ? '关'
          : app.textureStrength.toFixed(2)}</label
      >
      <input
        id="p-tex"
        type="range"
        min="0"
        max="1"
        step="0.05"
        bind:value={app.textureStrength}
      />
    </section>
  {/if}

  <section>
    <label class="check">
      <input type="checkbox" bind:checked={app.showPunct} />
      显示句读圈点
    </label>
  </section>

  <section>
    <label for="p-seals">印章（崇羲篆体 · 贴卷首叶）</label>
    <div id="p-seals" class="seals">
      {#each app.seals as seal, i (i)}
        <div class="seal">
          <div class="row">
            <input placeholder="印文（2–9 字）" bind:value={seal.text} />
            <button class="del" onclick={() => removeSeal(i)} aria-label="删除"
              >×</button
            >
          </div>
          <div class="row">
            <select bind:value={seal.style}>
              <option value="zhu">朱文（红字）</option>
              <option value="bai">白文（红底）</option>
            </select>
            <select bind:value={seal.shape}>
              <option value="square">方印</option>
              <option value="circle">圆印</option>
              <option value="ellipse">椭圆</option>
            </select>
            <select bind:value={seal.slot}>
              {#each SEAL_SLOTS as s (s.id)}
                <option value={s.id}>{s.label}</option>
              {/each}
            </select>
          </div>
          {#if missingOf(i)}
            <p class="warn">
              篆书缺字：{missingOf(i)}
              <label class="check inline">
                <input type="checkbox" bind:checked={seal.kaiFallback} />
                整印退用正文字体
              </label>
            </p>
          {/if}
        </div>
      {/each}
    </div>
    <button onclick={addSeal}>＋ 添加印章</button>
    {#if !app.sealFont && app.seals.length}
      <p class="hint">篆书字体加载中…（21.8MB，仅首次）</p>
    {/if}
  </section>
</div>

<style>
  .panel {
    padding: 14px 18px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .themes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .colors {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .color {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }
  .color input {
    width: 34px;
    height: 26px;
    padding: 1px;
  }
  .row {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }
  .warn {
    margin: 6px 0 0;
    font-size: 11px;
    color: #a3691e;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--ink);
  }
  .check input {
    width: auto;
  }
  .seals {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 8px;
  }
  .seal {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .seal .row {
    margin-top: 0;
  }
  .del {
    flex: 0 0 34px;
    padding: 6px 0;
  }
  .check.inline {
    display: inline-flex;
    margin-left: 8px;
  }
  .hint {
    margin: 6px 0 0;
    font-size: 11px;
    color: var(--muted);
  }
</style>
