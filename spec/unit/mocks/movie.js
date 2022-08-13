// eslint-disable-next-line no-unused-vars
function mockMovie () {
  const movie = jasmine.createSpyObj('movie', [
    'foo'
    // 'addLayer',
    // 'addEffect',
    // 'play',
    // 'pause',
    // 'stop',
    // 'refresh'
  ])
  // movie.type = 'movie'
  // movie.publicExcludes = []
  movie.propertyFilters = {}

  // movie.repeat = false
  // movie.autoRefresh = true
  // movie.background = '#000000'
  movie.actx = mockAudioContext()
  movie.canvas = mockCanvas()
  movie.cctx = movie.canvas.getContext('2d')
  movie.movie = movie

  movie.currentTime = 0
  movie.duration = 1
  movie.canvas.width = 100
  movie.canvas.height = 100
  return movie
}
