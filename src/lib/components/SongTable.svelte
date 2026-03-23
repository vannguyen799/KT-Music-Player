<script lang="ts">
  import { getMusicStore } from '$lib/stores/music.store.svelte'
  import { getPlayerStore } from '$lib/stores/player.store.svelte'
  import { getAuthStore } from '$lib/stores/auth.store.svelte'
  import { getMobileStore } from '$lib/stores/mobile.store.svelte'
  import { getDisplayTitle, getDisplayArtist, localize, hasLyricsForLang, getAvailableLyricLangs, type Song } from '$lib/types/song'
  import { toggleSong, deleteSong } from '$lib/services/admin.service'
  import FavoriteButton from './FavoriteButton.svelte'
  import SongEditModal from './SongEditModal.svelte'
  import UploadModal from './UploadModal.svelte'

  const music = getMusicStore()
  const player = getPlayerStore()
  const auth = getAuthStore()
  const mobile = getMobileStore()

  let sortBy = $state('')
  let editingSong = $state<Song | null>(null)
  let showUpload = $state(false)
  let togglingId = $state<string | null>(null)
  let deletingSong = $state<Song | null>(null)
  let deleteInProgress = $state(false)

  const sortedSongs = $derived.by(() => {
    let list = [...music.filteredSongs]
    const loc = (t: Song['title']) => localize(t)
    if (sortBy === 'name-asc') list.sort((a, b) => loc(a.title).localeCompare(loc(b.title)))
    else if (sortBy === 'name-desc') list.sort((a, b) => loc(b.title).localeCompare(loc(a.title)))
    else if (sortBy === 'singer-asc') list.sort((a, b) => loc(a.artist).localeCompare(loc(b.artist)))
    else if (sortBy === 'singer-desc') list.sort((a, b) => loc(b.artist).localeCompare(loc(a.artist)))
    else if (sortBy === 'listens-asc') list.sort((a, b) => a.listens - b.listens)
    else if (sortBy === 'listens-desc') list.sort((a, b) => b.listens - a.listens)
    return list
  })

  function playSong(song: Song, index: number) {
    if (player.isLoading) return
    if (isCurrentSong(song) && player.isPlaying) {
      player.pause()
      return
    }
    if (isCurrentSong(song) && !player.isPlaying) {
      player.resume()
      return
    }
    player.setQueue(sortedSongs, index)
  }

  function isCurrentSong(song: Song): boolean {
    return player.currentSong?.fileId === song.fileId
  }

  function onSongSaved(updated: Song) {
    music.updateSong(updated)
    editingSong = null
  }

  function onSongDeleted(fileId: string) {
    music.removeSong(fileId)
    editingSong = null
  }

  async function handleToggle(song: Song) {
    togglingId = song.fileId
    try {
      const updated = await toggleSong(song.fileId, !song.disabled)
      music.updateSong({ ...song, ...updated, disabled: !song.disabled })
    } catch {}
    togglingId = null
  }

  async function handleDelete() {
    if (!deletingSong) return
    deleteInProgress = true
    try {
      await deleteSong(deletingSong.fileId, true)
      music.removeSong(deletingSong.fileId)
      deletingSong = null
    } catch {}
    deleteInProgress = false
  }

  const pageNumbers = $derived.by(() => {
    const total = music.totalPages
    const current = music.currentPage
    const pages: (number | '...')[] = []
    if (total <= 9) {
      for (let i = 1; i <= total; i++) pages.push(i)
    } else {
      pages.push(1, 2)
      if (current > 4) pages.push('...')
      for (let i = Math.max(3, current - 1); i <= Math.min(total - 2, current + 1); i++) {
        pages.push(i)
      }
      if (current < total - 3) pages.push('...')
      pages.push(total - 1, total)
    }
    return pages
  })
</script>

