import { NextRequest } from "next/server";
import { SocialPostInput } from "@/lib/types";
import { generateSocialPost } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json()) as Partial<SocialPostInput>;
		if (!body?.platform || !body?.keyPoints || !Array.isArray(body.keyPoints) || body.keyPoints.length === 0) {
			return new Response(JSON.stringify({ error: "Provide platform and keyPoints[]" }), {
				status: 400,
				headers: { "content-type": "application/json" },
			});
		}
		const post = await generateSocialPost(body as SocialPostInput);
		return new Response(JSON.stringify({ post }), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	} catch (err: any) {
		console.error("social-post error", err);
		return new Response(JSON.stringify({ error: err?.message || "Server error" }), {
			status: 500,
			headers: { "content-type": "application/json" },
		});
	}
}


