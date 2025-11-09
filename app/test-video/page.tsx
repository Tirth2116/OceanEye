/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { VisionDetection, EnrichedItem } from "@/lib/types";

type FrameResult = {
	timeSec: number;
	imageDataUrl: string;
	detections: VisionDetection[];
	enriched?: EnrichedItem[];
	cleanedImageBase64?: string;
};

export default function TestVideoPage() {
	const [videoFile, setVideoFile] = useState<File | null>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [frames, setFrames] = useState<FrameResult[]>([]);
	const [working, setWorking] = useState(false);
	const [progress, setProgress] = useState(0);
	const [summary, setSummary] = useState<string>("");
	const [social, setSocial] = useState<string>("");

	const handleFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
		const f = e.target.files?.[0] || null;
		setVideoFile(f);
		setFrames([]);
	};

	const captureFrameAt = async (timeSec: number): Promise<string> => {
		return new Promise((resolve, reject) => {
			const video = videoRef.current!;
			const onSeeked = () => {
				const canvas = canvasRef.current!;
				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;
				const ctx = canvas.getContext("2d")!;
				ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
				const dataUrl = canvas.toDataURL("image/png");
				video.removeEventListener("seeked", onSeeked);
				resolve(dataUrl);
			};
			video.currentTime = Math.min(timeSec, Math.max(0, (video.duration || 0) - 0.05));
			video.addEventListener("seeked", onSeeked, { once: true });
		});
	};

	const cropImageByBbox = (imageDataUrl: string, bbox: { x: number; y: number; width: number; height: number }): Promise<string> => {
		return new Promise((resolve) => {
			const img = new Image();
			img.onload = () => {
				const canvas = document.createElement("canvas");
				const ctx = canvas.getContext("2d")!;
				const w = img.width;
				const h = img.height;
				const cropX = Math.floor(bbox.x * w);
				const cropY = Math.floor(bbox.y * h);
				const cropW = Math.floor(bbox.width * w);
				const cropH = Math.floor(bbox.height * h);
				canvas.width = cropW;
				canvas.height = cropH;
				ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
				resolve(canvas.toDataURL("image/png"));
			};
			img.src = imageDataUrl;
		});
	};

	const runDetections = async () => {
		if (!videoFile) return;
		setWorking(true);
		setProgress(0);
		console.log("Starting detection process...");
		try {
			// Load video in hidden element
			const video = videoRef.current!;
			video.src = URL.createObjectURL(videoFile);
			console.log("Video URL created, loading metadata...");
			
			// Wait for metadata with timeout
			const metadataLoaded = await Promise.race([
				new Promise<boolean>((resolve) => {
					video.onloadedmetadata = () => {
						console.log("Metadata loaded event fired");
						resolve(true);
					};
					video.onerror = (e) => {
						console.error("Video error:", e);
						resolve(false);
					};
					video.load();
				}),
				new Promise<boolean>((resolve) => setTimeout(() => {
					console.log("Metadata load timeout");
					resolve(false);
				}, 5000))
			]);
			
			if (!metadataLoaded || !video.duration) {
				throw new Error("Failed to load video metadata. The video format may not be supported.");
			}
			
			console.log("Video loaded, duration:", video.duration);

			const sampleTimes = [0, 2, 4].filter((t) => t <= (video.duration || 0));
			const tmpFrames: FrameResult[] = [];

			for (let i = 0; i < sampleTimes.length; i++) {
				setProgress(Math.round((i / sampleTimes.length) * 25));
				const t = sampleTimes[i];
				console.log(`Capturing frame at ${t}s...`);
				const dataUrl = await captureFrameAt(t);
				console.log(`Frame captured, size: ${dataUrl.length} chars`);
				
				// Vision detect
				console.log(`Calling vision API for frame ${i + 1}...`);
				const res = await fetch("/api/ai/vision-detect", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ imageBase64: dataUrl, maxDetections: 4 }),
				});
				console.log(`Vision API response status: ${res.status}`);
				if (!res.ok) {
					const errData = await res.json();
					console.error("Vision detection failed:", errData);
					alert(`Vision API error: ${errData.error || res.statusText}`);
					throw new Error(`Vision API failed: ${errData.error}`);
				}
				const { detections } = await res.json();
				console.log(`Frame ${i + 1} detections:`, detections);
				tmpFrames.push({ timeSec: t, imageDataUrl: dataUrl, detections: detections || [] });
			}

			setFrames(tmpFrames);
			setProgress(30);

			// Crop and enrich each detection separately (process all detections per frame)
			const enrichedFrames: FrameResult[] = [];
			for (let i = 0; i < tmpFrames.length; i++) {
				setProgress(30 + Math.round(((i + 1) / tmpFrames.length) * 40));
				const f = tmpFrames[i];
				const enriched: EnrichedItem[] = [];
				
				console.log(`Frame ${i + 1}: Processing ${f.detections.length} detections...`);
				
				for (let detIdx = 0; detIdx < f.detections.length; detIdx++) {
					const d = f.detections[detIdx];
					console.log(`  Detection ${detIdx + 1}/${f.detections.length}: ${d.label}`);
					
					// Crop the frame to just this trash item
					let croppedImage = f.imageDataUrl;
					if (d.bbox) {
						console.log(`    Cropping bbox:`, d.bbox);
						croppedImage = await cropImageByBbox(f.imageDataUrl, d.bbox);
					}
					
					// Enrich with cropped image context
					const body = {
						itemName: d.label,
						label: d.label,
						material: d.material_guess,
						confidence: d.confidence,
						contextNotes: d.summary,
						imageUrl: croppedImage, // Send cropped image
					};
					const enr = await fetch("/api/ai/analyze-item", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(body),
					}).then((r) => r.json());
					console.log(`    Enriched:`, enr.item, `- Threat: ${enr.threat_level}, Decomp: ${enr.decomposition_time}`);
					enriched.push({ ...enr, croppedImage });
				}
				enrichedFrames.push({ ...f, enriched });
			}

			setFrames(enrichedFrames);
			setProgress(100);
		} catch (e: any) {
			console.error("Detection error:", e);
			alert(`Error: ${e?.message || "Something went wrong"}`);
		} finally {
			setWorking(false);
		}
	};

	const deduplicateItems = (items: EnrichedItem[]): EnrichedItem[] => {
		const uniqueMap = new Map<string, EnrichedItem>();
		
		items.forEach((item) => {
			// Normalize the item name to detect similar items
			let normalizedName = item.item.toLowerCase();
			
			// Remove common modifiers/parts to group similar items
			normalizedName = normalizedName
				.replace(/\b(ring|cap|lid|top|bottom|label|wrapper|piece|part|fragment)\b/g, '')
				.replace(/\s+/g, ' ')
				.trim();
			
			// If normalized name is empty or too short, use material as key
			if (!normalizedName || normalizedName.length < 3) {
				normalizedName = item.material.toLowerCase();
			}
			
			const key = `${normalizedName}-${item.material.toLowerCase().replace(/\s+/g, '')}`;
			
			// Keep the first occurrence or the one with the most complete name
			if (!uniqueMap.has(key) || item.item.length > uniqueMap.get(key)!.item.length) {
				uniqueMap.set(key, item);
			}
		});
		
		return Array.from(uniqueMap.values());
	};

	const generateSummary = async () => {
		const enriched = frames.flatMap((f) => f.enriched || []);
		if (enriched.length === 0) return;
		
		// Deduplicate before sending to summary
		const uniqueItems = deduplicateItems(enriched);
		
		const res = await fetch("/api/ai/mission-summary", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				items: uniqueItems,
				durationMinutes: 60,
				location: "Unknown",
			}),
		}).then((r) => r.json());
		setSummary(res.summary || "");
	};

	const generateSocial = async () => {
		const enriched = frames.flatMap((f) => f.enriched || []);
		if (enriched.length === 0) return;
		const keyPoints: string[] = [];
		const total = enriched.length;
		const plastics = enriched.filter((e) => /plastic|PET|poly/i.test(e.material)).length;
		keyPoints.push(`Detected ~${total} debris items across sampled frames`);
		keyPoints.push(`${plastics} plastic-related items flagged`);
		keyPoints.push("Data logged for cleanup planning");
		const res = await fetch("/api/ai/social-post", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				platform: "twitter",
				keyPoints,
				hashtags: ["#OceanCleanup", "#ProtectOurSeas"],
			}),
		}).then((r) => r.json());
		setSocial(res.post || "");
	};

	return (
		<div className="container mx-auto max-w-5xl p-6">
			<Card className="overflow-hidden">
				<CardHeader>
					<CardTitle>Test Video Trash Detection</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center gap-3">
						<Input type="file" accept="video/*" onChange={handleFile} />
						<Button onClick={runDetections} disabled={!videoFile || working}>
							{working ? "Processing..." : "Run on 3 frames"}
						</Button>
						{working && <Progress value={progress} className="w-40" />}
					</div>
					{videoFile && (
						<Badge variant="outline">{`${videoFile.name} • ${(videoFile.size / 1024 / 1024).toFixed(1)} MB`}</Badge>
					)}
					{frames.length > 0 && (
						<div className="flex items-center gap-3">
							<Button variant="outline" onClick={generateSummary}>Generate Summary</Button>
							<Button variant="outline" onClick={generateSocial}>Generate Social Post</Button>
						</div>
					)}
					{summary && (
						<div className="glass-panel rounded p-3 border">
							<div className="font-medium mb-1">Mission Summary</div>
							<p className="text-sm whitespace-pre-wrap">{summary}</p>
						</div>
					)}
					{social && (
						<div className="glass-panel rounded p-3 border">
							<div className="font-medium mb-1">Social Post</div>
							<p className="text-sm whitespace-pre-wrap">{social}</p>
						</div>
					)}
					<video ref={videoRef} className="hidden" playsInline muted />
					<canvas ref={canvasRef} className="hidden" />

					{/* Unique Items Summary */}
					{frames.length > 0 && frames.some(f => f.enriched && f.enriched.length > 0) && (
						<div className="border-2 border-primary/30 rounded-lg p-4 bg-primary/5">
							<h3 className="text-xl font-bold mb-4 flex items-center gap-2">
								<span>📊</span>
								Unique Items Detected Across All Frames
							</h3>
							<div className="space-y-4">
								{deduplicateItems(frames.flatMap(f => f.enriched || [])).map((e, idx) => (
									<div key={idx} className="flex items-center gap-4 p-3 bg-background rounded-lg border">
										{e.croppedImage && (
											<img 
												src={e.croppedImage} 
												alt={e.item} 
												className="w-20 h-20 object-contain border rounded bg-white"
											/>
										)}
										<div className="flex-1">
											<div className="flex items-center gap-2 mb-1">
												<span className="font-bold">{e.item}</span>
												<Badge
													variant={
														e.threat_level === "Critical" || e.threat_level === "High"
															? "destructive"
															: e.threat_level === "Medium"
																? "default"
																: "secondary"
													}
												>
													{e.threat_level}
												</Badge>
											</div>
											<p className="text-sm text-muted-foreground">
												Material: {e.material} • Decomposition: {e.decomposition_time}
											</p>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Detailed Frame-by-Frame Analysis (Collapsible) */}
					{frames.length > 0 && (
						<details className="border rounded-lg">
							<summary className="p-4 cursor-pointer font-semibold hover:bg-muted flex items-center gap-2">
								<span>🔍</span>
								Detailed Frame-by-Frame Analysis ({frames.length} frames)
							</summary>
							<div className="p-4 space-y-8 border-t">
								{frames.map((f, frameIdx) => (
									<div key={frameIdx} className="border rounded-lg p-4 bg-muted/20">
										<div className="flex items-center justify-between mb-4">
											<h3 className="text-lg font-bold">Frame at {f.timeSec.toFixed(1)}s</h3>
											<Badge>{f.detections.length} item{f.detections.length !== 1 ? 's' : ''} detected</Badge>
										</div>
								
								{/* Show full frame */}
								<img src={f.imageDataUrl} alt={`frame-${frameIdx}`} className="rounded border mb-4 w-full" />
								
								{/* Show each detected item with its cropped image and full analysis */}
								{f.enriched && f.enriched.length > 0 && (
									<div className="space-y-6 mt-6">
										<h4 className="text-md font-semibold">Individual Trash Analysis:</h4>
										{f.enriched.map((e, itemIdx) => (
											<div key={itemIdx} className="border rounded-lg overflow-hidden bg-background">
												{/* Header with cropped image */}
												<div className="bg-muted p-4">
													<div className="flex items-start gap-4">
														{e.croppedImage && (
															<img 
																src={e.croppedImage} 
																alt={e.item} 
																className="w-32 h-32 object-contain border rounded bg-white"
															/>
														)}
														<div className="flex-1">
															<div className="flex items-center justify-between mb-2">
																<span className="font-bold text-lg">{e.item}</span>
																<Badge
																	variant={
																		e.threat_level === "Critical" || e.threat_level === "High"
																			? "destructive"
																			: e.threat_level === "Medium"
																				? "default"
																				: "secondary"
																	}
																>
																	{e.threat_level} Threat
																</Badge>
															</div>
															<p className="text-sm text-muted-foreground">Material: {e.material}</p>
														</div>
													</div>
												</div>

												{/* Analysis Cards */}
												<div className="p-4 space-y-4">
													{/* Decomposition Estimate */}
													<div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800 rounded-lg p-3">
														<h5 className="font-bold text-amber-900 dark:text-amber-100 mb-1 flex items-center gap-2 text-sm">
															<span>⏳</span>
															Decomposition Estimate
														</h5>
														<p className="text-sm text-amber-950 dark:text-amber-50">
															<strong>{e.decomposition_time}</strong> in marine environment
														</p>
													</div>

													{/* Environmental Threat */}
													<div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800 rounded-lg p-3">
														<h5 className="font-bold text-red-900 dark:text-red-100 mb-1 flex items-center gap-2 text-sm">
															<span>⚠️</span>
															Environmental Threat
														</h5>
														<p className="text-sm text-red-950 dark:text-red-50">{e.eco_impact}</p>
													</div>

													{/* Recycling Instructions */}
													<div className="bg-green-50 dark:bg-green-950/30 border-2 border-green-200 dark:border-green-800 rounded-lg p-3">
														<h5 className="font-bold text-green-900 dark:text-green-100 mb-1 flex items-center gap-2 text-sm">
															<span>♻️</span>
															Recycling/Disposal
														</h5>
														<p className="text-sm text-green-950 dark:text-green-50">{e.recommended_action}</p>
													</div>

													{/* Source Attribution */}
													<div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-3">
														<h5 className="font-bold text-blue-900 dark:text-blue-100 mb-1 flex items-center gap-2 text-sm">
															<span>📍</span>
															Probable Source
														</h5>
														<p className="text-sm text-blue-950 dark:text-blue-50">{e.probable_source}</p>
													</div>
												</div>
											</div>
										))}
									</div>
								)}
								</div>
							))}
						</div>
					</details>
					)}
				</CardContent>
			</Card>
		</div>
	);
}


