import { useState, useRef } from "react";
import { Mic } from "lucide-react";

export default function MicChatButton(){

    const [isRecording, setIsRecording] = useState(false);
	const mediaRecorder = useRef(null);
	const audioChunks = useRef([]);


    const startRecording = async () => {
		try {
            console.log("starting recording");
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			mediaRecorder.current = new MediaRecorder(stream);
			audioChunks.current = [];
            console.log(audioChunks);

			mediaRecorder.current.ondataavailable = (event) => {
				audioChunks.current.push(event.data);
                console.log("audiocurrent"+audioChunks.current);

			};

			mediaRecorder.current.onstop = async () => {
				const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
				const formData = new FormData();
                console.log("audioblob: " + audioBlob);
				formData.append("audio", audioBlob);

				try {
					const response = await fetch("/api/speech-in-out", {
						method: "POST",
						body: formData,
					});

					const data = await response.json();
					if (response.ok) {
						onTranscription(data.transcription);
					} else {
						console.error("Transcription failed:", data.error);
					}
				} catch (error) {
					console.error("Error sending audio:", error);
				}

				// Clean up the media stream
				for (const track of stream.getTracks()) {
					track.stop();
				}
			};

			mediaRecorder.current.start();
			setIsRecording(true);
		} catch (error) {
			console.error("Error accessing microphone:", error);
		}
	};

	const stopRecording = () => {
		if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
			mediaRecorder.current.stop();
			setIsRecording(false);
		}
	};

	const toggleRecording = () => {
		if (isRecording) {
			stopRecording();
		} else {
			startRecording();
		}
	};




    return (
        <div className="relative max-w-48 ml-6">
            
        <button type="button" 
        // disabled={disabled}
        onClick={toggleRecording}
        className={`rounded-sm relative z-20 generate-commentary ${
            isRecording ? "text-orange-100 hover:text-orange-200 brightness-90" : ""
        }`}
        >Talk with the Commentator <Mic className="outline-white inline" />
        
        </button>
        {isRecording && (
				<div className="absolute inset-0 z-0">
					<div className="absolute inset-0 animate-ping rounded bg-orange-400 opacity-75" />
					<div className="absolute inset-[-4px] animate-pulse rounded bg-orange-300 opacity-50" />
					<div className="absolute inset-[-8px] animate-pulse delay-75 rounded bg-orange-200 opacity-25" />
				</div>
			)}
        </div> 
        );
}