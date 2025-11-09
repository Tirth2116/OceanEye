"use client"

import { useState } from "react"
import { Waves, LayoutDashboard, Map, LineChart, Sparkles, Settings, User, Route } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useRouter, usePathname } from "next/navigation"

const tabs = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/" },
  { name: "Visualization", icon: Route, href: "/visualization" },
  { name: "Map", icon: Map, href: "#map" },
  { name: "Analysis", icon: LineChart, href: "#analysis" },
  { name: "Swarm Sim", icon: Sparkles, href: "#swarm" },
  { name: "Settings", icon: Settings, href: "#settings" },
]

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState("Dashboard")

  const handleTabClick = (tab: typeof tabs[0]) => {
    setActiveTab(tab.name)
    if (tab.href.startsWith("/")) {
      router.push(tab.href)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 glass-panel">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/")}>
          <div className="relative">
            <Waves className="h-8 w-8 text-primary" />
            <div className="absolute inset-0 blur-lg bg-primary/30 -z-10" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-balance">
            Ocean<span className="text-primary">Sight</span>
          </h1>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = tab.href === pathname || (tab.href === "/" && pathname === "/") || activeTab === tab.name
            return (
              <Button
                key={tab.name}
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-2 transition-all duration-200",
                  isActive
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/10",
                )}
                onClick={() => handleTabClick(tab)}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{tab.name}</span>
              </Button>
            )
          })}
        </nav>

        {/* Profile */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full border border-primary/30 hover:border-primary/60 hover:bg-primary/10"
        >
          <User className="h-5 w-5 text-primary" />
        </Button>
      </div>
    </header>
  )
}
