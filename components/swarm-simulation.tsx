"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, Play, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function SwarmSimulation() {
  const [isRunning, setIsRunning] = useState(false)
  const [collected, setCollected] = useState(0)

  const handleStart = () => {
    setIsRunning(true)
    // Simulate collection
    const interval = setInterval(() => {
      setCollected((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsRunning(false)
          return 100
        }
        return prev + 1
      })
    }, 100)
  }

  const handleReset = () => {
    setIsRunning(false)
    setCollected(0)
  }

  return (
    <Card className="glass-panel border-primary/20 overflow-hidden">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Sparkles className="h-6 w-6 text-secondary" />
              <div className="absolute inset-0 blur-md bg-secondary/40 -z-10" />
            </div>
            <CardTitle className="text-xl font-bold text-balance">Trash Collection Swarm Simulation</CardTitle>
          </div>
          <Badge
            variant="outline"
            className={
              isRunning
                ? "border-primary/40 text-primary bg-primary/10"
                : "border-muted-foreground/40 text-muted-foreground bg-muted/10"
            }
          >
            {isRunning ? "Running" : "Idle"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Simulation Canvas */}
          <div className="lg:col-span-2">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 border border-border/30">
              {/* Simulated ocean with particles */}
              <div className="absolute inset-0">
                {/* Trash particles (red dots) */}
                {!isRunning &&
                  [...Array(20)].map((_, i) => (
                    <div
                      key={`trash-${i}`}
                      className="absolute w-2 h-2 rounded-full bg-destructive animate-pulse"
                      style={{
                        left: `${Math.random() * 90 + 5}%`,
                        top: `${Math.random() * 90 + 5}%`,
                      }}
                    />
                  ))}

                {/* Collection drones (blue dots) - only show when running */}
                {isRunning &&
                  [...Array(5)].map((_, i) => (
                    <div
                      key={`drone-${i}`}
                      className="absolute w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/50"
                      style={{
                        left: `${Math.random() * 90 + 5}%`,
                        top: `${Math.random() * 90 + 5}%`,
                        animation: `float ${2 + Math.random() * 2}s ease-in-out infinite`,
                        animationDelay: `${Math.random()}s`,
                      }}
                    >
                      <div className="absolute inset-0 rounded-full bg-primary blur-md animate-pulse" />
                    </div>
                  ))}

                {/* Remaining trash during collection */}
                {isRunning &&
                  [...Array(Math.max(0, 20 - Math.floor(collected / 5)))].map((_, i) => (
                    <div
                      key={`remaining-${i}`}
                      className="absolute w-2 h-2 rounded-full bg-destructive opacity-50"
                      style={{
                        left: `${Math.random() * 90 + 5}%`,
                        top: `${Math.random() * 90 + 5}%`,
                      }}
                    />
                  ))}

                {/* Collection center */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-16 h-16 rounded-full border-2 border-accent/60 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border-2 border-accent/40" />
                    <div className="absolute w-8 h-8 rounded-full bg-accent/20" />
                  </div>
                </div>
              </div>

              {/* Stats Overlay */}
              <div className="absolute bottom-4 left-4 right-4 glass-panel rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Active Drones</p>
                    <p className="text-xl font-bold text-primary">{isRunning ? "5" : "0"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Collected</p>
                    <p className="text-xl font-bold text-accent">{collected}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Efficiency</p>
                    <p className="text-xl font-bold text-secondary">{isRunning ? "87%" : "--"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls & Info */}
          <div className="space-y-4">
            <div className="glass-panel rounded-xl p-4 border border-border/30">
              <h3 className="text-sm font-semibold mb-3 text-balance">Simulation Controls</h3>
              <div className="space-y-3">
                <Button
                  className="w-full gap-2 bg-primary hover:bg-primary/90"
                  onClick={handleStart}
                  disabled={isRunning || collected >= 100}
                >
                  <Play className="h-4 w-4" />
                  Start Simulation
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2 border-border/50 bg-transparent"
                  onClick={handleReset}
                  disabled={collected === 0 && !isRunning}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>

            <div className="glass-panel rounded-xl p-4 border border-border/30">
              <h3 className="text-sm font-semibold mb-2 text-balance">Swarm Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Drone Type</span>
                  <span className="font-medium">AquaBot-X</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Coverage</span>
                  <span className="font-medium">2.5 km²</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Battery</span>
                  <span className="font-medium text-accent">94%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-medium">50kg/drone</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
              <p className="text-xs text-primary leading-relaxed text-balance">
                {"Autonomous drones work collaboratively to collect detected ocean waste efficiently"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
