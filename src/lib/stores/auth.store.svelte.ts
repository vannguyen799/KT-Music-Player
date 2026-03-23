import type { User } from '$lib/types/user'
import { restoreAuth, logout as logoutService, login as loginService, register as registerService, changePassword as changePasswordService } from '$lib/services/auth.service'
import { getPlayerStore } from '$lib/stores/player.store.svelte'
import { getMobileStore } from '$lib/stores/mobile.store.svelte'
import { destroyActivityTracker } from '$lib/utils/activity-tracker'

let user = $state<User | null>(null)
let token = $state('')

export function getAuthStore() {
  const player = getPlayerStore()
  const mobile = getMobileStore()
  const isLoggedIn = $derived(!!token && !!user)
  const isAdmin = $derived(user?.role === 0)

  function syncPlayerConfig(u: User) {
    player.setLoggedIn(true)
    if (u.playerConfig) {
      player.loadConfig(u.playerConfig)
    } else {
      player.saveCurrentToServer()
    }
  }

  function restore() {
    const stored = restoreAuth()
    if (stored) {
      user = stored.user
      token = stored.token
      syncPlayerConfig(stored.user)
    }
  }

  async function login(username: string, password: string) {
    const result = await loginService(username, password)
    user = result.user
    token = result.token
    syncPlayerConfig(result.user)
  }

  async function register(username: string, password: string) {
    const result = await registerService(username, password)
    user = result.user
    token = result.token
    syncPlayerConfig(result.user)
  }

  function logout() {
    destroyActivityTracker()
    logoutService()
    user = null
    token = ''
    player.setLoggedIn(false)
    mobile.resetSidebar()
  }

  async function changePassword(oldPassword: string, newPassword: string) {
    await changePasswordService(oldPassword, newPassword)
  }

  function isFavorite(fileId: string): boolean {
    return user?.favorite?.includes(fileId) ?? false
  }

  function updateFavorites(favorites: string[]) {
    if (user) {
      user = { ...user, favorite: favorites }
    }
  }

  return {
    get user() { return user },
    get token() { return token },
    get isLoggedIn() { return isLoggedIn },
    get isAdmin() { return isAdmin },
    restore,
    login,
    register,
    logout,
    changePassword,
    isFavorite,
    updateFavorites,
  }
}
