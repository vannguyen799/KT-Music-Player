<script lang="ts">
  import { getAuthStore } from '$lib/stores/auth.store.svelte'
  import { getMobileStore } from '$lib/stores/mobile.store.svelte'
  import LoginModal from './LoginModal.svelte'

  const auth = getAuthStore()
  const mobile = getMobileStore()

  let showLogin = $state(false)
</script>

<header class="header">
  <nav class="nav-bar">
    <button class="hamburger" onclick={() => mobile.toggleSidebar()} title="Menu">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
    <a href="/" class="nav-brand">KT Player</a>

    <div class="nav-right">
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

  .hamburger {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    color: var(--text-primary);
    border-radius: 4px;
    flex-shrink: 0;
  }

  .hamburger:hover {
    background-color: var(--bg-hover);
  }

  @media (max-width: 768px) {
    .nav-bar {
      padding: 0 0.75rem;
    }

    .nav-link {
      padding: 0.4rem 0.6rem;
      font-size: 0.85rem;
    }

    .hide-mobile {
      display: none;
    }
  }
</style>
