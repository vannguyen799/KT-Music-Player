<script lang="ts">
  import CategorySidebar from '$lib/components/CategorySidebar.svelte'
  import { getAuthStore } from '$lib/stores/auth.store.svelte'
  import { getMusicStore } from '$lib/stores/music.store.svelte'

  let { children } = $props()
  const auth = getAuthStore()
  const music = getMusicStore()

  $effect(() => {
    if (auth.isLoggedIn && music.categories.length === 0) {
      music.loadCategories()
    }
  })
</script>

<div class="page-layout">
  <CategorySidebar />
  {@render children()}
</div>

<style>
  .page-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
    width: 100%;
  }
</style>
