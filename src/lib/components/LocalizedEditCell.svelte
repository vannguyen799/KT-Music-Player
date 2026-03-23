<script lang="ts">
  import EditableCell from './EditableCell.svelte'

  let {
    value = {},
    onchange,
  }: {
    value: Record<string, string>
    onchange: (val: Record<string, string>) => void
  } = $props()

  let addingLang = $state(false)
  let newLang = $state('')

  const entries = $derived(Object.entries(value).filter(([, v]) => v !== undefined))

  function updateLang(lang: string, text: string) {
    const updated = { ...value, [lang]: text }
    onchange(updated)
  }

  function removeLang(lang: string) {
    const updated = { ...value }
    delete updated[lang]
    onchange(updated)
  }

  function addLang() {
    const lang = newLang.trim().toLowerCase()
    if (!lang || value[lang] !== undefined) return
    onchange({ ...value, [lang]: '' })
    newLang = ''
    addingLang = false
  }
</script>

<div class="localized-cell">
  {#each entries as [lang, text]}
    <div class="lang-row">
      <span class="lang-tag">{lang}</span>
      <EditableCell value={text} onchange={(v) => updateLang(lang, v)} />
      <button class="remove-btn" onclick={() => removeLang(lang)} title="Remove {lang}">x</button>
    </div>
  {/each}

  {#if entries.length === 0}
    <span class="empty-hint" ondblclick={() => { addingLang = true; newLang = 'origin' }}>—</span>
  {/if}

  {#if addingLang}
    <div class="add-row">
      <input
        type="text"
        class="lang-input"
        placeholder="lang code"
        bind:value={newLang}
        onkeydown={(e) => e.key === 'Enter' && addLang()}
      />
      <button class="add-btn" onclick={addLang}>+</button>
      <button class="cancel-btn" onclick={() => addingLang = false}>x</button>
    </div>
  {:else}
    <button class="add-lang-btn" onclick={() => addingLang = true}>+ lang</button>
  {/if}
</div>

<style>
  .localized-cell {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .lang-row {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .lang-tag {
    font-size: 0.65rem;
    padding: 0.05rem 0.25rem;
    background: var(--bg-tertiary);
    border-radius: 3px;
    color: var(--text-muted);
    min-width: 2.5em;
    text-align: center;
    flex-shrink: 0;
  }

  .remove-btn {
    font-size: 0.65rem;
    color: var(--text-muted);
    padding: 0 0.2rem;
    flex-shrink: 0;
    opacity: 0;
  }

  .lang-row:hover .remove-btn {
    opacity: 1;
  }

  .remove-btn:hover {
    color: var(--danger);
  }

  .empty-hint {
    color: var(--text-muted);
    font-style: italic;
    cursor: pointer;
    font-size: 0.85rem;
  }

  .add-row {
    display: flex;
    gap: 0.2rem;
    align-items: center;
  }

  .lang-input {
    width: 4em;
    padding: 0.1rem 0.2rem;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.75rem;
  }

  .add-btn, .cancel-btn {
    font-size: 0.7rem;
    padding: 0.05rem 0.3rem;
    border-radius: 3px;
  }

  .add-btn {
    color: var(--accent);
  }

  .cancel-btn {
    color: var(--text-muted);
  }

  .add-lang-btn {
    font-size: 0.65rem;
    color: var(--text-muted);
    padding: 0.1rem 0;
    text-align: left;
  }

  .add-lang-btn:hover {
    color: var(--accent);
  }
</style>
