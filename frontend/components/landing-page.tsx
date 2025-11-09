"use client"

import React, { useRef, Suspense } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import { Button } from "@/components/ui/button"
import { ArrowRight, Waves, Camera, Map, Radio } from "lucide-react"

interface LandingPageProps {
  onEnter: () => void
}

// Simple vertex + fragment shaders for animated water
const vertexShader = `
  uniform float uTime;
  uniform float uBigWavesElevation;
  uniform vec2 uBigWavesFrequency;
  uniform float uSmallWavesElevation;
  uniform float uSmallWavesFrequency;
  uniform vec2 uPointer;         // 0..1 in UV space
  uniform float uRippleAmplitude; // ripple height
  uniform float uRippleFrequency; // ripple frequency
  uniform float uRippleFalloff;   // controls how quickly ripple fades

  // Gerstner wave uniforms
  uniform float uGerstnerAmp;
  uniform float uGerstnerSteepness;
  uniform float uGerstnerSpeed;
  uniform float uGerstnerLen1;
  uniform float uGerstnerLen2;
  uniform float uGerstnerLen3;
  uniform vec2 uDir1;
  uniform vec2 uDir2;
  uniform vec2 uDir3;

  varying vec2 vUv;
  varying float vElevation;

  // 2D Simplex / noise could be used, but we keep it simple and fast
  float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
  }

  float PI = 3.141592653589793238;

  float gerstner(vec2 xz, vec2 dir, float wavelength, float amp, float speed, float time) {
    float k = 2.0 * PI / wavelength;
    float f = k * (dot(dir, xz)) - time * speed;
    // classic gerstner vertical displacement
    return amp * sin(f);
  }

  void main() {
    vUv = uv;
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    // Big sine waves
    float bigWave = sin(modelPosition.x * uBigWavesFrequency.x + uTime) *
                    cos(modelPosition.z * uBigWavesFrequency.y + uTime);

    // Smaller faster ripples (layered)
    float smallWave = sin((modelPosition.x + modelPosition.z) * uSmallWavesFrequency + uTime * 2.0);

    // Cursor reactive ripple in UV space
    float d = distance(vUv, uPointer);
    float ripple = sin(d * uRippleFrequency - uTime * 4.0) * uRippleAmplitude * exp(-d * uRippleFalloff);

    // Gerstner waves (3 directions)
    vec2 xz = modelPosition.xz;
    float g1 = gerstner(xz, normalize(uDir1), uGerstnerLen1, uGerstnerAmp, uGerstnerSpeed, uTime);
    float g2 = gerstner(xz, normalize(uDir2), uGerstnerLen2, uGerstnerAmp * 0.8, uGerstnerSpeed * 1.1, uTime);
    float g3 = gerstner(xz, normalize(uDir3), uGerstnerLen3, uGerstnerAmp * 0.6, uGerstnerSpeed * 0.9, uTime);

    float elevation = bigWave * uBigWavesElevation
                    + smallWave * uSmallWavesElevation * 0.4
                    + (g1 + g2 + g3) * 0.7
                    + ripple;
    modelPosition.y += elevation;
    vElevation = elevation;

    gl_Position = projectionMatrix * viewMatrix * modelPosition;
  }
`

const fragmentShader = `
  varying vec2 vUv;
  varying float vElevation;
  uniform vec3 uDepthColor;
  uniform vec3 uSurfaceColor;
  uniform float uColorOffset;
  uniform float uColorMultiplier;

  void main() {
    // Mix color by elevation and uv
    float mixStrength = (vElevation + uColorOffset) * uColorMultiplier;
    mixStrength = clamp(mixStrength, 0.0, 1.0);

    vec3 color = mix(uDepthColor, uSurfaceColor, mixStrength + vUv.y * 0.1);

    // subtle fresnel
    float fresnel = 1.0 - dot(normalize(vec3(0.0,1.0,0.0)), normalize(vec3(0.0,1.0,0.0)));
    gl_FragColor = vec4(color, 1.0);
  }
`

