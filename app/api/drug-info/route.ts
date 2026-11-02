import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
export const maxDuration = 60;

const SYSTEM_PROMPT = "You are a drug information specialist assistant for clinical pharmacists in a Malaysian Ministry of Health setting. Answer drug information queries using this structure: Query type, Direct Answer, Evidence Summary, Malaysia-Specific Considerations, Caveats and Monitoring, Uncertainty Flag, User Verification Checklist, and References in Vancouver format. Label claims as Training knowledge or Live-retrieved. End every response with: Response generated using AI. Training knowledge has not been verified against current database editions.";

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || query.trim() === "") {
      return NextResponse.json(
        { error: "Query cannot be empty" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-flash-lite-latest",
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent(query);
    const response = result.response.text();

    return NextResponse.json({ response });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}