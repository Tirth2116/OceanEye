"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import {
  Satellite,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Info,
  Droplets,
  Leaf,
  Eye,
  Waves,
} from "lucide-react"

interface SatelliteData {
  date: string
  ndci: number
  ndwi: number
  ndvi: number
  fdi: number
}

interface Analysis {
  status: string
  level: number
  trend: string
  avgFdi: number
  recentAvg: number
}

interface SatelliteResponse {
  success: boolean
  data: SatelliteData[]
  analysis: Analysis
  aoi: {
    name: string
    center: number[]
  }
}

export function SatelliteMonitor() {
  const [data, setData] = useState<SatelliteData[]>([])
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<"30" | "60" | "90">("90")

  useEffect(() => {
    fetchSatelliteData()
  }, [timeRange])

  const fetchSatelliteData = async () => {
    setLoading(true)
    setError(null)

    try {
      const endDate = new Date().toISOString().split("T")[0]
      const startDate = new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0]

      const response = await fetch(
        `http://localhost:5001/api/satellite/time-series?start_date=${startDate}&end_date=${endDate}`
      )

      if (!response.ok) {
        throw new Error("Failed to fetch satellite data")
      }

      const result: SatelliteResponse = await response.json()
      
      if (result.success) {
        setData(result.data)
        setAnalysis(result.analysis)
      } else {
        throw new Error("Invalid response from server")
      }
    } catch (err) {
      console.error("Error fetching satellite data:", err)
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "excellent":
        return {
          label: "Excellent",
          color: "bg-green-500",
          textColor: "text-green-400",
          icon: CheckCircle2,
          description: "Water quality is excellent with minimal pollution",
        }
      case "good":
        return {
          label: "Good",
          color: "bg-blue-500",
          textColor: "text-blue-400",
          icon: CheckCircle2,
          description: "Water quality is good with low pollution levels",
        }
      case "moderate":
        return {
          label: "Moderate",
          color: "bg-yellow-500",
          textColor: "text-yellow-400",
          icon: Info,
          description: "Moderate pollution detected, monitoring recommended",
        }
      case "poor":
        return {
          label: "Poor",
          color: "bg-orange-500",
          textColor: "text-orange-400",
          icon: AlertTriangle,
          description: "Poor water quality, action recommended",
        }
      case "critical":
        return {
          label: "Critical",
          color: "bg-red-500",
          textColor: "text-red-400",
          icon: AlertTriangle,
          description: "Critical pollution levels, immediate action needed",
        }
      default:
        return {
          label: "Unknown",
          color: "bg-gray-500",
          textColor: "text-gray-400",
          icon: Info,
          description: "Status unknown",
        }
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingDown className="h-4 w-4 text-green-400" />
      case "worsening":
        return <TrendingUp className="h-4 w-4 text-red-400" />
      default:
        return <Minus className="h-4 w-4 text-yellow-400" />
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="glass-panel border-red-500/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Error Loading Satellite Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchSatelliteData} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const statusConfig = analysis ? getStatusConfig(analysis.status) : null
  const StatusIcon = statusConfig?.icon || Info

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Satellite className="h-8 w-8 text-primary" />
            <div className="absolute inset-0 blur-lg bg-primary/30 -z-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Satellite Monitoring</h2>
            <p className="text-sm text-muted-foreground">Real-time ocean health from Sentinel-2</p>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          <Button
            variant={timeRange === "30" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange("30")}
          >
            30 Days
          </Button>
          <Button
            variant={timeRange === "60" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange("60")}
          >
            60 Days
          </Button>
          <Button
            variant={timeRange === "90" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange("90")}
          >
            90 Days
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      {analysis && statusConfig && (
        <Card className="glass-panel border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Current Water Quality Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Status Badge */}
              <div className="flex flex-col items-center justify-center p-6 rounded-lg border border-border/30 bg-background/50">
                <StatusIcon className={`h-12 w-12 ${statusConfig.textColor} mb-3`} />
                <Badge variant="secondary" className={`${statusConfig.color} text-white mb-2`}>
                  {statusConfig.label}
                </Badge>
                <p className="text-sm text-center text-muted-foreground">{statusConfig.description}</p>
              </div>

              {/* Metrics */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Average FDI</span>
                    <span className="text-lg font-bold">{analysis.avgFdi.toFixed(3)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${statusConfig.color} transition-all`}
                      style={{ width: `${Math.min(100, analysis.avgFdi * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Recent Average</span>
                    <span className="text-lg font-bold">{analysis.recentAvg.toFixed(3)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${statusConfig.color} transition-all`}
                      style={{ width: `${Math.min(100, analysis.recentAvg * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Trend */}
              <div className="flex flex-col items-center justify-center p-6 rounded-lg border border-border/30 bg-background/50">
                <div className="mb-3">{getTrendIcon(analysis.trend)}</div>
                <h4 className="font-semibold text-lg capitalize mb-2">{analysis.trend}</h4>
                <p className="text-sm text-center text-muted-foreground">
                  {analysis.trend === "improving"
                    ? "Water quality is improving over time"
                    : analysis.trend === "worsening"
                      ? "Water quality is declining"
                      : "Water quality remains stable"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Floating Debris Index (FDI) */}
        <Card className="glass-panel border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4 text-primary" />
              Floating Debris Index (FDI)
            </CardTitle>
            <CardDescription>Higher values indicate more floating debris</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="fdi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} domain={[-0.5, 1]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    border: "1px solid #333",
                    borderRadius: "8px",
                  }}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Area type="monotone" dataKey="fdi" stroke="#ef4444" fillOpacity={1} fill="url(#fdi)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Water Index (NDWI) */}
        <Card className="glass-panel border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Droplets className="h-4 w-4 text-cyan-400" />
              Normalized Difference Water Index (NDWI)
            </CardTitle>
            <CardDescription>Water body identification and moisture</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="ndwi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} domain={[-0.5, 1]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    border: "1px solid #333",
                    borderRadius: "8px",
                  }}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Area type="monotone" dataKey="ndwi" stroke="#06b6d4" fillOpacity={1} fill="url(#ndwi)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chlorophyll Index (NDCI) */}
        <Card className="glass-panel border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Waves className="h-4 w-4 text-green-400" />
              Normalized Difference Chlorophyll Index (NDCI)
            </CardTitle>
            <CardDescription>Algae and chlorophyll concentration</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} domain={[-0.5, 1]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    border: "1px solid #333",
                    borderRadius: "8px",
                  }}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Line type="monotone" dataKey="ndci" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vegetation Index (NDVI) */}
        <Card className="glass-panel border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Leaf className="h-4 w-4 text-emerald-400" />
              Normalized Difference Vegetation Index (NDVI)
            </CardTitle>
            <CardDescription>Vegetation health and density</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} domain={[-0.5, 1]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    border: "1px solid #333",
                    borderRadius: "8px",
                  }}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Line type="monotone" dataKey="ndvi" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Info Panel */}
      <Card className="glass-panel border-border/50 bg-gradient-to-br from-primary/10 to-accent/10">
        <CardHeader>
          <CardTitle className="text-base">About Satellite Monitoring</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">FDI (Floating Debris Index):</strong> Detects floating marine debris
            including plastics using NIR and SWIR bands.
          </p>
          <p>
            <strong className="text-foreground">NDWI:</strong> Identifies water bodies and measures water content in
            vegetation.
          </p>
          <p>
            <strong className="text-foreground">NDCI:</strong> Estimates chlorophyll concentration, useful for detecting
            algal blooms.
          </p>
          <p>
            <strong className="text-foreground">NDVI:</strong> Measures vegetation health near coastal areas.
          </p>
          <Separator className="my-3" />
          <p className="text-xs italic">
            Data sourced from Sentinel-2 satellite imagery via Google Earth Engine. Updated weekly with 10m resolution.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

