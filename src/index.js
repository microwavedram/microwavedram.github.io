let grid_spacing = 16

class WorldMap {

    ctx;

    constructor(canvas) {
        this.canvas = canvas
        this.ctx = canvas.getContext("2d")

        this.z = 1
        this.px = 0
        this.py = 0

        this.tiles = {}
    }

    cacheTiles() {
        fetch("tiles.json").then(async response => {
            const tilenames = await response.json()

            tilenames.forEach(name => {
                const image = new Image()
                image.src = `tiles/${name}`
                
                let [x, y] = name.substring(-3).split("_")
                x = parseInt(x)
                y = parseInt(y)
                this.tiles[name] = {
                    x: x,
                    y: y,
                    image: image
                }
            })
        }).catch(console.error)
    }

    draw() {
        this.canvas.width = document.body.clientWidth;
        this.canvas.height = document.body.clientHeight;

        const w = this.canvas.clientWidth
        const h = this.canvas.clientHeight

        for (const tile of Object.values(this.tiles)) {
            this.ctx.drawImage(
                tile.image,
                (tile.x + this.px - (w / 2)) * this.z + (w / 2),
                (tile.y + this.py - (h / 2)) * this.z + (h / 2),
                tile.image.naturalHeight * this.z,
                tile.image.naturalWidth * this.z
            )
        }

        this.ctx.strokeStyle = "rgba(255,255,255,0.4)"
        this.ctx.strokeWidth = 1

        // Columns
        const columns = Math.ceil(((w / this.z) / grid_spacing)/2)
        for (let x = 0; x < w / this.z + grid_spacing; x += grid_spacing) {
            this.ctx.beginPath()
            this.ctx.moveTo((x + ((this.px - (w / 2)) % grid_spacing) - columns * grid_spacing) * this.z + (w / 2), 0)
            this.ctx.lineTo((x + ((this.px - (w / 2)) % grid_spacing) - columns * grid_spacing) * this.z + (w / 2), h)
            this.ctx.stroke()
        }

        const rows = Math.ceil(((h / this.z) / grid_spacing)/2)        // Rows
        for (let y = 0; y < h / this.z + grid_spacing; y += grid_spacing) {
            this.ctx.beginPath()
            this.ctx.moveTo(0, (y + ((this.py - (h / 2)) % grid_spacing) - rows * grid_spacing) * this.z + (h / 2))
            this.ctx.lineTo(w, (y + ((this.py - (h / 2)) % grid_spacing) - rows * grid_spacing) * this.z + (h / 2))
            this.ctx.stroke()
        }

        requestAnimationFrame(() => this.draw())
    }

}


const canvas = document.getElementById("canvas")
canvas.imageSmoothingEnabled = false
const map = new WorldMap(canvas)
map.cacheTiles()
map.draw()

let drag_dx = 0
let drag_dy = 0
let drag_from_px = 0
let drag_from_py = 0
let dragging = false

let zoom_level = 0

addEventListener("mousedown", event => {
    drag_dx = event.x
    drag_dy = event.y
    drag_from_px = map.px
    drag_from_py = map.py
    dragging = true
})

addEventListener("mouseup", event => {
    dragging = false
})

addEventListener("mousemove", event => {
    if (dragging) {
        const dx = event.x - drag_dx
        const dy = event.y - drag_dy

        map.px = drag_from_px + (dx * (1/map.z))
        map.py = drag_from_py + (dy * (1/map.z))
    }
})

addEventListener("wheel", event => {
    zoom_level = Math.max(-2000, Math.min(3000, zoom_level - event.deltaY))
    
    map.z = Math.pow(1.1, (zoom_level/100))

    console.log(map.z)
    if (map.z >= 12) {
        grid_spacing = 1
    } else if (map.z >= 1.5) {
        grid_spacing = 16
    } else if (map.z > 0.5) {
        grid_spacing = 64
    } else {
        grid_spacing = 64 * 32
    }
})