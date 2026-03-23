<script lang="ts">
  import { getAuthStore } from '$lib/stores/auth.store.svelte'
  import { api } from '$lib/services/api'
  import type { Song } from '$lib/types/song'

  let { song }: { song: Song } = $props()
  const auth = getAuthStore()

  const isFav = $derived(auth.isFavorite(song.fileId))

  async function toggle() {
    try {
      if (isFav) {
        await api.del('/api/user/favorite', { fileIds: [song.fileId] })
        const updated = (auth.user?.favorite || []).filter((f) => f !== song.fileId)
        auth.updateFavorites(updated)
      } else {
        await api.post('/api/user/favorite', { fileIds: [song.fileId] })
        auth.updateFavorites([...(auth.user?.favorite || []), song.fileId])
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    }
  }
</script>

<button class="fav-btn" class:active={isFav} onclick={toggle} title={isFav ? 'Remove favorite' : 'Add favorite'}>
  {isFav ? '★' : '☆'}
</button>

<style>
  .fav-btn {
    font-size: 1rem;
    color: var(--text-muted);
    padding: 0.1rem;
    line-height: 1;
  }

  .fav-btn:hover, .fav-btn.active {
    color: #f1c40f;
  }
</style>
