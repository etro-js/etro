import { ViewOptions } from '../../../src/view'
import { mockBitmap, mockCanvas, mockRenderingContext2D, mockWebGL } from './dom'

export function mockView (options: ViewOptions = {}) {
  const view = jasmine.createSpyObj('View', [
    'finish',
    'output',
    'readPixels',
    'renderStatic',
    'resize',
    'useGL',
    'use2D'
  ])

  view.output.and.returnValue(mockBitmap())
  view.useGL.and.returnValue(mockWebGL())
  view.use2D.and.returnValue(mockRenderingContext2D())

  view.width = options.width ?? 100
  view.height = options.height ?? 100

  if (options.staticOutput)
    view.staticOutput = mockCanvas()

  return view
}
