import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { AiAnalystPanel } from "@/components/ai-analyst-panel"
import { TrashHeatmap } from "@/components/trash-heatmap"
import { NewTrashDetectionLog } from "@/components/new-trash-detection-log"
import { SonarViewer } from "@/components/sonar-viewer"
import { SwarmSimulation } from "@/components/swarm-simulation"

interface DashboardViewProps {
  onBackToLanding?: () => void
}

export function DashboardView({ onBackToLanding }: DashboardViewProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header />

      {/* Main Dashboard Grid */}
      <div className="container mx-auto px-4 pt-4 md:px-6 lg:px-8">
        <Button variant="outline" size="sm" onClick={onBackToLanding}>
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
              <NewTrashDetectionLog />
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
