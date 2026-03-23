<script lang="ts">
  import { goto } from '$app/navigation'
  import { getMusicStore } from '$lib/stores/music.store.svelte'
  import type { Category } from '$lib/services/admin.service'

  const music = getMusicStore()

  interface TreeNode {
    category: Category
    children: TreeNode[]
  }

  let expanded = $state<Set<string>>(new Set())

  const tree = $derived.by(() => {
    const cats = music.categories
    const map = new Map<string | null, TreeNode[]>()
    for (const cat of cats) {
      const parentKey = cat.parentId || null
      if (!map.has(parentKey)) map.set(parentKey, [])
      map.get(parentKey)!.push({ category: cat, children: [] })
    }
    function build(parentId: string | null): TreeNode[] {
      const nodes = map.get(parentId) || []
      for (const node of nodes) {
        node.children = build(node.category.id)
      }
      return nodes
    }
    return build(null)
  })

  function hasChildren(catId: string): boolean {
    return music.categories.some((c) => c.parentId === catId)
  }

  function toggleExpand(catId: string, e: MouseEvent) {
    e.stopPropagation()
    const next = new Set(expanded)
    if (next.has(catId)) next.delete(catId)
    else next.add(catId)
    expanded = next
  }

  function selectCat(cat: Category) {
    goto(`/category/${cat.id}`)
    if (hasChildren(cat.id) && !expanded.has(cat.id)) {
      expanded = new Set([...expanded, cat.id])
    }
  }
</script>

<aside class="category-sidebar">
  <h3>Categories</h3>
  <div class="category-list">
    <button
      class="cat-item"
      class:active={music.currentCategory === null}
      onclick={() => goto('/')}
    >
      <span class="cat-label">All Songs</span>
    </button>

    {#snippet renderNodes(nodes: TreeNode[], depth: number)}
      {#each nodes as node}
        {@const has = node.children.length > 0}
        {@const isExpanded = expanded.has(node.category.id)}
        {@const isDisabled = node.category.disabled}
        <button
          class="cat-item"
          class:active={music.currentCategory?.id === node.category.id}
          class:is-disabled={isDisabled}
          style="padding-left: {0.75 + depth * 0.75}rem"
          onclick={() => selectCat(node.category)}
        >
          {#if has}
            <span
              class="arrow"
              class:open={isExpanded}
              onclick={(e) => toggleExpand(node.category.id, e)}
            >&#9656;</span>
          {:else}
            <span class="arrow-placeholder"></span>
          {/if}
          <span class="cat-label">{node.category.name}</span>
        </button>
        {#if has && isExpanded}
          {@render renderNodes(node.children, depth + 1)}
        {/if}
      {/each}
    {/snippet}

    {@render renderNodes(tree, 0)}
  </div>
</aside>

<style>
  .category-sidebar {
    width: 200px;
    border-right: 1px solid var(--border);
    padding: 0.75rem 0;
    overflow-y: auto;
    flex-shrink: 0;
    background: var(--bg-secondary);
  }

  h3 {
    font-size: 0.85rem;
    padding: 0 0.75rem;
    margin-bottom: 0.5rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .category-list {
    display: flex;
    flex-direction: column;
  }

  .cat-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.4rem 0.75rem;
    font-size: 0.82rem;
    text-align: left;
    color: var(--text-primary);
    border-radius: 0;
    transition: background-color 0.15s;
    white-space: nowrap;
    overflow: hidden;
  }

  .cat-item:hover {
    background-color: var(--bg-hover);
  }

  .cat-item.active {
    color: var(--accent);
    background-color: var(--bg-tertiary);
    font-weight: 600;
    border-left: 3px solid var(--accent);
  }

  .cat-item.is-disabled {
    opacity: 0.45;
  }

  .cat-label {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .arrow {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    font-size: 0.7rem;
    flex-shrink: 0;
    transition: transform 0.15s;
    border-radius: 3px;
    color: var(--text-muted);
  }

  .arrow:hover {
    background-color: var(--bg-hover);
    color: var(--text-primary);
  }

  .arrow.open {
    transform: rotate(90deg);
  }

  .arrow-placeholder {
    width: 16px;
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    .category-sidebar {
      width: 160px;
    }
  }
</style>
