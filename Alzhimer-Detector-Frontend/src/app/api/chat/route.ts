import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn("Gemini API key missing in .env.local");
      return NextResponse.json(
        { reply: "I'm sorry, my AI brain is currently disconnected. Please configure the Gemini API key." },
        { status: 200 }
      );
    }

    // Initialize the model (using gemini-3.5-flash for fast chat responses)
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    // System instructions to maintain the bot's persona and context
    const prompt = `You are AlzDetect AI, a helpful medical AI assistant specializing in Alzheimer's.
If the user asks about their score, tell them it's calculating.
If they want to start an assessment, tell them to click the Launch Assessment button at the top of the page to begin.
Keep your responses concise, empathetic, and under 2-3 sentences. Do not use markdown styling.
User says: "${message}"`;

    // Generate response from Gemini
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return NextResponse.json({ reply: responseText });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
