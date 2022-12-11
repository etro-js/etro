import etro from 'etro'

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t
}

function lerpColors(color1: etro.Color, color2: etro.Color, t: number): etro.Color {
	return new etro.Color(
		lerp(color1.r, color2.r, t),
		lerp(color1.g, color2.g, t),
		lerp(color1.b, color2.b, t),
		lerp(color1.a, color2.a, t),
	)
}

function createVisualLayer(shaderEffectCount: number, transformEffectCount: number, useViews: boolean): etro.layer.Visual {
	const color1 = new etro.Color(255, 0, 0)
	const color2 = new etro.Color(0, 0, 255)

	const view = useViews ? new etro.view.View() : undefined

	const layer = new etro.layer.Visual({
		startTime: 0,
		duration: Infinity,
		background: (_: etro.EtroObject, time: number) => lerpColors(color1, color2, Math.sin(time * 3) / 2 + 0.5),
		view,
	})

	for (let i = 0; i < shaderEffectCount; i++)
		layer.effects.push(new etro.effect.Shader())

	for (let i = 0; i < transformEffectCount; i++) {
		const effect = new etro.effect.Transform({
			matrix: new etro.effect.Transform.Matrix(),
		})
		layer.effects.push(effect)
	}

	return layer
}

function createMovie(layerCount: number, shaderEffectCount: number, transformEffectCount: number, useViews: boolean): etro.Movie {
	const canvas = document.createElement('canvas')
	canvas.width = window.innerWidth
	canvas.height = window.innerHeight
	document.body.appendChild(canvas)

	const view = useViews ? new etro.view.View({
		staticOutput: canvas,
	}) : undefined

	const movie = new etro.Movie({
		canvas: !useViews ? canvas : undefined,
		view,
	})

	for (let i = 0; i < layerCount; i++) {
		const layer = createVisualLayer(shaderEffectCount, transformEffectCount, useViews)
		movie.layers.push(layer)
	}

	return movie
}

async function start(): Promise<void> {
	if (movie) {
		movie.stop()

		const canvas = movie.view ? movie.view.staticOutput : movie.canvas
		document.body.removeChild(canvas)
	}

	const layerCount = parseInt(prompt('How many layers?', '1')!)
	const effectCount = parseInt(prompt('How many effects per layer?', '0')!)
	const effectType = effectCount ? parseInt(prompt('Effect type (0 = shader, 1 = transform)', '0')!) : 0
	const useViews = parseInt(prompt('Use views? (0 = no, 1 = yes)', '0')!) === 1

	const shaderEffectCount = effectType === 0 ? effectCount : 0
	const transformEffectCount = effectType === 1 ? effectCount : 0

	movie = createMovie(layerCount, shaderEffectCount, transformEffectCount, useViews)
	await movie.play()
}

let movie: etro.Movie | undefined

window.addEventListener('click', () => {
	start()
})

window.addEventListener('touchstart', () => {
	start()
})

window.addEventListener('keydown', (event: KeyboardEvent) => {
	if (event.key === 'Enter' || event.key === ' ')
		start()
})
