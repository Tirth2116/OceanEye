"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, Clock, Package, AlertTriangle, Hourglass, Recycle, MapPin, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import Image from "next/image"

// Detection type with full analysis
export interface TrashDetection {
  id: number
  timestamp: string
  image: string
  trashType: string
  confidence: number
  location: string
  size: string
  threatLevel: "Low" | "Medium" | "High" | "Critical"
  decompositionYears: number
  environmentalImpact: string
  disposalInstructions: string
  probableSource: string
}

interface NewTrashDetectionLogProps {
  detections?: TrashDetection[]
}

export function NewTrashDetectionLog({ detections = [] }: NewTrashDetectionLogProps) {
  // Normalize various incoming image path formats to valid public URLs
  const normalizeImageSrc = (image?: string): string => {
    if (!image || typeof image !== "string") return "/placeholder.svg"
    let src = image.trim()
    // Fix accidental trailing digits after extension (e.g., ".png1" -> ".png")
    src = src.replace(/\.(png|jpe?g|webp)\d+$/i, (m) => m.replace(/\d+$/, ""))
    // Ensure leading slash for public assets
    if (!src.startsWith("http") && !src.startsWith("/")) {
      src = "/" + src
    }
    // If it looks like a test_detection filename without directory, prefix /detections
    const fileOnly = src.replace(/^\//, "")
    if (!src.startsWith("http") && !src.startsWith("/detections/") && /^test_detection_\d+\.(png|jpe?g|webp)$/i.test(fileOnly)) {
      src = "/detections/" + fileOnly
    }
    return src
  }
  const [selectedDetection, setSelectedDetection] = useState<TrashDetection | null>(null)

  const getThreatColor = (level: string) => {
    switch (level) {
      case "Critical":
        return "border-red-600/70 text-red-500 bg-red-500/20"
      case "High":
        return "border-orange-500/70 text-orange-400 bg-orange-500/20"
      case "Medium":
        return "border-yellow-500/70 text-yellow-400 bg-yellow-500/20"
      case "Low":
        return "border-green-500/70 text-green-400 bg-green-500/20"
      default:
        return "border-border/50 text-muted-foreground bg-muted/20"
    }
  }

  if (selectedDetection) {
    return (
      <Card className="glass-panel border-primary/20 overflow-hidden h-full">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <AlertTriangle className="h-6 w-6 text-accent" />
                <div className="absolute inset-0 blur-md bg-accent/40 -z-10" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">{selectedDetection.trashType}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Detailed Analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getThreatColor(selectedDetection.threatLevel)}>
                {selectedDetection.threatLevel} Threat
              </Badge>
              <Button variant="ghost" size="icon" onClick={() => setSelectedDetection(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[520px]">
            <div className="p-6 space-y-4">
              {/* Image */}
              <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted/30">
                <Image
                  src={normalizeImageSrc(selectedDetection.image)}
                  alt={`Detected ${selectedDetection.trashType}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
                    {selectedDetection.confidence}% confidence
                  </Badge>
                </div>
                <div className="absolute bottom-3 left-3 flex gap-2 text-xs">
                  <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
                    <Clock className="h-3 w-3 mr-1" />
                    {selectedDetection.timestamp}
                  </Badge>
                  <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
                    <Package className="h-3 w-3 mr-1" />
                    {selectedDetection.location}
                  </Badge>
                </div>
              </div>

              {/* Decomposition Estimate */}
              <div className="glass-panel rounded-lg p-4 border-l-4 border-orange-500/70">
                <div className="flex items-start gap-3">
                  <Hourglass className="h-5 w-5 text-orange-400 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm">Decomposition Estimate</h3>
                    <p className="text-sm text-muted-foreground">
                      Based on the material, this item will take an estimated{" "}
                      <span className="font-bold text-foreground">{selectedDetection.decompositionYears} years</span> to
                      decompose in a marine environment.
                    </p>
                  </div>
                </div>
              </div>

              {/* Environmental Threat */}
              <div className="glass-panel rounded-lg p-4 border-l-4 border-red-500/70">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-400 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm">Environmental Threat Assessment</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedDetection.environmentalImpact}
                    </p>
                  </div>
                </div>
              </div>

              {/* Disposal Instructions */}
              <div className="glass-panel rounded-lg p-4 border-l-4 border-green-500/70">
                <div className="flex items-start gap-3">
                  <Recycle className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm">Recycling/Disposal Instructions</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedDetection.disposalInstructions}
                    </p>
                  </div>
                </div>
              </div>

              {/* Probable Source */}
              <div className="glass-panel rounded-lg p-4 border-l-4 border-blue-500/70">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-pink-400 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm">Probable Source Attribution</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedDetection.probableSource}</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    )
  }

  // Empty state when no detections
  if (detections.length === 0) {
    return (
      <Card className="glass-panel border-primary/20 overflow-hidden h-full">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Camera className="h-6 w-6 text-accent" />
              <div className="absolute inset-0 blur-md bg-accent/40 -z-10" />
            </div>
            <CardTitle className="text-xl font-bold text-balance">New Trash Detected</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-pretty">
            Waiting for video analyzer to detect new objects...
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[520px] flex items-center justify-center">
            <div className="text-center space-y-4 px-6">
              <div className="relative inline-block">
                <Camera className="h-16 w-16 text-muted-foreground/30" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">No detections yet</p>
                <p className="text-xs text-muted-foreground/60 max-w-xs">
                  Run your video analyzer to detect and classify trash objects
                </p>
              </div>
            </div>
          </div>
          {/* Live Indicator */}
          <div className="px-6 py-3 border-t border-border/50 bg-accent/5">
            <div className="flex items-center gap-2 justify-center">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs text-accent font-medium">Monitoring for new objects...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-panel border-primary/20 overflow-hidden h-full">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Camera className="h-6 w-6 text-accent" />
            <div className="absolute inset-0 blur-md bg-accent/40 -z-10" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl font-bold text-balance">New Trash Detected</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {detections.length} {detections.length === 1 ? "object" : "objects"} found
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-pretty">
          Click any detection to view full environmental analysis
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[520px]">
          <div className="p-6 space-y-4">
            {detections.map((detection) => (
              <button
                key={detection.id}
                onClick={() => setSelectedDetection(detection)}
                className="w-full text-left glass-panel rounded-lg p-3 border border-border/30 hover:border-primary/50 transition-all duration-200 cursor-pointer"
              >
                {/* Image Preview */}
                <div className="relative w-full h-28 rounded-lg overflow-hidden mb-3 bg-muted/30">
                  <Image
                    src={normalizeImageSrc(detection.image)}
                    alt={`Detected ${detection.trashType}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-xs">
                      {detection.confidence}% match
                    </Badge>
                  </div>
                  <div className="absolute top-2 left-2">
                    <Badge variant="outline" className={`text-xs ${getThreatColor(detection.threatLevel)}`}>
                      {detection.threatLevel}
                    </Badge>
                  </div>
                </div>

                {/* Detection Details */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-balance">{detection.trashType}</h4>
                    <Badge
                      variant="outline"
                      className={
                        detection.size === "Large"
                          ? "border-destructive/50 text-destructive bg-destructive/10"
                          : detection.size === "Medium"
                            ? "border-yellow-500/50 text-yellow-500 bg-yellow-500/10"
                            : "border-green-500/50 text-green-500 bg-green-500/10"
                      }
                    >
                      {detection.size}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {detection.timestamp}
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {detection.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Hourglass className="h-3 w-3" />
                      {detection.decompositionYears}y
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/30">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Tap for full analysis</span>
                      <span className="text-accent font-medium">→</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Live Indicator */}
        <div className="px-6 py-3 border-t border-border/50 bg-accent/5">
          <div className="flex items-center gap-2 justify-center">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs text-accent font-medium">Monitoring for new objects...</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
