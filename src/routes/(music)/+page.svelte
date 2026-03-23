<script lang="ts">
  import { onMount } from 'svelte'
  import SongTable from '$lib/components/SongTable.svelte'
  import { getMusicStore } from '$lib/stores/music.store.svelte'

  const music = getMusicStore()

  // "/" = All Songs
  onMount(() => {
    music.selectCategory(null)
  })
</script>

<svelte:head>
  <title>All Songs - KT Music Player</title>
</svelte:head>

<SongTable />
