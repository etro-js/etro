import { DOMViewOptions } from '../../../src/view'
import { mockCanvas, mockRenderingContext2D, mockWebGL } from './dom'

export function mockDOMView (options: DOMViewOptions = {}) {
  const view = jasmine.createSpyObj('View', [
    'finish',
    'flush',
    'readPixels',
    'resize',
    'useGL',
    'use2D'
  ])

  view.useGL.and.returnValue(mockWebGL())
  view.use2D.and.returnValue(mockRenderingContext2D())

  view.width = options.width ?? 100
  view.height = options.height ?? 100
  view.output = mockCanvas()

  if (options.staticOutput)
    view.staticOutput = mockCanvas()

  return view
}
