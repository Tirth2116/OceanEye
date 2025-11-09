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

		// Try common model names
		const modelsToTry = ["gemini-pro", "gemini-pro-vision", "gemini-1.5-pro", "gemini-1.5-flash"];
		const results = [];

		for (const modelName of modelsToTry) {
			try {
				const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
				const model = genAI.getGenerativeModel({ model: modelName });
				const result = await model.generateContent({
					contents: [{ role: "user", parts: [{ text: "Hi" }] }],
				});
				results.push({ model: modelName, works: true, response: result.response.text() });
			} catch (e: any) {
				results.push({ model: modelName, works: false, error: e.message });
			}
		}

		return new Response(
			JSON.stringify({
				success: true,
				results,
			}),
			{
				status: 200,
				headers: { "content-type": "application/json" },
			}
		);
	} catch (err: any) {
		console.error("List models error:", err);
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

