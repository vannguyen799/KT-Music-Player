<script lang="ts">
  import LocalizedEditCell from './LocalizedEditCell.svelte'
  import { updateSong } from '$lib/services/song.service'
  import type { Song, LocalizedText } from '$lib/types/song'

  let {
    song,
    onclose,
    onsaved,
  }: {
    song: Song
    onclose: () => void
    onsaved: (updated: Song) => void
  } = $props()

  let title = $state<Record<string, string>>({ ...song.title } as Record<string, string>)
  let artist = $state<Record<string, string>>({ ...song.artist } as Record<string, string>)
  let lyrics = $state<Record<string, string>>({ ...song.lyrics } as Record<string, string>)
  let status = $state(song.status)
  let note = $state(song.note ?? '')
  let saving = $state(false)
  let error = $state('')
  let addingLyricLang = $state(false)
  let newLyricLang = $state('')

  function addLyricLang() {
    const lang = newLyricLang.trim().toLowerCase()
    if (!lang || lyrics[lang] !== undefined) return
    lyrics = { ...lyrics, [lang]: '' }
    newLyricLang = ''
    addingLyricLang = false
  }

  async function save() {
    saving = true
    error = ''
    try {
      const updated = await updateSong(song.fileId, {
        title: title as LocalizedText,
        artist: artist as LocalizedText,
        lyrics: lyrics as LocalizedText,
        status,
        note,
      })
      onsaved(updated)
    } catch (err: any) {
      error = err.message || 'Save failed'
    } finally {
      saving = false
    }
  }

</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={onclose}>
  <div class="modal-content" onclick={(e) => e.stopPropagation()}>
    <div class="modal-header">
      <h3>Edit Song</h3>
      <button class="close-btn" onclick={onclose}>&times;</button>
    </div>

    <div class="modal-body">
      <div class="field">
        <label>Title</label>
        <LocalizedEditCell value={title} onchange={(v) => title = v} />
      </div>

      <div class="field">
        <label>Artist</label>
        <LocalizedEditCell value={artist} onchange={(v) => artist = v} />
      </div>

      <div class="field">
        <label>Lyrics</label>
        <div class="lyrics-edit">
          {#each Object.entries(lyrics).filter(([, v]) => v !== undefined) as [lang, text]}
            <div class="lyrics-lang">
              <div class="lyrics-lang-header">
                <span class="lang-tag">{lang}</span>
                <button class="remove-btn" onclick={() => { const l = { ...lyrics }; delete l[lang]; lyrics = l }}>x</button>
              </div>
              <textarea
                class="lyrics-textarea"
                value={text}
                oninput={(e) => lyrics = { ...lyrics, [lang]: (e.target as HTMLTextAreaElement).value }}
                rows="6"
                placeholder="[00:01.00] Lyrics line..."
              ></textarea>
            </div>
          {/each}
          {#if addingLyricLang}
            <div class="add-lang-row">
              <input
                type="text"
                class="lang-code-input"
                placeholder="lang code"
                bind:value={newLyricLang}
                onkeydown={(e) => { if (e.key === 'Enter') addLyricLang(); if (e.key === 'Escape') addingLyricLang = false }}
              />
              <button class="add-confirm-btn" onclick={addLyricLang}>+</button>
              <button class="add-cancel-btn" onclick={() => addingLyricLang = false}>x</button>
            </div>
          {:else}
            <button class="add-lang-btn" onclick={() => addingLyricLang = true}>+ lang</button>
          {/if}
        </div>
      </div>

      <div class="field">
        <label>Status</label>
        <input type="text" class="text-input" bind:value={status} placeholder="e.g. active, danger" />
      </div>

      <div class="field">
        <label>Note</label>
        <textarea class="text-input note-textarea" bind:value={note} placeholder="Admin notes..." rows="2"></textarea>
      </div>

      <div class="info-row">
        <span class="info-label">File ID:</span>
        <span class="info-value">{song.fileId}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Extension:</span>
        <span class="info-value">{song.ext}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Listens:</span>
        <span class="info-value">{song.listens}</span>
      </div>

      {#if error}
        <p class="error">{error}</p>
      {/if}
    </div>

    <div class="modal-footer">
      <button class="btn-cancel" onclick={onclose}>Cancel</button>
      <button class="btn-save" onclick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    width: 520px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border);
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.1rem;
  }

  .close-btn {
    font-size: 1.4rem;
    color: var(--text-muted);
    padding: 0 0.25rem;
    line-height: 1;
  }

  .close-btn:hover {
    color: var(--text-primary);
  }

  .modal-body {
    padding: 1rem 1.25rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .field label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .lyrics-edit {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .lyrics-lang-header {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    margin-bottom: 0.15rem;
  }

  .lang-tag {
    font-size: 0.65rem;
    padding: 0.05rem 0.25rem;
    background: var(--bg-tertiary);
    border-radius: 3px;
    color: var(--text-muted);
  }

  .remove-btn {
    font-size: 0.65rem;
    color: var(--text-muted);
    padding: 0 0.2rem;
  }

  .remove-btn:hover {
    color: var(--danger);
  }

  .lyrics-textarea {
    width: 100%;
    padding: 0.4rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.8rem;
    font-family: monospace;
    resize: vertical;
    line-height: 1.4;
  }

  .lyrics-textarea:focus {
    border-color: var(--accent);
    outline: none;
  }

  .add-lang-row {
    display: flex;
    gap: 0.2rem;
    align-items: center;
  }

  .lang-code-input {
    width: 5em;
    padding: 0.15rem 0.3rem;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.75rem;
  }

  .add-confirm-btn, .add-cancel-btn {
    font-size: 0.7rem;
    padding: 0.05rem 0.3rem;
    border-radius: 3px;
  }

  .add-confirm-btn { color: var(--accent); }
  .add-cancel-btn { color: var(--text-muted); }

  .add-lang-btn {
    font-size: 0.7rem;
    color: var(--text-muted);
    padding: 0.1rem 0;
    text-align: left;
    align-self: flex-start;
  }

  .add-lang-btn:hover {
    color: var(--accent);
  }

  .text-input {
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.85rem;
  }

  .note-textarea {
    resize: vertical;
    font-family: inherit;
    line-height: 1.4;
  }

  .info-row {
    display: flex;
    gap: 0.5rem;
    font-size: 0.8rem;
  }

  .info-label {
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .info-value {
    color: var(--text-secondary);
    word-break: break-all;
  }

  .error {
    color: var(--danger);
    font-size: 0.85rem;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    border-top: 1px solid var(--border);
  }

  .btn-cancel {
    padding: 0.4rem 1rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 0.85rem;
  }

  .btn-cancel:hover {
    background: var(--bg-hover);
  }

  .btn-save {
    padding: 0.4rem 1rem;
    background: var(--accent);
    color: #fff;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .btn-save:hover {
    background: var(--accent-hover);
  }

  .btn-save:disabled {
    opacity: 0.6;
  }
</style>
