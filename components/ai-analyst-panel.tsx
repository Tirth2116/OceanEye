"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Brain, Camera, Upload, Video } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function AiAnalystPanel() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  return (
    <Card className="glass-panel border-primary/20 overflow-hidden">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Brain className="h-6 w-6 text-primary" />
              <div className="absolute inset-0 blur-md bg-primary/40 pulse-glow -z-10" />
            </div>
            <CardTitle className="text-2xl font-bold text-balance">AI Marine Analyst</CardTitle>
          </div>
          <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Live Detection
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* Video Preview Area */}
        <div className="relative aspect-video rounded-xl overflow-hidden bg-muted/20 border border-border/30 mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />

          {/* Simulated Video with Segmentation Overlay */}
          <div className="relative h-full flex items-center justify-center">
            <img
              src="/ocean-water-surface-drone-view-plastic-bottles-flo.jpg"
              alt="Ocean surveillance feed"
              className="w-full h-full object-cover"
            />

            {/* AI Segmentation Overlays */}
            <div className="absolute inset-0">
              {/* Simulated detection boxes */}
              <div className="absolute top-1/4 left-1/3 w-24 h-24 border-2 border-destructive rounded-lg animate-pulse">
                <span className="absolute -top-6 left-0 text-xs bg-destructive/80 px-2 py-1 rounded text-white">
                  Plastic Bottle
                </span>
              </div>
              <div className="absolute top-1/2 right-1/4 w-32 h-20 border-2 border-destructive rounded-lg animate-pulse">
                <span className="absolute -top-6 left-0 text-xs bg-destructive/80 px-2 py-1 rounded text-white">
                  Wrapper
                </span>
              </div>
              <div className="absolute bottom-1/3 left-1/4 w-20 h-16 border-2 border-destructive rounded-lg animate-pulse">
                <span className="absolute -top-6 left-0 text-xs bg-destructive/80 px-2 py-1 rounded text-white">
                  Debris
                </span>
              </div>
            </div>

            {/* Stats Overlay */}
            <div className="absolute bottom-4 left-4 right-4 glass-panel rounded-lg p-3">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Detected Items</p>
                  <p className="text-xl font-bold text-primary">127</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Confidence</p>
                  <p className="text-xl font-bold text-accent">94.2%</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Processing</p>
                  <p className="text-xl font-bold text-secondary">Real-time</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Summary */}
        <div className="glass-panel rounded-xl p-5 mb-4 border border-primary/20">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            AI Summary
          </h3>
          <p className="text-base leading-relaxed text-balance">
            {
              "Most waste detected is plastic bottles and wrappers. High concentration detected in sector B-7. Recent increase suggests nearby pollution source. Recommend immediate collection protocol."
            }
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Video className="h-4 w-4" />
            Live Camera
          </Button>
          <Button variant="outline" className="gap-2 border-border/50 hover:border-primary/50 bg-transparent">
            <Upload className="h-4 w-4" />
            Upload Video
          </Button>
          <Button variant="outline" className="gap-2 border-border/50 hover:border-primary/50 bg-transparent">
            <Camera className="h-4 w-4" />
            Capture Frame
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
