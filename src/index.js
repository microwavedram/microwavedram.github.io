const MIN_ZOOM = -4000
const MAX_ZOOM = 4000
const DEFAULT_ZOOM = -3000


const HOST = "ws://nexus.cloudmc.uk:8080"

const api_input = document.getElementById("api-key")
const connect = document.getElementById("connect")
const disconnect = document.getElementById("disconnect")
const status_box = document.getElementById("status")

let ws

let grid_spacing = 64 * 32

let mousex = 0;
let mousey = 0;

let drag_dx = 0
let drag_dy = 0
let drag_from_px = 0
let drag_from_py = 0
let dragging = false

let zoom_level = 0

class WorldMap {

    ctx;

    constructor(canvas) {
        this.canvas = canvas
        this.ctx = canvas.getContext("2d")

        zoom_level = DEFAULT_ZOOM

        this.z = Math.pow(1.1, (DEFAULT_ZOOM/100))
        this.px = -(canvas.clientWidth)
        this.py = -(canvas.clientWidth)

        this.tiles = {}
        this.thumbs = {}

        this.markers = [
            {
                x: 0,
                y: 0,
                label: "World Origin"
            },
            {
                x: 8017,
                y: 7245,
                label: "Seraphia"
            },
            {
                x: 6483,
                y: 6322,
                label: "Celras"
            }
        ]
        this.players = {}
        this.claims = []
    }

    cacheClaims() {
        fetch("claims.json").then(async response => {
            const claims = await response.json()

            for (const [id, claim] of Object.entries(claims)) {

                const computed_edges = {}
                const edge_mappings = {}

                claim.chunks.forEach(chunk => {
                    const rx = chunk[0] * 16
                    const ry = chunk[1] * 16

                    const edges = [
                        [rx, ry, rx + 16, ry],
                        [rx, ry, rx, ry + 16],
                        [rx, ry + 16, rx + 16, ry + 16],
                        [rx + 16, ry, rx + 16, ry + 16],
                    ]

                    edges.forEach(pos => {
                        const i = `${pos[0]},${pos[1]}:${pos[2]},${pos[3]}`

                        edge_mappings[i] = pos

                        if (i in computed_edges) {
                            computed_edges[i] = false
                        } else {
                            computed_edges[i] = true
                        }
                    })
                })
                
                const edges = []
                for (const [edge_string, outer] of Object.entries(computed_edges)) {
                    if (outer == true) {
                        edges.push(edge_mappings[edge_string])
                    }
                }

                

                this.claims.push({
                    label: claim.label,
                    color: claim.color,
                    chunks: claim.chunks,
                    edges: edges
                })
            }
        })
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

    moveToWorldPos(wx, wy) {
        this.px = wx - (this.canvas.clientWidth / 2)
        this.py = wy - (this.canvas.clientHeight / 2)
    }

    draw() {
        this.canvas.width = document.body.clientWidth;
        this.canvas.height = document.body.clientHeight;

        const w = this.canvas.clientWidth
        const h = this.canvas.clientHeight

        this.ctx.webkitImageSmoothingEnabled = false
        this.ctx.mozImageSmoothingEnabled = false
        this.ctx.imageSmoothingEnabled = false

        for (const tile of Object.values(this.tiles)) {
            this.ctx.drawImage(
                tile.image,
                (tile.x + this.px - (w / 2)) * this.z + (w / 2),
                (tile.y + this.py - (h / 2)) * this.z + (h / 2),
                tile.image.naturalHeight * this.z,
                tile.image.naturalWidth * this.z
            )
        }

        
        this.claims.forEach(claim => {
            this.ctx.fillStyle = `rgba(${claim.color[0]},${claim.color[1]},${claim.color[2]},0.4)`
            this.ctx.strokeStyle = `rgba(${claim.color[0]},${claim.color[1]},${claim.color[2]},1)`
            this.ctx.strokeWidth = 2

            claim.chunks.forEach(([cx, cy]) => {
                const rx = cx * 16
                const ry = cy * 16

                const x1 = (rx + this.px - (w / 2)) * this.z + (w / 2)
                const y1 = (ry + this.py - (h / 2)) * this.z + (h / 2)
                const x2 = (rx + this.px + 16 - (w / 2)) * this.z + (w / 2)
                const y2 = (ry + this.py + 16 - (h / 2)) * this.z + (h / 2)

                this.ctx.fillRect(x1, y1, x1-x2, y1-y2)
            })

            
            claim.edges.forEach(([x1, y1, x2, y2]) => {
                x1 = (x1 - 16 + this.px - (w / 2)) * this.z + (w / 2)
                y1 = (y1 - 16 + this.py - (h / 2)) * this.z + (h / 2)
                x2 = (x2 - 16 + this.px - (w / 2)) * this.z + (w / 2)
                y2 = (y2 - 16 + this.py - (h / 2)) * this.z + (h / 2)
                this.ctx.beginPath()
                this.ctx.moveTo(x1, y1)
                this.ctx.lineTo(x2, y2)
                this.ctx.stroke()
            })
        })

        this.ctx.webkitImageSmoothingEnabled = true
        this.ctx.mozImageSmoothingEnabled = true
        this.ctx.imageSmoothingEnabled = true

        this.ctx.strokeStyle = "rgba(255,255,255,0.4)"
        this.ctx.strokeWidth = 1

        // Columns
        const columns = Math.ceil(((w / this.z) / grid_spacing)/2)
        for (let x = 0; x < w / this.z + grid_spacing; x += grid_spacing) {
            this.ctx.beginPath()
            this.ctx.moveTo((x + ((this.px - (w / 2)) % grid_spacing) - columns * grid_spacing) * this.z + (w / 2), 0)
            this.ctx.lineTo((x + ((this.px - (w / 2)) % grid_spacing) - columns * grid_spacing) * this.z + (w / 2), h)
            this.ctx.stroke()
            this.ctx.closePath()

        }

        const rows = Math.ceil(((h / this.z) / grid_spacing)/2)        // Rows
        for (let y = 0; y < h / this.z + grid_spacing; y += grid_spacing) {
            this.ctx.beginPath()
            this.ctx.moveTo(0, (y + ((this.py - (h / 2)) % grid_spacing) - rows * grid_spacing) * this.z + (h / 2))
            this.ctx.lineTo(w, (y + ((this.py - (h / 2)) % grid_spacing) - rows * grid_spacing) * this.z + (h / 2))
            this.ctx.stroke()
            this.ctx.closePath()
        }

        this.ctx.fillStyle = "rgba(255,255,255,1)"
        this.ctx.font = "20pt Arial"
        
        const MARKER_RADIUS = 10
        this.markers.forEach(marker => {
            const cx = (marker.x + this.px - (w / 2)) * this.z + (w / 2)
            const cy = (marker.y + this.py - (h / 2)) * this.z + (h / 2)
            this.ctx.beginPath()
            this.ctx.moveTo(cx, cy)
            this.ctx.arc(cx, cy, MARKER_RADIUS, 0, Math.PI * 2)
            this.ctx.fill()
            this.ctx.fillText(marker.label, cx + MARKER_RADIUS, cy - MARKER_RADIUS)
            this.ctx.closePath()
        })

        const PLAYER_RADIUS = 2
        for (const [uuid, player] of Object.entries(this.players)) {
            const cx = (player.position.x + this.px - (w / 2)) * this.z + (w / 2)
            const cy = (player.position.z + this.py - (h / 2)) * this.z + (h / 2)


            this.ctx.beginPath()
            this.ctx.moveTo(cx, cy)
            this.ctx.arc(cx, cy, PLAYER_RADIUS, 0, Math.PI * 2)
            this.ctx.fill()
            this.ctx.fillText(player.name, cx + PLAYER_RADIUS, cy - PLAYER_RADIUS)
            this.ctx.closePath()
        }

        

        const mapped_x = (((mousex - (w / 2)) / this.z) + (w / 2) - this.px)
        const mapped_y = (((mousey - (h / 2)) / this.z) + (h / 2) - this.py)

        this.ctx.fillStyle = "rgba(255,255,255,1)"
        this.ctx.font = "10pt Arial"
        this.ctx.fillText(`(${Math.floor(mapped_x)} ${Math.floor(mapped_y)}) (${Math.floor(mapped_x/16)}, ${Math.floor(mapped_y/16)})`, mousex, mousey)
        this.ctx.closePath()

        requestAnimationFrame(() => this.draw())
    }

}

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
    mousex = event.x
    mousey = event.y
    if (dragging) {
        const dx = event.x - drag_dx
        const dy = event.y - drag_dy

        map.px = drag_from_px + (dx * (1/map.z))
        map.py = drag_from_py + (dy * (1/map.z))
    }
})

