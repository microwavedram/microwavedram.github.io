// hi :)
// you should totally come dm me @microwavedram
// this code is 1/10 dont judge me too hard

const DEFAULT_ZOOM_LEVEL = -400
const ZOOM_MIN = -100000
const ZOOM_MAX = 100000
const ZOOM_SENS = 0.1

const loading = new Image()
loading.src = "assets/loading.png"

const crosshair = document.getElementById("crosshair")
const rightheader = document.getElementById("rightheader")

function roundNtoNearestX(n, x) {
	return Math.round(n / x) * x
}

class Tile {
	constructor(x, y, s, url) {
		this.x = x
		this.y = y
		this.s = s

		this.image = null
		this.url = url
		this.hasLoaded = false
	}

	load() {
		this.image = new Image()
		this.image.src = this.url
		this.hasLoaded = true
	}
}

class WorldMap {
	constructor(canvas) {
		this.mx = 0
		this.my = 0

		this.zoom_level = DEFAULT_ZOOM_LEVEL
		this.scale_factor = 1
		this.zoom_x = 0
		this.zoom_y = 0

		this.canvas = canvas
		this.context = canvas.getContext("2d")

		this.lod = 3

		this.mouse_x = 0
		this.mouse_y = 0

		this.dragging = false

		this.drag_begin_mouse_x = 0
		this.drag_begin_mouse_y = 0

		this.drag_begin_map_x = 0
		this.drag_begin_map_y = 0

		this.tiles = null
		this.markers = []
		this.claims = []

		this.zooming = false
		this.zoom_1x = 0
		this.zoom_1y = 0
		this.zoom_2x = 0
		this.zoom_2y = 0

		this.zoomdelta_begin = 0
		this.zoom_prev = 0

		this.hovered_nation = null
		this.selected_nation = null
		this.click_nation = null
		this.click_x = 0
		this.click_y = 0

		this.quadtree = new Quadtree({
			x: -10000,
			y: -10000,
			width: 20000,
			height: 20000,
		})

		this.grid_size = 16
	}

	async #setupTiles() {
		const tiles = await fetch("tiles.json")

