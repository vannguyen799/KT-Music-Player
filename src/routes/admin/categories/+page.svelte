<script lang="ts">
  import { getAuthStore } from '$lib/stores/auth.store.svelte'
  import {
    getCategories,
    updateCategory,
    deleteCategory,
    toggleCategory,
    type Category,
  } from '$lib/services/admin.service'
  import UploadModal from '$lib/components/UploadModal.svelte'

  const auth = getAuthStore()
  let uploadCategory = $state<Category | null>(null)

  let categories = $state<Category[]>([])
  let editingId = $state<string | null>(null)
  let editName = $state('')
  let editParentId = $state<string | null>(null)
  let loading = $state(false)
  let message = $state('')
  let error = $state('')

  // Build tree structure
  const tree = $derived(buildTree(categories))

  interface TreeNode {
    category: Category
    children: TreeNode[]
    depth: number
  }

  function buildTree(cats: Category[]): TreeNode[] {
    const byParent = new Map<string | null, Category[]>()
    for (const cat of cats) {
      const key = cat.parentId ?? null
      if (!byParent.has(key)) byParent.set(key, [])
      byParent.get(key)!.push(cat)
    }

    function build(parentId: string | null, depth: number): TreeNode[] {
      const children = byParent.get(parentId) ?? []
      return children.map((cat) => ({
        category: cat,
        children: build(cat.id, depth + 1),
        depth,
      }))
    }

    return build(null, 0)
  }

  function flattenTree(nodes: TreeNode[]): TreeNode[] {
    const result: TreeNode[] = []
    for (const node of nodes) {
      result.push(node)
      result.push(...flattenTree(node.children))
    }
    return result
  }

  const flatTree = $derived(flattenTree(tree))

  $effect(() => {
    if (auth.isAdmin) {
      loadCategories()
    }
  })

  async function loadCategories() {
    loading = true
    try {
      categories = await getCategories()
    } catch (e: any) {
      error = e.message
    } finally {
      loading = false
    }
  }

  function startEdit(cat: Category) {
    editingId = cat.id
    editName = cat.name
    editParentId = cat.parentId
  }

  function cancelEdit() {
    editingId = null
    editName = ''
    editParentId = null
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return
    error = ''
    message = ''
    try {
      await updateCategory(editingId, { name: editName.trim(), parentId: editParentId })
      await loadCategories()
      message = `Updated category "${editName.trim()}"`
      cancelEdit()
    } catch (e: any) {
      error = e.message
    }
  }

  async function doDelete(cat: Category) {
    if (!confirm(`Delete category "${cat.name}"? Songs will keep their other categories.`)) return
    error = ''
    message = ''
    try {
      await deleteCategory(cat.id)
      await loadCategories()
      message = `Deleted "${cat.name}"`
    } catch (e: any) {
      error = e.message
    }
  }

  function getCategoryName(id: string | null): string {
    if (!id) return 'None (root)'
    const cat = categories.find((c) => c.id === id)
    return cat?.name ?? id
  }

  async function doToggle(cat: Category) {
    error = ''
    message = ''
    try {
      const updated = await toggleCategory(cat.id, !cat.disabled)
      cat.disabled = updated.disabled
      message = `${cat.name} ${cat.disabled ? 'disabled' : 'enabled'}`
    } catch (e: any) {
      error = e.message
    }
  }
</script>

<svelte:head>
  <title>Admin: Categories</title>
</svelte:head>

