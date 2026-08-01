<script lang="ts">
  import { app } from './lib/state.svelte';
  import Editor from './lib/components/Editor.svelte';
  import ParamsPanel from './lib/components/ParamsPanel.svelte';
  import Preview from './lib/components/Preview.svelte';

  let tab = $state<'text' | 'params'>('text');
  $effect(() => app.persist());
</script>

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
    </nav>
    {#if tab === 'text'}
      <Editor />
    {:else}
      <ParamsPanel />
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
