"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Waves } from "lucide-react"
import { ShaderAnimation } from "@/components/ui/shader-animation"
import { AiAnalystPanel } from "@/components/ai-analyst-panel"
import { TrashHeatmap } from "@/components/trash-heatmap"
import { NewTrashDetectionLog, type TrashDetection } from "@/components/new-trash-detection-log"
import { SonarViewer } from "@/components/sonar-viewer"
import { PathVisualizer } from "@/components/path-visualizer"
import { SatelliteCityAnalyzer } from "@/components/satellite-city-analyzer"

interface DashboardViewProps {
  onBackToLanding?: () => void
}

export function DashboardView({ onBackToLanding }: DashboardViewProps) {
  const [detections, setDetections] = useState<TrashDetection[]>([])
  const [currentView, setCurrentView] = useState<string>("dashboard")

  useEffect(() => {
    const fetchDetections = async () => {
      try {
        const response = await fetch("/api/detections")
        if (response.ok) {
          const data = await response.json()
          const filtered = (data.detections || []).filter(
            (d: TrashDetection) => d.threatLevel !== "Medium",
          )
          setDetections(filtered)
        }
      } catch (error) {
        console.error("Failed to fetch detections:", error)
      }
    }

    fetchDetections()
    const interval = setInterval(fetchDetections, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleBackToLanding = async () => {
    try {
      await fetch("/api/detections", { method: "DELETE" })
      setDetections([])
    } catch (error) {
      console.error("Failed to clear detections:", error)
    }
    onBackToLanding?.()
  }

  if (currentView === "visualizer") {
    return (
      <div className="bg-background">
        <Header activeView={currentView} onViewChange={setCurrentView} />
        <PathVisualizer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header activeView={currentView} onViewChange={setCurrentView} />

      <div className="container mx-auto px-4 pt-4 md:px-6 lg:px-8">
        <Button variant="outline" size="sm" onClick={handleBackToLanding} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to landing
        </Button>

        <div className="relative mb-8 flex h-[200px] w-full items-center justify-center overflow-hidden rounded-xl border border-border/40">
          <ShaderAnimation />
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-center">
            <div className="flex items-center gap-2">
              <Waves className="h-6 w-6 text-sky-200" />
              <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                Ocean<span className="text-sky-300">Eye</span> Dashboard
              </h2>
            </div>
            <p className="max-w-md text-sm text-blue-100/80">
              Real-time marine waste monitoring &amp; AI-powered analytics
            </p>
          </div>
        </div>

        {currentView === "dashboard" && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <AiAnalystPanel />
              </div>
              <div>
                <NewTrashDetectionLog detections={detections} />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <SonarViewer />
              <TrashHeatmap />
            </div>

            <footer className="mt-12 text-center">
              <p className="text-lg italic text-muted-foreground">
                {"Protect the water that protects life."}
              </p>
            </footer>
          </div>
        )}

        {currentView === "satellite" && (
          <div className="space-y-6">
            <SatelliteCityAnalyzer />
          </div>
        )}
      </div>
    </div>
  )
}
