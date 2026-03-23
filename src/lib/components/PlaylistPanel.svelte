<script lang="ts">
  import { getAuthStore } from '$lib/stores/auth.store.svelte'
  import { getPlayerStore } from '$lib/stores/player.store.svelte'
  import * as playlistApi from '$lib/services/playlist.service'
  import type { Playlist } from '$lib/types/user'
  import { onMount } from 'svelte'

  const auth = getAuthStore()
  const player = getPlayerStore()

  let playlists = $state<Playlist[]>([])
  let newName = $state('')
  let creating = $state(false)

  onMount(async () => {
    if (auth.isLoggedIn) {
      try {
        playlists = await playlistApi.getPlaylists()
      } catch {}
    }
  })

  async function createPlaylist() {
    if (!newName.trim()) return
    creating = true
    try {
      playlists = await playlistApi.addPlaylist({
        name: newName.trim(),
        notes: '',
        hidden: false,
        songList: [],
      })
      newName = ''
    } catch (err) {
      console.error('Failed to create playlist:', err)
    } finally {
      creating = false
    }
  }

  async function removePlaylist(name: string) {
    try {
      playlists = await playlistApi.removePlaylist(name)
    } catch (err) {
      console.error('Failed to remove playlist:', err)
    }
  }
</script>

{#if auth.isLoggedIn}
  <aside class="playlist-panel">
    <h3>Playlists</h3>

    <div class="create-form">
      <input
        type="text"
        placeholder="New playlist name"
        bind:value={newName}
        onkeydown={(e) => e.key === 'Enter' && createPlaylist()}
      />
      <button onclick={createPlaylist} disabled={creating}>+</button>
    </div>

    <div class="playlist-list">
      {#each playlists as pl}
        <div class="playlist-item">
          <span class="pl-name">{pl.name}</span>
          <span class="pl-count">{pl.songList.length}</span>
          <button class="pl-remove" onclick={() => removePlaylist(pl.name)} title="Remove">x</button>
        </div>
      {/each}
      {#if playlists.length === 0}
        <p class="empty">No playlists yet</p>
      {/if}
    </div>
  </aside>
{/if}

<style>
  .playlist-panel {
    width: 250px;
    border-left: 1px solid var(--border);
    padding: 0.75rem;
    overflow-y: auto;
    flex-shrink: 0;
  }

  h3 {
    font-size: 0.95rem;
    margin-bottom: 0.75rem;
  }

  .create-form {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 0.75rem;
  }

  .create-form input {
    flex: 1;
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    font-size: 0.8rem;
  }

  .create-form button {
    padding: 0.3rem 0.6rem;
    background: var(--accent);
    color: #fff;
    border-radius: 4px;
    font-weight: 700;
  }

  .playlist-item {
    display: flex;
    align-items: center;
    padding: 0.4rem 0.3rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    gap: 0.5rem;
    font-size: 0.85rem;
  }

  .playlist-item:hover {
    background: var(--bg-hover);
  }

  .pl-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pl-count {
    color: var(--text-muted);
    font-size: 0.75rem;
  }

  .pl-remove {
    color: var(--text-muted);
    font-size: 0.75rem;
    padding: 0.1rem 0.3rem;
  }

  .pl-remove:hover {
    color: var(--danger);
  }

  .empty {
    color: var(--text-muted);
    font-size: 0.8rem;
    text-align: center;
    padding: 1rem 0;
  }
</style>
