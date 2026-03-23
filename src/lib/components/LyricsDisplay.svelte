<script lang="ts">
  import { getPlayerStore } from '$lib/stores/player.store.svelte'
  import { parseLRC, getCurrentLineIndex, type LyricLine } from '$lib/player/LyricLRC'
  import { getDisplayLyrics } from '$lib/types/song'

  const player = getPlayerStore()

  const lyricsText = $derived(player.currentSong ? getDisplayLyrics(player.currentSong) : '')

  const lyricLines = $derived.by(() => {
    if (!lyricsText) return []
    return parseLRC(lyricsText)
  })

  const currentLineIdx = $derived(getCurrentLineIndex(lyricLines, player.currentTime))

  let viewportEl: HTMLDivElement | undefined = $state()
  let viewportH = $state(60)

  $effect(() => {
    if (viewportEl) {
      viewportH = viewportEl.clientHeight
    }
  })

  const LINE_HEIGHT = 18
  const offsetY = $derived(viewportH / 2 - LINE_HEIGHT / 2 - currentLineIdx * LINE_HEIGHT)
</script>

{#if lyricLines.length > 0}
  <div class="lyrics-viewport" bind:this={viewportEl}>
    <div class="lyrics-track" style="top: {offsetY}px">
      {#each lyricLines as line, i}
        <span
          class="lyric-line"
          class:active={i === currentLineIdx}
          class:near={i === currentLineIdx - 1 || i === currentLineIdx + 1}
        >
          {line.text || '...'}
        </span>
      {/each}
    </div>
  </div>
{:else if lyricsText}
  <span class="lyric-plain">{lyricsText.split('\n')[0]}</span>
{:else}
  <span class="lyric-empty">No lyrics</span>
{/if}

<style>
  .lyrics-viewport {
    overflow: hidden;
    height: 100%;
    width: 100%;
    position: relative;
  }

  .lyrics-track {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: absolute;
    left: 0;
    right: 0;
    transition: top 0.4s ease;
  }

  .lyric-line {
    height: 18px;
    line-height: 18px;
    font-size: 0.7rem;
    color: transparent;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    text-align: center;
    transition: color 0.35s ease, opacity 0.35s ease, font-size 0.35s ease;
  }

  .lyric-line.active {
    font-size: 0.85rem;
    color: var(--accent);
    font-weight: 600;
  }

  .lyric-line.near {
    color: var(--text-muted);
    opacity: 0.45;
    font-size: 0.7rem;
  }

  .lyric-plain {
    font-size: 0.75rem;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    text-align: center;
  }

  .lyric-empty {
    font-size: 0.8rem;
    color: var(--text-muted);
  }
</style>
