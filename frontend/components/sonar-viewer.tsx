"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Radar, Circle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function SonarViewer() {
  return (
    <Card className="glass-panel border-primary/20 overflow-hidden">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Radar className="h-6 w-6 text-accent" />
              <div className="absolute inset-0 blur-md bg-accent/40 pulse-glow -z-10" />
            </div>
            <CardTitle className="text-xl font-bold text-balance">Sonar Ocean Floor</CardTitle>
          </div>
          <Badge variant="outline" className="border-accent/40 text-accent bg-accent/10">
            Active Scan
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* 3D Sonar Visualization */}
        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-b from-primary/10 via-background to-primary/20 border border-border/30">
          {/* Simulated 3D Ocean Floor */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Sonar Ripple Effect */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute w-32 h-32 rounded-full border-2 border-accent/60 ripple-animate" />
              <div
                className="absolute w-32 h-32 rounded-full border-2 border-accent/40 ripple-animate"
                style={{ animationDelay: "1s" }}
              />
              <div
                className="absolute w-32 h-32 rounded-full border-2 border-accent/20 ripple-animate"
                style={{ animationDelay: "2s" }}
              />
            </div>

            {/* Center Sonar */}
            <div className="relative z-10">
              <Circle className="h-4 w-4 text-accent fill-accent" />
              <div className="absolute inset-0 blur-lg bg-accent/60 animate-pulse" />
            </div>

            {/* Terrain Lines */}
            <svg className="absolute inset-0 w-full h-full opacity-60" viewBox="0 0 800 600">
              <defs>
                <linearGradient id="terrainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(0, 255, 200, 0.8)" />
                  <stop offset="100%" stopColor="rgba(0, 255, 200, 0.1)" />
                </linearGradient>
              </defs>
              {/* Ocean floor terrain */}
              <path
                d="M 0 300 Q 200 250 400 300 Q 600 350 800 300 L 800 600 L 0 600 Z"
                fill="url(#terrainGradient)"
                opacity="0.3"
              />
              <path
                d="M 0 300 Q 200 250 400 300 Q 600 350 800 300"
                stroke="rgba(0, 255, 200, 0.6)"
                strokeWidth="2"
                fill="none"
              />
              {/* Grid lines */}
              {[...Array(8)].map((_, i) => (
                <line
                  key={i}
                  x1="0"
                  y1={200 + i * 50}
                  x2="800"
                  y2={200 + i * 50}
                  stroke="rgba(0, 200, 255, 0.2)"
                  strokeWidth="1"
                />
              ))}
              {[...Array(8)].map((_, i) => (
                <line
                  key={i}
                  x1={100 + i * 100}
                  y1="0"
                  x2={100 + i * 100}
                  y2="600"
                  stroke="rgba(0, 200, 255, 0.2)"
                  strokeWidth="1"
                />
              ))}
              {/* Debris points */}
              <circle cx="250" cy="320" r="4" fill="#ef4444" className="animate-pulse" />
              <circle cx="450" cy="280" r="3" fill="#ef4444" className="animate-pulse" />
              <circle cx="600" cy="330" r="4" fill="#ef4444" className="animate-pulse" />
            </svg>
          </div>

          {/* Depth Indicator */}
          <div className="absolute bottom-4 left-4 glass-panel rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">Scan Depth</div>
            <div className="text-2xl font-bold text-accent">34.2m</div>
          </div>

          {/* Stats */}
          <div className="absolute top-4 right-4 glass-panel rounded-lg p-3">
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Objects</span>
                <span className="font-semibold text-destructive">23</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Scan Rate</span>
                <span className="font-semibold text-accent">60 Hz</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground text-balance">
            {"Real-time sonar visualization of ocean floor debris and topology"}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
