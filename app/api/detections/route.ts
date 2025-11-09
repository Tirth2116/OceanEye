import { NextRequest, NextResponse } from "next/server"
import { trashDetectionsStore } from "@/lib/trash-detections-store"

/**
 * GET /api/detections
 * Returns all current trash detections
 */
export async function GET() {
  const detections = trashDetectionsStore.getAll()
  return NextResponse.json({ detections, count: detections.length })
}

/**
 * POST /api/detections
 * Add a new trash detection from your analyzer
 * 
 * Request body example:
 * {
 *   "trashType": "Plastic bottle",
 *   "threatLevel": "High",
 *   "decompositionYears": 450,
 *   "environmentalImpact": "...",
 *   "disposalInstructions": "...",
 *   "probableSource": "...",
 *   "image": "/trash_crops/crop_0_137_90.png",
 *   "confidence": 94,
 *   "location": "Zone A-3",
 *   "size": "Medium"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const required = [
      "trashType",
      "threatLevel",
      "decompositionYears",
      "environmentalImpact",
      "disposalInstructions",
      "probableSource",
      "image",
    ]
    
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }
    
    // Add detection to store
    const detection = trashDetectionsStore.add({
      trashType: body.trashType,
      threatLevel: body.threatLevel,
      decompositionYears: body.decompositionYears,
      environmentalImpact: body.environmentalImpact,
      disposalInstructions: body.disposalInstructions,
      probableSource: body.probableSource,
      image: body.image,
      confidence: body.confidence || 95,
      location: body.location || "Unknown",
      size: body.size || "Medium",
      timestamp: body.timestamp,
    })
    
    return NextResponse.json({ success: true, detection }, { status: 201 })
  } catch (error) {
    console.error("Error adding detection:", error)
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}

/**
 * DELETE /api/detections
 * Clear all detections
 */
export async function DELETE() {
  trashDetectionsStore.clear()
  return NextResponse.json({ success: true, message: "All detections cleared" })
}

