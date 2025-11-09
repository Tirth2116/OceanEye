"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { AiAnalystPanel } from "@/components/ai-analyst-panel"
import { TrashHeatmap } from "@/components/trash-heatmap"
import { NewTrashDetectionLog, type TrashDetection } from "@/components/new-trash-detection-log"
import { SonarViewer } from "@/components/sonar-viewer"
import { SwarmSimulation } from "@/components/swarm-simulation"

interface DashboardViewProps {
  onBackToLanding?: () => void
}

export function DashboardView({ onBackToLanding }: DashboardViewProps) {
  const [detections, setDetections] = useState<TrashDetection[]>([])

  // Poll for new detections every 2 seconds
  useEffect(() => {
    const fetchDetections = async () => {
      try {
        const response = await fetch("/api/detections")
        if (response.ok) {
          const data = await response.json()
          setDetections(data.detections || [])
        }
      } catch (error) {
        console.error("Failed to fetch detections:", error)
      }
    }

    // Initial fetch
    fetchDetections()

    // Poll every 2 seconds
    const interval = setInterval(fetchDetections, 2000)

    return () => clearInterval(interval)
  }, [])

  // Clear detections and go back to landing
  const handleBackToLanding = async () => {
    try {
      await fetch("/api/detections", { method: "DELETE" })
      setDetections([])
    } catch (error) {
      console.error("Failed to clear detections:", error)
    }
    onBackToLanding?.()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header />

      {/* Main Dashboard Grid */}
      <div className="container mx-auto px-4 pt-4 md:px-6 lg:px-8">
        <Button variant="outline" size="sm" onClick={handleBackToLanding}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to landing
        </Button>
      </div>
      <main className="container mx-auto px-4 py-8 md:px-6 lg:px-8">
        <div className="grid gap-6 md:gap-8">
          {/* Top Row - AI Analyst (larger) */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <AiAnalystPanel />
            </div>
            <div>
              <NewTrashDetectionLog detections={detections} />
            </div>
          </div>

          {/* Middle Row - Heatmap and Sonar */}
          <div className="grid gap-6 lg:grid-cols-2">
            <TrashHeatmap />
            <SonarViewer />
          </div>

          {/* Bottom Row - Swarm Simulation */}
          <SwarmSimulation />
        </div>

        {/* Footer Message */}
        <footer className="mt-12 text-center">
          <p className="text-lg text-muted-foreground italic">{"Protect the water that protects life."}</p>
        </footer>
      </main>
    </div>
  )
}
