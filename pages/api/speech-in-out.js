import fs from "fs";
import {IncomingForm} from 'formidable';
import Groq from "groq-sdk";
import os from "os";
import path from "path";

// Initialize the Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// async function handleFormParse(req) {
//   return new Promise((resolve, reject) => {
//     const form = new IncomingForm({
//       uploadDir: os.tmpdir(), // Configure upload directory
//     });
//     console.log("hello")
 
//     form.parse(req, (err, fields, files) => {
//       if (err) {
//         reject(err);
//       } else {
//         console.log("good")
//         resolve({ fields, files });
//       }
//     });
//   });
//  }

// async function handleFormParse(req) {
//   return new Promise((resolve, reject) => {
//     const form = new IncomingForm({
//       uploadDir: os.tmpdir(), // Temporary upload directory
//     });

//     form.parse(req, async (err, fields, files) => {
//       if (err) {
//         return reject(err);
//       }

//       if (!files.audio) {
//         return reject(new Error("No file uploaded"));
//       }

//       const uploadedFile = files.audio; // Adjust based on structure here probably audio retrieval . 

//       try {
//         const fileBuffer = await fs.readFile(uploadedFile.filepath);
//         const fileBlob = new Blob([fileBuffer], { type: uploadedFile.mimetype });

//         resolve({ fields, file: fileBlob });
//       } catch (error) {
//         reject(error);
//       }
//     });
//   });
// }

