"use client"

import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { Camera, Map, Palette, ArrowRight, Shield, Users, Sparkles, Recycle, Droplets } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function Home() {
  const { currentUser } = useAuth()

  const features = [
    {
      icon: Camera,
      title: "AI Waste Classifier",
      description:
        "Snap a photo and let our AI instantly identify ocean waste types, recyclability, and environmental impact.",
      gradient: "recycle-gradient",
      glow: "glow-effect-green",
    },
    {
      icon: Map,
      title: "Cleanup Tracker",
      description:
        "Mark cleanup locations on the map, log waste collected, earn points, and visualize your ocean-saving journey.",
      gradient: "ocean-gradient",
      glow: "glow-effect",
    },
    {
      icon: Palette,
      title: "Recycled Art Gallery",
      description:
        "Turn ocean trash into treasure! Share your recycled art creations and inspire the global eco-community.",
      gradient: "from-purple-500 via-pink-500 to-rose-500",
      glow: "glow-effect-orange",
    },
  ]

  const stats = [
    { icon: Recycle, label: "Waste Items Classified", value: "50K+", color: "text-[rgb(var(--toxic-green))]" },
    { icon: Users, label: "Active Ocean Guardians", value: "10K+", color: "text-[rgb(var(--ocean-accent))]" },
    { icon: Droplets, label: "Ocean Area Protected", value: "250K m²", color: "text-[rgb(var(--recycle-cyan))]" },
  ]

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden wave-pattern">
        {/* Animated gradient background */}
        <div className="absolute inset-0 ocean-gradient opacity-90" />
        <div className="absolute inset-0 shimmer-gradient" />

        {/* Floating particles effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-2 h-2 bg-[rgb(var(--ocean-accent))] rounded-full animate-pulse opacity-60" />
          <div className="absolute top-40 right-20 w-3 h-3 bg-[rgb(var(--toxic-green))] rounded-full animate-bounce opacity-50" />
          <div
            className="absolute bottom-32 left-1/4 w-2 h-2 bg-[rgb(var(--recycle-cyan))] rounded-full animate-pulse opacity-50"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute top-1/2 right-1/3 w-4 h-4 bg-[rgb(var(--waste-orange))] rounded-full animate-bounce opacity-40"
            style={{ animationDelay: "0.5s" }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 glassmorphism rounded-full text-sm font-medium text-[rgb(var(--ocean-accent))]">
              <Sparkles className="w-4 h-4" />
              Join the Ocean Revolution
            </div>

            <h1 className="text-5xl sm:text-7xl font-bold text-balance leading-tight">
              <span className="block text-white mb-2">Protect Our</span>
              <span className="block bg-gradient-to-r from-[rgb(var(--ocean-accent))] via-[rgb(var(--recycle-cyan))] to-[rgb(var(--toxic-green))] bg-clip-text text-transparent">
                Ocean Together
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-slate-200 max-w-3xl mx-auto text-balance leading-relaxed">
              Classify waste with AI, track cleanups on the map, and transform ocean pollution into stunning recycled
              art
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              {currentUser ? (
                <Button asChild size="lg" className="font-semibold">
                  <Link href="/classify" className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Start Classifying
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg" className="font-semibold">
                    <Link href="/signup" className="flex items-center gap-2">
                      Get Started Free
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/login">Sign In</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 relative">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map(({ icon: Icon, label, value, color }) => (
              <Card
                key={label}
                className="text-center hover:scale-[1.02] transition-transform duration-300 group"
              >
                <CardContent className="p-8">
                  <Icon className={`w-12 h-12 mx-auto mb-4 ${color} group-hover:scale-105 transition-transform`} />
                  <div className={`text-5xl font-bold mb-2 ${color}`}>{value}</div>
                  <div className="text-slate-300 font-medium">{label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl sm:text-6xl font-bold text-white mb-6 text-balance">
              Powerful Tools for
              <span className="block bg-gradient-to-r from-[rgb(var(--toxic-green))] via-[rgb(var(--ocean-accent))] to-[rgb(var(--recycle-cyan))] bg-clip-text text-transparent">
                Ocean Conservation
              </span>
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto text-balance">
              Three game-changing features to make a real environmental impact
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map(({ icon: Icon, title, description, gradient, glow }, index) => (
              <Card
                key={title}
                className="group relative rounded-3xl hover:scale-[1.02] transition-transform duration-500 overflow-hidden"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Animated gradient background on hover */}
                <div
                  className={`absolute inset-0 ${gradient} opacity-0 group-hover:opacity-15 transition-opacity duration-500`}
                />

                <CardContent className="relative z-10 p-8">
                  <div
                    className={`w-16 h-16 ${gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-105 transition-all duration-300`}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-[rgb(var(--ocean-accent))] transition-colors">
                    {title}
                  </h3>
                  <p className="text-slate-300 leading-relaxed">{description}</p>
                </CardContent>

                {/* Corner accent */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[rgb(var(--ocean-accent))]/20 to-transparent rounded-bl-full" />
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 ocean-gradient-reverse" />
        <div className="absolute inset-0 shimmer-gradient" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Shield className="w-20 h-20 mx-auto mb-6 text-[rgb(var(--ocean-accent))] animate-bounce glow-effect" />
          <h2 className="text-5xl sm:text-6xl font-bold text-white mb-6 text-balance">Ready to Make a Difference?</h2>
          <p className="text-xl text-slate-100 mb-8 text-balance max-w-2xl mx-auto">
            Join thousands of ocean guardians making waves in conservation. Start your journey today!
          </p>
          {!currentUser && (
            <Button asChild size="lg" className="font-semibold">
              <Link href="/signup" className="inline-flex items-center gap-3">
                <Sparkles className="w-6 h-6" />
                Create Free Account
                <ArrowRight className="w-6 h-6" />
              </Link>
            </Button>
          )}
        </div>
      </section>
    </div>
  )
}
