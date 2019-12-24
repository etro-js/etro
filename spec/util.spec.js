describe('Util', function () {
  describe('applyOptions', function () {
    it('should not apply any options with no provided or default options', function () {
      const vdobj = {
        getDefaultOptions () {
          return {}
        }
      }
      const snapshot = { ...vdobj } // store state before applying options
      vd.applyOptions({}, vdobj)
      expect(vdobj).toEqual(snapshot) // should be the same as it was
    })

    it('should apply default options', function () {
      const vdobj = {
        getDefaultOptions () {
          return defaultOpt
        }
      }
      const snapshot = { ...vdobj } // store state before applying options
      const defaultOpt = { foo: 1 }
      vd.applyOptions({}, vdobj)
      expect(vdobj).toEqual({ ...defaultOpt, ...snapshot }) // defaultOpt should be applied to vdobj
    })

    it('should not override provided options with default values', function () {
      const vdobj = {
        getDefaultOptions () {
          return { foo: 1 }
        }
      }
      const providedOpt = { foo: 2 }
      vd.applyOptions(providedOpt, vdobj)
      expect(vdobj.foo).toBe(providedOpt.foo)
    })

    it('should not override existing object state', function () {
      const vdobj = {
        foo: 0,
        getDefaultOptions () {
          return { foo: 1 }
        }
      }
      const originalFoo = vdobj.foo
      vd.applyOptions({ foo: 2 }, vdobj)
      expect(vdobj.foo).toBe(originalFoo)
    })

    it('should not allow arbitrary options', function () {
      const vdobj = {
        getDefaultOptions () {
          return {}
        }
      }
      expect(() => vd.applyOptions({ foo: null }, vdobj).toThrow(new Error("Invalid option: 'foo'")))
    })
  })

  describe('val', function () {
    it('should work on simple values', function () {
      const elem = { prop: 'value', _propertyFilters: {} }
      expect(vd.val(elem, 'prop', 0)).toBe(elem.prop)
    })

    it('should interpolate keyframes', function () {
      const elem = {
        prop: { 0: 0, 4: 1 },
        _propertyFilters: {}
      }
      for (let i = 0; i <= 4; i += Math.random()) {
        expect(vd.val(elem, 'prop', i)).toBe(i / 4)
      }
    })

    it('should work with noninterpolated keyframes', function () {
      const elem = {
        prop: { 0: 'start', 4: 'end' },
        _propertyFilters: {}
      }
      expect(vd.val(elem, 'prop', 0)).toBe(elem.prop[0])
      expect(vd.val(elem, 'prop', 3)).toBe(elem.prop[0])
      expect(vd.val(elem, 'prop', 4)).toBe(elem.prop[4])
    })

    it('should call property filters', function () {
      const elem = {
        prop: 'value',
        _propertyFilters: {
          prop: () => 'new value'
        }
      }
      expect(vd.val(elem, 'prop', 0)).toBe('new value')
    })
  })

  describe('linearInterp', function () {
    it('should interpolate numbers', function () {
      expect(vd.linearInterp(5, 10, 0.5, undefined)).toBe(7.5)
    })

    it('should choose the first string', function () {
      expect(vd.linearInterp('hello', 'world', 0.5)).toBe('hello')
    })

    it('should interpolate objects recursively', function () {
      expect(vd.linearInterp(
        {
          foo: {
            bar: 0
          }
        },
        {
          foo: {
            bar: 100
          }
        },
        0.5,
        undefined
      )).toEqual(
        {
          foo: {
            bar: 50
          }
        }
      )
    })
  })

  describe('cosineInterp', function () {
    it('should interpolate numbers', function () {
      const x1 = 5
      const x2 = 10
      const t = 0.5
      const cos = Math.cos(t * Math.PI / 2)
      expect(vd.cosineInterp(x1, x2, t, undefined))
        .toBe(cos * x1 + (1 - cos) * x2)
    })

    it('should choose the first string', function () {
      expect(vd.linearInterp('hello', 'world', 0.5)).toBe('hello')
    })

    it('should interpolate objects recursively', function () {
      expect(vd.cosineInterp(
        {
          foo: {
            bar: 0
          }
        },
        {
          foo: {
            bar: 100
          }
        },
        0.5,
        undefined
      )).toEqual(
        {
          foo: {
            bar: (1 - Math.cos(0.5 * Math.PI / 2)) * 100
          }
        }
      )
    })
  })

  describe('Color ->', function () {
    it('toString() should convert to RGBA', function () {
      expect(new vd.Color(255, 0, 255, 0.5).toString())
        .toBe('rgba(255, 0, 255, 0.5)')
    })
  })

  describe('parseColor', function () {
    it('should parse RGB colors', function () {
      expect(vd.parseColor('rgb(255,0,0)'))
        .toEqual(new vd.Color(255, 0, 0))
    })

    it('should parse RGBA colors', function () {
      expect(vd.parseColor('rgba(0,255,0,1)'))
        .toEqual(new vd.Color(0, 255, 0, 1))
    })

    it('should parse hex colors', function () {
      expect(vd.parseColor('#00f'))
        .toEqual(new vd.Color(0, 0, 255))
    })

    it('should parse named colors', function () {
      expect(vd.parseColor('blue'))
        .toEqual(new vd.Color(0, 0, 255))
    })
  })

  describe('Font ->', function () {
    it('toString() should convert to CSS font', function () {
      expect(new vd.Font(16, 'px', 'monospace').toString())
        .toBe('16px monospace')
    })
  })

  describe('parseFont', function () {
    it('should parse CSS fonts', function () {
      expect(vd.parseFont('16em monospace'))
        .toEqual(new vd.Font(16, 'em', 'monospace'))
    })

    it('should work with multiple word fonts', function () {
      expect(vd.parseFont('16px "Times New Roman"'))
        .toEqual(new vd.Font(16, 'px', '"Times New Roman"'))
    })
  })

  describe('watchPublic', function () {
    it('should watch public properties', function () {
      const element = vd.watchPublic({
        // mock vidar element
        _publicExcludes: [],
        _type: 'test'
      })
      element.foo = 0 // intiialize (must be after watchPublic)
      const history = []
      vd.event.subscribe(element, 'test.change.modify', event => history.push(event))

      element.foo = 1
      expect(history).toEqual([
        {
          target: element,
          type: 'test.change.modify',
          property: 'foo',
          newValue: 1
        }
      ])
    })

    it("should watch recursive modifications that don't change the schema", function () {
      const element = vd.watchPublic({
        _publicExcludes: [],
        _type: 'test'
      })
      element.foo = { bar: 0 } // intiialize (must be after watchPublic)
      const history = []
      vd.event.subscribe(element, 'test.change.modify', event => history.push(event))

      element.foo.bar = 1
      expect(history).toEqual([
        {
          target: element,
          type: 'test.change.modify',
          property: 'foo.bar',
          newValue: 1
        }
      ])
    })

    it('should watch recursive modifications that change the schema', function () {
      const element = vd.watchPublic({
        _publicExcludes: [],
        _type: 'test'
      })
      element.foo = {} // intiialize (must be after watchPublic)
      const history = []
      vd.event.subscribe(element, 'test.change.modify', event => history.push(event))

      element.foo.bar = 1
      expect(history).toEqual([
        {
          target: element,
          type: 'test.change.modify',
          property: 'foo.bar',
          newValue: 1
        }
      ])
    })
  })
})
