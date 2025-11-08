"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Map, MapPin, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export function TrashHeatmap() {
  const [showCurrents, setShowCurrents] = useState(false)
  const [timeRange, setTimeRange] = useState([7])

  return (
    <Card className="glass-panel border-primary/20 overflow-hidden">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Map className="h-6 w-6 text-secondary" />
              <div className="absolute inset-0 blur-md bg-secondary/40 -z-10" />
            </div>
            <CardTitle className="text-xl font-bold text-balance">Trash Heatmap</CardTitle>
          </div>
          <Button variant="outline" size="sm" className="gap-2 border-border/50 bg-transparent">
            <Layers className="h-4 w-4" />
            Layers
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* Map Container */}
        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted/20 border border-border/30 mb-4">
          {/* Simulated Map */}
          <div className="relative h-full">
            <img src="/ocean-map-with-coordinates-satellite-view.jpg" alt="Ocean map" className="w-full h-full object-cover opacity-80" />

            {/* Heatmap Clusters */}
            <div className="absolute inset-0">
              {/* Red cluster - high concentration */}
              <div className="absolute top-1/3 left-1/2 w-32 h-32 rounded-full bg-destructive/60 blur-2xl animate-pulse" />
              <MapPin className="absolute top-1/3 left-1/2 h-6 w-6 text-destructive -translate-x-1/2 -translate-y-1/2" />

              {/* Yellow cluster - medium */}
              <div className="absolute top-2/3 left-1/3 w-24 h-24 rounded-full bg-yellow-500/50 blur-xl animate-pulse" />
              <MapPin className="absolute top-2/3 left-1/3 h-5 w-5 text-yellow-500 -translate-x-1/2 -translate-y-1/2" />

              {/* Green cluster - low */}
              <div className="absolute top-1/2 right-1/4 w-20 h-20 rounded-full bg-green-500/40 blur-lg animate-pulse" />
              <MapPin className="absolute top-1/2 right-1/4 h-4 w-4 text-green-500 -translate-x-1/2 -translate-y-1/2" />
            </div>

            {/* Ocean Currents Overlay */}
            {showCurrents && (
              <div className="absolute inset-0 pointer-events-none">
                <svg className="w-full h-full" viewBox="0 0 800 600">
                  <defs>
                    <linearGradient id="currentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgba(0, 200, 255, 0.6)" />
                      <stop offset="100%" stopColor="rgba(0, 255, 200, 0.3)" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 100 200 Q 300 150 500 250 Q 600 300 700 200"
                    stroke="url(#currentGradient)"
                    strokeWidth="3"
                    fill="none"
                    className="wave-animate"
                  />
                  <path
                    d="M 150 400 Q 350 350 550 450"
                    stroke="url(#currentGradient)"
                    strokeWidth="3"
                    fill="none"
                    className="wave-animate"
                    style={{ animationDelay: "1s" }}
                  />
                </svg>
              </div>
            )}

            {/* Legend */}
            <div className="absolute top-4 right-4 glass-panel rounded-lg p-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span>High (100+)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span>Medium (50-99)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>Low ({`<`}50)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="currents" className="text-sm font-medium">
              Show Ocean Currents Overlay
            </Label>
            <Switch id="currents" checked={showCurrents} onCheckedChange={setShowCurrents} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Time Range</Label>
              <span className="text-sm text-muted-foreground">{timeRange[0]} days</span>
            </div>
            <Slider value={timeRange} onValueChange={setTimeRange} max={30} min={1} step={1} className="w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
