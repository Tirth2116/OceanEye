import { NextRequest } from "next/server";
import { InpaintRequestBody } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json()) as Partial<InpaintRequestBody>;
		// Gemini SDK does not provide image inpainting. Use Google Vertex AI Imagen Editor instead.
		// For hackathon speed, this endpoint is a stub guiding setup.
		return new Response(
			JSON.stringify({
				error:
					"Inpainting not configured. Use Vertex AI Imagen (image editing with mask) or another image service. Provide GOOGLE_APPLICATION_CREDENTIALS and set up a Vertex route.",
			}),
			{ status: 501, headers: { "content-type": "application/json" } }
		);
	} catch (err: any) {
		console.error("inpaint error", err);
		return new Response(JSON.stringify({ error: err?.message || "Server error" }), {
			status: 500,
			headers: { "content-type": "application/json" },
		});
	}
}


