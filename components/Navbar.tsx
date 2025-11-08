"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Waves, Camera, Map, Palette, User, LogOut, Menu, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function Navbar() {
  const { currentUser, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const navLinks = [
    { href: "/classify", label: "Classify", icon: Camera },
    { href: "/cleanup", label: "Cleanup", icon: Map },
    { href: "/gallery", label: "Gallery", icon: Palette },
  ]

  return (
    <nav className="glassmorphism-dark border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 recycle-gradient rounded-xl flex items-center justify-center group-hover:scale-105 transition-all duration-300">
              <Waves className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white/90 group-hover:text-white transition-colors">
              BlueGuard
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {currentUser ? (
              <>
                {navLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                      pathname === href
                        ? "bg-white/10 text-white border border-white/10"
                        : "text-slate-200 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </Link>
                ))}

                <Link
                  href="/profile"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    pathname === "/profile"
                      ? "bg-white/10 text-white border border-white/10"
                      : "text-slate-200 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-slate-200 hover:text-white hover:bg-white/5 rounded-lg font-medium transition-all duration-300"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" className="text-slate-200 hover:text-white">
                  <Link href="/login" className="px-4">
                    Sign In
                  </Link>
                </Button>
                <Button asChild className="font-semibold">
                  <Link href="/signup">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-white hover:bg-white/5 rounded-lg transition-all"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            {currentUser ? (
              <>
                {navLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                      pathname === href ? "bg-white/10 text-white border border-white/10" : "text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </Link>
                ))}
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                    pathname === "/profile" ? "bg-white/10 text-white border border-white/10" : "text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <User className="w-5 h-5" />
                  Profile
                </Link>
                <button
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center gap-2 px-4 py-3 text-slate-200 hover:bg-white/5 rounded-lg font-medium transition-all w-full"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-slate-200 hover:bg-white/5 rounded-lg font-medium transition-all">
                  Sign In
                </Link>
                <Button asChild className="w-full">
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="text-center">
                    Get Started
                  </Link>
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
