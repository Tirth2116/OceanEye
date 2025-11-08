"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { collection, addDoc, query, orderBy, getDocs } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import { Plus, Heart, Upload, X } from "lucide-react"

export default function GalleryPage() {
  const { currentUser } = useAuth()
  const [artworks, setArtworks] = useState<any[]>([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    materials: "",
  })
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadArtworks()
  }, [])

  const loadArtworks = async () => {
    try {
      const q = query(collection(db, "artworks"), orderBy("timestamp", "desc"))
      const snapshot = await getDocs(q)
      const arts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setArtworks(arts)
    } catch (error) {
      console.error("Error loading artworks:", error)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedImage || !currentUser) {
      alert("Please select an image")
      return
    }

    setLoading(true)
    try {
      const storageRef = ref(storage, `artworks/${currentUser.uid}/${Date.now()}-${selectedImage.name}`)
      await uploadBytes(storageRef, selectedImage)
      const imageUrl = await getDownloadURL(storageRef)

      await addDoc(collection(db, "artworks"), {
        userId: currentUser.uid,
        userName: currentUser.displayName,
        title: formData.title,
        description: formData.description,
        materials: formData.materials,
        imageUrl,
        likes: 0,
        timestamp: new Date().toISOString(),
      })

      setFormData({ title: "", description: "", materials: "" })
      setSelectedImage(null)
      setPreview(null)
      setShowUploadModal(false)
      loadArtworks()
    } catch (error) {
      console.error("Error uploading artwork:", error)
      alert("Failed to upload artwork")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2 text-balance">Recycled Art Gallery</h1>
            <p className="text-xl text-slate-300 text-balance">Transform ocean waste into beautiful creations</p>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className="mt-4 md:mt-0 flex items-center gap-2 px-6 py-3 bg-[rgb(var(--ocean-accent))] text-[rgb(var(--ocean-dark))] font-semibold rounded-lg hover:bg-[rgb(var(--primary))] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Share Your Art
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {artworks.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <p className="text-slate-400 text-lg">No artworks yet. Be the first to share!</p>
            </div>
          ) : (
            artworks.map((artwork) => (
              <div
                key={artwork.id}
                className="bg-[rgb(var(--ocean-deep))] border border-[rgb(var(--ocean-medium))] rounded-2xl overflow-hidden hover:border-[rgb(var(--ocean-accent))] transition-all hover:scale-105 shadow-xl"
              >
                <div className="aspect-square overflow-hidden bg-[rgb(var(--ocean-dark))]">
                  <img
                    src={artwork.imageUrl || "/placeholder.svg"}
                    alt={artwork.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2">{artwork.title}</h3>
                  <p className="text-sm text-slate-300 mb-3 line-clamp-2">{artwork.description}</p>

                  {artwork.materials && (
                    <div className="mb-4">
                      <p className="text-xs text-slate-400 mb-1">Materials:</p>
                      <p className="text-sm text-slate-300">{artwork.materials}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-[rgb(var(--ocean-medium))]">
                    <p className="text-sm font-medium text-slate-400">by {artwork.userName}</p>
                    <button className="flex items-center gap-1 text-[rgb(var(--coral))] hover:scale-110 transition-transform">
                      <Heart className="w-5 h-5" />
                      <span className="text-sm font-medium">{artwork.likes}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-[rgb(var(--ocean-deep))] border border-[rgb(var(--ocean-medium))] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Share Your Recycled Art</h2>
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    setSelectedImage(null)
                    setPreview(null)
                    setFormData({ title: "", description: "", materials: "" })
                  }}
                  className="p-2 hover:bg-[rgb(var(--ocean-medium))] rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="art-upload"
                  />

                  {preview ? (
                    <div className="relative rounded-xl overflow-hidden">
                      <img
                        src={preview || "/placeholder.svg"}
                        alt="Preview"
                        className="w-full max-h-96 object-contain bg-[rgb(var(--ocean-dark))]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImage(null)
                          setPreview(null)
                          if (fileInputRef.current) fileInputRef.current.value = ""
                        }}
                        className="absolute top-2 right-2 p-2 bg-[rgb(var(--destructive))] rounded-lg hover:bg-opacity-90"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="art-upload"
                      className="flex flex-col items-center justify-center border-2 border-dashed border-[rgb(var(--ocean-medium))] rounded-xl p-12 cursor-pointer hover:border-[rgb(var(--ocean-accent))] hover:bg-[rgb(var(--ocean-medium))] hover:bg-opacity-20 transition-all"
                    >
                      <Upload className="w-12 h-12 text-[rgb(var(--ocean-accent))] mb-3" />
                      <p className="text-white font-medium mb-1">Upload artwork image</p>
                      <p className="text-sm text-slate-400">Click to browse</p>
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-[rgb(var(--ocean-dark))] border border-[rgb(var(--ocean-medium))] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ocean-accent))] focus:border-transparent"
                    placeholder="Ocean Wave Sculpture"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={4}
                    className="w-full px-4 py-3 bg-[rgb(var(--ocean-dark))] border border-[rgb(var(--ocean-medium))] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ocean-accent))] focus:border-transparent"
                    placeholder="Tell us about your creation..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Materials Used</label>
                  <input
                    type="text"
                    value={formData.materials}
                    onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
                    className="w-full px-4 py-3 bg-[rgb(var(--ocean-dark))] border border-[rgb(var(--ocean-medium))] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ocean-accent))] focus:border-transparent"
                    placeholder="Plastic bottles, fishing nets, etc."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !selectedImage}
                  className="w-full px-6 py-3 bg-[rgb(var(--ocean-accent))] text-[rgb(var(--ocean-dark))] font-semibold rounded-lg hover:bg-[rgb(var(--primary))] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Uploading..." : "Share Artwork"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