async function handleFormParse(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      uploadDir: os.tmpdir(), // Temporary upload directory
      keepExtensions: true, // Keep file extensions
    });
    // consol
    form.parse(req, async (err, fields, files) => {
      if (err) {
        return reject(err);
      }

      if (!files.audio) {
        return reject(new Error("No file uploaded"));
      }

      const uploadedFile = files.audio[0]; // Adjust based on structure

      try {
        const fileBuffer = fs.readFileSync(uploadedFile.filepath);

        resolve({
          fields,
          file: {
            buffer: fileBuffer, // Buffer containing file data
            originalFilename: uploadedFile.originalFilename,
            mimetype: uploadedFile.mimetype,
            size: uploadedFile.size,
          },
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}

//  async function whisper(audioFile){

//   // audioFile should now be a single file object, not an array
//   if (!audioFile.filepath) {
//     throw new Error('Invalid audio file object: missing filepath');
//   }

//   if (!fs.existsSync(audioFile.filepath)) {
//     throw new Error(`Audio file not found at path: ${audioFile.filepath}`);
//   }

//   const transcription = await groq.audio.transcriptions.create({
//     file: fs.createReadStream(audioFile.filepath), // Required path to audio file - replace with your audio file!
//     model: "whisper-large-v3-turbo", // Required model to use for transcription
//     prompt: "Saudi Arabian F1 Grand Prix at the Jeddah Corniche Circuit. Driver examples: Verstappen, Leclerc, Perez, Hamilton.", // Optional
//     response_format: "text", // Optional
//     language: "en", // Optional
//     temperature: 0.0, // Optional
//   });

//   // Log the transcribed text
//   return transcription;
//  }

async function whisper(audioFile) {
  if (!audioFile.buffer) {
    throw new Error('Invalid audio file object: missing buffer');
  }

  // Create a temporary file path
  const tempFilePath = path.join(os.tmpdir(), `audio_${Date.now()}.mp3`);
  // console.log("before write");
  // Write the buffer to a temporary file
  fs.writeFileSync(tempFilePath, audioFile.buffer);
  // console.log("after write");
  try {
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath), // Pass the temporary file path
      model: "whisper-large-v3-turbo",
      prompt: "U.S. F1 Grand Prix. Drivers may include: Norris, Verstappen, Leclerc.",
      response_format: "text",
      language: "en",
      temperature: 0.0,
    });

    return transcription;
  } finally {
    // Cleanup: Delete the temporary file after processing
    await fs.unlinkSync(tempFilePath);
  }
}

export const config = {
  api: {
    bodyParser: false,  // Important: Disable default body parsing
  },
};

const buildRequestHeaders = () => {
  // console.log("key: "+process.env.GROQ_API_KEY);
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.GROQ_API_KEY}`, // Replace with actual authentication if needed
  };
};

export default async function handler(req, res) {

  // console.log("this is the req: "+req);
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // console.log("REQ KEYS: " + Object.keys(req));
    // console.log("REQ VALUES: " + Object.values(req));
    const { file } = await handleFormParse(req);
    // console.log('Files object:', JSON.stringify(files, null, 2));
    // console.log("file: " + file);
    // console.log("fields: " + fields);
    // console.log("files: " +files);

    // this syntax works
    // const form = new IncomingForm();
    // form.parse(req, (err, fields, files) => {
    //   if (err) {
    //     res.status(500).json({ error: 'File upload failed' });
    //     return;
    //   }
    //   console.log(err, fields, files);

      // how to grab the audio file called audio
      // const audioFile = files.audio?.[0];

      // console.log('Audio file full details:', JSON.stringify(audioFile, null, 2));
      // if (!audioFile) {
      //   return res.status(400).json({ message: 'Audio file is required' });
      // }

      // console.log('Processing audio file:', {
      //   size: audioFile.size,
      //   filepath: audioFile.filepath,
      //   mimetype: audioFile.mimetype,
      //   filename: audioFile.newFilename
      // });

      // console.log("audio file: "+ audioFile);
      // console.log("type of audiofile is: " + typeof audioFile);
      // console.log("AUDIO KEYS: " + Object.keys(audioFile));

      // console.log("path: " + audioFile.filepath);

      // const arrayBuffer = await audioFile.arrayBuffer();
      // const buffer1 = Buffer.from(arrayBuffer);
      
      // const file = new File([buffer1], 'audio.webm', { type: 'audio/webm' });
      // console.log("type of file is: " + typeof file);
      // whispr parse
      let transcription = await whisper(file);
      console.log("input: " + transcription);
      console.log(typeof transcription);


      // if not coherent words e.g. didn't mean to ask question. break and return here before getting to response.
      const chatCompletion1 = await groq.chat.completions.create({
        messages: [
        
          {
            role: "system",
            content: 'Given the transcription, return a single JSON key with a boolean value whether it is coherent text or not. JSON schema must be: "isText": { "yes" || "no"}',
          },
          {
            role: "user",
            content: transcription,
          },
        ],
    
        model: "llama-3.1-8b-instant",
        max_tokens: 100,
        temperature: 0.1,
        stop: null,
        response_format: { type: "json_object" },
        stream: false,
      });

      let result = chatCompletion1.choices[0]?.message?.content;
      const resultObj = JSON.parse(result); // Parse the string into a JSON object
      // console.log()
      // console.log("checkpoint: " + resultObj.isText);
      if (resultObj.isText !== "yes"){
        return res.status(400).json({ error: "Please try again and speak clearly." });
      }
      
      // console.log("made it to here");
    
      // text to text conversational analyst. copied and pasted from other one
      const chatCompletion2 = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: '',
          },
          {
            role: "user",
            content: transcription,
          },
        ],
    
        model: "llama-3.1-8b-instant",
        max_tokens: 150,
        temperature: 0.2,
        stop: null,
        stream: false,
      });

      let announcerCommentary = chatCompletion2.choices[0]?.message?.content;
      // console.log("Talker Response: " + announcerCommentary);
      try {
        // make groq TTS call
      const AUDIO_SPEECH_URL = "https://api.groq.com/openai/v1/audio/speech";
      const response = await fetch(AUDIO_SPEECH_URL, {
        method: "POST",
        headers: buildRequestHeaders(),
        body: JSON.stringify({
          model: "playai-tts",
          input: announcerCommentary,
          voice: "Arthur-PlayAI", // Change as needed
        }),
      });
      // console.log("testtesttest");
  if (!response.ok) {
    // console.log("response was not ok")
    let variable = await response.text();
    // console.log("this is the reponse.text: "+variable);
        return res.status(response.status).json({ error: "TTS API Error", details: variable});
      }
      // console.log("response is ok")
  
      const audioBuffer = await response.arrayBuffer();
  
      // Set headers for audio file response
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", audioBuffer.byteLength);
      
      res.status(200).send(Buffer.from(audioBuffer));
      // console.log("made it all the way")
      } catch (error) {
        // console.log("error messagegegege:" )
        // console.log(error)
        res.status(500).json({ error: error.message });
      }
      

      // const chatCompletion = await groq.chat.completions.create({
      //   "messages": [announcerCommentary],
      //   "model": "play-tts",
      //   "temperature": 1,
      //   "max_completion_tokens": 1024,
      //   "top_p": 1,
      //   "stream": true,
      //   "stop": null
      // });

      // const buffer = Buffer.from(await chatCompletion.arrayBuffer());
      
      // what is returned from it? nothing is printed out after it
      // not sure how to change this into header audio back out
      // for await (const chunk of chatCompletion) {
      //   if (chunk.choices[0]?.delta?.content || '') {
      //     console.log("chunk: "+chunk);
      //     audioChunks.push(Buffer.from(chunk.choices[0].delta.content, 'binary'));
      //   }
      // }
      // // const audioBuffer = Buffer.concat(audioChunks);
      // console.log("audiobuffer: "+audioBuffer);
      // // buildRequestHeaders
      // // Set audio headers and send response
      // res.setHeader('Content-Type', 'audio/mpeg');
      // res.setHeader('Content-Length', audioBuffer.length);
      // res.status(200).send(audioBuffer);
    //  res.status(200).json({ 
    //    message: 'Audio received', 
    //  });
 } catch (error) {
  res.status(500).json({ error: error.message });
}
}
//   form.parse(req, async (err, fields, files) => {
//     if (err) {
//       console.error("Error parsing form data:", err);
//       return res.status(500).json({ error: 'Error processing file' });
//     }

//     console.log("Fields:", fields); // Other form values
//     console.log("Files:", files);   // Uploaded file

//     // Read the file
//     const audioFile = files.audio;

//     // const formData = await req.formData();
//     // console.log(formData);
//     // const audioFile = formData.get('audio');
//     if (!audioFile) {
//       return res.status(400).json({ message: 'audioFile is required' });
//     }
//     console.log("type of audiofile is: " + typeof audioFile);
//     const arrayBuffer = await audioBlob.arrayBuffer();
//     const buffer1 = Buffer.from(arrayBuffer);

//     const file = new File([buffer1], 'audio.webm', { type: 'audio/webm' });
//     console.log("file print out" + file)
//     // Create a transcription job
//   const transcription = await groq.audio.transcriptions.create({
//     file: file, // Required path to audio file - replace with your audio file!
//     model: "distil-whisper-large-v3-en", // Required model to use for transcription
//     prompt: "Context is the Saudi Arabian F1 Grand Prix at the Jeddah Corniche Circuit", // Optional
//     response_format: "text", // Optional
//     language: "en", // Optional
//     temperature: 0.0, // Optional
//   });

//  // Log the transcribed text
//  console.log("text transcribed: " + transcription.text);
//   let speechTranscription = transcription.text

//   // open ai TTS in the meantime 
//   // "You are a conversational analyst for the F1 Saudi Arabia Grand Prix that directly talks with viewers. The driver starting order is: 1. Verstappen 2. Leclerc 3. Perez 4. Alonso 5. Piastri 6. Norris 7. Russell 8. Hamilton. Please answer my question."


//     const buffer = Buffer.from(await mp3.arrayBuffer());
//     // await fs.promises.writeFile(fullPath, buffer);

//     res.setHeader('Content-Type', 'audio/mpeg');
//     res.setHeader('Content-Length', buffer.length);
    // res.status(200).send(buffer);
    // res.status(200).send("works: " + fields);
    //  });
  // } catch (error) {
    // console.error('Error generating speech:', error);
    // res.status(500).json({ message: 'Error generating speech' });
  // }



   
      // res.status(200).json({ fields, files });
