import { NextRequest } from "next/server";
import { EnrichedItem, MissionSummaryInput } from "@/lib/types";
import { generateMissionSummary } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json()) as Partial<MissionSummaryInput>;
		if (!body?.items || !Array.isArray(body.items) || typeof body.durationMinutes !== "number") {
			return new Response(JSON.stringify({ error: "Provide items[] and durationMinutes:number" }), {
				status: 400,
				headers: { "content-type": "application/json" },
			});
		}
		const summary = await generateMissionSummary(body as MissionSummaryInput);
		return new Response(JSON.stringify({ summary }), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	} catch (err: any) {
		console.error("mission-summary error", err);
		return new Response(JSON.stringify({ error: err?.message || "Server error" }), {
			status: 500,
			headers: { "content-type": "application/json" },
		});
	}
}


