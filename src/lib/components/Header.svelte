<script lang="ts">
  import { getAuthStore } from '$lib/stores/auth.store.svelte'
  import LoginModal from './LoginModal.svelte'

  const auth = getAuthStore()

  let showLogin = $state(false)
</script>

<header class="header">
  <nav class="nav-bar">
    <a href="/" class="nav-brand">KT Music Player</a>

    <div class="nav-right">
      {#if auth.isAdmin}
        <a href="/admin/scan" class="nav-link">Scan</a>
        <a href="/admin/categories" class="nav-link">Categories</a>
      {/if}
      {#if auth.isLoggedIn}
        <span class="username">{auth.user?.username}</span>
        <button class="nav-link" onclick={() => auth.logout()}>Logout</button>
      {:else}
        <button class="nav-link" onclick={() => showLogin = true}>Login</button>
      {/if}
    </div>
  </nav>
</header>

{#if showLogin}
  <LoginModal onclose={() => showLogin = false} />
{/if}

<style>
  .header {
    height: var(--header-height);
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
    z-index: 100;
    flex-shrink: 0;
  }

  .nav-bar {
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 1rem;
    gap: 0.5rem;
  }

  .nav-brand {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--accent);
    text-decoration: none;
    white-space: nowrap;
  }

  .nav-link {
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
    white-space: nowrap;
    border-radius: 4px;
    transition: background-color 0.15s;
  }

  .nav-link:hover {
    background-color: var(--bg-hover);
  }

  .nav-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: auto;
  }

  .username {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }
</style>
