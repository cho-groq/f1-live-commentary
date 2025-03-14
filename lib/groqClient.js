import Groq from "groq-sdk";
import OpenAI from "openai";
import { initializeDatabase } from "./singleStoreClient"; // Import the database initialization function

import { AI } from "@singlestore/ai";
// import { sleep } from "groq-sdk/core.mjs";
const ai = new AI({ openAIApiKey: process.env.OPENAI_API_KEY });

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,//process.env.GROQ_API_KEY,
});

console.log("process key: "+process.env.GROQ_API_KEY);

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
// const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function generateEmbedding(text) {
  try {
    const response = await ai.embeddings.create(text);
    return response[0];
  } catch (error) {
    console.error("Error generating embedding:", error);
    return null;
  }
}

let commentaryTable = null;
export async function generateCommentaryWithGroq(encodedImage, isArabic, pastCommentaries, analystPrompt, commentatorPrompt) {

  let t8 = performance.now();
  
  let retries = 0;
  if (!commentaryTable){

    // Initialize commentaryTable only once
    try {
      commentaryTable = await initializeDatabase(); // Ensure the table is initialized
    } catch (error) {
      console.error("Error initializing the database:", error);
      throw error;
    }
  }
  
  while (retries < MAX_RETRIES) {
    try {
      console.log(
        "Preparing request to Groq API (Attempt " + (retries + 1) + ")",
      );
      console.log("Encoded image length:", encodedImage.length);
      // this one just describes the image. analyst prompt
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: analystPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `${encodedImage}`,
                },
              },
            ],
          },
        ],
        model: "llama-3.2-11b-vision-preview",
        max_completion_tokens:512,
        temperature: 0.6,
      });

      let description = chatCompletion.choices[0].message.content;
      console.log("Image description: " + description);
      let announcerCommentary = "";
      // commentator prompt, english
      try {
        let prompt2 = description;
        
        const chatCompletion2 = await groq.chat.completions.create({
          messages: [
          
            {
              role: "system",
              content: commentatorPrompt,
            },
            {
              role: "user",
              content: prompt2,
            },
          ],
      
          model: "llama-3.1-8b-instant",
          max_tokens: 100,
          temperature: 1.0,
          stop: null,
          stream: false,
        });

        announcerCommentary = chatCompletion2.choices[0]?.message?.content;
        console.log("Announcer Commentary: " + announcerCommentary);
        
      } catch (error) {
        console.error(
          "Error generating commentary with Groq (Attempt " +
            (retries + 1) +
            "):",
          error,
        );
      }

     
      console.log("Arabic: "+ isArabic);
      if(isArabic == true){
        console.log("Arabic text Allam \n\n\n");
      //   const AUDIO_SPEECH_URL = "https://api.groq.com/openai/v1/chat/completions";
      //   const chatCompletion25 = await fetch(AUDIO_SPEECH_URL, {
      //   method: "POST",
      //   headers: buildRequestHeaders(),
      //   body: JSON.stringify({
      //     model: "allam-2-7b",
      //     input: announcerCommentary,
      //     voice: "Ahmed", // Change as needed
      //   }),
      // });
        const chatCompletion25 = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content:`Translate this commentary text into Arabic`,
            },
            {
              role: "user",
              content: announcerCommentary,
            },
          ],
      
          // The language model which will generate the completion.
          model: "allam-2-7b", //"allam-2-7b"
          temperature: 0.2,
          stop: null,
          stream: false,
        });
        announcerCommentary = chatCompletion25.choices[0]?.message?.content;
      }

      console.log("Announcer Commentary: " + announcerCommentary);

      // putting commentary and input into final JSON
      try {
        let sysPrompt = `Create a JSON schema that includes\n\n{\n  "commentary": str,\n  "win_probability_gs": int [0-100],\n  "current_gs_score": int,\n  "current_cle_score": int,\n  "latency": float\n}`;
        let finalPrompt = `Here is the commentary. Fill in the JSON based on it: ${announcerCommentary}`;
        
        const chatCompletion3 = await groq.chat.completions.create({
          messages: [
          
            {
              role: "system",
              content: sysPrompt,
            },
            {
              role: "user",
              content: finalPrompt,
            },
          ],
      
          model: "llama-3.3-70b-versatile",
          response_format: { type: "json_object" },
          stop: null,
          stream: false,
        });
        
        var parsedContent = JSON.parse(
          chatCompletion3.choices[0]?.message?.content,
        );
      } catch (error) {
        console.error("Final JSON commentary step didn't work", error);
      }
      

      const commentary = parsedContent.commentary || "No commentary generated.";
      const winProbability = parsedContent.win_probability_gs ?? 50; // Default fallback
      const warriorsScore = parsedContent.current_gs_score ?? 0; // Default fallback
      const cavaliersScore = parsedContent.current_cle_score ?? 0; // Default fallback
      const latency = chatCompletion.usage?.completion_time || 0; // Default fallback

      // Generate embedding
      const embedding = await generateEmbedding(commentary);
      console.log(
        "Generated embedding:",
        embedding
          ? "Embedding generated successfully"
          : "Failed to generate embedding",
      );

      // Insert data into SingleStore
      const timestamp = new Date();

      await commentaryTable.insert([
        {
          timestamp: timestamp,
          commentary: commentary,
          embedding: JSON.stringify(embedding),
          latency: latency,
          win_probability: winProbability,
          warriors_score: warriorsScore,
          cavaliers_score: cavaliersScore,
        },
      ]);
      let t7 = performance.now()
      console.log(`generateCommentaryWithGroq time ${t8-t7} milliseconds \n\n\n\n`);

      return {
        commentary,
        embedding,
        winProbability,
        warriorsScore,
        cavaliersScore,
        latency,
      };
    } catch (error) {
      console.error(
        "Error generating commentary with Groq (Attempt " +
          (retries + 1) +
          "):",
        error,
      );
      retries++;
      if (retries < MAX_RETRIES) {
        console.log("Retrying in " + RETRY_DELAY + "ms...");
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  return {
    commentary: "Error generating commentary after " + MAX_RETRIES + " attempts.",
    embedding: null,
    winProbability: null,
    warriorsScore: null,
    cavaliersScore: null,
    latency: null,
  };
}
