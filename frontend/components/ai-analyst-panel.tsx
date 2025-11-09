"use client"

import { useRef, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Brain, Camera, Upload, Video } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

export function AiAnalystPanel() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const [funFact, setFunFact] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Ocean plastics fun facts source list
  const ALL_FUN_FACTS: string[] = [
    "Over 8 million tons of plastic enter the oceans every year.",
    "Plastic can take more than 400 years to degrade in the ocean.",
    "By 2050, plastic in the ocean could outweigh fish by mass if trends continue.",
    "Around 700 marine species are harmed by plastic through ingestion or entanglement.",
    "Sea turtles often mistake plastic bags for jellyfish, a key part of their diet.",
    "Microplastics have been found in seafood, drinking water, and even sea salt.",
    "Ghost fishing gear (lost nets and lines) continues trapping marine life for years.",
    "Only about 9% of all plastic ever produced has been recycled globally.",
  ]

  useEffect(() => {
    // Pick one random fact on mount
    const i = Math.floor(Math.random() * ALL_FUN_FACTS.length)
    setFunFact(ALL_FUN_FACTS[i])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setOutputUrl(null)
    // Show preview immediately
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)
    try {
      const fd = new FormData()
      fd.append("file", file)
      // Call Flask backend directly
      const res = await fetch("http://localhost:5001/upload-video", {
        method: "POST",
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) {
        console.error("Upload failed:", data)
        alert(`Upload failed: ${data?.error || res.statusText}`)
      } else {
        setJobId(data.job_id)
        setProcessing(true)
        // Start polling status with progress
        const interval = setInterval(async () => {
          try {
            const r = await fetch(`http://localhost:5001/jobs/${data.job_id}/status`)
            const s = await r.json()
            if (s?.status === "finished") {
              clearInterval(interval)
              setProcessing(false)
              setProgress(100)
              if (s?.output_url) {
                try {
                  const resp = await fetch(s.output_url, { cache: "no-store", mode: "cors" })
                  const blob = await resp.blob()
                  const local = URL.createObjectURL(blob)
                  // Revoke previous blob if any
                  setOutputUrl((prev) => {
                    if (prev && prev.startsWith("blob:")) {
                      try { URL.revokeObjectURL(prev) } catch {}
                    }
                    return local
                  })
                } catch {
                  setOutputUrl(s.output_url)
                }
              } else {
                setOutputUrl(null)
              }
              // Revoke preview URL to free memory
              if (localUrl) URL.revokeObjectURL(localUrl)
            } else if (s?.status === "error") {
              clearInterval(interval)
              setProcessing(false)
              alert("Processing failed. See backend logs.\nJob: " + data.job_id)
            } else {
              if (typeof s?.progress_percent === "number") {
                setProgress(Math.max(1, Math.min(99, Math.round(s.progress_percent))))
              }
            }
          } catch {
            // ignore a single polling error
          }
        }, 1500)
        pollRef.current = interval as unknown as NodeJS.Timeout
      }
    } catch (err: any) {
      console.error(err)
      alert("Failed to start processing.")
    } finally {
      setUploading(false)
      // reset the input so the same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      // revoke preview URL if exists
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

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

          {/* Video Area */}
          <div className="relative h-full flex items-center justify-center">
            {outputUrl ? (
              <video
                key={outputUrl}
                className="w-full h-full object-cover"
                controls
                playsInline
                autoPlay
                muted
                crossOrigin="anonymous"
                ref={videoRef}
              >
                <source src={outputUrl} type="video/mp4" />
              </video>
            ) : previewUrl ? (
              <video
                key={previewUrl}
                className="w-full h-full object-cover"
                controls
                muted
                autoPlay
                loop
                playsInline
                ref={videoRef}
              >
                <source src={previewUrl} type="video/mp4" />
              </video>
            ) : (
              <img
                src="/ocean-water-surface-drone-view-plastic-bottles-flo.jpg"
                alt="Ocean surveillance feed"
                className="w-full h-full object-cover"
              />
            )}

            {/* Progress Overlay */}
            {processing && (
              <div className="absolute top-4 left-4 right-4 glass-panel rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Progress value={progress ?? 10} />
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {typeof progress === "number" ? `${progress}%` : "…"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fun Fact */}
        <div className="glass-panel rounded-xl p-5 mb-4 border border-primary/20">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Fun Fact
          </h3>
          <p className="text-base leading-relaxed text-balance">
            {funFact}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Video className="h-4 w-4" />
            Live Camera
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-border/50 hover:border-primary/50 bg-transparent"
            onClick={handleUploadClick}
            disabled={uploading}
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : "Upload Video"}
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-border/50 hover:border-primary/50 bg-transparent"
            onClick={async () => {
              try {
                const video = videoRef.current
                if (!video) {
                  alert("No video to capture. Upload or play a video first.")
                  return
                }
                // Ensure we have frame data
                if (video.readyState < 2 /* HAVE_CURRENT_DATA */) {
                  await new Promise<void>((resolve) => {
                    const onLoaded = () => {
                      video.removeEventListener("loadeddata", onLoaded)
                      resolve()
                    }
                    video.addEventListener("loadeddata", onLoaded, { once: true })
                  })
                }
                const width = video.videoWidth || video.clientWidth
                const height = video.videoHeight || video.clientHeight
                if (!width || !height) {
                  alert("Unable to capture frame from the current video.")
                  return
                }
                const canvas = document.createElement("canvas")
                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext("2d")
                if (!ctx) {
                  alert("Canvas context unavailable.")
                  return
                }
                ctx.drawImage(video, 0, 0, width, height)
                setIsAnalyzing(true)
                const blob: Blob | null = await new Promise((resolve) =>
                  canvas.toBlob((b) => resolve(b), "image/png", 0.92)
                )
                if (!blob) {
                  setIsAnalyzing(false)
                  alert("Failed to encode captured frame.")
                  return
                }
                const file = new File([blob], `frame_${Date.now()}.png`, { type: "image/png" })
                const fd = new FormData()
                fd.append("file", file)
                const res = await fetch("http://localhost:5001/upload-image", {
                  method: "POST",
                  body: fd,
                })
                const data = await res.json().catch(() => ({}))
                setIsAnalyzing(false)
                if (!res.ok) {
                  console.error("Capture upload failed:", data)
                  alert(`Capture failed: ${data?.error || res.statusText}`)
                  return
                }
                // Success: backend already forwarded detection to dashboard.
                // The right panel polls /api/detections every 2s and will reflect this.
              } catch (e) {
                setIsAnalyzing(false)
                console.error(e)
                alert("Capture failed. See console for details.")
              }
            }}
            disabled={isAnalyzing}
          >
            <Camera className="h-4 w-4" />
            {isAnalyzing ? "Analyzing…" : "Capture Frame"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </CardContent>
    </Card>
  )
}


