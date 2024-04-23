const MIN_ZOOM = -400
const MAX_ZOOM = 400
const DEFAULT_ZOOM = -300

const HOST = "ws://nexus.cloudmc.uk:8080"

const api_input = document.getElementById("api-key")
const connect = document.getElementById("connect")
const disconnect = document.getElementById("disconnect")
const status_box = document.getElementById("status")

const heart = new Image()
heart.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHBAMAAAA2fErgAAAAD1BMVEUAAAArAgvaJCSsCy/sV0SEKlj7AAAAAXRSTlMAQObYZgAAAChJREFUCNdjYBQQZGAQUVQSYBByAhLCSsoCDIxGhgwMDMICQIKRgQEAKHQCAAUrkucAAAAASUVORK5CYII="

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

const newimage = src => {const s = new Image(); s.src = src; return s}

const rank_assets = {
    "axe": newimage("assets/axe.svg"),
    "neth_pot": newimage("assets/neth_pot.svg"),
    "pot": newimage("assets/pot.svg"),
    "smp": newimage("assets/smp.svg"),
    "sword": newimage("assets/sword.svg"),
    "uhc": newimage("assets/uhc.svg"),
    "vannila": newimage("assets/vannila.svg"),
    "axe": newimage("assets/axe.svg"),
}

function toColor(num) {
    num >>>= 0

    let b = num & 0x255
    let g = (num & 0x2550) >>> 8
    let r = (num & 0x25500) >>> 16

    return `rgba(${r},${g},${b},1)`
}

function getTierColor(tier) {
    switch(tier) {
        case "HT1": { return "rgb(255, 0, 0, 1)" }
        case "LT1": { return "rgb(255, 182, 193, 1)" }
        case "HT2": { return "rgb(255, 165, 0, 1)" }
        case "LT2": { return "rgb(255, 288, 181, 1)" }
        case "HT3": { return "rgb(218, 165, 32, 1)" }
        case "LT3": { return "rgb(238, 232, 170, 1)" }
        case "HT4": { return "rgb(0, 100, 0, 1)" }
        case "LT4": { return "rgb(144, 238, 144, 1)" }
        case "HT5": { return "rgb(128, 128, 128, 1)" }
        case "LT5": { return "rgb(211, 211, 211, 1)" }
        default: { return "rgb(211, 211, 211, 1)" }
    }
}

class WorldMap {

    ctx;

