/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EnrichedItem } from "@/lib/types";

export default function TestImagePage() {
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string>("");
	const [working, setWorking] = useState(false);
	const [detections, setDetections] = useState<any[]>([]);
	const [enriched, setEnriched] = useState<EnrichedItem[]>([]);
	const [summary, setSummary] = useState<string>("");
	const [social, setSocial] = useState<string>("");

	const handleFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
		const f = e.target.files?.[0] || null;
		setImageFile(f);
		setDetections([]);
		setEnriched([]);
		setSummary("");
		setSocial("");
		if (f) {
			const reader = new FileReader();
			reader.onload = (ev) => setImagePreview(ev.target?.result as string);
			reader.readAsDataURL(f);
		} else {
			setImagePreview("");
		}
	};

	const runDetection = async () => {
		if (!imageFile || !imagePreview) return;
		setWorking(true);
		console.log("Starting image detection...");
		try {
			// Vision detect
			console.log("Calling vision API...");
			const res = await fetch("/api/ai/vision-detect", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ imageBase64: imagePreview, maxDetections: 5 }),
			});
			console.log("Vision API status:", res.status);
			if (!res.ok) {
				const errData = await res.json();
				console.error("Vision detection failed:", errData);
				alert(`Vision API error: ${errData.error || res.statusText}`);
				throw new Error(`Vision API failed: ${errData.error}`);
			}
			const { detections: dets, sceneDescription, rawResponse } = await res.json();
			console.log("Detections:", dets);
			console.log("Scene description:", sceneDescription);
			console.log("Raw Gemini response:", rawResponse);
			setDetections(dets || []);
			
			if (!dets || dets.length === 0) {
				alert(`No trash detected. Gemini sees: ${sceneDescription || "Unknown scene"}`);
			}

			// Enrich first 3
			const enrichedItems: EnrichedItem[] = [];
			for (const d of (dets || []).slice(0, 3)) {
				console.log("Enriching detection:", d.label);
				const body = {
					itemName: d.label,
					label: d.label,
					material: d.material_guess,
					confidence: d.confidence,
					contextNotes: d.summary,
				};
				const enr = await fetch("/api/ai/analyze-item", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				}).then((r) => r.json());
				console.log("Enriched:", enr);
				enrichedItems.push(enr);
			}
			setEnriched(enrichedItems);
			console.log("Detection complete!");
		} catch (e: any) {
			console.error("Detection error:", e);
			alert(`Error: ${e?.message || "Something went wrong"}`);
		} finally {
			setWorking(false);
		}
	};

	const generateSummary = async () => {
		if (enriched.length === 0) return;
		setWorking(true);
		try {
			const res = await fetch("/api/ai/mission-summary", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					items: enriched,
					durationMinutes: 5,
					location: "Test location",
				}),
			});
			const { summary: s } = await res.json();
			setSummary(s);
		} catch (e: any) {
			alert(`Summary error: ${e?.message}`);
		} finally {
			setWorking(false);
		}
	};

	const generateSocial = async () => {
		if (enriched.length === 0) return;
		setWorking(true);
		try {
			const keyPoints = enriched.map((e) => `${e.item} (${e.material}) - ${e.threat_level} threat`);
			const res = await fetch("/api/ai/social-post", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					platform: "twitter",
					keyPoints,
					hashtags: ["#OceanCleanup", "#MarineDebris"],
				}),
			});
			const { post } = await res.json();
			setSocial(post);
		} catch (e: any) {
			alert(`Social post error: ${e?.message}`);
		} finally {
			setWorking(false);
		}
	};

	return (
		<div className="min-h-screen bg-background p-8">
			<Card className="max-w-5xl mx-auto">
				<CardHeader>
					<CardTitle className="text-3xl">Test Image Trash Detection</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-4">
						<Input type="file" accept="image/*" onChange={handleFile} />
						{imageFile && (
							<p className="text-sm text-muted-foreground">
								{imageFile.name} • {(imageFile.size / 1024 / 1024).toFixed(2)} MB
							</p>
						)}
						<Button onClick={runDetection} disabled={!imageFile || working}>
							{working ? "Processing..." : "Run Detection"}
						</Button>
					</div>

					{imagePreview && (
						<div className="border rounded-lg overflow-hidden">
							<img src={imagePreview} alt="Preview" className="w-full h-auto" />
						</div>
					)}

					{detections.length > 0 && (
						<div className="space-y-4">
							<div>
								<h3 className="text-xl font-semibold mb-2">Detections ({detections.length})</h3>
								<div className="space-y-2">
									{detections.map((d, i) => (
										<div key={i} className="p-3 border rounded-lg">
											<div className="flex items-center justify-between">
												<span className="font-medium">{d.label}</span>
												<Badge>{Math.round(d.confidence * 100)}%</Badge>
											</div>
											<p className="text-sm text-muted-foreground mt-1">
												Material: {d.material_guess}
											</p>
											<p className="text-sm text-muted-foreground">{d.summary}</p>
										</div>
									))}
								</div>
							</div>

							{enriched.length > 0 && (
								<div>
									<h3 className="text-xl font-semibold mb-4">AI Analysis Results</h3>
									<div className="space-y-4">
										{enriched.map((e, i) => (
											<div key={i} className="border rounded-lg overflow-hidden">
												{/* Header */}
												<div className="bg-muted p-4 flex items-center justify-between">
													<span className="font-bold text-lg">{e.item}</span>
													<Badge
														variant={
															e.threat_level === "Critical"
																? "destructive"
																: e.threat_level === "High"
																	? "destructive"
																	: e.threat_level === "Medium"
																		? "default"
																		: "secondary"
														}
														className="text-sm"
													>
														{e.threat_level} Threat
													</Badge>
												</div>

												{/* Key Info Cards */}
												<div className="p-4 space-y-4">
													{/* Decomposition Estimate - HIGHLIGHTED */}
													<div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800 rounded-lg p-4">
														<h4 className="font-bold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
															<span className="text-xl">⏳</span>
															Decomposition Estimate
														</h4>
														<p className="text-base text-amber-950 dark:text-amber-50">
															Based on the material ({e.material}), this item will take an estimated{" "}
															<strong className="text-lg">{e.decomposition_time}</strong> to
															decompose in a marine environment.
														</p>
													</div>

													{/* Environmental Threat Assessment - HIGHLIGHTED */}
													<div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800 rounded-lg p-4">
														<h4 className="font-bold text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
															<span className="text-xl">⚠️</span>
															Environmental Threat Assessment
														</h4>
														<p className="text-base text-red-950 dark:text-red-50">{e.eco_impact}</p>
													</div>

													{/* Recycling/Disposal Instructions - HIGHLIGHTED */}
													<div className="bg-green-50 dark:bg-green-950/30 border-2 border-green-200 dark:border-green-800 rounded-lg p-4">
														<h4 className="font-bold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
															<span className="text-xl">♻️</span>
															Recycling/Disposal Instructions
														</h4>
														<p className="text-base text-green-950 dark:text-green-50">
															{e.recommended_action}
														</p>
													</div>

													{/* Probable Source Attribution - HIGHLIGHTED */}
													<div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
														<h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
															<span className="text-xl">📍</span>
															Probable Source Attribution
														</h4>
														<p className="text-base text-blue-950 dark:text-blue-50">{e.probable_source}</p>
													</div>
												</div>
											</div>
										))}
									</div>
								</div>
							)}

							<div className="flex gap-4">
								<Button onClick={generateSummary} disabled={enriched.length === 0 || working}>
									Generate Summary
								</Button>
								<Button onClick={generateSocial} disabled={enriched.length === 0 || working}>
									Generate Social Post
								</Button>
							</div>

							{summary && (
								<div className="p-4 border rounded-lg">
									<h3 className="text-lg font-semibold mb-2">Mission Summary</h3>
									<p className="text-sm whitespace-pre-wrap">{summary}</p>
								</div>
							)}

							{social && (
								<div className="p-4 border rounded-lg">
									<h3 className="text-lg font-semibold mb-2">Social Media Post</h3>
									<p className="text-sm whitespace-pre-wrap">{social}</p>
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

