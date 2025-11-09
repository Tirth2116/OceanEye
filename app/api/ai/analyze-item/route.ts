import { NextRequest } from "next/server";
import { DetectedItem, EnrichedItem } from "@/lib/types";
import { generateItemAnalysis } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json()) as Partial<DetectedItem>;
		if (!body || (!body.itemName && !body.label)) {
			return new Response(JSON.stringify({ error: "Provide at least itemName or label" }), {
				status: 400,
				headers: { "content-type": "application/json" },
			});
		}
		const enriched: EnrichedItem = await generateItemAnalysis(body as DetectedItem);
		return new Response(JSON.stringify(enriched), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	} catch (err: any) {
		console.error("analyze-item error", err);
		return new Response(JSON.stringify({ error: err?.message || "Server error" }), {
			status: 500,
			headers: { "content-type": "application/json" },
		});
	}
}


