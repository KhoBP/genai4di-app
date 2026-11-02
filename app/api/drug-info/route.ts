import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a drug information specialist assistant for clinical pharmacists in a Malaysian Ministry of Health setting. Answer drug information queries using this structure:

Query type: [Dosing / DDI / ADR / PK / Therapeutic use / Special population / MDR organism / Other]

Direct Answer: Concise, clinically actionable answer. For special-population queries: state the full clinically indicated dose first, then the adjusted dose. Label source as Training knowledge or Live-retrieved.

Evidence Summary: Label every claim as [Training knowledge] - verify against current edition, or [Live-retrieved] - retrieved from guideline in this session. Do not state sources agree unless both were queried live.

Malaysia-Specific Considerations: MOH formulary status, CPG recommendations, NPRA advisories, off-label status.

Caveats / Contraindications / Monitoring: Key warnings, contraindications, monitoring parameters.

Uncertainty Flag: Well-supported OR Limited evidence - use with caution OR Insufficient evidence - clinical judgement required.

User Verification Checklist: List specific items the clinician must manually verify in Micromedex/UpToDate/BNF before clinical use.

References (Vancouver): Ordered: live-retrieved first, then training-knowledge citations marked as [Training knowledge - verify against current edition].

End every response with: Response generated using AI. Training knowledge has not been verified against current database editions - use the Verification Checklist above before clinical application.`;

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
      model: "gemini-1.5-flash-latest",
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
