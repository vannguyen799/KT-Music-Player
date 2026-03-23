<script lang="ts">
  import '../app.css'
  import Header from '$lib/components/Header.svelte'
  import PlayerBar from '$lib/components/PlayerBar.svelte'
  import { getAuthStore } from '$lib/stores/auth.store.svelte'
  import { getPlayerStore } from '$lib/stores/player.store.svelte'
  import { onMount } from 'svelte'

  let { children } = $props()
  const auth = getAuthStore()
  const player = getPlayerStore()

  onMount(() => {
    player.restoreFromLocalStorage()
    auth.restore()
  })
</script>

<div class="app">
  {#if player.playerPosition === 'top'}
    <PlayerBar />
  {:else}
    <Header />
  {/if}
  <main class="main-content">
    {@render children()}
  </main>
  {#if player.playerPosition === 'bottom'}
    <PlayerBar />
  {:else}
    <Header />
  {/if}
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .main-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
</style>
