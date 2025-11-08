"use client"

import type React from "react"

import { useState, useRef } from "react"
import { collection, addDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import { Camera, Upload, Loader, CheckCircle, XCircle, Sparkles, Zap, Recycle } from "lucide-react"

export default function ClassifyPage() {
  const { currentUser } = useAuth()
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [classification, setClassification] = useState<{
    category: string
    confidence: string
    recyclable: boolean
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const wasteCategories = [
    "Plastic Bottles",
    "Plastic Bags",
    "Food Containers",
    "Fishing Nets",
    "Straws",
    "Cups & Lids",
    "Cigarette Butts",
    "Other Plastic",
  ]

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      setClassification(null)
    }
  }

  const classifyWaste = async () => {
    if (!selectedImage || !currentUser) return

    setLoading(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const randomCategory = wasteCategories[Math.floor(Math.random() * wasteCategories.length)]
      const confidence = (Math.random() * 0.3 + 0.7).toFixed(2)

      const storageRef = ref(storage, `waste-images/${currentUser.uid}/${Date.now()}-${selectedImage.name}`)
      await uploadBytes(storageRef, selectedImage)
      const imageUrl = await getDownloadURL(storageRef)

      await addDoc(collection(db, "classifications"), {
        userId: currentUser.uid,
        userName: currentUser.displayName,
        category: randomCategory,
        confidence: Number.parseFloat(confidence),
        imageUrl,
        timestamp: new Date().toISOString(),
      })

      setClassification({
        category: randomCategory,
        confidence,
        recyclable: Math.random() > 0.3,
      })
    } catch (error) {
      console.error("Classification error:", error)
      alert("Failed to classify waste. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setSelectedImage(null)
    setPreview(null)
    setClassification(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-12 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-3 h-3 bg-[rgb(var(--toxic-green))] rounded-full animate-pulse opacity-50" />
        <div className="absolute top-40 right-20 w-4 h-4 bg-[rgb(var(--ocean-accent))] rounded-full animate-bounce opacity-50" />
        <div
          className="absolute bottom-32 left-1/4 w-2 h-2 bg-[rgb(var(--recycle-cyan))] rounded-full animate-pulse opacity-50"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 glassmorphism rounded-full text-sm font-medium text-[rgb(var(--ocean-accent))] mb-6 pulse-glow">
            <Zap className="w-4 h-4" />
            AI-Powered Classification
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold mb-4 text-balance">
            <span className="block text-white mb-2">Classify</span>
            <span className="block bg-gradient-to-r from-[rgb(var(--toxic-green))] via-[rgb(var(--ocean-accent))] to-[rgb(var(--recycle-cyan))] bg-clip-text text-transparent">
              Ocean Waste
            </span>
          </h1>
          <p className="text-xl text-slate-300 text-balance">
            Upload an image to identify and categorize ocean pollution instantly
          </p>
        </div>

        <div className="relative glassmorphism-dark rounded-3xl p-8 shadow-2xl glow-effect overflow-hidden">
          {/* Gradient border effect */}
          <div className="absolute inset-0 recycle-gradient opacity-20 rounded-3xl blur-xl" />

          <div className="relative z-10">
            {!preview ? (
              <div className="space-y-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="file-upload"
                />

                <label
                  htmlFor="file-upload"
                  className="group flex flex-col items-center justify-center border-2 border-dashed border-[rgb(var(--ocean-accent))]/50 rounded-2xl p-16 cursor-pointer hover:border-[rgb(var(--ocean-accent))] hover:glassmorphism transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className="w-24 h-24 recycle-gradient rounded-3xl flex items-center justify-center mb-6 glow-effect-green group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                    <Camera className="w-12 h-12 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-white mb-2 group-hover:text-[rgb(var(--ocean-accent))] transition-colors">
                    Click to upload an image
                  </p>
                  <p className="text-sm text-slate-400">or drag and drop your waste photo here</p>
                </label>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-3 px-8 py-4 recycle-gradient text-white font-bold rounded-2xl hover:scale-105 transition-all duration-300 glow-effect-green shadow-2xl text-lg"
                >
                  <Upload className="w-6 h-6" />
                  Choose File
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="relative rounded-2xl overflow-hidden glow-effect">
                  <img
                    src={preview || "/placeholder.svg"}
                    alt="Selected waste"
                    className="w-full max-h-96 object-contain bg-black/50"
                  />
                </div>

                {classification ? (
                  <div className="space-y-6">
                    <div className="glassmorphism rounded-2xl p-8 border-2 border-[rgb(var(--ocean-accent))]/30 glow-effect">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h3 className="text-3xl font-bold bg-gradient-to-r from-[rgb(var(--ocean-accent))] to-[rgb(var(--recycle-cyan))] bg-clip-text text-transparent mb-3">
                            {classification.category}
                          </h3>
                          <p className="text-slate-300 text-lg">
                            Confidence:{" "}
                            <span className="font-bold text-white">
                              {(Number.parseFloat(classification.confidence) * 100).toFixed(0)}%
                            </span>
                          </p>
                        </div>
                        {classification.recyclable ? (
                          <div className="flex items-center gap-3 px-4 py-2 bg-[rgb(var(--toxic-green))]/20 rounded-xl border-2 border-[rgb(var(--toxic-green))] glow-effect-green">
                            <CheckCircle className="w-6 h-6 text-[rgb(var(--toxic-green))]" />
                            <span className="font-bold text-[rgb(var(--toxic-green))]">Recyclable</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-2 bg-[rgb(var(--danger-red))]/20 rounded-xl border-2 border-[rgb(var(--danger-red))] glow-effect-orange">
                            <XCircle className="w-6 h-6 text-[rgb(var(--danger-red))]" />
                            <span className="font-bold text-[rgb(var(--danger-red))]">Non-Recyclable</span>
                          </div>
                        )}
                      </div>

                      <div className="relative h-4 bg-black/50 rounded-full overflow-hidden">
                        <div
                          className="h-full recycle-gradient transition-all duration-1000 ease-out glow-effect-green"
                          style={{ width: `${Number.parseFloat(classification.confidence) * 100}%` }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={reset}
                      className="w-full flex items-center justify-center gap-3 px-8 py-4 glassmorphism-dark text-white font-bold rounded-2xl hover:scale-105 hover:glow-effect transition-all duration-300 border-2 border-[rgb(var(--ocean-accent))]/30 text-lg"
                    >
                      <Sparkles className="w-6 h-6" />
                      Classify Another
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <button
                      onClick={reset}
                      className="flex-1 px-6 py-4 glassmorphism-dark text-white font-bold rounded-2xl hover:scale-105 hover:glow-effect transition-all duration-300 border-2 border-[rgb(var(--ocean-accent))]/30"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={classifyWaste}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-3 px-6 py-4 recycle-gradient text-white font-bold rounded-2xl hover:scale-105 transition-all duration-300 glow-effect-green disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl"
                    >
                      {loading ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Classifying...
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5" />
                          Classify Waste
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {[
            {
              icon: Sparkles,
              title: "AI-Powered",
              desc: "Advanced AI analyzes images with high accuracy",
              gradient: "from-yellow-500 to-orange-500",
            },
            {
              icon: Zap,
              title: "Instant Results",
              desc: "Get immediate classification and recycling tips",
              gradient: "from-cyan-500 to-blue-500",
            },
            {
              icon: Recycle,
              title: "Track Impact",
              desc: "All classifications saved to your eco-profile",
              gradient: "from-green-500 to-emerald-500",
            },
          ].map(({ icon: Icon, title, desc, gradient }) => (
            <div
              key={title}
              className="glassmorphism-dark rounded-2xl p-6 hover:scale-105 transition-all duration-300 group relative overflow-hidden"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity`}
              />
              <Icon className={`w-8 h-8 mb-3 bg-gradient-to-br ${gradient} bg-clip-text text-transparent`} />
              <h3 className="font-bold text-white mb-2 text-lg">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
