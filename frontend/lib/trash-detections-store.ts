/**
 * Simple in-memory store for trash detections
 * This will be populated by your video analyzer when new trash is detected
 */

import type { TrashDetection } from "@/components/new-trash-detection-log"

let detections: TrashDetection[] = []
let nextId = 1

export const trashDetectionsStore = {
  /**
   * Get all current detections
   */
  getAll: (): TrashDetection[] => {
    return [...detections]
  },

  /**
   * Add a new detection from your analyzer
   * 
   * @param detection - Partial detection object (id and timestamp will be auto-generated if missing)
   * @returns The complete detection object that was added
   */
  add: (detection: Omit<TrashDetection, "id"> & { id?: number }): TrashDetection => {
    const newDetection: TrashDetection = {
      id: detection.id || nextId++,
      timestamp: detection.timestamp || new Date().toLocaleTimeString("en-US", { hour12: false }),
      ...detection,
    }
    
    // Add to beginning of array (newest first)
    detections.unshift(newDetection)
    
    // Optional: limit to most recent N detections
    if (detections.length > 50) {
      detections = detections.slice(0, 50)
    }
    
    return newDetection
  },

  /**
   * Clear all detections
   */
  clear: (): void => {
    detections = []
    nextId = 1
  },

  /**
   * Remove a specific detection by id
   */
  remove: (id: number): void => {
    detections = detections.filter((d) => d.id !== id)
  },
}

/**
 * Example: How to add a detection from your analyzer
 * 
 * When your Python analyzer detects new trash and gets Gemini analysis:
 * 
 * ```typescript
 * import { trashDetectionsStore } from '@/lib/trash-detections-store'
 * 
 * // Parse the Gemini JSON response
 * const geminiResponse = {
 *   label: "Plastic bottle",
 *   threat_level: "High",
 *   decomposition_years: 450,
 *   environmental_impact: "...",
 *   disposal_instructions: "...",
 *   probable_source: "..."
 * }
 * 
 * // Add to store
 * trashDetectionsStore.add({
 *   trashType: geminiResponse.label,
 *   threatLevel: geminiResponse.threat_level as "Low" | "Medium" | "High" | "Critical",
 *   decompositionYears: geminiResponse.decomposition_years,
 *   environmentalImpact: geminiResponse.environmental_impact,
 *   disposalInstructions: geminiResponse.disposal_instructions,
 *   probableSource: geminiResponse.probable_source,
 *   image: "/path/to/cropped/image.png",  // Path to saved crop
 *   confidence: 94,  // From your segmentation model
 *   location: "Zone A-3",  // From your camera/drone
 *   size: "Medium",  // Calculate from mask area
 * })
 * ```
 */

