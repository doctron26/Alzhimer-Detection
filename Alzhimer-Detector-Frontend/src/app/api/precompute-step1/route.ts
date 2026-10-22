import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    
    const pythonBackendResponse = await fetch(`${backendUrl}/api/precompute-step1`, {
      method: "POST",
      body: formData,
    });
    
    if (!pythonBackendResponse.ok) {
      console.warn("Python backend precompute-step1 warning:", pythonBackendResponse.status);
      return NextResponse.json({ success: false, status: pythonBackendResponse.status });
    }

    const pythonData = await pythonBackendResponse.json();
    return NextResponse.json(pythonData);
  } catch (error) {
    console.warn("Error forwarding precompute-step1:", error);
    return NextResponse.json({ success: false, error: "Precompute failed" }, { status: 500 });
  }
}