		if (tiles.status == 200) {
			const tile_map = await tiles.json()

			this.tiles = {}

			for (let [lod, tilenames] of Object.entries(tile_map)) {
				const lod_id = parseInt(lod.charAt(4))

				const out = []

				for (let i = 0; i < tilenames.length; i++) {
					const tilename = tilenames[i]
					const [x, y] = tilename
						.substring(0, tilename.length - 4)
						.split("_")

					out.push(
						new Tile(
							parseInt(x),
							parseInt(y),
							1024 * Math.pow(2, lod_id),
							`tiles/${lod}/${tilename}`
						)
					)
				}

				this.tiles[lod_id] = out
			}
		}
	}

	async #pullResources() {
		const markers = await fetch("markers.json")

		if (markers.status == 200) {
			this.markers = await markers.json()
		}

		const claims = await fetch("claims.json")

		if (claims.status == 200) {
			this.claims = await claims.json()

			for (const [name, claim] of Object.entries(this.claims)) {
				const { chunks, color } = claim

				let ax =
					chunks
						.map((position) => position[0])
						.reduce((acc, x) => acc + x) / chunks.length
				let ay =
					chunks
						.map((position) => position[1])
						.reduce((acc, x) => acc + x) / chunks.length

				const QUAD_RADIUS = 1

				this.quadtree.insert({
					x: ax - QUAD_RADIUS,
					y: ay - QUAD_RADIUS,
					width: QUAD_RADIUS * 2,
					height: QUAD_RADIUS * 2,
					id: name,
				})
			}
		}
	}

	init() {
		const width = document.body.clientWidth
		const height = document.body.clientHeight

		this.zoom_x = 0
		this.zoom_y = 0

		this.setZoomLevel(this.zoom_level)
		this.#pullResources()
		this.#setupTiles()

		addEventListener("mousedown", (event) => {
			if (event.target != this.canvas && event.target != rightheader)
				return

			this.click_nation = this.hovered_nation

			this.drag_begin_mouse_x = event.x
			this.drag_begin_mouse_y = event.y

			this.drag_begin_map_x = this.mx
			this.drag_begin_map_y = this.my

			this.dragging = true
		})

		addEventListener("touchstart", (event) => {
			if (event.target != this.canvas && event.target != rightheader)
				return

			if (event.touches.length == 2) {
				this.zoom_prev = this.zoom_level
				this.zooming = true
				this.zoom_1x = event.touches[0].screenX
				this.zoom_1y = event.touches[0].screenY
				this.zoom_2x = event.touches[1].screenX
				this.zoom_2y = event.touches[1].screenY

				this.zoomdelta_begin = Math.sqrt(
					(this.zoom_1x - this.zoom_2x) *
						(this.zoom_1x - this.zoom_2x) +
						(this.zoom_1y - this.zoom_2y) *
							(this.zoom_1y - this.zoom_2y)
				)
				return
			}

			this.click_nation = this.hovered_nation

			this.drag_begin_mouse_x = event.touches[0].screenX
			this.drag_begin_mouse_y = event.touches[0].screenY

			this.drag_begin_map_x = this.mx
			this.drag_begin_map_y = this.my

			this.dragging = true
		})

		addEventListener("mouseup", (event) => {
			this.dragging = false

			if (
				this.hovered_nation == this.click_nation &&
				this.drag_begin_mouse_x == this.mouse_x &&
				this.drag_begin_mouse_y == this.mouse_y
			) {
				this.selected_nation = this.click_nation
				setSelectedNation(this.selected_nation)
			}

			this.click_nation = null
		})

		addEventListener("touchend", (event) => {
			this.zooming = false
			this.dragging = false

			if (
				this.hovered_nation == this.click_nation &&
				this.drag_begin_mouse_x == this.mouse_x &&
				this.drag_begin_mouse_y == this.mouse_y
			) {
				this.selected_nation = this.click_nation
				setSelectedNation(this.selected_nation)
			}
			this.click_nation = null
		})

		addEventListener("touchcancel", (event) => {
			this.zooming = false
			this.dragging = false

			if (
				this.hovered_nation == this.click_nation &&
				this.drag_begin_mouse_x == this.mouse_x &&
				this.drag_begin_mouse_y == this.mouse_y
			) {
				this.selected_nation = this.click_nation
				setSelectedNation(this.selected_nation)
			}

			this.click_nation = null
		})

		addEventListener("mousemove", (event) => {
			event.preventDefault()

			this.mouse_x = event.x
			this.mouse_y = event.y

			if (this.dragging) {
				const dx = event.x - this.drag_begin_mouse_x
				const dy = event.y - this.drag_begin_mouse_y

				this.mx = this.drag_begin_map_x + dx * (1 / map.scale_factor)
				this.my = this.drag_begin_map_y + dy * (1 / map.scale_factor)
			}
		})

		addEventListener("touchmove", (event) => {
			this.mouse_x = event.touches[0].screenX
			this.mouse_y = event.touches[0].screenY

			if (this.zooming && event.touches.length == 2) {
				const delta =
					this.zoomdelta_begin -
					Math.sqrt(
						(event.touches[0].screenX - event.touches[1].screenX) *
							(event.touches[0].screenX -
								event.touches[1].screenX) +
							(event.touches[0].screenY -
								event.touches[1].screenY) *
								(event.touches[0].screenY -
									event.touches[1].screenY)
					)

				this.setZoomLevel(this.zoom_prev - delta * 0.5)
			}

			if (this.dragging) {
				const dx = event.touches[0].screenX - this.drag_begin_mouse_x
				const dy = event.touches[0].screenY - this.drag_begin_mouse_y

				this.mx = this.drag_begin_map_x + dx * (1 / map.scale_factor)
				this.my = this.drag_begin_map_y + dy * (1 / map.scale_factor)
			}
		})

		addEventListener("wheel", (event) => {
			if (event.target != this.canvas && event.target != rightheader)
				return

			this.setZoomLevel(
				Math.max(
					ZOOM_MIN,
					Math.min(
						ZOOM_MAX,
						this.zoom_level - event.deltaY * ZOOM_SENS
					)
				)
			)
		})

		addEventListener("keydown", (event) => {
			if (event.key == "-") {
				this.setZoomLevel(
					Math.max(
						ZOOM_MIN,
						Math.min(ZOOM_MAX, this.zoom_level - 1000 * ZOOM_SENS)
					)
				)
			}
			if (event.key == "=") {
				this.setZoomLevel(
					Math.max(
						ZOOM_MIN,
						Math.min(ZOOM_MAX, this.zoom_level + 1000 * ZOOM_SENS)
					)
				)
			}
		})
	}

	toScreenSpace([wx, wy]) {
		return [
			(wx + this.mx - this.zoom_x) * this.scale_factor +
				this.zoom_x +
				this.width / 2,
			(wy + this.my - this.zoom_y) * this.scale_factor +
				this.zoom_y +
				this.height / 2,
		]
	}

	toWorldSpace([sx, sy]) {
		return [
			(sx - this.zoom_x - this.width / 2) / this.scale_factor +
				this.zoom_x -
				this.mx,
			(sy - this.zoom_y - this.height / 2) / this.scale_factor +
				this.zoom_y -
				this.my,
		]
	}

	isOnScreen([sx, sy]) {
		return sx >= 0 && sx <= this.width && sy >= 0 && sy <= this.height
	}

	draw() {
		this.width = document.body.clientWidth
		this.height = document.body.clientHeight

		this.canvas.width = this.width
		this.canvas.height = this.height

		this.context.fillStyle = "rgba(255,255,255,1)"
		this.context.strokeStyle = "rgba(255,255,255,1)"
		this.context.font = "15px Arial"

		const crosshair_pos = this.toWorldSpace([
			this.width / 2,
			this.height / 2,
		])
		const mouse_world_pos = this.toWorldSpace([this.mouse_x, this.mouse_y])
		crosshair.innerHTML = `(${crosshair_pos.map(Math.floor)})`

		if (this.tiles != null) {
			const tiles = this.tiles[this.lod]

			this.#setInterpolation(false)
			for (let i = 0; i < tiles.length; i++) {
				const tile = tiles[i]

				const [x1, y1] = this.toScreenSpace([tile.x, tile.y])

				if (
					x1 > -tile.s * this.scale_factor &&
					x1 < this.width &&
					y1 > -tile.s * this.scale_factor &&
					y1 < this.height
				) {
					if (tile.hasLoaded) {
						if (
							tile.image.complete &&
							tile.image.naturalWidth > 0
						) {
							this.context.drawImage(
								tile.image,
								x1,
								y1,
								tile.s * this.scale_factor,
								tile.s * this.scale_factor
							)
						} else {
							this.context.drawImage(
								loading,
								x1,
								y1,
								tile.s * this.scale_factor,
								tile.s * this.scale_factor
							)
						}
					} else {
						tile.load()
					}
				}
			}
			this.#setInterpolation(true)
		}

		if (this.markers.length > 0) {
			for (let i = 0; i < this.markers.length; i++) {
				const { name, pos } = this.markers[i]

				this.#drawCircle(5, pos)
				this.#drawText(name, pos, [8, 3])
			}
		}

		const elements = this.quadtree.retrieve({
			x: mouse_world_pos[0] - 10,
			y: mouse_world_pos[1] - 10,
			width: 20,
			height: 20,
		})
		const lookup = {}

		let closest = undefined
		let current_dist = 10000

		const map = new Set(
			elements.map((element) => {
				const dist =
					Math.pow(element.x - mouse_world_pos[0], 2) +
					Math.pow(element.y - mouse_world_pos[1], 2)

				if (dist < current_dist) {
					closest = element.id
					current_dist = dist
				}

				return element.id
			})
		)
		if (Object.keys(this.claims).length > 0) {
			for (const [name, claim] of Object.entries(this.claims)) {
				const { chunks, color } = claim

				let root_c = color.join(",")

				if (name == closest) {
					root_c = "255,255,255"
					this.hovered_nation = name
				}
				if (name == this.selected_nation) {
					root_c = "0,255,255"
				}

				let ax =
					chunks
						.map((position) => position[0])
						.reduce((acc, x) => acc + x) / chunks.length
				let ay =
					chunks
						.map((position) => position[1])
						.reduce((acc, x) => acc + x) / chunks.length

				this.context.strokeStyle = `rgba(${root_c},1)`
				this.context.fillStyle = `rgba(${root_c},0.5)`

				this.context.beginPath()
				this.context.moveTo(...this.toScreenSpace(chunks[0]))

				chunks.forEach((position) => {
					this.context.lineTo(...this.toScreenSpace(position))
				})
				this.context.lineTo(...this.toScreenSpace(chunks[0]))

				if (this.lod == 0) {
					this.context.stroke()
				} else {
					this.context.fill()
				}

				if (this.lod <= 1) {
					let [tlx, tly] = this.toScreenSpace([ax, ay])
					const { width } = this.context.measureText(name)

					tlx += 7
					tly += 5

					const h = 15

					this.context.fillStyle = `rgba(0,0,0,1)`
					this.context.beginPath()
					this.context.moveTo(tlx, tly)
					this.context.lineTo(tlx + width + 1, tly)
					this.context.lineTo(tlx + width + 1, tly - h)
					this.context.lineTo(tlx, tly - h)
					this.context.lineTo(tlx, tly)
					this.context.fill()

					this.context.fillStyle = `rgba(${root_c},1)`

					this.#drawCircle(5, [ax, ay])
					this.#drawText(name, [ax, ay], [8, 3])
				}
			}
		}

		this.context.strokeStyle = "rgba(255,255,255,1)"
		this.context.strokeWidth = 2
		const TL = this.toScreenSpace([-11838.51672363281, -9999.27808535099])
		const BR = this.toScreenSpace([8161.48327636719, 10000.72191464901])

		this.context.beginPath()
		this.context.moveTo(TL[0], TL[1])
		this.context.lineTo(BR[0], TL[1])
		this.context.lineTo(BR[0], BR[1])
		this.context.lineTo(TL[0], BR[1])
		this.context.lineTo(TL[0], TL[1])
		this.context.stroke()

		this.context.strokeStyle = "rgba(255,255,255,0.3)"

		let GRID_TL = this.toWorldSpace([0, 0])
		let GRID_BR = this.toWorldSpace([this.width, this.height])

		GRID_TL = GRID_TL.map((n) => roundNtoNearestX(n, this.grid_size))
		GRID_BR = GRID_BR.map((n) => roundNtoNearestX(n, this.grid_size))

		for (let x = GRID_TL[0]; x < GRID_BR[0]; x += this.grid_size) {
			const [sx, _] = this.toScreenSpace([x, 0])

			this.context.beginPath()
			this.context.moveTo(sx, 0)
			this.context.lineTo(sx, this.height)
			this.context.stroke()
		}

		for (let y = GRID_TL[1]; y < GRID_BR[1]; y += this.grid_size) {
			const [_, sy] = this.toScreenSpace([0, y])

			this.context.beginPath()
			this.context.moveTo(0, sy)
			this.context.lineTo(this.width, sy)
			this.context.stroke()
		}

		requestAnimationFrame(() => this.draw())
	}

	setZoomLevel(level) {
		this.zoom_level = level
		if (level > 0) {
			this.lod = 0
			this.grid_size = 16
		} else if (level > -100) {
			this.lod = 1
			this.grid_size = 64
		} else if (level > -200) {
			this.lod = 2
			this.grid_size = 512
		} else {
			this.lod = 3
			this.grid_size = 2048
		}
		this.scale_factor = Math.pow(1.1, level / 10)
	}

	#setInterpolation(state) {
		this.context.webkitImageSmoothingEnabled = state
		this.context.mozImageSmoothingEnabled = state
		this.context.imageSmoothingEnabled = state
	}

	#drawImage(image, [wx, wy], [w, h]) {
		const [sx, sy] = this.toScreenSpace([wx, wy])

		this.context.drawImage(image, sx, sy, w, h)
	}

	#drawCircle(radius, [wx, wy]) {
		const [sx, sy] = this.toScreenSpace([wx, wy])

		this.context.beginPath()
		this.context.moveTo(sx, sy)
		this.context.arc(sx, sy, radius, 0, Math.PI * 2)
		this.context.fill()
	}

	#drawText(text, [wx, wy], offset) {
		offset = offset || [0, 0]

		const [sx, sy] = this.toScreenSpace([wx, wy])

		this.context.fillText(text, sx + offset[0], sy + offset[1])
	}
}

const header = document.getElementsByClassName("leftheader")[0]
const hide_header_button = document.getElementById("hide_header")

hide_header_button.onclick = () => (header.style.display = "none")

const canvas = document.getElementById("canvas")

const map = new WorldMap(canvas)
map.init()
map.draw()

window.map = map

addEventListener("click", (e) => {
	if (e.target.id == "teleport") {
		const positions = map.claims[e.target.name].chunks

		if (positions) {
			let ax =
				positions
					.map((position) => position[0])
					.reduce((acc, x) => acc + x) / positions.length
			let ay =
				positions
					.map((position) => position[1])
					.reduce((acc, x) => acc + x) / positions.length

			map.zoom_level = 100
			map.setZoomLevel(100)
			map.lod = 0

			map.mx = -ax
			map.my = -ay + 10
		}
	}
})