<div class="song-section">
  <div class="section-header">
    <h2 class="category-title">
      {music.currentCategory?.name || 'All Songs'}
      <span class="count">({music.totalSongs})</span>
      {#if auth.isAdmin && music.currentCategory}
        <a class="gdrive-cat-btn" href="https://drive.google.com/drive/folders/{music.currentCategory.folderId}" target="_blank" rel="noopener" title="Open folder in Google Drive">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" xmlns="http://www.w3.org/2000/svg"><path d="M21.4231,13.88785,15.33356,3.33792H8.66663l6.09,10.54993ZM8.08917,4.33835,2,14.88736l3.33356,5.77472,6.08911-10.54926Zm1.73273,10.549L6.48877,20.66208H18.66663L22,14.88736Z"/></svg>
        </a>
      {/if}
    </h2>
    <button class="play-all-btn" onclick={() => player.setQueue(sortedSongs, 0)} title="Play all">
      &#9654;
    </button>
    <div class="header-spacer"></div>
    {#if auth.isAdmin && music.currentCategory}
      <button class="upload-btn" onclick={() => showUpload = true} title="Upload songs to this category">
        &#8679; Upload
      </button>
    {/if}
  </div>

  <div class="table-actions">
    <div class="actions-left">
      <input
        type="text"
        placeholder="Search..."
        value={music.searchQuery}
        oninput={(e) => music.setSearch((e.target as HTMLInputElement).value)}
        class="search-input"
      />
      <select class="sort-select" bind:value={sortBy}>
        <option value="">--Sort--</option>
        <option value="name-asc">Name (A-Z)</option>
        <option value="name-desc">Name (Z-A)</option>
        <option value="singer-asc">Singer (A-Z)</option>
        <option value="singer-desc">Singer (Z-A)</option>
        <option value="listens-asc">Listens (Low)</option>
        <option value="listens-desc">Listens (High)</option>
      </select>
    </div>
    {#if music.totalPages > 1}
      <div class="pagination">
        <button
          class="page-btn"
          disabled={music.currentPage === 1}
          onclick={() => music.goToPage(music.currentPage - 1)}
        >&laquo;</button>
        {#each pageNumbers as p}
          {#if p === '...'}
            <span class="page-ellipsis">...</span>
          {:else}
            <button
              class="page-btn"
              class:active={p === music.currentPage}
              onclick={() => music.goToPage(p)}
            >{p}</button>
          {/if}
        {/each}
        <button
          class="page-btn"
          disabled={music.currentPage === music.totalPages}
          onclick={() => music.goToPage(music.currentPage + 1)}
        >&raquo;</button>
      </div>
    {/if}
  </div>

  {#if music.loading}
    <div class="loading">Loading...</div>
  {:else if mobile.isMobile}
    <!-- Mobile: Card-based song list -->
    <div class="song-cards">
      {#each sortedSongs as song, i}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions a11y_no_noninteractive_element_interactions -->
        <div
          class="song-card"
          class:active={isCurrentSong(song)}
          class:disabled-song={song.disabled}
          onclick={() => playSong(song, i)}
        >
          <div class="card-play-indicator">
            {#if isCurrentSong(song) && player.isPlaying}
              <span class="card-playing-icon">&#10074;&#10074;</span>
            {:else}
              <span class="card-play-icon">&#9654;</span>
            {/if}
          </div>
          <div class="card-info">
            <div class="card-title-row">
              <span class="card-title">{getDisplayTitle(song)}</span>
              <div class="card-badges">
                {#if song.ext}
                  <span
                    class="badge quality-badge"
                    class:lossless={['flac', 'wav', 'alac', 'aiff', 'ape', 'dsd'].includes(song.ext.toLowerCase())}
                  >{song.ext.toUpperCase()}</span>
                {/if}
                {#if getAvailableLyricLangs(song).length > 0}
                  <span class="badge lyric-badge">Lyric</span>
                {/if}
              </div>
            </div>
            <div class="card-subtitle">
              <span class="card-artist">{getDisplayArtist(song)}</span>
              <span class="card-listens">{song.listens} plays</span>
            </div>
          </div>
          <div class="card-actions" onclick={(e) => e.stopPropagation()}>
            {#if auth.isLoggedIn}
              <FavoriteButton {song} />
            {/if}
            {#if auth.isAdmin}
              <button class="edit-btn" onclick={() => editingSong = song} title="Edit">
                <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M16.474 5.408L18.592 7.526M17.836 3.374L12.109 9.1C11.81 9.4 11.611 9.783 11.54 10.198L11 13L13.802 12.46C14.217 12.389 14.6 12.19 14.9 11.891L20.626 6.164C20.9935 5.79651 21.1985 5.30348 21.1985 4.789C21.1985 4.27453 20.9935 3.7815 20.626 3.414C20.2585 3.04651 19.7655 2.8415 19.251 2.8415C18.7365 2.8415 18.2435 3.04651 17.876 3.414L17.836 3.374Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 15V18C19 19.105 18.105 20 17 20H6C4.895 20 4 19.105 4 18V7C4 5.895 4.895 5 6 5H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <!-- Desktop: Table view -->
    <div class="song-table">
      <table>
        <thead>
          <tr>
            <th class="col-play"></th>
            <th class="col-name">Name</th>
            <th class="col-singer">Singer</th>
            <th class="col-listens">Listens</th>
            <th class="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each sortedSongs as song, i}
            <tr class:active={isCurrentSong(song)} class:disabled-song={song.disabled}>
              <td>
                <button
                  class="play-btn"
                  class:playing={isCurrentSong(song) && player.isPlaying}
                  onclick={() => playSong(song, i)}
                  title="Play"
                >
                  {#if isCurrentSong(song) && player.isPlaying}
                    &#10074;&#10074;
                  {:else}
                    &#9654;
                  {/if}
                </button>
              </td>
              <td class="name-cell">
                <span class="song-name">{getDisplayTitle(song)}</span>
                {#if song.ext}
                  <span
                    class="badge quality-badge"
                    class:lossless={['flac', 'wav', 'alac', 'aiff', 'ape', 'dsd'].includes(song.ext.toLowerCase())}
                    title={[
                      song.sampleRate ? `${song.sampleRate / 1000}kHz` : '',
                      song.bitDepth ? `${song.bitDepth}bit` : '',
                      song.bitRate ? `${song.bitRate}kbps` : '',
                      song.channels ? `${song.channels}ch` : '',
                      song.codec || '',
                    ].filter(Boolean).join(' · ') || song.ext.toUpperCase()}
                  >{song.ext.toUpperCase()}</span>
                {/if}
                {#if getAvailableLyricLangs(song).length > 0}
                  <span class="badge lyric-badge" title={getAvailableLyricLangs(song).map(l => l === 'origin' ? 'Original' : l.toUpperCase()).join(', ')}>
                    Lyric{getAvailableLyricLangs(song).length > 1 ? ` (${getAvailableLyricLangs(song).map(l => l === 'origin' ? 'O' : l.toUpperCase()).join('/')})` : ''}
                  </span>
                {/if}
              </td>
              <td>{getDisplayArtist(song)}</td>
              <td class="listens">{song.listens}</td>
              <td>
                <div class="action-buttons">
                  {#if auth.isAdmin}
                    <button class="edit-btn" onclick={() => editingSong = song} title="Edit">
                      <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M16.474 5.408L18.592 7.526M17.836 3.374L12.109 9.1C11.81 9.4 11.611 9.783 11.54 10.198L11 13L13.802 12.46C14.217 12.389 14.6 12.19 14.9 11.891L20.626 6.164C20.9935 5.79651 21.1985 5.30348 21.1985 4.789C21.1985 4.27453 20.9935 3.7815 20.626 3.414C20.2585 3.04651 19.7655 2.8415 19.251 2.8415C18.7365 2.8415 18.2435 3.04651 17.876 3.414L17.836 3.374Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 15V18C19 19.105 18.105 20 17 20H6C4.895 20 4 19.105 4 18V7C4 5.895 4.895 5 6 5H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <button
                      class="toggle-btn"
                      class:is-disabled={song.disabled}
                      onclick={() => handleToggle(song)}
                      disabled={togglingId === song.fileId}
                      title={song.disabled ? 'Enable' : 'Disable'}
                    >
                      {#if song.disabled}
                        <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M12 5C4.5 5 2 12 2 12C2 12 4.5 19 12 19C19.5 19 22 12 22 12C22 12 19.5 5 12 5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/></svg>
                      {:else}
                        <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M3 3L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10.584 10.587C10.209 10.962 9.998 11.471 9.998 12.001C9.998 12.532 10.208 13.041 10.583 13.416C10.958 13.791 11.467 14.002 11.997 14.003C12.528 14.003 13.037 13.792 13.412 13.417" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9.363 5.365C10.22 5.12 11.108 4.997 12 5C16 5 19.333 7.333 22 12C21.222 13.361 20.388 14.524 19.497 15.488M17.357 17.349C15.726 18.449 13.942 19 12 19C8 19 4.667 16.667 2 12C3.369 9.605 4.913 7.825 6.632 6.659" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                      {/if}
                    </button>
                    <a class="gdrive-btn" href="https://drive.google.com/file/d/{song.fileId}/view" target="_blank" rel="noopener" title="Open in Google Drive">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" xmlns="http://www.w3.org/2000/svg"><path d="M21.4231,13.88785,15.33356,3.33792H8.66663l6.09,10.54993ZM8.08917,4.33835,2,14.88736l3.33356,5.77472,6.08911-10.54926Zm1.73273,10.549L6.48877,20.66208H18.66663L22,14.88736Z"/></svg>
                    </a>
                    <button class="delete-btn" onclick={() => deletingSong = song} title="Delete">
                      <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M10 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M14 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 7H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 7H18V18C18 19.657 16.657 21 15 21H9C7.343 21 6 19.657 6 18V7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 5C9 3.895 9.895 3 11 3H13C14.105 3 15 3.895 15 5V7H9V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                  {/if}
                  {#if auth.isLoggedIn}
                    <FavoriteButton {song} />
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

  {/if}
</div>

{#if showUpload && music.currentCategory}
  <UploadModal
    category={music.currentCategory}
    onclose={() => showUpload = false}
    onuploaded={() => { showUpload = false; if (music.currentCategory) music.selectCategory(music.currentCategory) }}
  />
{/if}

{#if editingSong}
  <SongEditModal
    song={editingSong}
    onclose={() => editingSong = null}
    onsaved={onSongSaved}
  />
{/if}

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
{#if deletingSong}
  <div class="confirm-backdrop" onclick={() => { if (!deleteInProgress) deletingSong = null }}>
    <div class="confirm-dialog" onclick={(e) => e.stopPropagation()}>
      <div class="confirm-icon">
        <svg viewBox="0 0 24 24" fill="none" width="32" height="32"><path d="M10 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M14 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 7H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 7H18V18C18 19.657 16.657 21 15 21H9C7.343 21 6 19.657 6 18V7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 5C9 3.895 9.895 3 11 3H13C14.105 3 15 3.895 15 5V7H9V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <h3 class="confirm-title">Delete Song</h3>
      <p class="confirm-text">
        Are you sure you want to delete <strong>{localize(deletingSong.title)}</strong>?
        This will also remove the file from Google Drive.
      </p>
      <div class="confirm-actions">
        <button class="btn-confirm-cancel" onclick={() => deletingSong = null} disabled={deleteInProgress}>Cancel</button>
        <button class="btn-confirm-delete" onclick={handleDelete} disabled={deleteInProgress}>
          {deleteInProgress ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .song-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 0.5rem 1rem;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0;
  }

  .category-title {
    font-size: 1.2rem;
    font-weight: 600;
    margin: 0;
  }

  .count {
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-weight: 400;
  }

  .gdrive-cat-btn {
    display: inline-flex;
    align-items: center;
    color: var(--text-muted);
    margin-left: 0.2rem;
    vertical-align: middle;
  }

  .gdrive-cat-btn:hover {
    color: var(--accent);
  }

  .play-all-btn {
    font-size: 0.9rem;
    color: var(--accent);
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
  }

  .play-all-btn:hover {
    background: var(--bg-hover);
  }

  .header-spacer {
    flex: 1;
  }

  .upload-btn {
    font-size: 0.8rem;
    padding: 0.25rem 0.7rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-secondary);
    transition: all 0.15s;
  }

  .upload-btn:hover {
    color: var(--accent);
    border-color: var(--accent);
    background: rgba(var(--accent-rgb, 29, 185, 84), 0.08);
  }

  .table-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0;
  }

  .actions-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .search-input {
    padding: 0.35rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-primary);
    font-size: 0.85rem;
    width: 260px;
  }

  .sort-select {
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.85rem;
  }

  .song-table {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }

  thead {
    position: sticky;
    top: 0;
    background: var(--bg-primary);
    z-index: 1;
  }

  th {
    border-bottom: 1px solid var(--border);
    padding: 0.5rem;
    text-align: left;
    font-weight: 600;
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  td {
    padding: 0.4rem 0.5rem;
    vertical-align: middle;
  }

  tbody tr {
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  tr:hover {
    background-color: var(--bg-hover);
  }

  tr.active {
    background-color: var(--bg-tertiary);
  }

  tr.disabled-song {
    opacity: 0.45;
  }

  .col-play { width: 3%; }
  .col-name { width: 40%; }
  .col-singer { width: 25%; }
  .col-listens { width: 7%; }
  .col-actions { width: 10%; }

  .play-btn {
    font-size: 0.75rem;
    color: var(--text-secondary);
    padding: 0.15rem 0.3rem;
  }

  .play-btn:hover, .play-btn.playing {
    color: var(--accent);
  }


  .name-cell {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .song-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 250px;
  }

  .badge {
    font-size: 0.45rem;
    padding: 0.02rem 0.18rem;
    background: var(--bg-tertiary);
    border-radius: 6px;
    color: var(--text-secondary);
    line-height: 1.1;
  }

  .quality-badge.lossless {
    background: rgba(29, 185, 84, 0.15);
    color: var(--accent);
  }

  .lyric-badge {
    background: rgba(100, 149, 237, 0.18);
    color: cornflowerblue;
  }

  .listens {
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  .action-buttons {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .edit-btn,
  .toggle-btn,
  .delete-btn,
  .gdrive-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    padding: 0.15rem;
    border-radius: 3px;
  }

  .edit-btn:hover,
  .toggle-btn:hover {
    color: var(--accent);
  }

  .toggle-btn.is-disabled {
    color: var(--accent);
  }

  .gdrive-btn:hover {
    color: var(--accent);
  }

  .delete-btn:hover {
    color: var(--danger, #e74c3c);
  }

  .confirm-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
  }

  .confirm-dialog {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 1.5rem 2rem;
    width: 360px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .confirm-icon {
    color: var(--danger, #e74c3c);
    margin-bottom: 0.25rem;
  }

  .confirm-title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .confirm-text {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .confirm-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.75rem;
    width: 100%;
  }

  .btn-confirm-cancel {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 0.85rem;
    color: var(--text-primary);
  }

  .btn-confirm-cancel:hover {
    background: var(--bg-hover);
  }

  .btn-confirm-delete {
    flex: 1;
    padding: 0.5rem;
    background: var(--danger, #e74c3c);
    color: #fff;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .btn-confirm-delete:hover {
    opacity: 0.9;
  }

  .btn-confirm-delete:disabled {
    opacity: 0.6;
  }

  .loading {
    padding: 2rem;
    text-align: center;
    color: var(--text-secondary);
  }

  /* Mobile card styles */
  .song-cards {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .song-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.7rem 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .song-card:active {
    background-color: var(--bg-hover);
  }

  .song-card.active {
    background-color: var(--bg-tertiary);
  }

  .song-card.disabled-song {
    opacity: 0.45;
  }

  .card-play-indicator {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--bg-tertiary);
    font-size: 0.7rem;
    color: var(--text-secondary);
  }

  .song-card.active .card-play-indicator {
    background: var(--accent);
    color: #fff;
  }

  .card-playing-icon {
    font-size: 0.6rem;
  }

  .card-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .card-title-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .card-title {
    font-size: 0.9rem;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-badges {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .card-subtitle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.78rem;
    color: var(--text-secondary);
  }

  .card-artist {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-listens {
    flex-shrink: 0;
    color: var(--text-muted);
    font-size: 0.72rem;
  }

  .card-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .pagination {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .page-btn {
    min-width: 2rem;
    height: 2rem;
    padding: 0 0.4rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.8rem;
    cursor: pointer;
  }

  .page-btn:hover:not(:disabled) {
    background: var(--bg-hover);
  }

  .page-btn.active {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }

  .page-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .page-ellipsis {
    padding: 0 0.25rem;
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  @media (max-width: 768px) {
    .song-section {
      padding: 0.25rem 0.5rem;
    }

    .section-header {
      gap: 0.5rem;
      padding: 0.4rem 0;
    }

    .category-title {
      font-size: 1rem;
    }

    .table-actions {
      flex-direction: column;
      align-items: stretch;
      gap: 0.4rem;
    }

    .actions-left {
      width: 100%;
    }

    .search-input {
      flex: 1;
      width: auto;
      min-width: 0;
    }

    .pagination {
      justify-content: center;
      flex-wrap: wrap;
    }

    .page-btn {
      min-width: 1.8rem;
      height: 1.8rem;
      font-size: 0.75rem;
    }

    .confirm-dialog {
      width: calc(100vw - 2rem);
      max-width: 360px;
      padding: 1.25rem;
    }
  }
</style>
