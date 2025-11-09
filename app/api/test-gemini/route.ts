import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

		const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
		const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

		const result = await model.generateContent({
			contents: [{ role: "user", parts: [{ text: "Say 'Hello from Gemini!' in one sentence." }] }],
		});

		return new Response(
			JSON.stringify({
				success: true,
				message: result.response.text(),
				apiKeySet: true,
			}),
			{
				status: 200,
				headers: { "content-type": "application/json" },
			}
		);
	} catch (err: any) {
		console.error("Gemini test error:", err);
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

