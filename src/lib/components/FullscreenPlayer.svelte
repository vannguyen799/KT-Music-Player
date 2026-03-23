<script lang="ts">
  import { getPlayerStore } from '$lib/stores/player.store.svelte'
  import Icon from './Icon.svelte'
  import { getDisplayTitle, getDisplayArtist, getAvailableLyricLangs, type LangCode } from '$lib/types/song'
  import { parseLRC, getCurrentLineIndex } from '$lib/player/LyricLRC'
  // @ts-ignore
  import { pinyin } from 'pinyin'

  const CJK_REGEX = /[\u4e00-\u9fff]/

  function toPinyin(text: string): string {
    if (!text || !CJK_REGEX.test(text)) return ''
    return pinyin(text, { segment: true, group: true })
      .map((p: string[]) => p[0])
      .join(' ')
  }

  let { onclose }: { onclose: () => void } = $props()

  const player = getPlayerStore()

  let lyricsEl: HTMLDivElement | undefined = $state()
  let enabledLangs = $state<Set<LangCode>>(new Set())
  let showSettings = $state(false)
  let langsInitialized = false

  function onSpeedInput(e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value)
    if (!isNaN(val) && val >= 0.1 && val <= 4) {
      player.setSpeed(Math.round(val * 100) / 100)
    }
  }

  const availableLangs = $derived(
    player.currentSong ? getAvailableLyricLangs(player.currentSong) : [],
  )

  // Auto-enable all langs when song changes
  $effect(() => {
    const langs = availableLangs
    if (langs.length > 0 && !langsInitialized) {
      enabledLangs = new Set(langs)
      langsInitialized = true
    }
  })

  // Reset when song changes
  $effect(() => {
    player.currentSong
    langsInitialized = false
  })

  function toggleLang(lang: LangCode) {
    const next = new Set(enabledLangs)
    if (next.has(lang)) {
      next.delete(lang)
    } else {
      next.add(lang)
    }
    enabledLangs = next
  }

  // Parse lyrics for each enabled lang
  const parsedByLang = $derived.by(() => {
    const song = player.currentSong
    if (!song) return new Map<LangCode, ReturnType<typeof parseLRC>>()
    const map = new Map<LangCode, ReturnType<typeof parseLRC>>()
    for (const lang of enabledLangs) {
      const lrc = song.lyrics[lang] ?? ''
      const lines = parseLRC(lrc)
      if (lines.length > 0) map.set(lang, lines)
    }
    return map
  })

  // Use the first enabled lang's lines for scroll sync
  const primaryLines = $derived(() => {
    for (const lines of parsedByLang.values()) return lines
    return []
  })

  const currentLineIdx = $derived(getCurrentLineIndex(primaryLines(), player.currentTime))

  $effect(() => {
    if (currentLineIdx >= 0 && lyricsEl) {
      const el = lyricsEl.querySelector(`[data-idx="${currentLineIdx}"]`) as HTMLElement | null
      if (el) {
        const container = lyricsEl
        const targetTop = el.offsetTop - container.offsetTop - container.clientHeight / 2 + el.clientHeight / 2
        const start = container.scrollTop
        const diff = targetTop - start
        if (Math.abs(diff) < 2) return
        const duration = 600
        let startTime: number
        function step(ts: number) {
          if (!startTime) startTime = ts
          const progress = Math.min((ts - startTime) / duration, 1)
          // easeInOutCubic — slow start, slow end
          const ease = progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2
          container.scrollTop = start + diff * ease
          if (progress < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      }
    }
  })

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

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose()
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="fc-player" onkeydown={handleKeydown}>
  <div class="fc-bg"></div>

  <div class="fc-main">
    <!-- Left: cover + song info stacked -->
    <div class="fc-left">
      <div class="fc-cover">
        {#if player.coverUrl}
          <img class="fc-cover-img" src={player.coverUrl} alt="Cover art" />
        {:else}
          <div class="fc-cover-placeholder"><Icon name="music-note" size={64} /></div>
        {/if}
      </div>
      {#if player.currentSong}
        <div class="fc-song-info">
          <div class="fc-song-title">{getDisplayTitle(player.currentSong)}</div>
          <div class="fc-song-artist">{getDisplayArtist(player.currentSong)}</div>
        </div>
      {/if}
    </div>

    <!-- Right: lyrics -->
    <div class="fc-right">
      <div class="fc-top-bar">
        {#if availableLangs.length > 1}
          <div class="fc-lang-switcher">
            {#each availableLangs as lang}
              <button
                class="fc-lang-btn"
                class:active={enabledLangs.has(lang)}
                onclick={() => toggleLang(lang)}
              >
                {lang === 'origin' ? 'Original' : lang.toUpperCase()}
              </button>
            {/each}
          </div>
        {:else}
          <div></div>
        {/if}
        <button class="fc-close-btn" onclick={onclose} title="Close"><Icon name="x" size={24} /></button>
      </div>

      <div class="fc-lyrics" bind:this={lyricsEl}>
        {#if parsedByLang.size > 0}
          {@const pLines = primaryLines()}
          {#each pLines as line, i}
            <div
              class="fc-lyric-group"
              class:active={i === currentLineIdx}
              class:past={i < currentLineIdx}
              data-idx={i}
            >
              {#each [...enabledLangs] as lang, langIdx}
                {@const lines = parsedByLang.get(lang)}
                {#if lines}
                  {@const text = (() => { const idx = getCurrentLineIndex(lines, line.time + 0.01); return idx >= 0 ? (lines[idx]?.text ?? '') : '' })()}
                  {#if text || langIdx === 0}
                    <p class="fc-lyric-line" class:fc-lyric-sub={langIdx > 0}>
                      {text || '...'}
                    </p>
                    {@const py = toPinyin(text)}
                    {#if py}
                      <p class="fc-lyric-line fc-lyric-pinyin">{py}</p>
                    {/if}
                  {/if}
                {/if}
              {/each}
            </div>
          {/each}
        {:else}
          <p class="fc-no-lyrics">No lyrics available</p>
        {/if}
      </div>
    </div>
  </div>

  <!-- Bottom controls -->
  <div class="fc-controls">
    <div class="fc-progress-row">
      <span class="fc-time">{formatTime(player.currentTime)}</span>
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div class="fc-progress-bar" onclick={seekHandler} onmousemove={onProgressHover} onmouseleave={() => showHoverTime = false}>
        <div class="fc-progress-fill" style="width: {progress}%"></div>
        {#if showHoverTime && player.duration > 0}
          <div class="fc-progress-tooltip" style="left: {hoverX}px">{hoverTime}</div>
        {/if}
      </div>
      <span class="fc-time">{formatTime(player.duration)}</span>
    </div>

    <div class="fc-buttons">
      <button class="fc-btn" onclick={() => player.toggleRandom()} class:active={player.isRandom} title="Shuffle">
        <Icon name="shuffle" size={18} />
      </button>
      <button class="fc-btn" onclick={() => player.playPrev()} title="Previous">
        <Icon name="prev" size={18} />
      </button>
      <button class="fc-btn fc-play-pause" onclick={() => player.togglePlay()} title={player.isPlaying ? 'Pause' : 'Play'}>
        {#if player.isLoading}
          ...
        {:else if player.isPlaying}
          <Icon name="pause" size={24} />
        {:else}
          <Icon name="play" size={24} />
        {/if}
      </button>
      <button class="fc-btn" onclick={() => player.playNext()} title="Next">
        <Icon name="next" size={18} />
      </button>
      <button class="fc-btn" onclick={() => player.toggleLoop()} class:active={player.loopMode !== 'none'} title="Loop: {player.loopMode}">
        <Icon name="loop" size={18} />{loopLabel()}
      </button>
      <div class="fc-volume">
        <input
          type="range"
          class="fc-volume-slider"
          min="0"
          max="1"
          step="0.01"
          value={player.volume}
          oninput={(e) => player.setVolume(parseFloat((e.target as HTMLInputElement).value))}
        />
      </div>

      <!-- Settings popover -->
      <div class="fc-settings-wrapper">
        <button class="fc-btn" onclick={() => showSettings = !showSettings} class:active={showSettings} title="Settings">
          <Icon name="settings" size={18} />
        </button>
        {#if showSettings}
          <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
          <div class="fc-settings-backdrop" onclick={() => showSettings = false}></div>
          <div class="fc-settings-popover">
            <div class="fc-settings-item">
              <span class="fc-settings-label">Lyrics</span>
              <button class="fc-btn" onclick={() => player.setShowLyrics(!player.showLyrics)} class:active={player.showLyrics}>
                {player.showLyrics ? 'ON' : 'OFF'}
              </button>
            </div>
            <div class="fc-settings-item">
              <span class="fc-settings-label">Speed</span>
              <input
                type="number"
                class="fc-speed-input"
                min="0.1"
                max="4"
                step="0.05"
                value={player.speed}
                oninput={onSpeedInput}
              />
            </div>
            <div class="fc-settings-item">
              <span class="fc-settings-label">Shuffle</span>
              <button class="fc-btn" onclick={() => player.toggleRandom()} class:active={player.isRandom}>
                {player.isRandom ? 'ON' : 'OFF'}
              </button>
            </div>
            <div class="fc-settings-item">
              <span class="fc-settings-label">Loop</span>
              <button class="fc-btn" onclick={() => player.toggleLoop()} class:active={player.loopMode !== 'none'}>
                {loopLabel()}
              </button>
            </div>
            <div class="fc-settings-item">
              <span class="fc-settings-label">Position</span>
              <button class="fc-btn" onclick={() => player.togglePlayerPosition()}>
                {player.playerPosition === 'top' ? 'TOP' : 'BOTTOM'}
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .fc-player {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    color: #fff;
    overflow: hidden;
  }

  .fc-bg {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%);
    z-index: -1;
  }

  .fc-main {
    flex: 1;
    display: flex;
    padding: 2rem;
    gap: 2rem;
    overflow: hidden;
  }

  /* Left: cover + song info */
  .fc-left {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-end;
    flex-shrink: 0;
    padding-bottom: 1.5vh;
    padding-left: 4vw;
  }

  .fc-cover {
    width: clamp(200px, 25vw, 360px);
    height: clamp(200px, 25vw, 360px);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    flex-shrink: 0;
  }

  .fc-cover-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 16px;
  }

  .fc-cover-placeholder {
    font-size: 5rem;
    color: rgba(255, 255, 255, 0.2);
  }

  /* Right: lyrics */
  .fc-right {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }

  .fc-top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 0.5rem;
    flex-shrink: 0;
  }

  .fc-lang-switcher {
    display: flex;
    gap: 0.35rem;
  }

  .fc-lang-btn {
    font-size: 0.75rem;
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.08);
    transition: all 0.2s;
  }

  .fc-lang-btn.active {
    color: #fff;
    background: rgba(255, 255, 255, 0.2);
  }

  .fc-close-btn {
    font-size: 2rem;
    color: rgba(255, 255, 255, 0.5);
    padding: 0 0.5rem;
    line-height: 1;
    transition: color 0.2s;
  }

  .fc-close-btn:hover {
    color: #fff;
  }

  .fc-lyrics {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 0;
    text-align: center;
    mask-image: linear-gradient(transparent 0%, black 15%, black 85%, transparent 100%);
    -webkit-mask-image: linear-gradient(transparent 0%, black 15%, black 85%, transparent 100%);
  }

  .fc-lyrics::-webkit-scrollbar {
    display: none;
  }

  .fc-lyric-group {
    padding: 0.6rem 1rem;
    transform-origin: center;
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: transform, opacity;
    opacity: 0.4;
  }

  .fc-lyric-line {
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.75);
    line-height: 1.6;
  }

  .fc-lyric-sub {
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .fc-lyric-pinyin {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.3;
    margin-top: -0.1rem;
  }

  .fc-lyric-group.active {
    transform: scale(1.1);
    opacity: 1;
  }

  .fc-lyric-group.active .fc-lyric-line {
    color: #fff;
    font-weight: 600;
    text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
  }

  .fc-lyric-group.active .fc-lyric-sub {
    font-weight: 400;
    color: rgba(255, 255, 255, 0.7);
    text-shadow: none;
  }

  .fc-lyric-group.active .fc-lyric-pinyin {
    color: rgba(255, 255, 255, 0.5);
    font-weight: 400;
    text-shadow: none;
  }

  .fc-lyric-group.past {
    opacity: 0.6;
  }

  .fc-lyric-group.past .fc-lyric-line {
    color: rgba(255, 255, 255, 0.75);
  }

  .fc-lyric-group.past .fc-lyric-sub {
    color: rgba(255, 255, 255, 0.5);
  }

  .fc-lyric-group.past .fc-lyric-pinyin {
    color: rgba(255, 255, 255, 0.4);
  }

  .fc-no-lyrics {
    color: rgba(255, 255, 255, 0.3);
    font-size: 1.1rem;
    padding-top: 4rem;
    text-align: center;
  }

  .fc-song-info {
    text-align: left;
    margin-top: 0.75rem;
    max-width: clamp(300px, 37vw, 540px);
    align-self: flex-start;
  }

  .fc-song-title {
    font-size: clamp(1.1rem, 1.2vw, 1.6rem);
    font-weight: 700;
    word-break: break-word;
  }

  .fc-song-artist {
    font-size: clamp(0.85rem, 0.9vw, 1.1rem);
    color: rgba(255, 255, 255, 0.6);
    margin-top: 0.25rem;
    word-break: break-word;
  }

  /* Bottom controls */
  .fc-controls {
    flex-shrink: 0;
    padding: 0.75rem 2rem 1.5rem;
  }

  .fc-progress-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .fc-time {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.6);
    min-width: 3em;
    text-align: center;
  }

  .fc-progress-bar {
    flex: 1;
    height: 5px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
    cursor: pointer;
    position: relative;
  }

  .fc-progress-fill {
    height: 100%;
    background: #fff;
    border-radius: 3px;
    transition: width 0.1s linear;
  }

  .fc-progress-bar:hover .fc-progress-fill {
    background: var(--accent, #1db954);
  }

  .fc-progress-tooltip {
    position: absolute;
    bottom: 100%;
    transform: translateX(-50%);
    margin-bottom: 8px;
    background: rgba(30, 30, 50, 0.95);
    color: #fff;
    font-size: 0.75rem;
    padding: 3px 8px;
    border-radius: 4px;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
  }

  .fc-buttons {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    margin-top: 0.75rem;
  }

  .fc-btn {
    font-size: 1rem;
    padding: 0.4rem 0.6rem;
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.7);
    transition: all 0.2s;
  }

  .fc-btn:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
  }

  .fc-btn.active {
    color: var(--accent, #1db954);
  }

  .fc-play-pause {
    font-size: 1.5rem;
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    width: 3.5rem;
    height: 3.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .fc-play-pause:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .fc-volume {
    position: absolute;
    right: 2rem;
  }

  .fc-volume-slider {
    width: 100px;
    accent-color: #fff;
  }

  /* Settings popover */
  .fc-settings-wrapper {
    position: absolute;
    right: calc(2rem + 120px);
    display: flex;
    align-items: center;
  }

  .fc-settings-backdrop {
    position: fixed;
    inset: 0;
    z-index: 99;
  }

  .fc-settings-popover {
    position: absolute;
    bottom: calc(100% + 12px);
    right: 0;
    background: rgba(30, 30, 50, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    padding: 8px;
    min-width: 160px;
    z-index: 100;
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 4px;
    backdrop-filter: blur(12px);
  }

  .fc-settings-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .fc-settings-item:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .fc-settings-label {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .fc-speed-input {
    width: 60px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    color: #fff;
    font-size: 0.75rem;
    padding: 2px 4px;
    text-align: center;
  }

  .fc-speed-input:focus {
    outline: 1px solid var(--accent, #1db954);
    border-color: var(--accent, #1db954);
  }

  @media (max-width: 768px) {
    .fc-main {
      flex-direction: column;
      align-items: center;
      padding: 1rem;
      gap: 1rem;
    }

    .fc-cover {
      width: 200px;
      height: 200px;
    }

    .fc-cover-placeholder {
      font-size: 3rem;
    }

    .fc-lyric-line { font-size: 0.95rem; }
    .fc-lyric-group.active .fc-lyric-line { font-size: 1.2rem; }
    .fc-lyric-group.active .fc-lyric-sub { font-size: 0.95rem; }
    .fc-song-title { font-size: 1.2rem; }
    .fc-volume { display: none; }
    .fc-settings-wrapper { right: 1rem; }
  }
</style>
