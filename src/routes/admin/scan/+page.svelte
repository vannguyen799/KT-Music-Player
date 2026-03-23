<script lang="ts">
  import { getAuthStore } from '$lib/stores/auth.store.svelte'
  import { listFolders, previewScan, previewAllScan, saveScan, type ScannedSong, type ScanPreview, type DriveFolder, type ScanMode } from '$lib/services/admin.service'
  import LocalizedEditCell from '$lib/components/LocalizedEditCell.svelte'

  const auth = getAuthStore()

  // State
  let folders = $state<DriveFolder[]>([])
  let selectedFolderId = $state('')
  let scanning = $state(false)
  let saving = $state(false)
  let previews = $state<ScanPreview[]>([])
  let skipUnderscored = $state(true)
  let scanMode = $state<ScanMode>('new')
  let message = $state('')
  let error = $state('')

  // Load root folders on mount
  import { onMount } from 'svelte'
  onMount(async () => {
    if (!auth.isAdmin) return
    try {
      folders = await listFolders()
    } catch (e: any) {
      error = e.message
    }
  })

  async function doScan() {
    error = ''
    message = ''
    scanning = true
    previews = []
    try {
      let results: ScanPreview[]
      if (selectedFolderId) {
        const folder = folders.find((f) => f.id === selectedFolderId)
        results = [await previewScan(selectedFolderId, folder?.name || selectedFolderId, scanMode)]
      } else {
        results = await previewAllScan(undefined, skipUnderscored, scanMode)
      }
      // Add _enabled flag to each song
      for (const p of results) {
        for (const song of p.songs) {
          (song as any)._enabled = true
        }
      }
      previews = results
      const totalSongs = previews.reduce((sum, p) => sum + p.summary.total, 0)
      const totalNew = previews.reduce((sum, p) => sum + p.summary.new, 0)
      const totalExisting = previews.reduce((sum, p) => sum + p.summary.existing, 0)
      const totalDanger = previews.reduce((sum, p) => sum + p.summary.danger, 0)
      message = `Scanned ${previews.length} categories — ${totalSongs} songs: ${totalNew} new, ${totalExisting} existing, ${totalDanger} missing`
    } catch (e: any) {
      error = e.message
    } finally {
      scanning = false
    }
  }

  async function doSaveAll() {
    if (previews.length === 0) return
    error = ''
    saving = true
    try {
      let totalSaved = 0
      const count = previews.length
      for (const p of previews) {
        const enabledSongs = p.songs.filter((s: any) => s._enabled !== false)
        if (enabledSongs.length === 0) continue
        const result = await saveScan(p.category.id, enabledSongs)
        totalSaved += result.saved
      }
      previews = []
      message = `Saved ${totalSaved} songs across ${count} categories`
    } catch (e: any) {
      error = e.message
    } finally {
      saving = false
    }
  }

  let savingCategory = $state<number | null>(null)
  let savingSong = $state<string | null>(null) // "pi-si" key

  async function doSaveCategory(pi: number) {
    const p = previews[pi]!
    const enabledSongs = p.songs.filter((s: any) => s._enabled !== false)
    if (enabledSongs.length === 0) return
    error = ''
    savingCategory = pi
    try {
      const result = await saveScan(p.category.id, enabledSongs)
      message = `Saved ${result.saved} songs in ${p.category.name}`
      // Remove this category from the list
      previews = previews.filter((_, i) => i !== pi)
    } catch (e: any) {
      error = e.message
    } finally {
      savingCategory = null
    }
  }

  async function doSaveSong(pi: number, si: number) {
    const p = previews[pi]!
    const song = p.songs[si]!
    if ((song as any)._enabled === false) return
    error = ''
    savingSong = `${pi}-${si}`
    try {
      const result = await saveScan(p.category.id, [song])
      message = `Saved "${Object.values(song.title)[0] || 'song'}" in ${p.category.name}`
      // Remove this song from the category
      const updatedSongs = p.songs.filter((_, i) => i !== si)
      if (updatedSongs.length === 0) {
        // No songs left, remove the whole category
        previews = previews.filter((_, i) => i !== pi)
      } else {
        previews[pi] = {
          ...p,
          songs: updatedSongs,
          summary: {
            ...p.summary,
            total: p.summary.total - 1,
            [song._scanStatus]: (p.summary as any)[song._scanStatus] - 1,
          },
        }
        previews = [...previews]
      }
    } catch (e: any) {
      error = e.message
    } finally {
      savingSong = null
    }
  }

  function toggleSong(previewIndex: number, songIndex: number, enabled: boolean) {
    const p = previews[previewIndex]!
    const songs = [...p.songs]
    ;(songs[songIndex] as any) = { ...songs[songIndex]!, _enabled: enabled }
    previews[previewIndex] = { ...p, songs }
    previews = [...previews]
  }

  function toggleAllSongs(previewIndex: number, enabled: boolean) {
    const p = previews[previewIndex]!
    const songs = p.songs.map((s) => ({ ...s, _enabled: enabled } as any))
    previews[previewIndex] = { ...p, songs }
    previews = [...previews]
  }

  function updateSong(previewIndex: number, songIndex: number, field: 'title' | 'artist', value: Record<string, string>) {
    const p = previews[previewIndex]!
    const songs = [...p.songs]
    songs[songIndex] = { ...songs[songIndex]!, [field]: value }
    previews[previewIndex] = { ...p, songs }
    previews = [...previews]
  }

  function statusBadge(status: string): string {
    if (status === 'new') return 'badge-new'
    if (status === 'existing') return 'badge-existing'
    if (status === 'danger') return 'badge-danger'
    return ''
  }
