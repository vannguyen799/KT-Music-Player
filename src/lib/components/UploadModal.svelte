<script lang="ts">
  import { uploadSongs, checkDuplicates, type UploadSongMeta, type Category, type DuplicateMatch } from '$lib/services/admin.service'
  import Icon from './Icon.svelte'
  import LocalizedEditCell from './LocalizedEditCell.svelte'

  let {
    category,
    onclose,
    onuploaded,
  }: {
    category: Category
    onclose: () => void
    onuploaded: () => void
  } = $props()

  interface DuplicateInfo {
    title: Record<string, string>
    artist: Record<string, string>
    filename: string
  }

  interface ParsedFile {
    file: File
    title: Record<string, string>
    artist: Record<string, string>
    lyrics: Record<string, string>
    ext: string
    enabled: boolean
    duplicates?: DuplicateInfo[]
    checking?: boolean
  }

  let files = $state<ParsedFile[]>([])
  let uploading = $state(false)
  let error = $state('')
  let dragOver = $state(false)
  let fileInput: HTMLInputElement | undefined = $state()

  function parseFilenameClient(name: string): { title: Record<string, string>; artist: Record<string, string>; ext: string } {
    const audioExts = ['flac', 'wav', 'mp3', 'ape', 'm4a', 'mp4', 'ogg']
    let ext = ''
    for (const e of audioExts) {
      if (name.toLowerCase().endsWith(`.${e}`)) {
        ext = e
        name = name.slice(0, -(e.length + 1))
        break
      }
    }
    name = name.replace(/\+/g, ' ').trim()

    const SPLITTER = 'ǁ'
    for (const sep of [SPLITTER, '|', '   ']) {
      if (name.includes(sep)) {
        const parts = name.split(sep)
        if (parts.length === 2) {
          const viParts = parts[0]!.split(' - ')
          const originParts = parts[1]!.split(' - ')
          const title: Record<string, string> = {}
          const artist: Record<string, string> = {}
          const ot = (originParts[1] ?? '').trim()
          const vt = (viParts[1] ?? '').trim()
          const oa = (originParts[0] ?? '').trim()
          const va = (viParts[0] ?? '').trim()
          if (ot) title.origin = ot
          if (vt && vt !== ot) title.vi = vt
          if (oa) artist.origin = oa
          if (va && va !== oa) artist.vi = va
          return { title, artist, ext }
        }
      }
    }

    if (name.includes(' - ')) {
      const parts = name.split(' - ')
      return { title: { origin: (parts[1] ?? '').trim() }, artist: { origin: (parts[0] ?? '').trim() }, ext }
    }

    return { title: { origin: name }, artist: {}, ext }
  }

  function addFiles(newFiles: FileList | File[]) {
    const audioTypes = ['audio/', 'video/mp4']
    const added: number[] = []
    for (const file of newFiles) {
      const isAudio = audioTypes.some((t) => file.type.startsWith(t)) || /\.(flac|wav|mp3|ape|m4a|ogg)$/i.test(file.name)
      if (!isAudio) continue
      if (files.some((f) => f.file.name === file.name)) continue

      const parsed = parseFilenameClient(file.name)

      files.push({
        file,
        title: parsed.title,
        artist: parsed.artist,
        lyrics: {},
        ext: parsed.ext,
        enabled: true,
        checking: true,
      })
      added.push(files.length - 1)
    }
    files = [...files]
    if (added.length > 0) runDuplicateCheck(added)
  }

  async function runDuplicateCheck(indices: number[]) {
    const songs = indices.map((i) => ({ title: files[i]!.title, artist: files[i]!.artist }))
    try {
      const results = await checkDuplicates(songs)
      const resultMap = new Map(results.map((r) => [r.index, r.matches]))
      for (let j = 0; j < indices.length; j++) {
        const fi = indices[j]!
        const matches = resultMap.get(j)
        files[fi]!.duplicates = matches?.map((m) => ({
          title: m.title,
          artist: m.artist,
          filename: m.filename,
        }))
        files[fi]!.checking = false
      }
    } catch {
      for (const fi of indices) {
        files[fi]!.checking = false
      }
    }
    files = [...files]
  }

  function removeFile(idx: number) {
    files = files.filter((_, i) => i !== idx)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    dragOver = false
    if (e.dataTransfer?.files) addFiles(e.dataTransfer.files)
  }

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement
    if (input.files) addFiles(input.files)
    input.value = ''
  }

  async function doUpload() {
    const toUpload = files.filter((f) => f.enabled)
    if (toUpload.length === 0) return

    uploading = true
    error = ''
    try {
      const rawFiles = toUpload.map((f) => f.file)
      const meta: UploadSongMeta[] = toUpload.map((f) => ({
        filename: f.file.name,
        title: f.title,
        artist: f.artist,
        lyrics: f.lyrics,
      }))

      await uploadSongs(category.id, rawFiles, meta)
      onuploaded()
    } catch (err: any) {
      error = err.message || 'Upload failed'
    } finally {
      uploading = false
    }
  }

  const enabledCount = $derived(files.filter((f) => f.enabled).length)
  const dupCount = $derived(files.filter((f) => f.enabled && f.duplicates && f.duplicates.length > 0).length)
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={onclose}>
  <div class="modal-content" onclick={(e) => e.stopPropagation()}>
    <div class="modal-header">
      <h3>Upload to <span class="cat-name">{category.name}</span></h3>
      <button class="close-btn" onclick={onclose}><Icon name="x" size={18} /></button>
    </div>

    <div class="modal-body">
      <!-- Drop zone -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="drop-zone"
        class:drag-over={dragOver}
        ondragover={(e) => { e.preventDefault(); dragOver = true }}
        ondragleave={() => dragOver = false}
        ondrop={handleDrop}
        onclick={() => fileInput?.click()}
      >
        <input
          bind:this={fileInput}
          type="file"
          multiple
          accept="audio/*,.flac,.wav,.mp3,.ape,.m4a,.ogg"
          onchange={handleFileSelect}
          hidden
        />
        <div class="drop-text">
          {#if files.length === 0}
            Drop audio files here or click to browse
          {:else}
            Drop more files or click to add
          {/if}
        </div>
      </div>

      <!-- File list -->
      {#if files.length > 0}
        <div class="file-list">
          {#each files as f, i}
            <div class="file-item" class:disabled={!f.enabled} class:has-duplicate={f.duplicates && f.duplicates.length > 0}>
              <div class="file-header">
                <label class="file-toggle">
                  <input type="checkbox" bind:checked={f.enabled} />
                  <span class="file-name">{f.file.name}</span>
                </label>
                {#if f.checking}
                  <span class="dup-checking">checking...</span>
                {/if}
                {#if f.duplicates && f.duplicates.length > 0}
                  <span class="dup-badge">duplicate</span>
                {/if}
                <span class="file-size">{(f.file.size / 1024 / 1024).toFixed(1)}MB</span>
                <button class="file-remove" onclick={() => removeFile(i)}><Icon name="x" size={14} /></button>
              </div>
              {#if f.duplicates && f.duplicates.length > 0}
                <div class="dup-warning">
                  Possible duplicate{f.duplicates.length > 1 ? 's' : ''}:
                  {#each f.duplicates as dup}
                    <div class="dup-match">
                      {Object.values(dup.artist).filter(Boolean).join(' / ') || '?'} - {Object.values(dup.title).filter(Boolean).join(' / ') || '?'}
                      <span class="dup-filename">({dup.filename})</span>
                    </div>
                  {/each}
                </div>
              {/if}
              {#if f.enabled}
                <div class="file-meta">
                  <div class="meta-field">
                    <span class="meta-label">Title</span>
                    <LocalizedEditCell value={f.title} onchange={(v) => f.title = v} />
                  </div>
                  <div class="meta-field">
                    <span class="meta-label">Artist</span>
                    <LocalizedEditCell value={f.artist} onchange={(v) => f.artist = v} />
                  </div>
                  <div class="meta-field">
                    <span class="meta-label">Lyrics</span>
                    <div class="lyrics-mini">
                      {#each Object.entries(f.lyrics).filter(([,v]) => v !== undefined) as [lang, text]}
                        <div class="lyrics-lang-row">
                          <span class="lang-tag">{lang}</span>
                          <textarea
                            class="lyrics-ta"
                            value={text}
                            oninput={(e) => f.lyrics = { ...f.lyrics, [lang]: (e.target as HTMLTextAreaElement).value }}
                            rows="3"
                            placeholder="[00:01.00] ..."
                          ></textarea>
                          <button class="rm-lang" onclick={() => { const l = { ...f.lyrics }; delete l[lang]; f.lyrics = l }}>x</button>
                        </div>
                      {/each}
                      <button class="add-lang-btn" onclick={() => {
                        const lang = prompt('Language code (e.g. origin, vi, en, zh)')
                        if (lang && f.lyrics[lang] === undefined) f.lyrics = { ...f.lyrics, [lang]: '' }
                      }}>+ lyrics lang</button>
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

      {#if error}
        <p class="error">{error}</p>
      {/if}
    </div>

    <div class="modal-footer">
      <span class="upload-count">
        {enabledCount} file{enabledCount !== 1 ? 's' : ''} selected
        {#if dupCount > 0}
          <span class="dup-count-warn">({dupCount} possible duplicate{dupCount !== 1 ? 's' : ''})</span>
        {/if}
      </span>
      <button class="btn-cancel" onclick={onclose}>Cancel</button>
      <button class="btn-upload" onclick={doUpload} disabled={uploading || enabledCount === 0}>
        {uploading ? 'Uploading...' : `Upload ${enabledCount}`}
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
    width: 680px;
    max-height: 85vh;
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
    font-size: 1rem;
  }

  .cat-name {
    color: var(--accent);
  }

  .close-btn {
    font-size: 1.4rem;
    color: var(--text-muted);
    padding: 0 0.25rem;
    line-height: 1;
  }

  .close-btn:hover { color: var(--text-primary); }

  .modal-body {
    padding: 1rem 1.25rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .drop-zone {
    border: 2px dashed var(--border);
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
  }

  .drop-zone:hover, .drop-zone.drag-over {
    border-color: var(--accent);
    background: rgba(var(--accent-rgb, 29, 185, 84), 0.05);
  }

  .drop-text {
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .file-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .file-item {
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
  }

  .file-item.disabled {
    opacity: 0.5;
  }

  .file-item.has-duplicate {
    border-color: var(--warning, #e6a700);
    background: rgba(230, 167, 0, 0.05);
  }

  .dup-checking {
    font-size: 0.65rem;
    color: var(--text-muted);
    font-style: italic;
    flex-shrink: 0;
  }

  .dup-badge {
    font-size: 0.6rem;
    padding: 0.05rem 0.35rem;
    background: var(--warning, #e6a700);
    color: #000;
    border-radius: 3px;
    font-weight: 600;
    text-transform: uppercase;
    flex-shrink: 0;
  }

  .dup-warning {
    font-size: 0.7rem;
    color: var(--warning, #e6a700);
    padding: 0.3rem 0.5rem;
    margin-top: 0.25rem;
    background: rgba(230, 167, 0, 0.08);
    border-radius: 4px;
  }

  .dup-match {
    margin-top: 0.15rem;
    padding-left: 0.5rem;
  }

  .dup-filename {
    color: var(--text-muted);
    font-size: 0.6rem;
  }

  .file-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .file-toggle {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex: 1;
    min-width: 0;
    cursor: pointer;
  }

  .file-toggle input {
    flex-shrink: 0;
  }

  .file-name {
    font-size: 0.8rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-size {
    font-size: 0.7rem;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .file-remove {
    font-size: 1.1rem;
    color: var(--text-muted);
    padding: 0 0.2rem;
    flex-shrink: 0;
  }

  .file-remove:hover { color: var(--danger); }

  .file-meta {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-top: 0.4rem;
    padding-top: 0.4rem;
    border-top: 1px solid var(--border);
  }

  .meta-field {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .meta-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    min-width: 3rem;
    padding-top: 0.15rem;
    flex-shrink: 0;
  }

  .lyrics-mini {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .lyrics-lang-row {
    display: flex;
    align-items: flex-start;
    gap: 0.3rem;
  }

  .lang-tag {
    font-size: 0.6rem;
    padding: 0.05rem 0.2rem;
    background: var(--bg-tertiary);
    border-radius: 3px;
    color: var(--text-muted);
    min-width: 2.2em;
    text-align: center;
    flex-shrink: 0;
    margin-top: 0.2rem;
  }

  .lyrics-ta {
    flex: 1;
    padding: 0.25rem 0.4rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.75rem;
    font-family: monospace;
    resize: vertical;
  }

  .rm-lang {
    font-size: 0.6rem;
    color: var(--text-muted);
    padding: 0 0.15rem;
    margin-top: 0.2rem;
  }

  .rm-lang:hover { color: var(--danger); }

  .add-lang-btn {
    font-size: 0.65rem;
    color: var(--text-muted);
    padding: 0.1rem 0;
    text-align: left;
    align-self: flex-start;
  }

  .add-lang-btn:hover { color: var(--accent); }

  .error {
    color: var(--danger);
    font-size: 0.85rem;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    border-top: 1px solid var(--border);
  }

  .upload-count {
    flex: 1;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .btn-cancel {
    padding: 0.4rem 1rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 0.85rem;
  }

  .btn-cancel:hover { background: var(--bg-hover); }

  .btn-upload {
    padding: 0.4rem 1rem;
    background: var(--accent);
    color: #fff;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .btn-upload:hover { background: var(--accent-hover); }
  .btn-upload:disabled { opacity: 0.6; }

  .dup-count-warn {
    color: var(--warning, #e6a700);
    font-weight: 600;
  }
</style>
