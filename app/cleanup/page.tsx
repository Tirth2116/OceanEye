"use client"

import type React from "react"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { collection, addDoc, query, orderBy, limit, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import { MapPin, Plus, Award, Trash2 } from "lucide-react"

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false })
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false })
const useMapEvents = dynamic(() => import("react-leaflet").then((mod) => mod.useMapEvents), { ssr: false })

function LocationMarker({ onLocationSelect }: { onLocationSelect: (latlng: any) => void }) {
  const [position, setPosition] = useState<any>(null)

  useMapEvents({
    click(e) {
      setPosition(e.latlng)
      onLocationSelect(e.latlng)
    },
  })

  return position === null ? null : (
    <Marker position={position}>
      <Popup>Selected cleanup location</Popup>
    </Marker>
  )
}

export default function CleanupPage() {
  const { currentUser } = useAuth()
  const [cleanupPoints, setCleanupPoints] = useState<any[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<any>(null)
  const [formData, setFormData] = useState({
    description: "",
    wasteAmount: "",
    wasteTypes: [] as string[],
  })
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  const wasteTypes = ["Plastic", "Metal", "Glass", "Paper", "Organic", "Other"]

  useEffect(() => {
    setMounted(true)
    loadCleanupPoints()
  }, [])

  const loadCleanupPoints = async () => {
    try {
      const q = query(collection(db, "cleanupPoints"), orderBy("timestamp", "desc"), limit(50))
      const snapshot = await getDocs(q)
      const points = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setCleanupPoints(points)
    } catch (error) {
      console.error("Error loading cleanup points:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLocation || !currentUser) {
      alert("Please select a location on the map")
      return
    }

    setLoading(true)
    try {
      await addDoc(collection(db, "cleanupPoints"), {
        userId: currentUser.uid,
        userName: currentUser.displayName,
        location: {
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
        },
        description: formData.description,
        wasteAmount: formData.wasteAmount,
        wasteTypes: formData.wasteTypes,
        points: Number.parseInt(formData.wasteAmount) * 10,
        timestamp: new Date().toISOString(),
      })

      setFormData({ description: "", wasteAmount: "", wasteTypes: [] })
      setSelectedLocation(null)
      setShowAddForm(false)
      loadCleanupPoints()
    } catch (error) {
      console.error("Error adding cleanup point:", error)
      alert("Failed to add cleanup point")
    } finally {
      setLoading(false)
    }
  }

  const toggleWasteType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      wasteTypes: prev.wasteTypes.includes(type)
        ? prev.wasteTypes.filter((t) => t !== type)
        : [...prev.wasteTypes, type],
    }))
  }

  if (!mounted) return null

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2 text-balance">Cleanup Tracking</h1>
            <p className="text-xl text-slate-300 text-balance">Log your cleanup efforts and earn points</p>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="mt-4 md:mt-0 flex items-center gap-2 px-6 py-3 bg-[rgb(var(--ocean-accent))] text-[rgb(var(--ocean-dark))] font-semibold rounded-lg hover:bg-[rgb(var(--primary))] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Log Cleanup
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[rgb(var(--ocean-deep))] border border-[rgb(var(--ocean-medium))] rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-[rgb(var(--ocean-accent))]" />
                <h2 className="text-xl font-bold text-white">Cleanup Map</h2>
              </div>

              <div className="h-[500px] rounded-xl overflow-hidden">
                <MapContainer center={[0, 0]} zoom={2} style={{ height: "100%", width: "100%" }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {showAddForm && <LocationMarker onLocationSelect={setSelectedLocation} />}

                  {cleanupPoints.map((point) => (
                    <Marker key={point.id} position={[point.location.lat, point.location.lng]}>
                      <Popup>
                        <div className="p-2">
                          <p className="font-bold">{point.userName}</p>
                          <p className="text-sm">{point.description}</p>
                          <p className="text-sm text-slate-600">{point.wasteAmount} kg collected</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Award className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm font-medium">{point.points} points</span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>

              {showAddForm && (
                <p className="mt-4 text-sm text-slate-400 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Click on the map to select cleanup location
                </p>
              )}
            </div>

            {showAddForm && (
              <div className="bg-[rgb(var(--ocean-deep))] border border-[rgb(var(--ocean-medium))] rounded-2xl p-6 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-6">Log Cleanup Details</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                      rows={3}
                      className="w-full px-4 py-3 bg-[rgb(var(--ocean-dark))] border border-[rgb(var(--ocean-medium))] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ocean-accent))] focus:border-transparent"
                      placeholder="Describe the cleanup location and activity..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Waste Amount (kg)</label>
                    <input
                      type="number"
                      value={formData.wasteAmount}
                      onChange={(e) => setFormData({ ...formData, wasteAmount: e.target.value })}
                      required
                      min="0"
                      step="0.1"
                      className="w-full px-4 py-3 bg-[rgb(var(--ocean-dark))] border border-[rgb(var(--ocean-medium))] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ocean-accent))] focus:border-transparent"
                      placeholder="5.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">Waste Types</label>
                    <div className="flex flex-wrap gap-2">
                      {wasteTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleWasteType(type)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            formData.wasteTypes.includes(type)
                              ? "bg-[rgb(var(--ocean-accent))] text-[rgb(var(--ocean-dark))]"
                              : "bg-[rgb(var(--ocean-dark))] text-slate-300 border border-[rgb(var(--ocean-medium))] hover:border-[rgb(var(--ocean-accent))]"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false)
                        setSelectedLocation(null)
                        setFormData({ description: "", wasteAmount: "", wasteTypes: [] })
                      }}
                      className="flex-1 px-6 py-3 bg-[rgb(var(--ocean-medium))] text-white font-semibold rounded-lg hover:bg-[rgb(var(--ocean-light))] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !selectedLocation}
                      className="flex-1 px-6 py-3 bg-[rgb(var(--ocean-accent))] text-[rgb(var(--ocean-dark))] font-semibold rounded-lg hover:bg-[rgb(var(--primary))] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "Saving..." : "Submit Cleanup"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-[rgb(var(--ocean-deep))] border border-[rgb(var(--ocean-medium))] rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-[rgb(var(--ocean-accent))]" />
                Recent Cleanups
              </h2>

              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {cleanupPoints.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No cleanups logged yet. Be the first!</p>
                ) : (
                  cleanupPoints.map((point) => (
                    <div
                      key={point.id}
                      className="bg-[rgb(var(--ocean-dark))] border border-[rgb(var(--ocean-medium))] rounded-lg p-4 hover:border-[rgb(var(--ocean-accent))] transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-white">{point.userName}</p>
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Award className="w-4 h-4" />
                          <span className="text-sm font-bold">{point.points}</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-300 mb-2">{point.description}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>{point.wasteAmount} kg</span>
                        <span>•</span>
                        <span>{new Date(point.timestamp).toLocaleDateString()}</span>
                      </div>
                      {point.wasteTypes && point.wasteTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {point.wasteTypes.map((type: string) => (
                            <span
                              key={type}
                              className="px-2 py-1 bg-[rgb(var(--ocean-medium))] text-xs text-slate-300 rounded"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