</script>

<svelte:head>
  <title>Admin: Scan Drive</title>
</svelte:head>

{#if !auth.isAdmin}
  <div class="page-center">
    <p>Admin access required</p>
  </div>
{:else}
  <div class="scan-page">
    <h1>Scan Google Drive</h1>

    <div class="scan-controls">
      <div class="control-row">
        <label>
          <span>Folder</span>
          <select bind:value={selectedFolderId}>
            <option value="">All folders</option>
            {#each folders as folder}
              <option value={folder.id}>{folder.name}</option>
            {/each}
          </select>
        </label>

        <label class="toggle-label">
          <input type="checkbox" bind:checked={skipUnderscored} />
          <span>Skip _folders</span>
        </label>

        <label>
          <span>Mode</span>
          <select bind:value={scanMode}>
            <option value="new">New only</option>
            <option value="full">Full</option>
          </select>
        </label>

        <button class="btn-scan" onclick={doScan} disabled={scanning}>
          {scanning ? 'Scanning...' : 'Scan'}
        </button>
      </div>

      {#if error}
        <p class="msg-error">{error}</p>
      {/if}
      {#if message}
        <p class="msg-info">{message}</p>
      {/if}
    </div>

    {#if previews.length > 0}
      <div class="preview-header">
        <h2>{previews.length} categories</h2>
        <button class="btn-save" onclick={doSaveAll} disabled={saving}>
          {saving ? 'Saving...' : 'Save All'}
        </button>
      </div>

      {#each previews as ap, pi}
        <details class="folder-section" class:saving-overlay={savingCategory === pi} open>
          <summary class="folder-summary">
            <span class="folder-name">{ap.category.name}</span>
            <span class="summary">
              <span class="badge-new">New: {ap.summary.new}</span>
              <span class="badge-existing">Existing: {ap.summary.existing}</span>
              <span class="badge-danger">Missing: {ap.summary.danger}</span>
            </span>
            <span class="folder-total">{ap.summary.total} songs</span>
            <button
              class="btn-save-cat"
              onclick={(e) => { e.stopPropagation(); doSaveCategory(pi) }}
              disabled={savingCategory === pi}
            >
              {savingCategory === pi ? 'Saving...' : 'Save Category'}
            </button>
          </summary>

          <div class="table-scroll">
            <table class="scan-table">
              <thead>
                <tr>
                  <th class="col-check">
                    <input
                      type="checkbox"
                      checked={ap.songs.every((s) => (s as any)._enabled !== false)}
                      onchange={(e) => toggleAllSongs(pi, e.currentTarget.checked)}
                    />
                  </th>
                  <th class="col-status">Status</th>
                  <th class="col-title">Title</th>
                  <th class="col-artist">Artist</th>
                  <th class="col-ext">Ext</th>
                  <th class="col-listens">Plays</th>
                  <th class="col-drive">Drive Filename</th>
                  <th class="col-action"></th>
                </tr>
              </thead>
              <tbody>
                {#each ap.songs as song, si}
                  <tr class="{statusBadge(song._scanStatus)}{(song as any)._enabled === false ? ' row-disabled' : ''}{savingSong === `${pi}-${si}` ? ' saving-overlay' : ''}">
                    <td>
                      <input
                        type="checkbox"
                        checked={(song as any)._enabled !== false}
                        onchange={(e) => toggleSong(pi, si, e.currentTarget.checked)}
                      />
                    </td>
                    <td>
                      <span class="status-tag {song._scanStatus}">{song._scanStatus}</span>
                    </td>
                    <td>
                      <LocalizedEditCell
                        value={song.title}
                        onchange={(v) => updateSong(pi, si, 'title', v)}
                      />
                    </td>
                    <td>
                      <LocalizedEditCell
                        value={song.artist}
                        onchange={(v) => updateSong(pi, si, 'artist', v)}
                      />
                    </td>
                    <td class="mono">{song.ext}</td>
                    <td class="mono">{song.listens}</td>
                    <td class="drive-name" title={song._driveFilename}>
                      {song._driveFilename || '—'}
                    </td>
                    <td>
                      <button
                        class="btn-save-song"
                        onclick={() => doSaveSong(pi, si)}
                        disabled={savingSong === `${pi}-${si}` || (song as any)._enabled === false}
                      >
                        {savingSong === `${pi}-${si}` ? '...' : 'Save'}
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </details>
      {/each}
    {/if}
  </div>
{/if}

<style>
  .scan-page {
    padding: 1rem 1.5rem;
    overflow-y: auto;
    height: 100%;
    width: 100%;
  }

  h1 {
    font-size: 1.3rem;
    margin-bottom: 1rem;
  }

  h2 {
    font-size: 1rem;
    margin: 0;
  }

  /* Controls */
  .scan-controls {
    margin-bottom: 1rem;
  }

  .control-row {
    display: flex;
    gap: 1rem;
    align-items: flex-end;
    flex-wrap: wrap;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  label span {
    font-weight: 600;
  }

  select {
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.85rem;
    min-width: 180px;
  }

  .btn-scan {
    padding: 0.4rem 1rem;
    background: var(--accent);
    color: #fff;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.85rem;
  }

  .btn-scan:disabled {
    opacity: 0.5;
  }

  .btn-save {
    padding: 0.35rem 1.2rem;
    background: #2ecc71;
    color: #fff;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.85rem;
    margin-left: auto;
  }

  .btn-save:disabled {
    opacity: 0.5;
  }

  .msg-error {
    color: var(--danger);
    font-size: 0.85rem;
    margin-top: 0.5rem;
  }

  .msg-info {
    color: var(--accent);
    font-size: 0.85rem;
    margin-top: 0.5rem;
  }

  /* Preview header */
  .preview-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }

  .summary {
    display: flex;
    gap: 0.5rem;
  }

  .summary span {
    font-size: 0.75rem;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
  }

  /* Table */
  .table-scroll {
    overflow: auto;
    flex: 1;
  }

  .scan-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }

  .scan-table thead {
    position: sticky;
    top: 0;
    background: var(--bg-primary);
    z-index: 1;
  }

  .scan-table th {
    border-bottom: 2px solid var(--border);
    padding: 0.5rem 0.4rem;
    text-align: left;
    font-weight: 600;
    font-size: 0.75rem;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .scan-table td {
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding: 0.35rem 0.4rem;
    vertical-align: top;
  }

  .scan-table tr:hover {
    background: var(--bg-hover);
  }

  .col-check { width: 3%; }
  .col-check input, .scan-table td input[type="checkbox"] {
    cursor: pointer;
  }
  .col-status { width: 5%; }
  .col-title { width: 30%; }
  .col-artist { width: 25%; }
  .col-ext { width: 4%; }
  .col-listens { width: 4%; }
  .col-drive { width: 25%; }

  .mono {
    font-family: monospace;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .drive-name {
    font-size: 0.75rem;
    color: var(--text-muted);
    max-width: 250px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Status badges */
  .status-tag {
    font-size: 0.65rem;
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .status-tag.new {
    background: rgba(46, 204, 113, 0.2);
    color: #2ecc71;
  }

  .status-tag.existing {
    background: rgba(52, 152, 219, 0.2);
    color: #3498db;
  }

  .status-tag.danger {
    background: rgba(231, 76, 60, 0.2);
    color: #e74c3c;
  }

  .badge-new {
    background: rgba(46, 204, 113, 0.15);
    color: #2ecc71;
  }

  .badge-existing {
    background: rgba(52, 152, 219, 0.15);
    color: #3498db;
  }

  .badge-danger {
    background: rgba(231, 76, 60, 0.15);
    color: #e74c3c;
  }

  tr.badge-danger {
    background: rgba(231, 76, 60, 0.05);
  }

  tr.row-disabled {
    opacity: 0.35;
  }

  .toggle-label {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.82rem;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .toggle-label input[type="checkbox"] {
    cursor: pointer;
  }

  .folder-section {
    margin-bottom: 0.5rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
  }

  .folder-summary {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 0.75rem;
    background: var(--bg-secondary, rgba(255,255,255,0.03));
    cursor: pointer;
    font-size: 0.85rem;
  }

  .folder-summary:hover {
    background: var(--bg-hover);
  }

  .folder-name {
    font-weight: 600;
    min-width: 120px;
  }

  .folder-total {
    margin-left: auto;
    color: var(--text-muted);
    font-size: 0.75rem;
  }

  .btn-save-cat {
    padding: 0.2rem 0.6rem;
    background: #2ecc71;
    color: #fff;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.75rem;
    margin-left: 0.5rem;
  }

  .btn-save-cat:disabled {
    opacity: 0.5;
  }

  .btn-save-song {
    padding: 0.15rem 0.4rem;
    background: var(--accent);
    color: #fff;
    border-radius: 3px;
    font-size: 0.7rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .btn-save-song:disabled {
    opacity: 0.3;
  }

  .col-action {
    width: 4%;
  }

  .saving-overlay {
    position: relative;
    pointer-events: none;
    opacity: 0.5;
  }

  .page-center {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted);
  }
</style>
