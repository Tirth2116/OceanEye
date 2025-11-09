"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, MapPin, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const sources = [
  { id: 1, name: "Fishing Harbor", distance: "2.3 km", severity: "high", items: 342 },
  { id: 2, name: "Drainage Outlet", distance: "4.1 km", severity: "high", items: 289 },
  { id: 3, name: "Beach Area", distance: "1.8 km", severity: "medium", items: 156 },
  { id: 4, name: "Marina Dock", distance: "3.5 km", severity: "medium", items: 124 },
  { id: 5, name: "River Mouth", distance: "6.2 km", severity: "low", items: 78 },
]

export function PollutionTracker() {
  return (
    <Card className="glass-panel border-primary/20 overflow-hidden h-full">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <TrendingUp className="h-6 w-6 text-accent" />
            <div className="absolute inset-0 blur-md bg-accent/40 -z-10" />
          </div>
          <CardTitle className="text-xl font-bold text-balance">Pollution Sources</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          {sources.map((source, index) => (
            <div
              key={source.id}
              className="glass-panel rounded-lg p-4 border border-border/30 hover:border-primary/50 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-primary">#{index + 1}</span>
                  <div>
                    <h4 className="font-semibold text-sm text-balance">{source.name}</h4>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {source.distance}
                    </div>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    source.severity === "high"
                      ? "border-destructive/50 text-destructive bg-destructive/10"
                      : source.severity === "medium"
                        ? "border-yellow-500/50 text-yellow-500 bg-yellow-500/10"
                        : "border-green-500/50 text-green-500 bg-green-500/10"
                  }
                >
                  {source.severity}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Detected items</span>
                <span className="text-sm font-semibold text-accent">{source.items}</span>
              </div>
              <div className="mt-2 h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    source.severity === "high"
                      ? "bg-destructive"
                      : source.severity === "medium"
                        ? "bg-yellow-500"
                        : "bg-green-500"
                  }`}
                  style={{ width: `${(source.items / 350) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-xs text-destructive leading-relaxed text-balance">
              {"High pollution levels detected near fishing harbor. Recommend immediate action."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