    constructor(canvas) {
        this.canvas = canvas
        this.ctx = canvas.getContext("2d")

        zoom_level = DEFAULT_ZOOM

        this.z = Math.pow(1.1, (DEFAULT_ZOOM/10))
        this.px = -(canvas.clientWidth)
        this.py = -(canvas.clientWidth)

        this.tiles = {}
        this.thumbs = {}
        this.tier_cache = {
        }

        this.lod = 3

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
            const lods = await response.json()

            for (const [lod_id, tilenames] of Object.entries(lods)) {
                this.tiles[lod_id] = {}
                tilenames.forEach(name => {
                    const image = new Image()
                    image.src = `tiles/${lod_id}/${name}`
                    
                    let [x, y] = name.substring(-3).split("_")
                    x = parseInt(x)
                    y = parseInt(y)
                    this.tiles[lod_id][name] = {
                        x: x,
                        y: y,
                        image: image,
                        s: Math.pow(2, parseInt(lod_id.charAt(4)))
                    }
                })
            }

            console.log(this.tiles)
        }).catch(console.error)
    }

    moveToWorldPos(wx, wy) {
        this.px = wx - (this.canvas.style.width / 2)
        this.py = wy - (this.canvas.style.height / 2)
    }

    cacheThumb(uuid) {
        const image = new Image()
    
        image.src = `https://crafatar.com/avatars/${uuid}`

        this.thumbs[uuid] = image
    }

    cacheTier(uuid) {
        fetch({
            url: `https://mctiers.com/api/rankings/${uuid}`,
            headers: {
                "Access-Control-Allow-Origin": "*"
            }
        }).then(async response => {
            this.tier_cache[uuid] = await response.json()
        })
    }

    setPixelated(enabled) {
        this.ctx.webkitImageSmoothingEnabled = !enabled
        this.ctx.mozImageSmoothingEnabled = !enabled
        this.ctx.imageSmoothingEnabled = !enabled
    }

    draw() {
        this.canvas.width = document.body.clientWidth * 2
        this.canvas.height = document.body.clientHeight * 2
        this.canvas.style.width = document.body.clientWidth
        this.canvas.style.height = document.body.clientHeight

        const w = document.body.clientWidth
        const h = document.body.clientHeight

        this.setPixelated(true)            
        if (`lod-${this.lod}` in this.tiles) {
            for (const tile of Object.values(this.tiles[`lod-${this.lod}`])) {
                const calc_x = (tile.x + this.px - (w / 2)) * this.z + (w / 2)
                const calc_y = (tile.y + this.py - (h / 2)) * this.z + (h / 2)

                const sx = tile.image.naturalHeight * this.z * tile.s
                const sy = tile.image.naturalWidth * this.z * tile.s

                if (calc_x > w) continue
                if (calc_y > w) continue
                if (calc_x + sx < 0) continue
                if (calc_y + sy < 0) continue

                this.ctx.drawImage(
                    tile.image,
                    calc_x,
                    calc_y,
                    sx,
                    sy
                )
            }
        }
        this.setPixelated(false)            


        
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

        

        this.ctx.font = "13pt Arial"
        for (const [uuid, player] of Object.entries(this.players)) {
            const cx = (player.position.x + this.px - (w / 2)) * this.z + (w / 2)
            const cy = (player.position.z + this.py - (h / 2)) * this.z + (h / 2)

            const size = 24

            let mode = ""
            let tier = 6
            let pos = 2
            let r = false

            if (uuid in this.tier_cache) {
                for (const [m, ranking] of Object.entries(this.tier_cache[uuid].rankings || {})) {
                    const highest_tier = ranking.peak_tier || ranking.tier 
                    const highest_pos = ranking.peak_pos || ranking.pos 

                    // console.log(`${ranking.retired ? "R" : ""}${highest_pos == 0 ? "H" : "L"}T${highest_tier} ${m}`)

                    if (highest_tier < tier || (highest_tier == tier & highest_pos < pos)) {
                        mode = m
                        tier = highest_tier
                        pos = highest_pos
                        r = ranking.retired
                    }
                }
                
            }
            
            let ts = ""
            if (mode !== "") {
                ts = `${r ? "R" : ""}${pos == 0 ? "H" : "L"}T${tier}`
            }

            this.ctx.font = "10pt Arial"


            let f = Math.max(0, player.health.toString().length - 1) * 7
            let f2 = Math.max(0, ts.length - 1) * 7
            this.ctx.fillStyle = "rgba(255,255,255,1)"

            this.ctx.fillRect(cx - (size / 2) - 2, cy - (size / 2) - 2, size + 4, size + 4)
            this.ctx.fillText(player.name, cx + (size/1.5) + 3, cy - 2)

            this.setPixelated(true)            

            this.ctx.drawImage(this.thumbs[uuid], cx - (size/2), cy - (size/2), size, size)
            this.ctx.drawImage(heart, cx + size + f + 4, cy + 2, 13, 13)
            this.ctx.drawImage(rank_assets[mode] || heart, cx + (size) + 32 + f + f2, cy + 2, 13, 13)

            this.setPixelated(false)            


            this.ctx.font = "bold 10pt Arial"

            
            this.ctx.fillText(`${player.health}`, cx + (size/1.5) + 3, cy + 13)
            
            this.ctx.fillStyle = getTierColor(`${pos == 0 ? "H" : "L"}T${tier}`)
            this.ctx.fillText(ts, cx + (size) + f + 20, cy + 13)
            
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

const canvas = document.getElementById("canvas")
const map = new WorldMap(canvas)
map.cacheTiles()
map.draw()
map.cacheClaims()

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
    
    map.z = Math.pow(1.1, (zoom_level/10))

    if (map.z >= 12) {
        grid_spacing = 1
        map.lod = 0
    } else if (map.z >= 1.5) {
        grid_spacing = 16
        map.lod = 0
    } else if (map.z > 0.5) {
        grid_spacing = 64
        map.lod = 1
    } else if (map.z > 0.3) {
        grid_spacing = 64
        map.lod = 2
    } else {
        grid_spacing = 64 * 32
        map.lod = 3
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
        console.log(e)
    }
    ws.onerror = error => {
        status_box.innerHTML = `<b>Status: Failed to connect</b>`
        console.log(error)
    }
    ws.onmessage = (message) => {
        try {
            const [pid, data] = JSON.parse(message.data)
            switch (pid) {
                case 0x0:
                    open = true
                    status_box.innerHTML = `<b>Status: Connected</b>`
                    const tick = () => {
                        ws.send(JSON.stringify([0x06, null]))
                        
                        if (open) {
                            setTimeout(tick, 100)
                        }
                    }
            
                    tick()
                    break
                case 0x06:
                    data.players.forEach(player => {
                        const uuid = player.uuid
    
                        if (!(uuid in map.thumbs)) {
                            map.cacheThumb(uuid)
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

        ws.send(JSON.stringify([0x0, {
            client_id: api_input.value,
            address: "play.stoneworks.gg"
        }]))
    }
}






