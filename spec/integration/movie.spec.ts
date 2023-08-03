import etro from '../../src/index'

/**
 * Resolves to true if the audio is completely silent.
 * @param audio
 * @returns
 */
async function isAudioSilent (audio: HTMLAudioElement) {
  // Set up audio context
  const audioCtx = new AudioContext()
  const source = audioCtx.createMediaElementSource(audio)
  const analyser = audioCtx.createAnalyser()
  source.connect(analyser)
  analyser.connect(audioCtx.destination)

  // Play audio
  audio.play()
  if (!audio.paused) {
    await new Promise<void>(resolve => {
      audio.addEventListener('pause', () => {
        resolve()
      })
    })
  }

  // Check if audio is silent
  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  analyser.getByteTimeDomainData(dataArray)
  return dataArray.every(x => x === 128)
}

describe('Integration Tests ->', function () {
  describe('Movie', function () {
    let movie: etro.Movie
    let canvas: HTMLCanvasElement

    beforeEach(function () {
      if (canvas) {
        document.body.removeChild(canvas)
      }

      canvas = document.createElement('canvas')
      // Resolutions lower than 20x20 result in empty blobs.
      canvas.width = 20
      canvas.height = 20
      document.body.appendChild(canvas)

      movie = new etro.Movie({ canvas, background: new etro.Color(0, 0, 255) })
      movie.addLayer(new etro.layer.Visual({ startTime: 0, duration: 0.8 }))
    })

    describe('playback ->', function () {
      it('should produce audio when recording', async function () {
        // Remove all existing layers (optional)
        movie.layers.length = 0

        // Add an audio layer
        const audio = new Audio('/base/spec/assets/layer/audio.wav')
        await new Promise(resolve => {
          audio.onloadeddata = resolve
        })
        const layer = new etro.layer.Audio({
          source: audio,
          startTime: 0
        })
        movie.layers.push(layer)

        // Record audio
        const blob = await movie.record({
          frameRate: 30,
          video: false,
          type: 'audio/ogg'
        })

        // Make sure the audio blob is not empty
        expect(blob.size).toBeGreaterThan(0)

        // Load blob into html audio element
        const audioElement = document.createElement('audio')
        audioElement.src = URL.createObjectURL(blob)
        await new Promise<void>(resolve => {
          audioElement.addEventListener('canplaythrough', () => {
            resolve()
          })
        })

        // Make sure the audio is not completely silent
        expect(await isAudioSilent(audioElement)).toBe(false)

        // Clean up
        URL.revokeObjectURL(audioElement.src)
      })

      it('should produce audio when recording twice', async function () {
        // Remove all existing layers (optional)
        movie.layers.length = 0

        // Add an audio layer
        const audio = new Audio('/base/spec/assets/layer/audio.wav')
        await new Promise(resolve => {
          audio.onloadeddata = resolve
        })
        const layer = new etro.layer.Audio({
          source: audio,
          startTime: 0
        })
        movie.layers.push(layer)

        // Record audio
        await movie.record({
          frameRate: 30,
          video: false,
          type: 'audio/ogg'
        })
        const blob = await movie.record({
          frameRate: 30,
          video: false,
          type: 'audio/ogg'
        })

        // Make sure the audio blob is not empty
        expect(blob.size).toBeGreaterThan(0)

        // Load blob into html audio element
        const audioElement = document.createElement('audio')
        audioElement.src = URL.createObjectURL(blob)
        await new Promise<void>(resolve => {
          audioElement.addEventListener('canplaythrough', () => {
            resolve()
          })
        })

        // Make sure the audio is not completely silent
        expect(await isAudioSilent(audioElement)).toBe(false)

        // Clean up
        URL.revokeObjectURL(audioElement.src)
      })
    })
  })
})
