<script lang="ts">
  import { page } from '$app/state'
  import SongTable from '$lib/components/SongTable.svelte'
  import { getAuthStore } from '$lib/stores/auth.store.svelte'
  import { getMusicStore } from '$lib/stores/music.store.svelte'

  const auth = getAuthStore()
  const music = getMusicStore()

  // Select category when URL param or categories change — wait for auth
  $effect(() => {
    if (!auth.isLoggedIn) return
    const id = page.params.id
    const cats = music.categories
    if (cats.length > 0 && id) {
      const cat = cats.find((c) => c.id === id) ?? null
      if (cat && music.currentCategory?.id !== id) {
        music.selectCategory(cat)
      }
    }
  })
</script>

<svelte:head>
  <title>{music.currentCategory?.name ?? 'Music'} - KT Music Player</title>
</svelte:head>

<SongTable />
