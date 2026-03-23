<script lang="ts">
  import SongTable from '$lib/components/SongTable.svelte'
  import { getAuthStore } from '$lib/stores/auth.store.svelte'
  import { getMusicStore } from '$lib/stores/music.store.svelte'

  const auth = getAuthStore()
  const music = getMusicStore()

  // "/" = All Songs — wait for auth before fetching
  $effect(() => {
    if (auth.isLoggedIn) {
      music.selectCategory(null)
    }
  })
</script>

<svelte:head>
  <title>All Songs - KT Music Player</title>
</svelte:head>

<SongTable />
