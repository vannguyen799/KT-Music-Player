<script lang="ts">
  import '../app.css'
  import Header from '$lib/components/Header.svelte'
  import PlayerBar from '$lib/components/PlayerBar.svelte'
  import CategorySidebar from '$lib/components/CategorySidebar.svelte'
  import { getAuthStore } from '$lib/stores/auth.store.svelte'
  import { getPlayerStore } from '$lib/stores/player.store.svelte'
  import { getMobileStore } from '$lib/stores/mobile.store.svelte'
  import { onMount, onDestroy } from 'svelte'
  import { afterNavigate } from '$app/navigation'
  import { initActivityTracker, destroyActivityTracker, trackNavigation } from '$lib/utils/activity-tracker'

  let { children } = $props()
  const auth = getAuthStore()
  const player = getPlayerStore()
  const mobile = getMobileStore()

  let trackerStarted = false

  function startTrackerIfNeeded() {
    if (auth.isLoggedIn && auth.user && !trackerStarted) {
      initActivityTracker(auth.user.id, auth.user.username)
      trackerStarted = true
    }
  }

  onMount(() => {
    player.restoreFromLocalStorage()
    auth.restore()
    startTrackerIfNeeded()
  })

  // Track SvelteKit client-side navigations
  afterNavigate(({ from, to }) => {
    // Start tracker after login navigation
    startTrackerIfNeeded()

    const fromPath = from?.url?.pathname || ''
    const toPath = to?.url?.pathname || ''
    if (fromPath && toPath && fromPath !== toPath) {
      trackNavigation(fromPath, toPath)
    }
  })

  onDestroy(() => {
    if (trackerStarted) {
      destroyActivityTracker()
      trackerStarted = false
    }
  })
</script>

<CategorySidebar />

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
