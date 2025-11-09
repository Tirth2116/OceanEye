import { GoogleGenerativeAI } from "@google/generative-ai";
import { DetectedItem, EnrichedItem, MissionSummaryInput, SocialPostInput } from "./types";

const GEMINI_MODEL_TEXT = process.env.GEMINI_MODEL_TEXT || "gemini-2.5-flash";
const GEMINI_MODEL_JSON = process.env.GEMINI_MODEL_JSON || "gemini-2.5-flash";

export function getGeminiClient(): GoogleGenerativeAI {
	if (!process.env.GEMINI_API_KEY) {
		throw new Error("Missing GEMINI_API_KEY");
	}
	return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

export async function generateItemAnalysis(item: DetectedItem): Promise<EnrichedItem> {
	const genAI = getGeminiClient();
	const userFacts: string[] = [];
	if (item.itemName) userFacts.push(`Item: ${item.itemName}`);
	if (item.label) userFacts.push(`Model label: ${item.label}`);
	if (item.material) userFacts.push(`Material: ${item.material}`);
	if (typeof item.confidence === "number") userFacts.push(`Confidence: ${Math.round(item.confidence * 100)}%`);
	if (item.locationHint) userFacts.push(`Location hint: ${item.locationHint}`);
	if (item.contextNotes) userFacts.push(`Notes: ${item.contextNotes}`);

	const prompt =
		"You are a marine debris analysis assistant. Given minimal detection context, produce concise, evidence-informed JSON describing the debris.\n\n" +
		"CRITICAL REQUIREMENTS:\n" +
		"- decomposition_time: MUST be a specific number range in years (e.g., '400-500 years', '1-5 years', '50-80 years'). NEVER use 'Unknown'. " +
		"For common materials: PET plastic bottles (450 years), plastic bags (10-20 years), foam (50+ years), fishing nets (600 years), glass (1 million years), aluminum cans (200 years), paper (2-6 weeks).\n" +
		"- threat_level: Low|Medium|High|Critical\n" +
		"- eco_impact: Be specific about dangers (ingestion, entanglement, microplastics, habitat damage)\n" +
		"- recommended_action (Recycling/Disposal Instructions): Generate CLEAR step-by-step instructions for disposal after collection. Examples:\n" +
		"  * 'This PET bottle is widely recyclable. Rinse thoroughly, remove cap, and place in recycling bin.'\n" +
		"  * 'This fishing net is not suitable for standard recycling; contact a local port authority or marine debris disposal program.'\n" +
		"  * 'Aluminum cans are highly recyclable. Rinse and recycle at any standard facility.'\n" +
		"- probable_source: Make an educated guess with specifics. Examples:\n" +
		"  * 'This type of debris is common from recreational boating and beach visitors.'\n" +
		"  * 'This packaging is likely linked to land-based consumer waste from a nearby river delta or storm drain runoff.'\n" +
		"  * 'This fishing gear indicates commercial fishing activity in the area.'\n\n" +
		"Return valid JSON with keys: item, material, threat_level, eco_impact, decomposition_time, recommended_action, probable_source.\n\n" +
		`Context:\n${userFacts.join("\n") || "No extra context."}`;

	const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_JSON });
	const response = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
	let raw = response.response.text() || "{}";
	
	// Strip markdown code blocks if present
	raw = raw.trim();
	if (raw.startsWith("```json")) {
		raw = raw.replace(/^```json\s*/i, "").replace(/\s*```\s*$/i, "");
	} else if (raw.startsWith("```")) {
		raw = raw.replace(/^```\s*/i, "").replace(/\s*```\s*$/i, "");
	}
	
	let parsed: EnrichedItem;
	try {
		parsed = JSON.parse(raw) as EnrichedItem;
		// Fallback if still Unknown
		if (parsed.decomposition_time === "Unknown" || !parsed.decomposition_time) {
			const mat = (item.material || "").toLowerCase();
			if (mat.includes("plastic") || mat.includes("pet")) {
				parsed.decomposition_time = "450 years";
			} else if (mat.includes("metal") || mat.includes("aluminum")) {
				parsed.decomposition_time = "200 years";
			} else if (mat.includes("glass")) {
				parsed.decomposition_time = "1 million years";
			} else if (mat.includes("paper")) {
				parsed.decomposition_time = "2-6 weeks";
			} else {
				parsed.decomposition_time = "50-100 years";
			}
		}
	} catch {
		parsed = {
			item: item.itemName || item.label || "Unknown debris",
			material: item.material || "Plastic",
			threat_level: "Medium",
			eco_impact: "Potential ingestion and entanglement risks; may fragment into microplastics.",
			decomposition_time: "450 years",
			recommended_action: "Collect safely and dispose per local recycling or marine debris guidance.",
			probable_source: "Land-based consumer waste",
		};
	}
	return { ...parsed, raw };
}

export async function generateMissionSummary(input: MissionSummaryInput): Promise<string> {
	const genAI = getGeminiClient();
	const totalsByMaterial = input.items.reduce<Record<string, number>>((acc, it) => {
		const key = (it.material || "Unknown").trim();
		acc[key] = (acc[key] || 0) + 1;
		return acc;
	}, {});
	const mostCommonMaterial = Object.entries(totalsByMaterial).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unknown";

	const facts = [
		`Duration: ${input.durationMinutes} minutes`,
		`Area: ${input.areaKm2 ? `${input.areaKm2} km^2` : "Unknown"}`,
		`Location: ${input.location ?? "Unknown"}`,
		`Total items: ${input.items.length}`,
		`Most common material: ${mostCommonMaterial}`,
	];

	const prompt =
		"Write a 3-paragraph, concise, factual mission summary for a marine debris detection run. " +
		"Be concrete and avoid hype. 70-120 words total.\n\n" +
		`Facts:\n${facts.join("\n")}\n` +
		`Top 5 items (sample):\n${input.items
			.slice(0, 5)
			.map((i) => `- ${i.item} (${i.material})`)
			.join("\n")}`;

	const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_TEXT });
	const response = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
	return response.response.text() || "";
}

export async function generateSocialPost(input: SocialPostInput): Promise<string> {
	const genAI = getGeminiClient();
	const platform = input.platform;
	const maxLength = input.maxLength ?? (platform === "twitter" ? 280 : 2200);
	const prompt = [
		`Platform: ${platform}`,
		`Tone: ${input.tone ?? "informative"}`,
		`Max length: ${maxLength} characters`,
		`Key points:\n${input.keyPoints.map((k) => `- ${k}`).join("\n")}`,
		input.hashtags?.length ? `Hashtags: ${input.hashtags.join(" ")}` : "",
	]
		.filter(Boolean)
		.join("\n");

	const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_TEXT });
	const response = await model.generateContent({
		contents: [
			{
				role: "user",
				parts: [
					{
						text:
							"Compose a single social post in plain text for the given platform. Keep within length limits. Use clear, accessible language.\n\n" +
							prompt,
					},
				],
			},
		],
	});
	const text = (response.response.text() || "").trim();
	return text.length > maxLength ? text.slice(0, maxLength - 1) + "…" : text;
}

export const AiModels = {
	json: GEMINI_MODEL_JSON,
	text: GEMINI_MODEL_TEXT,
};


