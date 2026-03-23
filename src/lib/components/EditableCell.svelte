<script lang="ts">
  let {
    value = '',
    onchange,
    placeholder = '',
  }: {
    value: string
    onchange: (val: string) => void
    placeholder?: string
  } = $props()

  let editing = $state(false)
  let inputEl: HTMLInputElement | undefined = $state()

  function startEdit() {
    editing = true
    // Focus after DOM update
    queueMicrotask(() => inputEl?.focus())
  }

  function commit() {
    editing = false
    onchange(inputEl?.value ?? value)
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') { editing = false }
  }
</script>

{#if editing}
  <input
    bind:this={inputEl}
    type="text"
    class="edit-input"
    value={value}
    {placeholder}
    onblur={commit}
    onkeydown={handleKeydown}
  />
{:else}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <span
    class="edit-text"
    class:empty={!value}
    ondblclick={startEdit}
    title="Double-click to edit"
  >
    {value || placeholder || '—'}
  </span>
{/if}

<style>
  .edit-text {
    cursor: text;
    display: block;
    min-height: 1.2em;
    padding: 0.1rem 0.2rem;
    border-radius: 3px;
  }

  .edit-text:hover {
    background: var(--bg-hover);
  }

  .edit-text.empty {
    color: var(--text-muted);
    font-style: italic;
  }

  .edit-input {
    width: 100%;
    padding: 0.15rem 0.3rem;
    border: 1px solid var(--accent);
    border-radius: 3px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: inherit;
    font-family: inherit;
    outline: none;
  }
</style>
