<script lang="ts">
  import { getPlayerStore } from '$lib/stores/player.store.svelte'
  import { getDisplayTitle, getDisplayArtist } from '$lib/types/song'
  import LyricsDisplay from './LyricsDisplay.svelte'
  import FullscreenPlayer from './FullscreenPlayer.svelte'

  const player = getPlayerStore()

  let showFullscreen = $state(false)
  let showSettings = $state(false)
  let showVolumePopover = $state(false)
  let volumeHoverTimeout: ReturnType<typeof setTimeout> | null = null
  let prevVolume = 0.7

  function onSpeedInput(e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value)
    if (!isNaN(val) && val >= 0.1 && val <= 4) {
      player.setSpeed(Math.round(val * 100) / 100)
    }
  }

  function onVolumeEnter() {
    if (volumeHoverTimeout) clearTimeout(volumeHoverTimeout)
    showVolumePopover = true
  }

  function onVolumeLeave() {
    volumeHoverTimeout = setTimeout(() => {
      showVolumePopover = false
    }, 200)
  }

  function toggleMute() {
    if (player.volume > 0) {
      prevVolume = player.volume
      player.setVolume(0)
    } else {
      player.setVolume(prevVolume)
    }
  }

  function volumeIcon(): string {
    if (player.volume === 0) return '\u{1F507}'   // muted
    if (player.volume < 0.5) return '\u{1F509}'   // low
    return '\u{1F50A}'                              // high
  }

  function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const progress = $derived(
    player.duration > 0 ? (player.currentTime / player.duration) * 100 : 0,
  )

  let hoverTime = $state('')
  let hoverX = $state(0)
  let showHoverTime = $state(false)

  function seekHandler(e: MouseEvent) {
    const bar = e.currentTarget as HTMLElement
    const rect = bar.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    player.seek(pct * player.duration)
  }

  function onProgressHover(e: MouseEvent) {
    const bar = e.currentTarget as HTMLElement
    const rect = bar.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    hoverTime = formatTime(pct * player.duration)
    hoverX = e.clientX - rect.left
    showHoverTime = true
  }

  function loopLabel(): string {
    if (player.loopMode === 'one') return '1'
    if (player.loopMode === 'all') return 'A'
    return '-'
  }
</script>

