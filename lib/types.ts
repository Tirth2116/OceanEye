export type ThreatLevel = "Low" | "Medium" | "High" | "Critical";

export interface BoundingBox {
	x: number; // left px
	y: number; // top px
	width: number;
	height: number;
}

export interface DetectedItem {
	id?: string;
	itemName?: string; // e.g., "Plastic Water Bottle"
	label?: string; // model label, e.g., "bottle"
	material?: string; // e.g., "PET"
	confidence?: number; // 0..1
	imageUrl?: string; // frame image URL
	maskUrl?: string; // optional mask URL for the trash region
	bbox?: BoundingBox;
	frameNumber?: number;
	locationHint?: string; // e.g., "near coastal marina", coordinates, etc.
	timestampIso?: string;
	contextNotes?: string; // any extra context
}

export interface EnrichedItem {
	item: string;
	material: string;
	threat_level: ThreatLevel;
	eco_impact: string;
	decomposition_time: string;
	recommended_action: string;
	probable_source: string;
	references?: string[]; // optional citations/notes from the model
	raw?: unknown; // original model output if needed
	croppedImage?: string; // cropped image of just this trash item
}

export interface MissionMetrics {
	durationMinutes: number;
	areaKm2?: number;
	location?: string;
	totalItems: number;
	mostCommonMaterial?: string;
	estimatedImpactAverted?: string; // free text summary
}

export interface MissionSummaryInput {
	items: EnrichedItem[];
	durationMinutes: number;
	areaKm2?: number;
	location?: string;
}

export interface SocialPostInput {
	platform: "twitter" | "instagram";
	keyPoints: string[]; // short bullets or key sentences
	hashtags?: string[];
	tone?: "informative" | "urgent" | "celebratory" | "scientific";
	maxLength?: number; // platform length, default sensible
}

export interface InpaintRequestBody {
	imageUrl?: string;
	maskUrl?: string;
	imageBase64?: string; // data URL or raw base64 (PNG/JPEG)
	maskBase64?: string; // data URL or raw base64 (PNG with transparent region over trash)
	prompt?: string;
	size?: "512x512" | "768x768" | "1024x1024";
}

export interface VisionDetection {
	label: string;
	material_guess?: string;
	confidence?: number; // 0..1 approximate
	bbox?: { x: number; y: number; width: number; height: number }; // relative 0..1
	summary?: string;
}

export interface VisionDetectRequestBody {
	imageUrl?: string;
	imageBase64?: string;
	maxDetections?: number;
}


