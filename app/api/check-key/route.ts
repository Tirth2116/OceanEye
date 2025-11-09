import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
	try {
		if (!process.env.GEMINI_API_KEY) {
			return new Response(
				JSON.stringify({
					success: false,
					error: "GEMINI_API_KEY not found in environment",
				}),
				{
					status: 500,
					headers: { "content-type": "application/json" },
				}
			);
		}

		// Direct REST API call to list models
		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
		);

		if (!response.ok) {
			const errorText = await response.text();
			return new Response(
				JSON.stringify({
					success: false,
					error: `API returned ${response.status}: ${errorText}`,
					keyPresent: true,
					keyPrefix: process.env.GEMINI_API_KEY.substring(0, 10) + "...",
				}),
				{
					status: response.status,
					headers: { "content-type": "application/json" },
				}
			);
		}

		const data = await response.json();

		return new Response(
			JSON.stringify({
				success: true,
				keyPresent: true,
				keyPrefix: process.env.GEMINI_API_KEY.substring(0, 10) + "...",
				models: data.models?.map((m: any) => ({
					name: m.name,
					displayName: m.displayName,
					supportedGenerationMethods: m.supportedGenerationMethods,
				})),
			}),
			{
				status: 200,
				headers: { "content-type": "application/json" },
			}
		);
	} catch (err: any) {
		console.error("Check key error:", err);
		return new Response(
			JSON.stringify({
				success: false,
				error: err?.message || "Unknown error",
				stack: err?.stack,
			}),
			{
				status: 500,
				headers: { "content-type": "application/json" },
			}
		);
	}
}

