import { interpolateAlongPath } from "./path"
import type { Plan, Vec2 } from "./types"

export function drawScene(
  ctx: CanvasRenderingContext2D,
  size: { width: number; height: number },
  plan: Plan,
  distanceTravelled: number,
) {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, size.width, size.height)
  drawBackground(ctx, size, plan.environment)
  drawGrid(ctx, size)
  drawPath(ctx, plan, distanceTravelled)
  drawTargets(ctx, plan, distanceTravelled)
  drawCollector(ctx, plan, distanceTravelled)
  ctx.restore()
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  size: { width: number; height: number },
  environment: "underwater" | "land",
) {
  const gradient = ctx.createLinearGradient(0, 0, 0, size.height)
  if (environment === "underwater") {
    gradient.addColorStop(0, "rgba(7, 30, 64, 0.95)")
    gradient.addColorStop(1, "rgba(6, 59, 102, 0.95)")
  } else {
    gradient.addColorStop(0, "rgba(34, 48, 28, 0.92)")
    gradient.addColorStop(1, "rgba(63, 95, 55, 0.92)")
  }
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size.width, size.height)

  ctx.fillStyle =
    environment === "underwater" ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.04)"
  for (let i = 0; i < 40; i++) {
    const x = ((i * 97) % size.width) + (i % 3) * 10
    const y = ((i * 53) % size.height) + (i % 5) * 6
    ctx.beginPath()
    ctx.arc(x, y, 1.8, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, size: { width: number; height: number }) {
  const spacing = 80
  ctx.strokeStyle = "rgba(255,255,255,0.04)"
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = spacing; x < size.width; x += spacing) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, size.height)
  }
  for (let y = spacing; y < size.height; y += spacing) {
    ctx.moveTo(0, y)
    ctx.lineTo(size.width, y)
  }
  ctx.stroke()
}

function drawPath(ctx: CanvasRenderingContext2D, plan: Plan, distanceTravelled: number) {
  const { points, cumulative, totalLength } = plan.smoothPath
  if (points.length < 2 || totalLength === 0) return

  ctx.lineWidth = 4
  ctx.lineJoin = "round"

  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)"
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  ctx.stroke()

  ctx.strokeStyle = "rgba(45, 212, 191, 0.8)"
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    if (cumulative[i] <= distanceTravelled) {
      ctx.lineTo(points[i].x, points[i].y)
    } else {
      const prev = points[i - 1]
      const next = points[i]
      const segmentLength = cumulative[i] - cumulative[i - 1]
      const ratio = segmentLength ? (distanceTravelled - cumulative[i - 1]) / segmentLength : 0
      const clamped = Math.max(0, Math.min(1, ratio))
      ctx.lineTo(prev.x + (next.x - prev.x) * clamped, prev.y + (next.y - prev.y) * clamped)
      break
    }
  }
  ctx.stroke()
}

function drawTargets(ctx: CanvasRenderingContext2D, plan: Plan, distanceTravelled: number) {
  plan.orderedTargets.forEach((point, index) => {
    const collected = plan.smoothPath.segmentDistances[index] <= distanceTravelled + 1e-3

    ctx.beginPath()
    ctx.fillStyle = collected ? "rgba(34,197,94,0.7)" : "rgba(255,255,255,0.15)"
    ctx.strokeStyle = collected ? "rgba(59,130,246,0.9)" : "rgba(255,255,255,0.25)"
    ctx.lineWidth = 3
    ctx.arc(point.normX, point.normY, 16, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.save()
    ctx.font = "20px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji'"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.shadowColor = collected ? "rgba(34,197,94,0.8)" : "rgba(0,0,0,0.4)"
    ctx.shadowBlur = collected ? 12 : 8
    ctx.fillText(point.icon, point.normX, point.normY)
    ctx.restore()
  })

  const { base } = plan
  ctx.beginPath()
  ctx.fillStyle = "rgba(59, 130, 246, 0.3)"
  ctx.strokeStyle = "rgba(59, 130, 246, 0.9)"
  ctx.lineWidth = 3
  ctx.arc(base.normX, base.normY, 20, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.save()
  ctx.font = "24px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji'"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.shadowColor = "rgba(59,130,246,0.8)"
  ctx.shadowBlur = 14
  ctx.fillText(base.icon, base.normX, base.normY)
  ctx.restore()
}

function drawCollector(ctx: CanvasRenderingContext2D, plan: Plan, distanceTravelled: number) {
  const { points, cumulative, totalLength } = plan.smoothPath
  if (!points.length) return

  if (totalLength === 0) {
    drawCollectorGlyph(ctx, points[0], 0)
    drawCollectorHalo(ctx, points[0])
    return
  }

  const distanceValue = Math.min(distanceTravelled, totalLength)
  const position = interpolateAlongPath(points, cumulative, distanceValue)
  const ahead = interpolateAlongPath(points, cumulative, Math.min(distanceValue + 1, totalLength))
  const angle = Math.atan2(ahead.y - position.y, ahead.x - position.x)

  drawCollectorGlyph(ctx, position, angle)
  drawCollectorHalo(ctx, position)
}

function drawCollectorGlyph(ctx: CanvasRenderingContext2D, position: Vec2, angle: number) {
  ctx.save()
  ctx.translate(position.x, position.y)
  ctx.rotate(angle)

  const bodyGradient = ctx.createLinearGradient(-20, 0, 20, 0)
  bodyGradient.addColorStop(0, "rgba(34,211,238,0.8)")
  bodyGradient.addColorStop(1, "rgba(14,165,233,0.9)")

  ctx.fillStyle = bodyGradient
  ctx.beginPath()
  ctx.moveTo(-18, -10)
  ctx.lineTo(18, 0)
  ctx.lineTo(-18, 10)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = "rgba(12,74,110,0.9)"
  ctx.beginPath()
  ctx.arc(-4, 0, 8, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawCollectorHalo(ctx: CanvasRenderingContext2D, position: Vec2) {
  ctx.beginPath()
  ctx.strokeStyle = "rgba(45, 212, 191, 0.5)"
  ctx.lineWidth = 2
  ctx.arc(position.x, position.y, 20, 0, Math.PI * 2)
  ctx.stroke()
}