function WaterPlane({ position = [0, 0, 0] as [number, number, number] }) {
  const geomRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<any>(null)

  // Set up uniforms
  const uniforms = useRef({
    uTime: { value: 0 },
    uBigWavesElevation: { value: 0.5 },
    uBigWavesFrequency: { value: new THREE.Vector2(0.6, 0.4) },
    uSmallWavesElevation: { value: 0.1 },
    uSmallWavesFrequency: { value: 8.0 },
    uPointer: { value: new THREE.Vector2(0.5, 0.5) },
    uRippleAmplitude: { value: 0.12 },
    uRippleFrequency: { value: 40.0 },
    uRippleFalloff: { value: 6.0 },
    // Gerstner wave defaults
    uGerstnerAmp: { value: 0.4 },
    uGerstnerSteepness: { value: 0.3 },
    uGerstnerSpeed: { value: 0.9 },
    uGerstnerLen1: { value: 14.0 },
    uGerstnerLen2: { value: 22.0 },
    uGerstnerLen3: { value: 36.0 },
    uDir1: { value: new THREE.Vector2(1.0, 0.2).normalize() },
    uDir2: { value: new THREE.Vector2(-0.6, 0.8).normalize() },
    uDir3: { value: new THREE.Vector2(0.7, 0.7).normalize() },
    // Natural ocean palette (deeper, less saturated)
    uDepthColor: { value: new THREE.Color("#02161f") },
    uSurfaceColor: { value: new THREE.Color("#0b6d8a") },
    uColorOffset: { value: 0.06 },
    uColorMultiplier: { value: 1.8 },
  })

  useFrame((state, delta) => {
    if (!matRef.current) return
    uniforms.current.uTime.value += delta * 0.8
    // pointer in NDC (-1..1) -> UV (0..1)
    const x01 = (state.pointer.x + 1) / 2
    const y01 = 1 - (state.pointer.y + 1) / 2
    uniforms.current.uPointer.value.set(x01, y01)
    // expose small dynamics for subtle variation
    matRef.current.uniforms.uTime.value = uniforms.current.uTime.value
    matRef.current.uniforms.uPointer.value = uniforms.current.uPointer.value
  })

  return (
    <mesh ref={geomRef} rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
      <planeGeometry args={[200, 200, 320, 320]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms.current}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

export default function LandingPage3D({ onEnter }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
      {/* Background canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 12, 20], fov: 45 }} shadows dpr={[1, 2]}>
          <color attach="background" args={["#000a12"]} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1.0} castShadow />

          <Suspense fallback={null}>
            <WaterPlane position={[0, 0, 0]} />
          </Suspense>

          <OrbitControls enablePan={false} enableZoom={true} maxPolarAngle={Math.PI / 2.1} />
        </Canvas>
      </div>

      {/* Foreground UI - keeps the original structure but simplified and responsive */}
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8 text-white">
          <div className="flex justify-center">
            <div className="glass-panel inline-flex items-center gap-3 rounded-2xl px-4 py-2 border border-white/10 bg-background/30 backdrop-blur">
              <div className="relative">
                <Waves className="h-10 w-10 text-white" />
                <div className="absolute inset-0 blur-lg bg-white/20 -z-10" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-balance text-white">
                Ocean<span className="text-sky-200">Sight</span>
              </h1>
            </div>
          </div>

          <p className="text-base md:text-lg text-blue-100/90">
            AI-Powered Marine Waste Detection & Monitoring
          </p>

          <p className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed text-blue-100/80">
            Real-time ocean waste tracking with advanced AI segmentation, intelligent drone swarms, and comprehensive
            pollution analytics.
          </p>

          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="glass-panel p-4 rounded-xl border border-border/30">
              <Camera className="w-6 h-6 mx-auto mb-2" />
              <h3 className="font-semibold">AI Detection</h3>
              <p className="text-sm text-muted-foreground">Smart trash identification with real-time segmentation</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-border/30">
              <Map className="w-6 h-6 mx-auto mb-2" />
              <h3 className="font-semibold">Live Heatmaps</h3>
              <p className="text-sm text-muted-foreground">Interactive pollution mapping with ocean currents</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-border/30">
              <Radio className="w-6 h-6 mx-auto mb-2" />
              <h3 className="font-semibold">Drone Swarms</h3>
              <p className="text-sm text-muted-foreground">Autonomous collection simulation & coordination</p>
            </div>
          </div>

          <div>
            <Button
              size="lg"
              onClick={onEnter}
              className="group relative overflow-hidden bg-linear-to-r from-primary to-accent hover:shadow-lg transition-all duration-300 text-lg px-8 py-4 mt-4"
            >
              <span className="relative z-10 flex items-center gap-2">
                Analyze
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-linear-to-r from-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Button>
          </div>

          <p className="text-sm italic">Protect the water that protects life</p>
        </div>
      </div>
    </div>
  )
}
