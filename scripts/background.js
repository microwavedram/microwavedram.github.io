const canvas = document.getElementById("background")
const ctx = canvas.getContext('2d')
canvas.width = window.innerWidth
canvas.height = window.innerHeight

let particlesArray;

let mouse = {
    x: 100000,
    y: 100000,
    radius: (canvas.height/100)*(canvas.width/100)
}

 window.addEventListener('mousemove',
    function(event) {
        mouse.x = event.x
        mouse.y = event.y
    }
)

class Particle {
    constructor(x, y, directionX, directionY, size, color) {
        this.x = x;
        this.y = y;
        this.directionX = directionX;
        this.directionY = directionY;
        this.size = size;
        this.color = color;
        this.debounce = false
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x,this.y, this.size, 0, Math.PI * 2,false);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }

    bounce() {
        if (performance.now() < 1000) return
        if (this.debounce == true) return
        this.debounce = true
        this.directionX = -this.directionX
        this.directionY = -this.directionY
        this.deviate()
        setTimeout(() => {  this.debounce = false; }, 6000*Math.random());
    }

    deviate() {
        this.directionX = Math.min(Math.max(this.directionX*Math.random(),-1),1)
        this.directionY = Math.min(Math.max(this.directionY*Math.random(),-1),1)
        
        if (this.directionX < 0.1 && this.directionX > -0.1) {
            this.directionX = (Math.random()-0.5)*2
        }
        if (this.directionY < 0.1 && this.directionY > -0.1) {
            this.directionY = (Math.random()-0.5)*2
        }
    }

    update() {
        if (this.x < 0 || this.x > innerWidth) {
            this.directionX = -this.directionX*2
            this.debounce = true

            setTimeout(() => {  this.debounce = false; }, 5000*Math.random());
        }
        if (this.y < 0 || this.y > innerHeight) {
            this.directionY = -this.directionY*2
            this.debounce = true

            setTimeout(() => {  this.debounce = false; }, 5000*Math.random());
        }

        this.x += this.directionX
        this.y += this.directionY
        this.draw();
    }
}

function init() {
    particlesArray = []
    let rings = 3
    for (let n = 0; n < rings; n++) {
        for (let i = 0; i < 360; i+=10) {
            let size = 2
            let x = (innerWidth / 2) + n+1 * 300 * Math.sin(i*(Math.PI/180))
            let y = (innerHeight / 2) + n+1 * 300 *Math.cos(i*(Math.PI/180))
            let directionX = 0
            let directionY = 0
            let color = '#ffffff'
    
            

            if (x > innerWidth && y > innerHeight/2) {
                directionX = 1
                directionY = 1
            }
            else if (x < innerWidth/2 && y < innerHeight/2) {
                directionX = -1
                directionY = -1
            }
            else if (x < innerWidth/2 && y > innerHeight/2) {
                directionX = -1
                directionY = 1
            }
            else if (x > innerWidth/2 && y < innerHeight/2) {
                directionX = 1
                directionY = -1
            }
            else {
                directionX = -1
                directionY = -1
            }
            particlesArray.push(new Particle(x,y,directionX,directionY,size,color))
        }
    }
    
}

function connect() {
    let opacityValue = 1;
    for (let a = 0; a< particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
            let distance = ((particlesArray[a].x - particlesArray[b].x)*(particlesArray[a].x - particlesArray[b].x) + (particlesArray[a].y - particlesArray[b].y)*(particlesArray[a].y - particlesArray[b].y));
            if (distance < (canvas.width/7) * (canvas.height/7)) {
                opacityValue = 1 - (distance/30000)
                ctx.strokeStyle = 'rgba(255,255,255,'+opacityValue+')';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(particlesArray[a].x, particlesArray[a].y)
                ctx.lineTo(particlesArray[b].x, particlesArray[b].y)
                ctx.stroke();
            }
            if (distance < mouse.radius) {
                particlesArray[a].bounce()
                particlesArray[b].bounce()
            }
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    ctx.clearRect(0,0,innerWidth, innerHeight);

    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
    }
    connect()
}

window.addEventListener('resize',
    function() {
        canvas.width = innerWidth;
        canvas.height = innerHeight;
        mouse.radius = ((canvas.height/80) * (canvas.height/80));
        init();
    }
)

window.addEventListener('mouseout',
    function() {
        mouse.x = 100000;
        mouse.y = 100000;
    }
)

init()
animate()