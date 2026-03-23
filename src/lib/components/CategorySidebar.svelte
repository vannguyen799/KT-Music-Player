<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { getMusicStore } from '$lib/stores/music.store.svelte'
  import { getMobileStore } from '$lib/stores/mobile.store.svelte'
  import { getAuthStore } from '$lib/stores/auth.store.svelte'
  import ChangePasswordModal from './ChangePasswordModal.svelte'
  import Icon from './Icon.svelte'
  import { getPlayerStore } from '$lib/stores/player.store.svelte'
  import type { Category } from '$lib/services/admin.service'

  const music = getMusicStore()
  const mobile = getMobileStore()
  const auth = getAuthStore()
  const player = getPlayerStore()

  let showChangePassword = $state(false)

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
    if (mobile.isMobile) mobile.closeSidebar()
  }

  function goHome() {
    goto('/')
    if (mobile.isMobile) mobile.closeSidebar()
  }

  function navTo(path: string) {
    goto(path)
    if (mobile.isMobile) mobile.closeSidebar()
  }
</script>

<!-- Backdrop overlay -->
{#if mobile.sidebarOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="sidebar-backdrop" onclick={() => mobile.closeSidebar()}></div>
{/if}

<aside class="category-sidebar" class:sidebar-open={mobile.sidebarOpen}>
  <div class="sidebar-header">
    <h3>Categories</h3>
  </div>
  <div class="category-list">
    <button
      class="cat-item"
      class:active={music.currentCategory === null}
      onclick={goHome}
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
            ><Icon name="chevron-right" size={12} /></span>
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

  {#if auth.isLoggedIn}
    <div class="sidebar-section">
      <h3>Account</h3>
      <div class="category-list">
        <button class="cat-item admin-item" onclick={() => { showChangePassword = true; if (mobile.isMobile) mobile.closeSidebar() }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          <span class="cat-label">Change Password</span>
        </button>
        <button class="cat-item admin-item" onclick={() => { player.resetConfig(); mobile.resetSidebar(); if (mobile.isMobile) mobile.closeSidebar() }}>
          <Icon name="refresh" size={14} />
          <span class="cat-label">Reset Config</span>
        </button>
      </div>
    </div>
  {/if}

  {#if auth.isAdmin}
    <div class="sidebar-section">
      <h3>Admin</h3>
      <div class="category-list">
        <button class="cat-item admin-item" class:active={$page.url.pathname === '/admin/scan'} onclick={() => navTo('/admin/scan')}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span class="cat-label">Scan</span>
        </button>
        <button class="cat-item admin-item" class:active={$page.url.pathname === '/admin/categories'} onclick={() => navTo('/admin/categories')}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
          <span class="cat-label">Categories</span>
        </button>
      </div>
    </div>
  {/if}
</aside>

{#if showChangePassword}
  <ChangePasswordModal onclose={() => showChangePassword = false} />
{/if}

<style>
  .category-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 260px;
    z-index: 210;
    padding: 1rem 0 0.75rem;
    overflow-y: auto;
    background: var(--bg-secondary);
    border-right: 3px solid;
    border-image: linear-gradient(to bottom, #4285F4 25%, #EA4335 25%, #EA4335 50%, #FBBC05 50%, #FBBC05 75%, #34A853 75%) 1;
    display: flex;
    flex-direction: column;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    box-shadow: none;
  }

  .category-sidebar.sidebar-open {
    transform: translateX(0);
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0.75rem;
    margin-bottom: 0.5rem;
  }

  h3 {
    font-size: 0.85rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
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

  .sidebar-section {
    border-top: 1px solid var(--border);
    padding-top: 0.5rem;
  }

  .sidebar-section:first-of-type {
    margin-top: auto;
  }

  .sidebar-section h3 {
    padding: 0 0.75rem;
    margin-bottom: 0.25rem;
  }

  .admin-item {
    gap: 0.5rem;
  }

  .admin-item svg {
    flex-shrink: 0;
    color: var(--text-muted);
  }

  .admin-item:hover svg {
    color: var(--text-primary);
  }

  .admin-item.active svg {
    color: var(--accent);
  }

  /* Desktop: no backdrop (sidebar pushes content) */
  .sidebar-backdrop {
    display: none;
  }

  /* Mobile: sidebar becomes overlay drawer with backdrop */
  @media (max-width: 768px) {
    .sidebar-backdrop {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 200;
    }
  }

  @media (max-width: 768px) {
    .category-sidebar {
      width: 280px;
    }
  }
</style>
