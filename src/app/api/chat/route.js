import Bytez from "bytez.js";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    // We now expect both the message AND the selected persona
    const { message, persona } = await req.json();

    const key = process.env.BYTEZ_API_KEY;
    const sdk = new Bytez(key);

    // --- THE CUSTOM PERSONA INJECTOR ---
    let systemPrompt = "";

    if (persona === "mentor") {
        systemPrompt = "You are an expert Senior Software Engineer and coding mentor. Your student is building advanced full-stack apps with React, Next.js, and Java, and tackling Data Structures and Algorithms in C and C++. Do not just give away the final code. Instead, ask guiding questions, explain the underlying architecture, and encourage open-source best practices. Assume they are using modern tools like Cursor AI.";
    } else if (persona === "sustainability") {
        systemPrompt = "You are a leading expert in green tech, environmental sustainability, and smart waste management. You provide deep, actionable insights tailored for projects focused on real-world social impact, similar to CivicFix AI and EcoQuest. Emphasize gamified sustainability when brainstorming.";
    } else if (persona === "writer") {
        systemPrompt = "You are a master storyteller and creative scriptwriter. You craft highly engaging narratives with deep character arcs. Draw inspiration from the intricate plot twists of popular K-dramas and the immersive lore of games like Hogwarts Legacy or Modern Warfare 3. Feel free to weave strategic elements, like a high-stakes chess match or a poignant singing performance, into your scenes to make them dynamic.";
    } else {
        systemPrompt = "You are Cloud5, a highly intelligent and helpful AI assistant created by Omshree and Darshan. You provide clear, friendly, and factual answers to all questions.";
    }

    // We inject the system prompt as the very first message
    const messagesPayload = [
      { "role": "system", "content": systemPrompt },
      { "role": "user", "content": message }
    ];

    let finalOutput = null;

    // --- ATTEMPT 1: OpenAI GPT-4.1 ---
    let model = sdk.model("openai/gpt-4.1");
    let { error, output } = await model.run(messagesPayload);

    if (!error && output) {
      finalOutput = output;
      console.log(`Success: Used GPT-4.1 with ${persona} persona`);
    } else {
      console.log("GPT-4.1 failed. Falling back to Gemma 3...");
      
      // --- ATTEMPT 2: Google Gemma 3 ---
      model = sdk.model("google/gemma-3-4b-it");
      let res2 = await model.run(messagesPayload);
      
      if (!res2.error && res2.output) {
        finalOutput = res2.output;
      } else {
        console.log("Gemma 3 failed. Falling back to Mistral 7B...");
        
        // --- ATTEMPT 3: Mistral 7B ---
        model = sdk.model("mistralai/Mistral-7B-Instruct-v0.2");
        let res3 = await model.run(messagesPayload);
        
        if (!res3.error && res3.output) {
          finalOutput = res3.output;
        } else {
          console.log("Mistral 7B failed. Falling back to Llama 3...");
          
          // --- ATTEMPT 4: Meta Llama 3 ---
          model = sdk.model("meta-llama/Meta-Llama-3-8B-Instruct");
          let res4 = await model.run(messagesPayload);
          
          if (!res4.error && res4.output) {
            finalOutput = res4.output;
          } else {
            console.log("Llama 3 failed. Falling back to IBM Granite...");
            
            // --- ATTEMPT 5: IBM Granite ---
            model = sdk.model("ibm-granite/granite-docling-258M");
            let res5 = await model.run(messagesPayload);
            
            if (!res5.error && res5.output) {
              finalOutput = res5.output;
            } else {
              console.error("All Bytez text models failed.");
              return NextResponse.json(
                { error: "Cloud5 had an issue communicating with the AI models." }, 
                { status: 500 }
              );
            }
          }
        }
      }
    }

    let textAnswer = finalOutput;
    if (typeof finalOutput === "string") {
        textAnswer = finalOutput;
    } else if (Array.isArray(finalOutput) && finalOutput.length > 0) {
        const lastObj = finalOutput[finalOutput.length - 1];
        textAnswer = lastObj.content || lastObj.generated_text || lastObj;
    } else if (typeof finalOutput === "object" && finalOutput !== null) {
        textAnswer = finalOutput.content || finalOutput.generated_text || JSON.stringify(finalOutput);
    }

    return NextResponse.json({ answer: textAnswer });

  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json(
      { error: "Cloud5 is currently resting. Please try again." }, 
      { status: 500 }
    );
  }
}