<footer class="player-bar" class:has-song={!!player.currentSong} class:position-top={player.playerPosition === 'top'}>
  <!-- Progress bar -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="progress-bar" onclick={seekHandler} onmousemove={onProgressHover} onmouseleave={() => showHoverTime = false}>
    <div class="progress-fill" style="width: {progress}%"></div>
    {#if showHoverTime && player.duration > 0}
      <div class="progress-tooltip" style="left: {hoverX}px">{hoverTime}</div>
    {/if}
  </div>

  <div class="player-content">
    <!-- Song info -->
    <div class="song-info">
      <div class="cover-wrapper">
        {#if player.coverUrl}
          <img class="cover-img" src={player.coverUrl} alt="Cover art" />
        {:else}
          <div class="cover-placeholder">&#9835;</div>
        {/if}
      </div>
      <div class="song-text">
        {#if player.currentSong}
          <span class="song-title" title={getDisplayTitle(player.currentSong)}>{getDisplayTitle(player.currentSong)}</span>
          <span class="song-artist" title={getDisplayArtist(player.currentSong)}>{getDisplayArtist(player.currentSong)}</span>
        {:else}
          <span class="song-title empty">No song playing</span>
        {/if}
      </div>
    </div>

    <!-- Center: Lyrics (only when enabled) -->
    {#if player.showLyrics}
      <div class="center-lyrics">
        <LyricsDisplay />
      </div>
    {/if}

    <!-- Controls (right side) -->
    <div class="controls">
      <button class="ctrl-btn" onclick={() => player.playPrev()} title="Previous">
        &#9664;&#9664;
      </button>
      <button class="ctrl-btn play-pause" onclick={() => player.togglePlay()} title={player.isPlaying ? 'Pause' : 'Play'}>
        {#if player.isLoading}
          ...
        {:else if player.isPlaying}
          &#10074;&#10074;
        {:else}
          &#9654;
        {/if}
      </button>
      <button class="ctrl-btn" onclick={() => player.playNext()} title="Next">
        &#9654;&#9654;
      </button>
    </div>

    <!-- Right side -->
    <div class="player-right">
      <span class="time">{formatTime(player.currentTime)} / {formatTime(player.duration)}</span>
      <button class="ctrl-btn" onclick={() => showFullscreen = true} title="Fullscreen player">
        &#9974;
      </button>

      <!-- Volume with hover popover -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="volume-wrapper" onmouseenter={onVolumeEnter} onmouseleave={onVolumeLeave}>
        <button class="ctrl-btn volume-icon" onclick={toggleMute} title={player.volume === 0 ? 'Unmute' : 'Mute'}>
          {volumeIcon()}
        </button>
        {#if showVolumePopover}
          <div class="volume-popover">
            <input
              type="range"
              class="volume-slider-vertical"
              min="0"
              max="1"
              step="0.01"
              value={player.volume}
              oninput={(e) => player.setVolume(parseFloat((e.target as HTMLInputElement).value))}
              {...{ orient: 'vertical' } as any}
            />
            <span class="volume-label">{Math.round(player.volume * 100)}%</span>
          </div>
        {/if}
      </div>

      <!-- Settings popover -->
      <div class="settings-wrapper">
        <button class="ctrl-btn" onclick={() => showSettings = !showSettings} class:active={showSettings} title="Settings">
          &#9881;
        </button>
        {#if showSettings}
          <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
          <div class="settings-backdrop" onclick={() => showSettings = false}></div>
          <div class="settings-popover">
            <div class="settings-item">
              <span class="settings-label">Lyrics</span>
              <button class="ctrl-btn" onclick={() => player.setShowLyrics(!player.showLyrics)} class:active={player.showLyrics}>
                {player.showLyrics ? 'ON' : 'OFF'}
              </button>
            </div>
            <div class="settings-item">
              <span class="settings-label">Speed</span>
              <input
                type="number"
                class="speed-input"
                min="0.1"
                max="4"
                step="0.05"
                value={player.speed}
                oninput={onSpeedInput}
              />
            </div>
            <div class="settings-item">
              <span class="settings-label">Shuffle</span>
              <button class="ctrl-btn" onclick={() => player.toggleRandom()} class:active={player.isRandom}>
                {player.isRandom ? 'ON' : 'OFF'}
              </button>
            </div>
            <div class="settings-item">
              <span class="settings-label">Loop</span>
              <button class="ctrl-btn" onclick={() => player.toggleLoop()} class:active={player.loopMode !== 'none'}>
                {loopLabel()}
              </button>
            </div>
            <div class="settings-item">
              <span class="settings-label">Position</span>
              <button class="ctrl-btn" onclick={() => player.togglePlayerPosition()}>
                {player.playerPosition === 'top' ? 'TOP' : 'BOTTOM'}
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</footer>

{#if showFullscreen}
  <FullscreenPlayer onclose={() => showFullscreen = false} />
{/if}

<style>
  .player-bar {
    height: var(--player-height);
    background: var(--bg-secondary);
    border-top: 1px solid var(--border);
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .player-bar.position-top {
    border-top: none;
    border-bottom: 1px solid var(--border);
  }

  .progress-bar {
    width: 100%;
    height: 4px;
    background: var(--bg-tertiary);
    cursor: pointer;
    flex-shrink: 0;
    position: relative;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.1s linear;
  }

  .progress-tooltip {
    position: absolute;
    bottom: 100%;
    transform: translateX(-50%);
    margin-bottom: 6px;
    background: var(--bg-tertiary);
    color: var(--text-primary);
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 4px;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }

  .player-content {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 0 1rem;
    gap: 1rem;
  }

  .song-info {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    min-width: 0;
    max-width: 400px;
  }

  .cover-wrapper {
    flex-shrink: 0;
    width: 50px;
    height: 50px;
  }

  .cover-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 6px;
  }

  .cover-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
    border-radius: 6px;
    font-size: 1.2rem;
    color: var(--text-muted);
  }

  .song-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .song-title {
    font-size: 0.85rem;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .song-title.empty {
    color: var(--text-muted);
  }

  .song-artist {
    font-size: 0.75rem;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
    margin-left: auto;
  }

  .center-lyrics {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    height: calc(var(--player-height) - 4px);
    max-height: calc(var(--player-height) - 4px);
  }

  .ctrl-btn {
    font-size: 0.8rem;
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
    color: var(--text-secondary);
    transition: all 0.15s;
  }

  .ctrl-btn:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
  }

  .ctrl-btn.active {
    color: var(--accent);
  }

  .play-pause {
    font-size: 1rem;
    padding: 0.3rem 0.6rem;
  }

  .volume-icon {
    font-size: 1rem;
    min-width: 1.8rem;
    text-align: center;
  }

  .speed-input {
    width: 60px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 0.75rem;
    padding: 2px 4px;
    text-align: center;
  }

  .speed-input:focus {
    outline: 1px solid var(--accent);
    border-color: var(--accent);
  }

  .player-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  .time {
    font-size: 0.75rem;
    color: var(--text-muted);
    white-space: nowrap;
  }

  /* Volume popover */
  .volume-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .volume-popover {
    position: absolute;
    bottom: calc(100% + 12px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    z-index: 100;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);
  }

  .volume-slider-vertical {
    writing-mode: vertical-lr;
    direction: rtl;
    width: 4px;
    height: 100px;
    accent-color: var(--accent);
    cursor: pointer;
  }

  .volume-label {
    font-size: 0.65rem;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  /* Settings popover */
  .settings-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .settings-backdrop {
    position: fixed;
    inset: 0;
    z-index: 99;
  }

  .settings-popover {
    position: absolute;
    bottom: calc(100% + 12px);
    right: 0;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px;
    min-width: 150px;
    z-index: 100;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .settings-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .settings-item:hover {
    background: var(--bg-hover);
  }

  .settings-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  /* Flip popovers when player is at top */
  .position-top .volume-popover {
    bottom: auto;
    top: calc(100% + 12px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .position-top .settings-popover {
    bottom: auto;
    top: calc(100% + 12px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .position-top .progress-tooltip {
    bottom: auto;
    top: 100%;
    margin-bottom: 0;
    margin-top: 14px;
    transform: translateX(-100%);
  }
</style>
