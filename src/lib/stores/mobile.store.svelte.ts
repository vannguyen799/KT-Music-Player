const MOBILE_BREAKPOINT = 768
const SIDEBAR_KEY = 'kt_sidebar_open'

let isMobile = $state(false)
let sidebarOpen = $state(true)

function loadSidebarState(): boolean {
  if (typeof localStorage === 'undefined') return true
  try {
    const stored = localStorage.getItem(SIDEBAR_KEY)
    return stored === null ? true : stored === 'true'
  } catch {
    return true
  }
}

function saveSidebarState() {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SIDEBAR_KEY, String(sidebarOpen))
}

function checkMobile() {
  if (typeof window !== 'undefined') {
    isMobile = window.innerWidth <= MOBILE_BREAKPOINT
  }
}

let initialized = false

function initMobileStore() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  checkMobile()
  sidebarOpen = isMobile ? false : loadSidebarState()
  window.addEventListener('resize', checkMobile)
}

export function getMobileStore() {
  initMobileStore()
  return {
    get isMobile() { return isMobile },
    get sidebarOpen() { return sidebarOpen },
    openSidebar() { sidebarOpen = true; saveSidebarState() },
    closeSidebar() { sidebarOpen = false; saveSidebarState() },
    toggleSidebar() { sidebarOpen = !sidebarOpen; saveSidebarState() },
    resetSidebar() {
      sidebarOpen = false
      if (typeof localStorage !== 'undefined') localStorage.removeItem(SIDEBAR_KEY)
    },
  }
}
