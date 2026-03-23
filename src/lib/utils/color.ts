/** Extract the dominant color from an image URL using a small canvas sample */
export function extractDominantColor(url: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const size = 16
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, size, size)
      const data = ctx.getImageData(0, 0, size, size).data

      let r = 0, g = 0, b = 0, count = 0
      for (let i = 0; i < data.length; i += 4) {
        // Skip very dark and very light pixels
        const pr = data[i]!, pg = data[i + 1]!, pb = data[i + 2]!
        const brightness = (pr + pg + pb) / 3
        if (brightness > 30 && brightness < 220) {
          r += pr; g += pg; b += pb; count++
        }
      }

      if (count === 0) {
        resolve('rgb(60, 60, 60)')
        return
      }

      r = Math.round(r / count)
      g = Math.round(g / count)
      b = Math.round(b / count)
      resolve(`rgb(${r}, ${g}, ${b})`)
    }
    img.onerror = () => resolve('rgb(60, 60, 60)')
    img.src = url
  })
}
