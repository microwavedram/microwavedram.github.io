const canvas = document.getElementById("canvas")
const background = document.getElementById("background")
const ctx = canvas.getContext("2d")

particles = []

function drawFrame() {
    canvas.width = background.clientWidth
    canvas.height = background.clientHeight

    const w = background.clientWidth
    const h = background.clientHeight

    ctx.fillStyle = "rgba(255,255,255,1)"

    
    
    particles.forEach(particle => {
        ctx.beginPath()
        ctx.moveTo(w / 2 + particle.x, h / 2 + particle.y)
        ctx.arc(w / 2 + particle.x, h / 2 + particle.y, 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.closePath()

        ctx.strokeStyle = "rgba(255,255,255,0.4)"
        ctx.strokeWidth = 1

        particle.x += particle.xv
        particle.y += particle.yv

        if (particle.x < -w/2) particle.xv = Math.abs(particle.xv)
        if (particle.x > w/2) particle.xv = -Math.abs(particle.xv)
        if (particle.y < -h/2) particle.yv = Math.abs(particle.yv)
        if (particle.y > h/2) particle.yv = -Math.abs(particle.yv)

        particle.xv *= 0.9
        particle.yv *= 0.9

        particles.forEach(other => {
            const dx = particle.x - other.x
            const dy = particle.y - other.y
            
            const strength = dx*dx + dy*dy


            if (strength < 10000) {
                particle.xv += dx * 0.0001
                particle.yv += dy * 0.0001
                other.xv += -dx * 0.0001
                other.yv += -dy * 0.0001

                ctx.strokeStyle = `rgba(255,255,255,${(10000-strength)/10000})`
                ctx.beginPath()
                ctx.moveTo(w / 2 + particle.x, h / 2 + particle.y)
                ctx.lineTo(w / 2 + other.x, h / 2 + other.y)
                ctx.stroke()
                ctx.closePath()
            }
        })
    })

    requestAnimationFrame(drawFrame)
}

const TAU = Math.PI

const count = 1000
const C = TAU/count
for (let i = 0; i < count; i++) {
    particles.push({
        x: Math.cos(i/C) * 500,
        y: Math.sin(i/C) * 500,
        xv: Math.cos(i/C) * -80,
        yv: Math.sin(i/C) * -80,
    })
}


drawFrame()