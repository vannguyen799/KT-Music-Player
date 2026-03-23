<script lang="ts">
  import { getAuthStore } from '$lib/stores/auth.store.svelte'

  let { onclose }: { onclose: () => void } = $props()

  const auth = getAuthStore()
  let oldPassword = $state('')
  let newPassword = $state('')
  let confirmPassword = $state('')
  let error = $state('')
  let success = $state('')
  let loading = $state(false)

  async function submit() {
    error = ''
    success = ''

    if (!oldPassword || !newPassword) {
      error = 'Please fill in all fields'
      return
    }
    if (newPassword.length < 4) {
      error = 'New password must be at least 4 characters'
      return
    }
    if (newPassword !== confirmPassword) {
      error = 'New passwords do not match'
      return
    }

    loading = true
    try {
      await auth.changePassword(oldPassword, newPassword)
      success = 'Password changed successfully'
      oldPassword = ''
      newPassword = ''
      confirmPassword = ''
      setTimeout(onclose, 1200)
    } catch (err: any) {
      error = err.message || 'Failed to change password'
    } finally {
      loading = false
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={onclose}>
  <div class="modal-content" onclick={(e) => e.stopPropagation()}>
    <h3>Change Password</h3>

    <form onsubmit={(e) => { e.preventDefault(); submit() }}>
      <input
        type="password"
        placeholder="Current password"
        bind:value={oldPassword}
        autocomplete="current-password"
      />
      <input
        type="password"
        placeholder="New password"
        bind:value={newPassword}
        autocomplete="new-password"
      />
      <input
        type="password"
        placeholder="Confirm new password"
        bind:value={confirmPassword}
        autocomplete="new-password"
      />

      {#if error}
        <p class="error">{error}</p>
      {/if}
      {#if success}
        <p class="success">{success}</p>
      {/if}

      <div class="actions">
        <button type="button" class="btn-cancel" onclick={onclose}>Cancel</button>
        <button type="submit" class="btn-primary" disabled={loading}>
          {loading ? '...' : 'Change'}
        </button>
      </div>
    </form>
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
    flex: 1;
  }

  .btn-primary:hover {
    background: var(--accent-hover);
  }

  .btn-primary:disabled {
    opacity: 0.6;
  }

  .btn-cancel {
    padding: 0.5rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    font-size: 0.85rem;
    flex: 1;
  }

  .btn-cancel:hover {
    background: var(--bg-hover);
  }

  .actions {
    display: flex;
    gap: 0.75rem;
  }

  .error {
    color: var(--danger);
    font-size: 0.85rem;
    margin: 0;
  }

  .success {
    color: var(--accent);
    font-size: 0.85rem;
    margin: 0;
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
  }
</style>
