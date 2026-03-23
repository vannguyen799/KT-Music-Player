<script lang="ts">
  import CategorySidebar from '$lib/components/CategorySidebar.svelte'

  import { getMusicStore } from '$lib/stores/music.store.svelte'

  let { children } = $props()
  const music = getMusicStore()

  $effect(() => {
    if (music.categories.length === 0) {
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
