import { generateCommentary } from "../../lib/commentaryGenerator";
import { GROQ_API_KEY } from "../../lib/config";

export default async function handler(req, res) {
  // console.log("Commentary API handler called");
  // console.log("GROQ_API_KEY is set:", !!GROQ_API_KEY);
  let t9 = performance.now();
  if (req.method === "POST") {
    try {
      const { imageData, width, height, isArabic, pastCommentaries, analystPrompt, commentatorPrompt } = req.body;
      // console.log("Received image data:", width, "x", height, isArabic, pastCommentaries);

      if (!imageData) {
        throw new Error("No image data provided");
      }

      console.log("Generating commentary...");
      const commentary = await generateCommentary(imageData, width, height, isArabic, pastCommentaries, analystPrompt, commentatorPrompt);
      // console.log("Commentary generated:", commentary);

      if (commentary.error) {
        throw new Error(commentary.error);
      }

      res.status(200).json(commentary);
      let t10 = performance.now();
      console.log(`commentary.js handler ${t10-t9 }milliseconds`)
    } catch (error) {
      console.error("Error in generating commentary:", error);
      res.status(500).json({
        text: `Error generating commentary: ${error.message}`,
        error: true,
      });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
