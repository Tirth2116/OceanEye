import { Header } from "@/components/header"
import { AiAnalystPanel } from "@/components/ai-analyst-panel"
import { TrashHeatmap } from "@/components/trash-heatmap"
import { PollutionTracker } from "@/components/pollution-tracker"
import { SonarViewer } from "@/components/sonar-viewer"
import { SwarmSimulation } from "@/components/swarm-simulation"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header />

      {/* Main Dashboard Grid */}
      <main className="container mx-auto px-4 py-8 md:px-6 lg:px-8">
        <div className="grid gap-6 md:gap-8">
          {/* Top Row - AI Analyst (larger) */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <AiAnalystPanel />
            </div>
            <div>
              <PollutionTracker />
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
          <p className="text-lg text-muted-foreground italic">{"Protect the water that protects life. 🌊"}</p>
        </footer>
      </main>
    </div>
  )
}
