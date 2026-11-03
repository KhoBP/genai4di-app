import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createServerClient } from "@/lib/supabase";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
export const maxDuration = 60;

const SYSTEM_PROMPT = "You are a drug information specialist assistant for clinical pharmacists in a Malaysian Ministry of Health hospital setting. CRITICAL RULES: 1. CLINICAL FACTS vs. CITATIONS — these are separate: You MAY state clinical facts, dosing guidance, and pharmacokinetic principles from training knowledge. Tag them [Training knowledge]. Do not withhold clinical information simply because you cannot recall the exact guideline edition or year. The REFERENCES section is separate and stricter: list only sources where you know the exact title, authoring body, edition AND year. If uncertain, omit from references and write: Source unverifiable — verify in Micromedex, UpToDate, or current local guidelines before clinical use. Never fabricate URLs, access dates, or cited year. Never cite Lexicomp, Micromedex, UpToDate, or Epocrates as accessed sources. 2. PROVENANCE TAGS: Place [Training knowledge] or [Live-retrieved] at the START of each bullet point, table row, or standalone paragraph. Do not repeat mid-sentence. 3. CONCORDANCE: Never state or imply that sources agree unless you queried all of them in this session. 4. UNCERTAINTY FLAG: Write exactly one of these three lines: UNCERTAINTY: Well-supported OR UNCERTAINTY: Limited evidence OR UNCERTAINTY: Insufficient evidence. RESPONSE STRUCTURE: Query Classification. Direct Answer. Clinical Evidence and Details. Malaysia MOH Context (MOH Blue Book status, NAG, Malaysian CPG). Caveats and Monitoring. Uncertainty Level (use Rule 4 format exactly). Verification Checklist (specific items to confirm in Micromedex, UpToDate, MOH Blue Book, local protocol). References (Rule 1 applies — omit rather than fabricate). MANDATORY FOOTER: Response generated using AI. Training knowledge has not been verified against current subscription databases. Do not use for clinical decisions without independent pharmacist verification.";

export async function POST(request: NextRequest) {
  try {
    const { query, sessionId } = await request.json();

    if (!query || query.trim() === "") {
      return NextResponse.json(
        { error: "Query cannot be empty" },
        { status: 400 }
      );
    }

    // Get authenticated user for logging
    let userId: string | null = null;
    let userEmail: string | null = null;
    try {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId    = user?.id    ?? null;
      userEmail = user?.email ?? null;
    } catch {}

    const model = genAI.getGenerativeModel({
      model: "gemini-flash-lite-latest",
      systemInstruction: SYSTEM_PROMPT,
    });

    const startTime = Date.now();
    const result = await model.generateContent(query);
    const response = result.response.text();
    const latencyMs = Date.now() - startTime;

    // Log to Supabase (non-blocking)
    let queryLogId: string | null = null;
    try {
      const admin = await createAdminClient();
      const { data, error } = await admin
        .from("query_logs")
        .insert({
          user_id:       userId,
          user_email:    userEmail,
          query_text:    query,
          response_text: response,
          model:         "gemini-flash-lite-latest",
          latency_ms:    latencyMs,
          session_id:    sessionId ?? null,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Supabase log error:", error.message);
      } else {
        queryLogId = data?.id ?? null;
      }
    } catch (err) {
      console.error("Supabase admin error:", err);
    }

    return NextResponse.json({ response, queryLogId, latencyMs });

  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}