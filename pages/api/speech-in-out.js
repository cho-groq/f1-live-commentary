import fs from "fs";
import Groq from "groq-sdk";

// Initialize the Groq client
const groq = new Groq();

export default async function handler(req, res) {
  // console.log(req);
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
 // console.log(Object.keys(req));
 console.log("REQ KEYS: " + Object.keys(req));
 console.log(req.body);
 const mp3  = req.body.mp3;
 if (!mp3) {
  return res.status(400).json({ message: 'mp3 is required' });
}

    // Create a transcription job
  const transcription = await groq.audio.transcriptions.create({
    file: fs.createReadStream(mp3), // Required path to audio file - replace with your audio file!
    model: "distil-whisper-large-v3-en", // Required model to use for transcription
    prompt: "Context is the Saudi Arabian F1 Grand Prix at the Jeddah Corniche Circuit", // Optional
    // response_format: "json", // Optional
    language: "en", // Optional
    temperature: 0.0, // Optional
  });

 // Log the transcribed text
 console.log(transcription.text);


  // "You are a conversational analyst for the F1 Saudi Arabia Grand Prix that directly talks with viewers. The driver starting order is: 1. Verstappen 2. Leclerc 3. Perez 4. Alonso 5. Piastri 6. Norris 7. Russell 8. Hamilton. Please answer my question."


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

