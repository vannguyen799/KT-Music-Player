import type { Song } from '$lib/types/song'
import type { Category } from '$lib/services/admin.service'
import { getCategories, getAllSongs, getSongsByCategory, searchSongs } from '$lib/services/song.service'

const PAGE_SIZE = 20

let categories = $state<Category[]>([])
let currentCategory = $state<Category | null>(null)
let songs = $state<Song[]>([])
let searchQuery = $state('')
let loading = $state(false)
let currentPage = $state(1)
let totalSongs = $state(0)

let searchTimer: ReturnType<typeof setTimeout> | null = null

export function getMusicStore() {
  const totalPages = $derived(Math.max(1, Math.ceil(totalSongs / PAGE_SIZE)))

  async function loadCategories() {
    categories = await getCategories()
  }

  async function fetchSongs(page: number) {
    loading = true
    try {
      let result: { songs: Song[]; total: number }
      const q = searchQuery.trim()

      if (q && currentCategory) {
        result = await getSongsByCategory(currentCategory.id, page, PAGE_SIZE, q)
      } else if (q) {
        result = await searchSongs(q, page, PAGE_SIZE)
      } else if (currentCategory) {
        result = await getSongsByCategory(currentCategory.id, page, PAGE_SIZE)
      } else {
        result = await getAllSongs(page, PAGE_SIZE)
      }

      songs = result.songs
      totalSongs = result.total
      currentPage = page
    } catch (err) {
      console.error('Failed to load songs:', err)
      songs = []
      totalSongs = 0
    } finally {
      loading = false
    }
  }

  async function selectCategory(category: Category | null) {
    currentCategory = category
    searchQuery = ''
    currentPage = 1
    await fetchSongs(1)
  }

  async function goToPage(page: number) {
    if (page < 1 || page > totalPages) return
    await fetchSongs(page)
  }

  function setSearch(query: string) {
    searchQuery = query
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      currentPage = 1
      fetchSongs(1)
    }, 300)
  }

  function updateSong(updated: Song) {
    const idx = songs.findIndex((s) => s.fileId === updated.fileId)
    if (idx >= 0) songs[idx] = updated
  }

  function removeSong(fileId: string) {
    songs = songs.filter((s) => s.fileId !== fileId)
  }

  return {
    get categories() { return categories },
    get currentCategory() { return currentCategory },
    get songs() { return songs },
    get filteredSongs() { return songs },
    get searchQuery() { return searchQuery },
    get loading() { return loading },
    get currentPage() { return currentPage },
    get totalPages() { return totalPages },
    get totalSongs() { return totalSongs },
    get pageSize() { return PAGE_SIZE },
    loadCategories,
    selectCategory,
    setSearch,
    goToPage,
    updateSong,
    removeSong,
  }
}
