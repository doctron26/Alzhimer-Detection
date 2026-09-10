import { NextResponse } from "next/server";
import dialogflow from "@google-cloud/dialogflow";
import { v4 as uuidv4 } from "uuid";

// We keep a session ID in memory for simple demonstration.
// In a real app, this should be stored in a secure cookie or passed from the client.
let sessionId = uuidv4();

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const projectId = process.env.GOOGLE_PROJECT_ID;
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || "";
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, "\n");
    const languageCode = process.env.DIALOGFLOW_LANGUAGE_CODE || "en-US";

    if (!projectId || !clientEmail || !privateKey) {
      console.warn("Dialogflow credentials missing in .env.local");
      return NextResponse.json(
        { reply: "I'm sorry, my AI brain is currently disconnected. Please configure the Dialogflow credentials." },
        { status: 200 }
      );
    }

    // Initialize Dialogflow client
    const sessionClient = new dialogflow.SessionsClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      projectId: projectId,
    });

    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: message,
          languageCode: languageCode,
        },
      },
    };

    // Send request to Dialogflow
    const [response] = await sessionClient.detectIntent(request);
    
    if (response.queryResult) {
      const result = response.queryResult;
      return NextResponse.json({ reply: result.fulfillmentText });
    } else {
      return NextResponse.json({ reply: "I'm sorry, I didn't understand that." });
    }
  } catch (error: any) {
    console.error("Dialogflow error:", error);
    return NextResponse.json({ error: "Failed to process chat", details: error?.message || String(error) }, { status: 500 });
  }
}
