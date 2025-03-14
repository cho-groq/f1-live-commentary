import { generateCommentaryWithGroq } from "./groqClient";
import { processFrame } from "./frameProcessor";

export async function generateCommentary(imageData, width, height, isArabic, pastCommentaries, analystPrompt, commentatorPrompt) {
  let t5 = performance.now();
  try {
    
    // console.log("Generating commentary for frame:", width, "x", height);
    // console.log("Image data type:", typeof imageData);
    // console.log("Image data length:", imageData ? imageData.length : "N/A");
    // console.log(isArabic, pastCommentaries);

    if (!imageData) {
      throw new Error("No image data provided");
    }

    const { encodedImage } = await processFrame(imageData, width, height);
    // console.log("Encoded image length:", encodedImage.length);

    try {
      const { commentary, embedding } =
        await generateCommentaryWithGroq(encodedImage, isArabic, pastCommentaries, analystPrompt, commentatorPrompt);
        let t6 = performance.now();
        console.log(`generateCommentary time ${t6-t5} milliseconds \n\n\n\n`);
      // console.log("Generated commentary:", commentary);
      // console.log("Generated embedding:", embedding);
      return {
        timestamp: new Date().toISOString(),
        text: commentary,
        embedding: embedding,
      };
    } catch (groqError) {
      console.error("Error in generateCommentaryWithGroq:", groqError);
      return {
        timestamp: new Date().toISOString(),
        text: "Error generating commentary with Groq API.",
        embedding: null,
      };
    }
  } catch (error) {
    console.error("Error in generateCommentary:", error);
    return {
      timestamp: new Date().toISOString(),
      text: "Error processing frame or generating commentary.",
      embedding: null,
    };
  }
}
