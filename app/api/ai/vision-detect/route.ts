import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { VisionDetectRequestBody, VisionDetection } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json()) as Partial<VisionDetectRequestBody>;
		if (!body?.imageUrl && !body?.imageBase64) {
			return new Response(JSON.stringify({ error: "Provide imageUrl or imageBase64" }), {
				status: 400,
				headers: { "content-type": "application/json" },
			});
		}
		if (!process.env.GEMINI_API_KEY) {
			return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), {
				status: 500,
				headers: { "content-type": "application/json" },
			});
		}

		// Prepare base64 data
		let imageBase64: string;
		if (body.imageBase64) {
			imageBase64 = body.imageBase64.startsWith("data:")
				? body.imageBase64.split(",")[1] || ""
				: body.imageBase64;
		} else {
			const resp = await fetch(body.imageUrl as string);
			if (!resp.ok) {
				return new Response(JSON.stringify({ error: "Failed to fetch imageUrl" }), {
					status: 400,
					headers: { "content-type": "application/json" },
				});
			}
			const buf = await resp.arrayBuffer();
			imageBase64 = Buffer.from(buf).toString("base64");
		}

		const maxDetections = body.maxDetections ?? 5;

		const instruction =
			`You are a marine debris and ocean pollution detection system. Analyze this image carefully and identify ANY of the following:
- Plastic items (bottles, bags, wrappers, containers, straws, cups, packaging)
- Fishing debris (nets, lines, buoys, traps)
- Metal objects (cans, bottle caps)
- Glass items
- Foam/styrofoam
- Cloth/fabric
- Paper/cardboard
- Any other human-made objects or pollution in water

Return a JSON object with "detections" array (max ${maxDetections} items). Each detection must have:
- label: string (item type)
- material_guess: string (plastic, metal, glass, etc.)
- confidence: number (0-1)
- bbox: {x, y, width, height} (normalized 0-1)
- summary: string (brief description)

If you see ANY suspicious objects, debris, or pollution, include them. Be liberal in detection - false positives are better than false negatives.
If you see NOTHING suspicious, return {"detections":[], "scene_description":"[describe what you see]"}.
Output ONLY valid JSON.`;

		const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
		const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL_JSON || "gemini-2.5-flash" });
		const result = await model.generateContent({
			contents: [
				{
					role: "user",
					parts: [
						{ text: instruction },
						{ inlineData: { data: imageBase64, mimeType: "image/png" } },
					],
				},
			],
		});

		let detections: VisionDetection[] = [];
		let sceneDescription = "";
		let rawResponse = "";
		try {
			rawResponse = result.response.text() || "{}";
			// Strip markdown code blocks if present
			let jsonText = rawResponse.trim();
			if (jsonText.startsWith("```json")) {
				jsonText = jsonText.replace(/^```json\s*/i, "").replace(/\s*```\s*$/i, "");
			} else if (jsonText.startsWith("```")) {
				jsonText = jsonText.replace(/^```\s*/i, "").replace(/\s*```\s*$/i, "");
			}
			const parsed = JSON.parse(jsonText);
			detections = Array.isArray(parsed?.detections) ? parsed.detections : [];
			sceneDescription = parsed?.scene_description || "";
		} catch (e) {
			console.error("Failed to parse vision response:", rawResponse, e);
			detections = [];
		}

		return new Response(JSON.stringify({ detections, sceneDescription, rawResponse }), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	} catch (err: any) {
		console.error("vision-detect error", err);
		const errorDetails = {
			error: err?.message || "Server error",
			stack: err?.stack,
			name: err?.name,
		};
		return new Response(JSON.stringify(errorDetails), {
			status: 500,
			headers: { "content-type": "application/json" },
		});
	}
}


