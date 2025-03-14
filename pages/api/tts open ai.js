import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  // console.log(req);
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // console.log(Object.keys(req));
    // console.log("REQ KEYS: " + Object.keys(req));
    // console.log(req.body);
    const prompt  = req.body.lastCommentary;
    // console.log("PROMPT: " + prompt)
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    // const speechPath = path.join(process.cwd(), 'public', 'speech');
    // if (!fs.existsSync(speechPath)) {
    //   fs.mkdirSync(speechPath, { recursive: true });
    // }

    // const filename = `speech.mp3`;
    // const fullPath = path.join(speechPath, filename);

    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'ash',
      input: prompt,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    // await fs.promises.writeFile(fullPath, buffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    res.status(200).send(buffer);
  } catch (error) {
    console.error('Error generating speech:', error);
    res.status(500).json({ message: 'Error generating speech' });
  }
}

// export default async function generatehandlerSpeech(req, res) {
//   console.log("hi")
//   try {
//   const { text } = req.body;

//     if (!text) {
//       return res.status(400).json({ message: 'Text is required' + othertext });
//     }
//   console.log("\n\n\n\n\n\n\n\n\n\n\n\n\n it works here")
//   const speechPath = path.resolve("./public/speech");
//     const filename = `speech-${Date.now()}.mp3`;
//     const fullPath = path.join(speechPath, filename);

//     // Create the speech
//     const mp3 = await openai.audio.speech.create({
//       model: "tts-1",
//       voice: "alloy",
//       input: prompt,
//     });

//     // Convert the response to a buffer and save to file
//     const buffer = Buffer.from(await mp3.arrayBuffer());
//     await fs.promises.writeFile(fullPath, buffer);

//     // Send response back to client
//     res.status(200).json({ filename });


  
//   // const response = await openai.audio.speech.create({
//   //   model: "tts-1", // Or "tts-1-hd" for higher quality
//   //   voice: "ash", // Choose from available voices
//   //   input: text,
//   // });
  
  
//   // const buffer = Buffer.from(await mp3.arrayBuffer());
//   // const audioStream = await response.audio.arrayBuffer();
//   // const buffer = Buffer.from(await mp3.arrayBuffer());
//   // return await fs.promises.writeFile(speechFile, buffer);
    
//   // res.setHeader('Content-Type', 'audio/mpeg');
//   // res.status(200).send(audioStream);
// } catch (error) {
//   console.error('Error generating speech:', error);
//   res.status(500).json({ message: 'Error generating speech' });
// }


//   // res.setHeader("Content-Type", "audio/mpeg");
//   // res.setHeader('Content-Disposition', 'attachment; filename="audio.mp3"');
//   // response.pipe(res);
// }