addEventListener("wheel", event => {
    zoom_level = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom_level - event.deltaY))
    
    map.z = Math.pow(1.1, (zoom_level/100))

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


disconnect.onclick = () => {
    if (ws) {
        ws.close()
    }
}


connect.onclick = () => {
    let open = false

    status_box.innerHTML = `<b>Status: Connecting</b>`
    try {
        ws = new WebSocket(HOST)
    } catch (e) {
        status_box.innerHTML = `<b>Status: Failed to connect</b>`
        console.log(error)
    }
    ws.onerror = error => {
        status_box.innerHTML = `<b>Status: Failed to connect</b>`
        console.log(error)
    }
    ws.onmessage = (message) => {
        try {
            const [pid, data] = JSON.parse(message.data)
            switch (pid) {
                case 0x00:
                    open = true
                    status_box.innerHTML = `<b>Status: Connected</b>`
                    const tick = () => {
                        ws.send(JSON.stringify([0x06, null]))
                        
                        if (open) {
                            setTimeout(tick, 1000)
                        }
                    }
            
                    tick()
                    break
                case 0x06:
                    data.players.forEach(player => {
                        const uuid = player.uuid
    
                        if (!(uuid in map.thumbs)) {
                            const image = new Image()
    
                            image.src = `https://crafatar.com/avatars/${uuid}`
    
                            map.thumbs[uuid] = image
                        }
                    })
    
                    map.players = data.players
            }
        } catch (e) {
            console.log("Something went wrong", message.data)
        }
        
        
    }
    ws.onclose = (e) => {
        let msg = e

        try {
            msg = JSON.parse(e.reason)[1]
        } catch {}

        open = false
        status_box.innerHTML = `<b>Status: ${msg}</b>`
    }
    ws.onopen = () => {
        status_box.innerHTML = `<b>Status: Authenticating</b>`

        ws.send(JSON.stringify([0x00, {
            client_id: api_input.value,
            address: "play.stoneworks.gg"
        }]))
    }
}


const canvas = document.getElementById("canvas")
const map = new WorldMap(canvas)
map.cacheTiles()
map.draw()
map.cacheClaims()



