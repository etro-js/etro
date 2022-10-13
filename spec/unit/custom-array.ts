import { CustomArray } from '../../src/custom-array'

describe('Unit Tests ->', function () {
  describe('CustomArray', function () {
    let listener
    let array: CustomArray<number>

    beforeEach(function () {
      listener = jasmine.createSpyObj('listener', ['onAdd', 'onRemove'])
      array = new CustomArray([1, 2, 3], listener)
    })

    it('should call onAdd when adding an item', function () {
      array.push(4)
      expect(listener.onAdd.calls.count()).toBe(4)
      expect(listener.onAdd).toHaveBeenCalledWith(4)
    })

    it('should call onRemove when removing an item', function () {
      array.pop()
      expect(listener.onRemove.calls.count()).toBe(1)
      expect(listener.onRemove).toHaveBeenCalledWith(3)
    })

    it('should call onRemove and onAdd when setting an item', function () {
      array[0] = 4
      expect(listener.onRemove).toHaveBeenCalledWith(1)
      expect(listener.onAdd).toHaveBeenCalledWith(4)
    })

    it('should implement common array methods correctly', function () {
      const calls = {
        concat: [[4, 5, 6]],
        every: [(_x: number) => true],
        includes: [1],
        pop: [],
        push: [6],
        unshift: [0]
      }

      for (const method in calls) {
        const args = calls[method]
        const copy = array.slice()
        const expectedResult = Array.prototype[method].apply(copy, args)
        const actualResult = array[method](...args)
        expect(actualResult).toEqual(expectedResult)
        expect(array).toEqual(copy)
      }
    })
  })
})
