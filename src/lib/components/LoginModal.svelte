<script lang="ts">
  import { getAuthStore } from '$lib/stores/auth.store.svelte'

  let { onclose }: { onclose: () => void } = $props()

  const auth = getAuthStore()
  let mode = $state<'login' | 'register'>('login')
  let username = $state('')
  let password = $state('')
  let error = $state('')
  let loading = $state(false)

  async function submit() {
    error = ''
    loading = true
    try {
      if (mode === 'login') {
        await auth.login(username, password)
      } else {
        await auth.register(username, password)
      }
      onclose()
    } catch (err: any) {
      error = err.message || 'Failed'
    } finally {
      loading = false
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={onclose}>
  <div class="modal-content" onclick={(e) => e.stopPropagation()}>
    <h3>{mode === 'login' ? 'Login' : 'Register'}</h3>

    <form onsubmit={(e) => { e.preventDefault(); submit() }}>
      <input
        type="text"
        placeholder="Username"
        bind:value={username}
        autocomplete="username"
      />
      <input
        type="password"
        placeholder="Password"
        bind:value={password}
        autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
      />

      {#if error}
        <p class="error">{error}</p>
      {/if}

      <button type="submit" class="btn-primary" disabled={loading}>
        {loading ? '...' : mode === 'login' ? 'Login' : 'Register'}
      </button>
    </form>

    <p class="switch">
      {#if mode === 'login'}
        No account? <button onclick={() => mode = 'register'}>Register</button>
      {:else}
        Have account? <button onclick={() => mode = 'login'}>Login</button>
      {/if}
    </p>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 2rem;
    width: 320px;
  }

  h3 {
    margin-bottom: 1rem;
    font-size: 1.2rem;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  input {
    padding: 0.5rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    font-size: 0.9rem;
  }

  .btn-primary {
    padding: 0.5rem;
    background: var(--accent);
    color: #fff;
    border-radius: 4px;
    font-weight: 600;
  }

  .btn-primary:hover {
    background: var(--accent-hover);
  }

  .btn-primary:disabled {
    opacity: 0.6;
  }

  .error {
    color: var(--danger);
    font-size: 0.85rem;
  }

  .switch {
    margin-top: 1rem;
    font-size: 0.85rem;
    color: var(--text-secondary);
    text-align: center;
  }

  .switch button {
    color: var(--accent);
    text-decoration: underline;
  }

  @media (max-width: 768px) {
    .modal-content {
      width: calc(100vw - 2rem);
      max-width: 320px;
      padding: 1.5rem;
    }

    input {
      padding: 0.65rem;
      font-size: 1rem;
    }

    .btn-primary {
      padding: 0.65rem;
      font-size: 1rem;
    }
  }
</style>
