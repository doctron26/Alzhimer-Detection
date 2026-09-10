import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    const audioSpontaneous = formData.get("audio_spontaneous") as Blob | null;
    const audioReading = formData.get("audio_reading") as Blob | null;
    const writtenData = formData.get("writtenData") as string;

    console.log("--- RECEIVED ASSESSMENT DATA (PHASE 5) ---");
    console.log("Spontaneous Audio Size:", audioSpontaneous ? audioSpontaneous.size : "No file");
    console.log("Reading Audio Size:", audioReading ? audioReading.size : "No file");
    console.log("Written Data Payload length:", writtenData ? writtenData.length : 0);
    
    // Forwarding the data to the Python backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    const pythonBackendResponse = await fetch(`${backendUrl}/api/analyze`, {
      method: "POST",
      body: formData, // Forwarding the form data directly
    });
    
    if (!pythonBackendResponse.ok) {
       console.error("Python backend error:", pythonBackendResponse.status);
       throw new Error("Python backend failed");
    }

    const pythonData = await pythonBackendResponse.json();

    // Return response from Python
    return NextResponse.json(pythonData);
    
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Failed to process assessment data" },
      { status: 500 }
    );
  }
}
