const MOBILE_BREAKPOINT = 768

let isMobile = $state(false)
let sidebarOpen = $state(false)

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
  window.addEventListener('resize', checkMobile)
}

export function getMobileStore() {
  initMobileStore()
  return {
    get isMobile() { return isMobile },
    get sidebarOpen() { return sidebarOpen },
    openSidebar() { sidebarOpen = true },
    closeSidebar() { sidebarOpen = false },
    toggleSidebar() { sidebarOpen = !sidebarOpen },
  }
}
