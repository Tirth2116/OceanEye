"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
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
  Search,
  MapPin,
  Loader2,
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

interface Location {
  name: string
  center: number[]
  coordinates: number[]
  source?: string
}

interface City {
  name: string
  center: number[]
  coordinates: number[]
}

export function SatelliteCityAnalyzer() {
  const [cityInput, setCityInput] = useState("")
  const [selectedCity, setSelectedCity] = useState<string>("Mumbai")
  const [location, setLocation] = useState<Location | null>(null)
  const [data, setData] = useState<SatelliteData[]>([])
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<number>(90)
  const [availableCities, setAvailableCities] = useState<City[]>([])
  const [showCityList, setShowCityList] = useState(false)

  // Fetch available cities on mount
  useEffect(() => {
    fetchAvailableCities()
  }, [])

  const fetchAvailableCities = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/satellite/cities")
      const result = await response.json()
      if (result.success) {
        setAvailableCities(result.cities)
      }
    } catch (err) {
      console.error("Error fetching cities:", err)
    }
  }

  const analyzeCity = async () => {
    if (!cityInput.trim() && !selectedCity) {
      setError("Please enter a city name")
      return
    }

    const cityToAnalyze = cityInput.trim() || selectedCity
    setLoading(true)
    setError(null)
    setLoadingProgress(0)

    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 300)

    try {
      const response = await fetch(
        `http://localhost:5001/api/satellite/analyze?city=${encodeURIComponent(cityToAnalyze)}&days=${timeRange}`
      )

      if (!response.ok) {
        throw new Error("City not found or unable to analyze")
      }

      const result = await response.json()

      if (result.success) {
        setLocation(result.location)
        setData(result.data)
        setAnalysis(result.analysis)
        setSelectedCity(cityToAnalyze)
        setLoadingProgress(100)
      } else {
        throw new Error(result.error || "Failed to analyze city")
      }
    } catch (err) {
      console.error("Error analyzing city:", err)
      setError(err instanceof Error ? err.message : "Failed to analyze city")
    } finally {
      clearInterval(progressInterval)
      setTimeout(() => {
        setLoading(false)
        setLoadingProgress(0)
      }, 500)
    }
  }

  const handleCitySelect = (cityName: string) => {
    setCityInput(cityName)
    setShowCityList(false)
    setTimeout(() => analyzeCity(), 100)
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "excellent":
        return {
          label: "Excellent",
          color: "bg-green-500",
          textColor: "text-green-400",
          borderColor: "border-green-500/50",
          icon: CheckCircle2,
          description: "Water quality is excellent with minimal pollution",
        }
      case "good":
        return {
          label: "Good",
          color: "bg-blue-500",
          textColor: "text-blue-400",
          borderColor: "border-blue-500/50",
          icon: CheckCircle2,
          description: "Water quality is good with low pollution levels",
        }
      case "moderate":
        return {
          label: "Moderate",
          color: "bg-yellow-500",
          textColor: "text-yellow-400",
          borderColor: "border-yellow-500/50",
          icon: Info,
          description: "Moderate pollution detected, monitoring recommended",
        }
      case "poor":
        return {
          label: "Poor",
          color: "bg-orange-500",
          textColor: "text-orange-400",
          borderColor: "border-orange-500/50",
          icon: AlertTriangle,
          description: "Poor water quality, action recommended",
        }
      case "critical":
        return {
          label: "Critical",
          color: "bg-red-500",
          textColor: "text-red-400",
          borderColor: "border-red-500/50",
          icon: AlertTriangle,
          description: "Critical pollution levels, immediate action needed",
        }
      default:
        return {
          label: "Unknown",
          color: "bg-gray-500",
          textColor: "text-gray-400",
          borderColor: "border-gray-500/50",
          icon: Info,
          description: "Status unknown",
        }
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingDown className="h-5 w-5 text-green-400" />
      case "worsening":
        return <TrendingUp className="h-5 w-5 text-red-400" />
      default:
        return <Minus className="h-5 w-5 text-yellow-400" />
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const statusConfig = analysis ? getStatusConfig(analysis.status) : null
  const StatusIcon = statusConfig?.icon || Info

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <Card className="glass-panel border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <Satellite className="h-8 w-8 text-primary" />
              <div className="absolute inset-0 blur-lg bg-primary/30 -z-10" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">🌍 Global Satellite Ocean Analysis</h2>
              <p className="text-sm text-muted-foreground">
                Analyze ocean health for any coastal city worldwide
              </p>
            </div>
          </div>

          {/* Search Section */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter city name (e.g., Mumbai, Tokyo, New York, Sydney...)"
                  value={cityInput}
                  onChange={(e) => {
                    setCityInput(e.target.value)
                    setShowCityList(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      analyzeCity()
                    }
                  }}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
              <Button onClick={analyzeCity} disabled={loading} className="min-w-[120px]">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </div>

            {/* Quick City Buttons */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground self-center mr-2">Quick select:</span>
              {availableCities.slice(0, 6).map((city) => (
                <Button
                  key={city.name}
                  variant="outline"
                  size="sm"
                  onClick={() => handleCitySelect(city.name)}
                  disabled={loading}
                  className="text-xs"
                >
                  <MapPin className="h-3 w-3 mr-1" />
                  {city.name}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCityList(!showCityList)}
                className="text-xs"
              >
                {showCityList ? "Hide" : "More cities..."}
              </Button>
            </div>

            {/* Expanded City List */}
            {showCityList && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-4 bg-muted/30 rounded-lg">
                {availableCities.map((city) => (
                  <Button
                    key={city.name}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCitySelect(city.name)}
                    disabled={loading}
                    className="justify-start text-xs"
                  >
                    {city.name}
                  </Button>
                ))}
              </div>
            )}

            {/* Time Range Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Analysis period:</span>
              <div className="flex gap-2">
                {[30, 60, 90, 120].map((days) => (
                  <Button
                    key={days}
                    variant={timeRange === days ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeRange(days)}
                    disabled={loading}
                  >
                    {days} Days
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Loading Progress Bar */}
        {loading && (
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fetching satellite data...</span>
                <span className="text-primary font-medium">{loadingProgress}%</span>
              </div>
              <Progress value={loadingProgress} className="h-3" />
              <p className="text-xs text-muted-foreground text-center">
                Analyzing Sentinel-2 imagery from Google Earth Engine
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="glass-panel border-red-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Unable to Analyze City
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Try searching for a major coastal city or check your spelling.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Location card removed to avoid Google Maps API usage */}

      {/* Status Overview */}
      {analysis && statusConfig && !loading && (
        <Card className={`glass-panel ${statusConfig.borderColor} border-2`}>
          <CardHeader>
            <CardTitle className="text-lg">Water Quality Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Status Badge */}
              <div className="flex flex-col items-center justify-center p-6 rounded-lg border border-border/30 bg-background/50">
                <StatusIcon className={`h-16 w-16 ${statusConfig.textColor} mb-3`} />
                <Badge variant="secondary" className={`${statusConfig.color} text-white mb-2 px-4 py-1`}>
                  {statusConfig.label}
                </Badge>
                <p className="text-sm text-center text-muted-foreground">{statusConfig.description}</p>
                <div className="mt-2 text-xs text-muted-foreground">Level {analysis.level}/5</div>
              </div>

              {/* Metrics */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Average FDI</span>
                    <span className="text-xl font-bold">{analysis.avgFdi.toFixed(3)}</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${statusConfig.color} transition-all duration-500`}
                      style={{ width: `${Math.min(100, analysis.avgFdi * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Floating Debris Index</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Recent Avg</span>
                    <span className="text-xl font-bold">{analysis.recentAvg.toFixed(3)}</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${statusConfig.color} transition-all duration-500`}
                      style={{ width: `${Math.min(100, analysis.recentAvg * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Last 3 measurements</p>
                </div>
              </div>

              {/* Trend */}
              <div className="flex flex-col items-center justify-center p-6 rounded-lg border border-border/30 bg-background/50">
                <div className="mb-3">{getTrendIcon(analysis.trend)}</div>
                <h4 className="font-semibold text-xl capitalize mb-2">{analysis.trend}</h4>
                <p className="text-sm text-center text-muted-foreground">
                  {analysis.trend === "improving"
                    ? "Ocean health is improving over time ✓"
                    : analysis.trend === "worsening"
                      ? "Ocean health is declining ⚠"
                      : "Ocean health remains stable →"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      {data.length > 0 && !loading && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Floating Debris Index (FDI) */}
          <Card className="glass-panel border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="h-4 w-4 text-primary" />
                Floating Debris Index (FDI)
              </CardTitle>
              <CardDescription>Higher values indicate more floating debris and plastic pollution</CardDescription>
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
                Water Index (NDWI)
              </CardTitle>
              <CardDescription>Water body health and moisture content</CardDescription>
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
                Chlorophyll Index (NDCI)
              </CardTitle>
              <CardDescription>Algae and phytoplankton concentration</CardDescription>
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
                Vegetation Index (NDVI)
              </CardTitle>
              <CardDescription>Coastal vegetation health</CardDescription>
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
      )}

      {/* Info Panel */}
      {data.length > 0 && !loading && (
        <Card className="glass-panel border-border/50 bg-gradient-to-br from-primary/10 to-accent/10">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" />
              Understanding the Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">FDI:</strong> Detects floating marine debris including plastics
              using Near-Infrared (NIR) and Short-Wave Infrared (SWIR) bands.
            </p>
            <p>
              <strong className="text-foreground">NDWI:</strong> Identifies water bodies and measures water content.
              Higher values indicate cleaner water.
            </p>
            <p>
              <strong className="text-foreground">NDCI:</strong> Estimates chlorophyll concentration, useful for
              detecting algal blooms and water quality.
            </p>
            <p>
              <strong className="text-foreground">NDVI:</strong> Measures vegetation health in coastal areas,
              indicating ecosystem vitality.
            </p>
            <Separator className="my-3" />
            <p className="text-xs italic flex items-center gap-2">
              <Satellite className="h-3 w-3" />
              Data from Sentinel-2 satellite via Google Earth Engine • 10m resolution • Cloud cover &lt; 20%
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

