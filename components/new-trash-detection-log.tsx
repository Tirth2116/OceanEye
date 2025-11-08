"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, Clock, Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image"

// Simulated detection log - when NEW trash objects are detected
const detections = [
  {
    id: 1,
    timestamp: "14:32:18",
    image: "/ocean-water-with-plastic-bottle-floating-aerial-vi.jpg",
    trashType: "Plastic Bottle",
    confidence: 94,
    location: "Zone A-3",
    size: "Medium",
  },
  {
    id: 2,
    timestamp: "14:28:45",
    image: "/ocean-debris-fishing-net-in-water-drone-view.jpg",
    trashType: "Fishing Net",
    confidence: 89,
    location: "Zone B-1",
    size: "Large",
  },
  {
    id: 3,
    timestamp: "14:25:12",
    image: "/plastic-bag-floating-ocean-surface-aerial.jpg",
    trashType: "Plastic Bag",
    confidence: 96,
    location: "Zone A-2",
    size: "Small",
  },
  {
    id: 4,
    timestamp: "14:21:33",
    image: "/styrofoam-container-floating-in-ocean-water.jpg",
    trashType: "Styrofoam",
    confidence: 91,
    location: "Zone C-4",
    size: "Medium",
  },
]

export function NewTrashDetectionLog() {
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
          Captured frames when AI identifies new objects only
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[520px]">
          <div className="p-6 space-y-4">
            {detections.map((detection) => (
              <div
                key={detection.id}
                className="glass-panel rounded-lg p-3 border border-border/30 hover:border-primary/50 transition-all duration-200"
              >
                {/* Image Preview */}
                <div className="relative w-full h-28 rounded-lg overflow-hidden mb-3 bg-muted/30">
                  <Image
                    src={detection.image || "/placeholder.svg"}
                    alt={`Detected ${detection.trashType}`}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-xs">
                      {detection.confidence}% match
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
                  </div>

                  <div className="pt-2 border-t border-border/30">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Status</span>
                      <span className="text-accent font-medium">Logged & Ready</span>
                    </div>
                  </div>
                </div>
              </div>
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
