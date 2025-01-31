import Groq from "groq-sdk";
import OpenAI from "openai";
import { GROQ_API_KEY } from "./config";
import { initializeDatabase } from "./singleStoreClient"; // Import the database initialization function

import { AI } from "@singlestore/ai";
// import { sleep } from "groq-sdk/core.mjs";
const ai = new AI({ openAIApiKey: process.env.OPENAI_API_KEY });

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
export async function generateCommentaryWithGroq(encodedImage, isArabic, pastCommentaries) {
  // await sleep(1000);
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
      console.log("GROQ_API_KEY set:", !!GROQ_API_KEY);
      // this one just describes the image.
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "You are an expert F1 motorsports analyst for the Saudi Arabian Grand Prix. Talk about the section of the track they're in. Mention which F1 teams and drivers are in the picture. This is the start of the race.",
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
      // commentator, english
      try {
        let prompt2 = description;
        
        const chatCompletion2 = await groq.chat.completions.create({
          messages: [
          
            {
              role: "system",
              content: `You are a F1 sports commentator for the Saudi Arabian Grand Prix. Be succinct and expressive. Comment on the scene described in less than 18 words. Do not use the phrases 'Folks' or 'And they're off'
              \n Possible topics: [DRIVER], [Team], [The part of the track].
              `,
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
        const chatCompletion25 = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content:`"Translate this commentary text into Arabic`,
            },
            {
              role: "user",
              content: announcerCommentary,
            },
          ],
      
          // The language model which will generate the completion.
          model: "llama-3.3-70b-versatile",
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
