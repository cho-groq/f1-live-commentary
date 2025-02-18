import fs from "fs";
import Groq from "groq-sdk";

// we not using this one. doesn't work

// Initialize the Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function handler(req, res) {

  // console.log("this is the req: "+req);
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // console.log("REQ KEYS: " + Object.keys(req));
    // it should be inside the req body?
    // console.log("REQ body: " + req.body);

    const formData = await req.formData();
    // console.log(formData);
    const audioFile = formData.get('audio');
    if (!audioFile) {
      return res.status(400).json({ message: 'audioFile is required' });
    }
    // console.log("type of audiofile is: " + typeof audioFile);
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer1 = Buffer.from(arrayBuffer);

    const file = new File([buffer1], 'audio.webm', { type: 'audio/webm' });
    // console.log("file print out" + file)
    // Create a transcription job
  const transcription = await groq.audio.transcriptions.create({
    file: file, // Required path to audio file - replace with your audio file!
    model: "distil-whisper-large-v3-en", // Required model to use for transcription
    prompt: "Context is the Saudi Arabian F1 Grand Prix at the Jeddah Corniche Circuit", // Optional
    response_format: "text", // Optional
    language: "en", // Optional
    temperature: 0.0, // Optional
  });

 // Log the transcribed text
//  console.log("text transcribed: " + transcription.text);
  let speechTranscription = transcription.text

  // open ai TTS in the meantime 
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
