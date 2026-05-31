import etro from '../../src/index'
import { deserializeProperty } from '../../src/util'

describe('Serialization', () => {
  let canvas: HTMLCanvasElement

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
  })

  it('should serialize and deserialize Color', () => {
    const color = new etro.Color(255, 0, 128, 0.5)
    const json = JSON.parse(JSON.stringify(color))
    expect(json).toEqual({
      type: 'Color',
      r: 255,
      g: 0,
      b: 128,
      a: 0.5
    })
    const deserialized = deserializeProperty(json)
    expect(deserialized instanceof etro.Color).toBe(true)
    expect(deserialized.r).toBe(255)
    expect(deserialized.g).toBe(0)
    expect(deserialized.b).toBe(128)
    expect(deserialized.a).toBe(0.5)
  })

  it('should serialize and deserialize Font', () => {
    const font = new etro.Font(16, 'px', 'sans-serif')
    const json = JSON.parse(JSON.stringify(font))
    expect(json).toEqual({
      type: 'Font',
      size: 16,
      sizeUnit: 'px',
      family: 'sans-serif',
      style: 'normal',
      variant: 'normal',
      weight: 'normal',
      stretch: 'normal',
      lineHeight: 'normal'
    })
    const deserialized = deserializeProperty(json)
    expect(deserialized instanceof etro.Font).toBe(true)
    expect(deserialized.size).toBe(16)
    expect(deserialized.family).toBe('sans-serif')
  })

  it('should serialize and deserialize KeyFrame', () => {
    const kf = new etro.KeyFrame([0, 10, etro.linearInterp], [5, 20])
    const json = JSON.parse(JSON.stringify(kf))
    expect(json.type).toBe('KeyFrame')
    expect(json.value).toEqual([
      [0, 10, 'linear'],
      [5, 20]
    ])
    const deserialized = deserializeProperty(json)
    expect(deserialized instanceof etro.KeyFrame).toBe(true)
    expect(deserialized.value[0][0]).toBe(0)
    expect(deserialized.value[0][1]).toBe(10)
    expect(deserialized.value[0][2]).toBe(etro.linearInterp)
  })

  it('should serialize and deserialize an entire Movie', () => {
    const movie = new etro.Movie({ canvas } as any)
    const layer = new etro.layer.Text({
      startTime: 0,
      duration: 10,
      text: 'Hello World',
      color: new etro.Color(255, 0, 0, 1)
    })
    const effect = new etro.effect.Brightness({ brightness: 2 })
    layer.addEffect(effect)
    movie.addLayer(layer)
    movie.addEffect(new etro.effect.Grayscale())

    const json = JSON.parse(JSON.stringify(movie))

    expect(json.type).toBe('movie')
    expect(json.layers.length).toBe(1)
    expect(json.effects.length).toBe(1)
    expect(json.layers[0].type).toBe('layer.Text')
    expect(json.layers[0].text).toBe('Hello World')
    expect(json.layers[0].color.type).toBe('Color')
    expect(json.layers[0].effects.length).toBe(1)
    expect(json.layers[0].effects[0].type).toBe('effect.Brightness')
    expect(json.effects[0].type).toBe('effect.Grayscale')

    const newCanvas = document.createElement('canvas')
    const deserialized = etro.Movie.fromJSON(json, newCanvas)

    expect(deserialized instanceof etro.Movie).toBe(true)
    expect(deserialized.layers.length).toBe(1)
    expect(deserialized.effects.length).toBe(1)

    const dLayer = deserialized.layers[0] as etro.layer.Text
    expect(dLayer instanceof etro.layer.Text).toBe(true)
    expect(dLayer.startTime).toBe(0)
    expect(dLayer.duration).toBe(10)
    expect(dLayer.text).toBe('Hello World')
    expect((dLayer.color as etro.Color).r).toBe(255)

    expect(dLayer.effects.length).toBe(1)
    expect(dLayer.effects[0] instanceof etro.effect.Brightness).toBe(true)

    expect(deserialized.effects[0] instanceof etro.effect.Grayscale).toBe(true)
  })
})
