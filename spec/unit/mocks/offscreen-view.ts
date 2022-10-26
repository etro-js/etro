import { OffscreenViewOptions } from '../../../src/view'
import { mockCanvas, mockRenderingContext2D, mockWebGL } from './dom'

export function mockOffscreenView (options: OffscreenViewOptions = {}) {
  const view = jasmine.createSpyObj('View', [
    'finish',
    'readPixels',
    'renderStatic',
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
