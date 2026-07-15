let angleX = 0
let angleY = 0
let cameraX = 0
let cameraY = -35
let cameraZ = -30
let fov = 80
let velocityY = 0
let gravity = 0.6
let isGrounded = false

let menuOpen = false
let menuIndex = 0
let options = [
    "Toggle Projection",
    "Exit Menu"
]
let isOrthographic = false

interface Point3D {
    x: number
    y: number
    z: number
}

interface Block3D {
    cx: number
    cy: number
    cz: number
}

let blocks: Block3D[] = []
let worldSize = 4
let spacing = 14

for (let x = -worldSize; x <= worldSize; x++) {
    for (let z = -worldSize; z <= worldSize; z++) {
        let height = Math.round(Math.sin(x * 0.8) * 1.5 + Math.cos(z * 0.8) * 1.5)
        blocks.push({
            cx: x * spacing,
            cy: -height * 10,
            cz: z * spacing
        })
    }
}

let localVertices: Point3D[] = [
    { x: -5, y: -5, z: -5 },
    { x: 5, y: -5, z: -5 },
    { x: 5, y: 5, z: -5 },
    { x: -5, y: 5, z: -5 },
    { x: -5, y: -5, z: 5 },
    { x: 5, y: -5, z: 5 },
    { x: 5, y: 5, z: 5 },
    { x: -5, y: 5, z: 5 }
]

let edges = [
    { u: 0, v: 1 }, { u: 1, v: 2 }, { u: 2, v: 3 }, { u: 3, v: 0 },
    { u: 4, v: 5 }, { u: 5, v: 6 }, { u: 6, v: 7 }, { u: 7, v: 4 },
    { u: 0, v: 4 }, { u: 1, v: 5 }, { u: 2, v: 6 }, { u: 3, v: 7 }
]

function project(p: Point3D): { x: number, y: number } {
    if (isOrthographic) {
        return {
            x: Math.round(p.x + 80),
            y: Math.round(p.y + 60)
        }
    } else {
        let z = p.z
        if (z <= 1) z = 1
        let screenX = (p.x * fov) / z + 80
        let screenY = (p.y * fov) / z + 60
        return {
            x: Math.round(screenX),
            y: Math.round(screenY)
        }
    }
}

controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
    if (!menuOpen) {
        menuOpen = true
        menuIndex = 0
    } else {
        if (menuIndex == 0) {
            isOrthographic = !isOrthographic
        }
        menuOpen = false
    }
})

game.onUpdate(function () {
    if (menuOpen) {
        if (controller.up.isPressed()) {
            menuIndex = (menuIndex - 1 + options.length) % options.length
            pause(150)
        } else if (controller.down.isPressed()) {
            menuIndex = (menuIndex + 1) % options.length
            pause(150)
        }
    } else {
        let radY = (angleY * Math.PI) / 180
        let speed = 1.5

        if (controller.B.isPressed()) {
            if (controller.up.isPressed()) {
                angleX = (angleX - 3) % 360
            }
            if (controller.down.isPressed()) {
                angleX = (angleX + 3) % 360
            }
        } else {
            if (controller.up.isPressed()) {
                cameraX += Math.sin(radY) * speed
                cameraZ += Math.cos(radY) * speed
            }
            if (controller.down.isPressed()) {
                cameraX -= Math.sin(radY) * speed
                cameraZ -= Math.cos(radY) * speed
            }
        }

        if (controller.left.isPressed()) {
            angleY = (angleY - 4) % 360
        }
        if (controller.right.isPressed()) {
            angleY = (angleY + 4) % 360
        }

        velocityY += gravity
        cameraY += velocityY

        let currentGroundY = 0
        let closestDist = 999999

        for (let b = 0; b < blocks.length; b++) {
            let dx = blocks[b].cx - cameraX
            let dz = blocks[b].cz - cameraZ
            let distSq = dx * dx + dz * dz
            if (distSq < closestDist) {
                closestDist = distSq
                currentGroundY = blocks[b].cy - 18
            }
        }

        if (cameraY >= currentGroundY) {
            cameraY = currentGroundY
            velocityY = 0
            isGrounded = true
        } else {
            isGrounded = false
        }
    }
})

game.onPaint(function () {
    if (menuOpen) {
        screen.fillRect(10, 10, 140, 100, 15)
        screen.drawRect(10, 10, 140, 100, 1)
        for (let i = 0; i < options.length; i++) {
            let color = (i == menuIndex) ? 5 : 1
            let prefix = (i == menuIndex) ? "> " : "  "
            screen.print(prefix + options[i], 15, 15 + (i * 12), color)
        }
    } else {
        screen.print("A: Menu", 2, 2, 1)

        let radY = (-angleY * Math.PI) / 180
        let cosY = Math.cos(radY)
        let sinY = Math.sin(radY)

        let radX = (-angleX * Math.PI) / 180
        let cosX = Math.cos(radX)
        let sinX = Math.sin(radX)

        for (let b = 0; b < blocks.length; b++) {
            let block = blocks[b]
            let transformed: Point3D[] = []
            let countVisible = 0

            let bdx = block.cx - cameraX
            let bdy = block.cy - cameraY
            let bdz = block.cz - cameraZ
            let distance = Math.sqrt(bdx * bdx + bdy * bdy + bdz * bdz)

            let lineColor = 1
            if (distance < 25) {
                lineColor = 9
            } else if (distance < 45) {
                lineColor = 14
            } else if (distance < 70) {
                lineColor = 13
            } else if (distance < 100) {
                lineColor = 11
            } else {
                lineColor = 12
            }

            for (let i = 0; i < localVertices.length; i++) {
                let v = localVertices[i]

                let dx = (v.x + block.cx) - cameraX
                let dy = (v.y + block.cy) - cameraY
                let dz = (v.z + block.cz) - cameraZ

                let rx = dx * cosY + dz * sinY
                let rz = -dx * sinY + dz * cosY

                let ry = dy * cosX - rz * sinX
                let finalZ = dy * sinX + rz * cosX

                if (finalZ > 2) {
                    countVisible++
                }

                transformed.push({ x: rx, y: ry, z: finalZ })
            }

            if (countVisible > 0) {
                for (let i = 0; i < edges.length; i++) {
                    let edge = edges[i]
                    let t1 = transformed[edge.u]
                    let t2 = transformed[edge.v]

                    if (t1.z > 2 && t2.z > 2) {
                        let p1 = project(t1)
                        let p2 = project(t2)

                        if ((p1.x >= 0 && p1.x <= 160 && p1.y >= 0 && p1.y <= 120) ||
                            (p2.x >= 0 && p2.x <= 160 && p2.y >= 0 && p2.y <= 120)) {
                            screen.drawLine(p1.x, p1.y, p2.x, p2.y, lineColor)
                        }
                    }
                }
            }
        }
    }
})
