<script lang="ts">
  let { name, size = 16 }: { name: string; size?: number } = $props()
</script>

<svg
  class="icon"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if name === 'play'}
    <polygon points="5,3 19,12 5,21" fill="currentColor" stroke="none" />
  {:else if name === 'pause'}
    <rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none" />
    <rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none" />
  {:else if name === 'prev'}
    <polygon points="11,12 19,5 19,19" fill="currentColor" stroke="none" />
    <polygon points="3,12 11,5 11,19" fill="currentColor" stroke="none" />
  {:else if name === 'next'}
    <polygon points="13,12 5,5 5,19" fill="currentColor" stroke="none" />
    <polygon points="21,12 13,5 13,19" fill="currentColor" stroke="none" />
  {:else if name === 'shuffle'}
    <polyline points="16,3 21,3 21,8" />
    <line x1="4" y1="20" x2="21" y2="3" />
    <polyline points="21,16 21,21 16,21" />
    <line x1="15" y1="15" x2="21" y2="21" />
    <line x1="4" y1="4" x2="9" y2="9" />
  {:else if name === 'loop'}
    <polyline points="17,1 21,5 17,9" />
    <path d="M3 11V9a4 4 0 014-4h14" />
    <polyline points="7,23 3,19 7,15" />
    <path d="M21 13v2a4 4 0 01-4 4H3" />
  {:else if name === 'settings'}
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  {:else if name === 'fullscreen'}
    <polyline points="15,3 21,3 21,9" />
    <polyline points="9,21 3,21 3,15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  {:else if name === 'upload'}
    <polyline points="16,16 12,12 8,16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
  {:else if name === 'chevron-right'}
    <polyline points="9,18 15,12 9,6" />
  {:else if name === 'chevron-left'}
    <polyline points="15,18 9,12 15,6" />
  {:else if name === 'chevrons-left'}
    <polyline points="11,17 6,12 11,7" />
    <polyline points="18,17 13,12 18,7" />
  {:else if name === 'chevrons-right'}
    <polyline points="13,17 18,12 13,7" />
    <polyline points="6,17 11,12 6,7" />
  {:else if name === 'volume-mute'}
    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  {:else if name === 'volume-low'}
    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none" />
    <path d="M15.54 8.46a5 5 0 010 7.07" />
  {:else if name === 'volume-high'}
    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none" />
    <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
  {:else if name === 'music-note'}
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  {:else if name === 'star'}
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="currentColor" stroke="none" />
  {:else if name === 'star-outline'}
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
  {:else if name === 'refresh'}
    <polyline points="23,4 23,10 17,10" />
    <polyline points="1,20 1,14 7,14" />
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  {:else if name === 'x'}
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  {/if}
</svg>

<style>
  .icon {
    display: inline-flex;
    vertical-align: middle;
    flex-shrink: 0;
  }
</style>
