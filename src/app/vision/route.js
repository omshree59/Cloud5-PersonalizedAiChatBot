import Bytez from "bytez.js";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { question, imageBase64 } = await req.json();

    const key = process.env.BYTEZ_API_KEY;
    const sdk = new Bytez(key);

    // If the user uploads an image but doesn't type a question, ask a default one
    const finalQuestion = question || "Please describe everything you see in this image.";

    const visionPayload = {
      "question": finalQuestion,
      "url": imageBase64
    };

    let finalOutput = null;

    // --- ATTEMPT 1: Salesforce BLIP ---
    let model = sdk.model("Salesforce/blip-vqa-base");
    let { error, output } = await model.run(visionPayload);

    if (!error && output) {
        finalOutput = output;
        console.log("Success: Used BLIP VQA");
    } else {
        console.log("BLIP failed. Falling back to Document Reader...");
        
        // --- ATTEMPT 2: Fallback Document Reader ---
        model = sdk.model("cloudqi/CQI_Visual_Question_Awnser_PT_v0");
        const fallbackRes = await model.run(visionPayload);
        
        if (!fallbackRes.error && fallbackRes.output) {
            finalOutput = fallbackRes.output;
            console.log("Success: Used CQI VQA");
        } else {
            return NextResponse.json({ error: "Cloud5 is having trouble seeing the image clearly right now." }, { status: 500 });
        }
    }

    // Safely extract the text answer
    let textAnswer = finalOutput;
    if (Array.isArray(finalOutput) && finalOutput.length > 0) {
        textAnswer = finalOutput[0].answer || finalOutput[0].generated_text || JSON.stringify(finalOutput[0]);
    } else if (typeof finalOutput === "object" && finalOutput !== null) {
        textAnswer = finalOutput.answer || finalOutput.generated_text || JSON.stringify(finalOutput);
    }

    return NextResponse.json({ answer: textAnswer });

  } catch (error) {
    console.error("Vision Server Error:", error);
    return NextResponse.json({ error: "Server error processing the image." }, { status: 500 });
  }
}