{#if !auth.isAdmin}
  <div class="page-center">
    <p>Admin access required</p>
  </div>
{:else}
  <div class="categories-page">
    <h1>Category Manager</h1>

    {#if error}
      <p class="msg-error">{error}</p>
    {/if}
    {#if message}
      <p class="msg-info">{message}</p>
    {/if}

    {#if loading}
      <p class="msg-info">Loading...</p>
    {:else if categories.length === 0}
      <p class="msg-muted">No categories yet. Run a scan to create categories from Drive folders.</p>
    {:else}
      <table class="cat-table">
        <thead>
          <tr>
            <th class="col-name">Name</th>
            <th class="col-status">Status</th>
            <th class="col-parent">Parent</th>
            <th class="col-folder">Folder ID</th>
            <th class="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each flatTree as node}
            {@const cat = node.category}
            <tr>
              <td>
                {#if editingId === cat.id}
                  <input
                    class="edit-input"
                    type="text"
                    bind:value={editName}
                    onkeydown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                  />
                {:else}
                  <span class="cat-name" style="padding-left: {node.depth * 1.2}rem">
                    {#if node.depth > 0}<span class="tree-indent">└</span>{/if}
                    {cat.name}
                  </span>
                {/if}
              </td>
              <td class="status-cell">
                <button
                  class="status-toggle"
                  class:enabled={!cat.disabled}
                  class:disabled={cat.disabled}
                  onclick={() => doToggle(cat)}
                  title={cat.disabled ? 'Click to enable' : 'Click to disable'}
                >
                  {cat.disabled ? 'Disabled' : 'Enabled'}
                </button>
              </td>
              <td class="mono">
                {#if editingId === cat.id}
                  <select class="edit-select" bind:value={editParentId}>
                    <option value={null}>None (root)</option>
                    {#each categories.filter((c) => c.id !== cat.id) as opt}
                      <option value={opt.id}>{opt.name}</option>
                    {/each}
                  </select>
                {:else}
                  {cat.parentId ? getCategoryName(cat.parentId) : '—'}
                {/if}
              </td>
              <td class="mono folder-id" title={cat.folderId}>
                <a class="drive-link" href="https://drive.google.com/drive/folders/{cat.folderId}" target="_blank" rel="noopener" title="Open in Google Drive">
                  <svg class="drive-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M21.4231,13.88785,15.33356,3.33792H8.66663l6.09,10.54993ZM8.08917,4.33835,2,14.88736l3.33356,5.77472,6.08911-10.54926Zm1.73273,10.549L6.48877,20.66208H18.66663L22,14.88736Z"/></svg>
                </a>
                <span class="folder-text">{cat.folderId}</span>
              </td>
              <td>
                <div class="actions">
                  {#if editingId === cat.id}
                    <button class="btn-action save" onclick={saveEdit}>Save</button>
                    <button class="btn-action cancel" onclick={cancelEdit}>Cancel</button>
                  {:else}
                    <button class="btn-action upload" onclick={() => uploadCategory = cat}>Upload</button>
                    <button class="btn-action edit" onclick={() => startEdit(cat)}>Edit</button>
                    <button class="btn-action delete" onclick={() => doDelete(cat)}>Delete</button>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>

  {#if uploadCategory}
    <UploadModal
      category={uploadCategory}
      onclose={() => uploadCategory = null}
      onuploaded={() => uploadCategory = null}
    />
  {/if}
{/if}

<style>
  .categories-page {
    padding: 1rem 1.5rem;
    overflow-y: auto;
    height: 100%;
    width: 100%;
  }

  h1 {
    font-size: 1.3rem;
    margin-bottom: 1rem;
  }

  .msg-error {
    color: var(--danger);
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
  }

  .msg-info {
    color: var(--accent);
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
  }

  .msg-muted {
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .cat-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }

  .cat-table thead {
    position: sticky;
    top: 0;
    background: var(--bg-primary);
    z-index: 1;
  }

  .cat-table th {
    border-bottom: 2px solid var(--border);
    padding: 0.5rem 0.5rem;
    text-align: left;
    font-weight: 600;
    font-size: 0.75rem;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .cat-table td {
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding: 0.4rem 0.5rem;
    vertical-align: middle;
  }

  .cat-table tr:hover {
    background: var(--bg-hover);
  }

  .col-name { width: 30%; }
  .col-status { width: 8%; }
  .col-parent { width: 18%; }
  .col-folder { width: 28%; }
  .col-actions { width: 16%; }

  .cat-name {
    font-weight: 500;
  }

  .tree-indent {
    color: var(--text-muted);
    margin-right: 0.3rem;
    font-size: 0.75rem;
  }

  .mono {
    font-family: monospace;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .folder-id {
    max-width: 200px;
  }

  .folder-id .folder-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: inline-block;
    max-width: calc(100% - 1.4rem);
    vertical-align: middle;
  }

  .drive-link {
    display: inline-flex;
    align-items: center;
    vertical-align: middle;
    margin-right: 0.35rem;
  }

  .drive-link:hover {
    opacity: 0.8;
  }

  .drive-icon {
    width: 0.9rem;
    height: 0.9rem;
  }

  .edit-input {
    padding: 0.25rem 0.4rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.82rem;
    width: 100%;
  }

  .edit-select {
    padding: 0.25rem 0.4rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.75rem;
    width: 100%;
  }

  .actions {
    display: flex;
    gap: 0.3rem;
  }

  .btn-action {
    padding: 0.2rem 0.5rem;
    border-radius: 3px;
    font-size: 0.72rem;
    font-weight: 600;
  }

  .btn-action.upload {
    color: #2ecc71;
  }

  .btn-action.upload:hover {
    background: rgba(46, 204, 113, 0.15);
  }

  .btn-action.edit {
    color: var(--accent);
  }

  .btn-action.edit:hover {
    background: rgba(52, 152, 219, 0.15);
  }

  .btn-action.delete {
    color: var(--danger, #e74c3c);
  }

  .btn-action.delete:hover {
    background: rgba(231, 76, 60, 0.15);
  }

  .btn-action.save {
    color: #2ecc71;
  }

  .btn-action.save:hover {
    background: rgba(46, 204, 113, 0.15);
  }

  .btn-action.cancel {
    color: var(--text-muted);
  }

  .btn-action.cancel:hover {
    background: var(--bg-hover);
  }

  .status-cell {
    text-align: center;
  }

  .status-toggle {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.15rem 0.5rem;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .status-toggle.enabled {
    color: #2ecc71;
    background: rgba(46, 204, 113, 0.12);
  }

  .status-toggle.enabled:hover {
    background: rgba(46, 204, 113, 0.25);
  }

  .status-toggle.disabled {
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.06);
  }

  .status-toggle.disabled:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  .page-center {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted);
  }
</style>
