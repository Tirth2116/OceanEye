"use client"

import { useState, useEffect } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import { User, Award, Camera, Palette, MapPin, Calendar } from "lucide-react"

export default function ProfilePage() {
  const { currentUser } = useAuth()
  const [userData, setUserData] = useState<any>(null)
  const [stats, setStats] = useState({
    cleanupPoints: 0,
    wasteClassified: 0,
    artShared: 0,
  })

  useEffect(() => {
    if (currentUser) {
      loadUserData()
    }
  }, [currentUser])

  const loadUserData = async () => {
    if (!currentUser) return

    try {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid))
      if (userDoc.exists()) {
        const data = userDoc.data()
        setUserData(data)
        setStats({
          cleanupPoints: data.cleanupPoints || 0,
          wasteClassified: data.wasteClassified || 0,
          artShared: data.artShared || 0,
        })
      }
    } catch (error) {
      console.error("Error loading user data:", error)
    }
  }

  const achievements = [
    {
      icon: Camera,
      label: "Waste Items Classified",
      value: stats.wasteClassified,
      color: "text-[rgb(var(--ocean-accent))]",
      bg: "bg-[rgb(var(--ocean-accent))]",
    },
    {
      icon: MapPin,
      label: "Cleanup Points",
      value: stats.cleanupPoints,
      color: "text-[rgb(var(--seaweed))]",
      bg: "bg-[rgb(var(--seaweed))]",
    },
    {
      icon: Palette,
      label: "Artworks Shared",
      value: stats.artShared,
      color: "text-[rgb(var(--coral))]",
      bg: "bg-[rgb(var(--coral))]",
    },
  ]

  if (!currentUser) return null

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="bg-[rgb(var(--ocean-deep))] border border-[rgb(var(--ocean-medium))] rounded-2xl p-8 shadow-xl mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-24 h-24 bg-[rgb(var(--ocean-accent))] bg-opacity-20 rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-[rgb(var(--ocean-accent))]" />
            </div>

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                {currentUser?.displayName || "Ocean Guardian"}
              </h1>
              <p className="text-slate-300 mb-4">{currentUser?.email}</p>

              {userData?.createdAt && (
                <div className="flex items-center gap-2 text-slate-400 justify-center md:justify-start">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    Joined{" "}
                    {new Date(userData.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[rgb(var(--ocean-accent))] to-[rgb(var(--ocean-light))] rounded-xl">
              <Award className="w-6 h-6 text-white" />
              <div className="text-left">
                <p className="text-xs text-white opacity-90">Total Points</p>
                <p className="text-2xl font-bold text-white">{stats.cleanupPoints}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {achievements.map(({ icon: Icon, label, value, color, bg }) => (
            <div
              key={label}
              className="bg-[rgb(var(--ocean-deep))] border border-[rgb(var(--ocean-medium))] rounded-2xl p-6 shadow-xl hover:border-[rgb(var(--ocean-accent))] transition-all hover:scale-105"
            >
              <div className={`w-12 h-12 ${bg} bg-opacity-20 rounded-xl flex items-center justify-center mb-4`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <p className="text-3xl font-bold text-white mb-2">{value}</p>
              <p className="text-slate-400">{label}</p>
            </div>
          ))}
        </div>

        <div className="bg-[rgb(var(--ocean-deep))] border border-[rgb(var(--ocean-medium))] rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-white mb-6">Your Environmental Impact</h2>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300">Ocean Guardian Level</span>
                <span className="text-[rgb(var(--ocean-accent))] font-bold">
                  {stats.cleanupPoints < 100
                    ? "Beginner"
                    : stats.cleanupPoints < 500
                      ? "Intermediate"
                      : stats.cleanupPoints < 1000
                        ? "Advanced"
                        : "Expert"}
                </span>
              </div>
              <div className="h-3 bg-[rgb(var(--ocean-dark))] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[rgb(var(--ocean-accent))] to-[rgb(var(--ocean-light))] transition-all"
                  style={{ width: `${Math.min((stats.cleanupPoints / 1000) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="bg-[rgb(var(--ocean-dark))] rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-1">Estimated Waste Prevented</p>
                <p className="text-2xl font-bold text-white">{(stats.cleanupPoints * 0.1).toFixed(1)} kg</p>
              </div>
              <div className="bg-[rgb(var(--ocean-dark))] rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-1">CO₂ Offset</p>
                <p className="text-2xl font-bold text-white">{(stats.cleanupPoints * 0.05).toFixed(1)} kg</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[rgb(var(--ocean-deep))] border border-[rgb(var(--ocean-medium))] rounded-2xl p-8 shadow-xl mt-8">
          <h2 className="text-2xl font-bold text-white mb-6">Achievements & Badges</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { name: "First Cleanup", unlocked: stats.cleanupPoints > 0 },
              { name: "Waste Classifier", unlocked: stats.wasteClassified > 0 },
              { name: "Art Creator", unlocked: stats.artShared > 0 },
              { name: "100 Points", unlocked: stats.cleanupPoints >= 100 },
              { name: "500 Points", unlocked: stats.cleanupPoints >= 500 },
              { name: "10 Classifications", unlocked: stats.wasteClassified >= 10 },
              { name: "5 Artworks", unlocked: stats.artShared >= 5 },
              { name: "Ocean Hero", unlocked: stats.cleanupPoints >= 1000 },
            ].map((badge) => (
              <div
                key={badge.name}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center p-4 text-center transition-all ${
                  badge.unlocked
                    ? "bg-gradient-to-br from-[rgb(var(--ocean-accent))] to-[rgb(var(--ocean-light))] text-white"
                    : "bg-[rgb(var(--ocean-dark))] border border-[rgb(var(--ocean-medium))] text-slate-500"
                }`}
              >
                <Award className={`w-8 h-8 mb-2 ${badge.unlocked ? "" : "opacity-30"}`} />
                <p className="text-xs font-medium">{badge.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
