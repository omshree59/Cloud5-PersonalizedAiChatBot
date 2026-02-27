import Bytez from "bytez.js";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { prompt } = await req.json();
    
    // 1. Securely fetch the key from your .env.local file
    const key = process.env.BYTEZ_API_KEY;
    
    // Add a quick safety check to ensure the key actually loaded
    if (!key) {
      console.error("Missing BYTEZ_API_KEY in environment variables.");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // 2. THE FIX: You MUST initialize the SDK before using it!
    const bytez = new Bytez(key); 
    
    let finalOutput = null;

    // --- ATTEMPT 1: Stable Diffusion XL ---
    let model = bytez.model("stabilityai/stable-diffusion-xl-base-1.0");
    let { error, output } = await model.run(prompt);

    if (!error && output) {
      finalOutput = output;
      console.log("Success: Used SD-XL");
    } else {
      console.log("SD-XL failed. Falling back to DALL-E 2...");
      
      // --- ATTEMPT 2: DALL-E 2 ---
      model = bytez.model("openai/dall-e-2");
      const res2 = await model.run(prompt);
      
      if (!res2.error && res2.output) {
        finalOutput = res2.output;
        console.log("Success: Used DALL-E 2");
      } else {
        console.log("DALL-E 2 failed. Falling back to SD v1.4...");
        
        // --- ATTEMPT 3: Stable Diffusion v1-4 ---
        model = bytez.model("CompVis/stable-diffusion-v1-4");
        const res3 = await model.run(prompt);
        
        if (!res3.error && res3.output) {
          finalOutput = res3.output;
          console.log("Success: Used SD v1.4");
        } else {
          // If all 3 fail, send the error back to the frontend
          return NextResponse.json({ error: "All image models are currently unavailable." }, { status: 500 });
        }
      }
    }

    // --- BULLETPROOF FORMATTING ---
    let finalImage = finalOutput;

    // 1. If Bytez returns an array (multiple images), grab the first one
    if (Array.isArray(finalOutput)) {
      finalImage = finalOutput[0];
    }

    // 2. If Bytez returns raw binary data (Buffer), translate it to Base64
    if (Buffer.isBuffer(finalImage)) {
      finalImage = finalImage.toString("base64");
    } else if (typeof finalImage === "object" && finalImage.type === "Buffer" && finalImage.data) {
      finalImage = Buffer.from(finalImage.data).toString("base64");
    } else if (finalImage instanceof Uint8Array) {
      finalImage = Buffer.from(finalImage).toString("base64");
    }

    // Return the translated, clean text string to the frontend
    return NextResponse.json({ image: finalImage });
    
  } catch (err) {
    console.error("Image API Error:", err);
    return NextResponse.json({ error: "Server error processing the image." }, { status: 500 });
  }
}