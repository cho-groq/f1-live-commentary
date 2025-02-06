// components/VideoPlayer.js

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import CommentarySidebar from "./CommentarySidebar";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import MicChatButton from "./MicChatButton";
import { Volume2, VolumeX } from "lucide-react";


export default function VideoPlayer({ videoSrc }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [commentary, setCommentary] = useState([]);
  const [showAIMessages, setShowAIMessages] = useState(true);
  const [isAIWatching, setIsAIWatching] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({});
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isArabic, setIsArabic] = useState(false);
  const commentaryIntervalRef = useRef(null);

  const isArabicRef = useRef(isArabic);
  const commentaryRef = useRef(commentary);
  const processingRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, toggleMute] = useState(false);
  const [hideMessages, setHideMessages] = useState(false);

  const handleLanguageChange = (language) => {
    setIsLoading(true);
    setIsArabic(language === 'arabic');
    setTimeout(() => {
      setIsLoading(false);
    }, 10000);
  };

  const handleToggleMute = () => {
    toggleMute(!isMuted);
  // if we are muting then need to forloop mute all audio immediately
  if (isMuted == true){
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.muted = true;
    });
  }

  };

  const getIsMuted = () => {
    return isMuted;
  };
  


  

  // Keep refs updated
  useEffect(() => {
    isArabicRef.current = isArabic;
    commentaryRef.current = commentary;
  }, [isArabic, commentary]);


  const fetchLatestAnalytics = useCallback(async () => {
    try {
      const response = await fetch("/api/analytics");
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error("Error fetching latest analytics:", error);
    }
  }, []);

  useEffect(() => {
    fetchLatestAnalytics();
    const intervalId = setInterval(() => {
      fetchLatestAnalytics();
    }, 5000); // Fetch analytics every 2 seconds

    return () => clearInterval(intervalId);
  }, [fetchLatestAnalytics]);

 // Function to start commentary fetching interval
 const startCommentaryInterval = useCallback(() => {
  // Fetch immediately on start
  if (!processingRef.current) {
    fetchCommentary();
  }

  // Set up interval for subsequent fetches
  if (!commentaryIntervalRef.current) {
    commentaryIntervalRef.current = setInterval(async () => {
      if (!processingRef.current) {
        await fetchCommentary();
      }
    }, 5000);
  }
}, []);
// Add a stop function
const stopCommentaryInterval = useCallback(() => {
  if (commentaryIntervalRef.current) {
    clearInterval(commentaryIntervalRef.current);
    commentaryIntervalRef.current = null;
  }
}, []);

// Clean up on unmount
useEffect(() => {
  return () => {
    if (commentaryIntervalRef.current) {
      clearInterval(commentaryIntervalRef.current);
    }
  };
}, []);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handlePlay = () => {
        setIsVideoPlaying(true);
        toggleMute(false);
        startCommentaryInterval();
      };

      const handlePause = () => {
        setIsVideoPlaying(false);
        toggleMute(true);
        stopCommentaryInterval();
      };

      video.addEventListener("play", handlePlay);
      video.addEventListener("playing", handlePlay);
      video.addEventListener("pause", handlePause);
      video.addEventListener("ended", handlePause);

      // Cleanup event listeners on component unmount
      return () => {
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("playing", handlePlay);
        video.removeEventListener("pause", handlePause);
        video.removeEventListener("ended", handlePause);
        stopCommentaryInterval();
      };
    }
  }, [startCommentaryInterval, stopCommentaryInterval]);

  

  // Function to handle text-to-speech when the "Speak" button is clicked
  const handleTextToSpeech = useCallback(async () => {
    if (commentary.length === 0) {
      // alert("No commentary available for speech synthesis.");
      return;
    }

    const lastCommentary = commentary[commentary.length - 1].text;

    console.log("LastCommentary: " +lastCommentary);
   
    try {
      let audioBlob = null;
      if (isArabicRef.current == true){
        console.log("Arabic is true");
        const response = await fetch('/api/tts-arabic', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lastCommentary
          }),
        });
        console.log("api response for ARABIC:");
        console.log(response);
        
    
        if (!response.ok) {
          throw new Error('Failed to generate arabic speech');
        }
        console.log("ARABIC test:");
        audioBlob = await response.blob();
      }
      else{
      console.log("Arabic is false");
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lastCommentary
        }),
      });
      console.log("api response:");
      console.log(response);
      
  
      if (!response.ok) {
        throw new Error('Failed to generate english speech');
      }
      audioBlob = await response.blob();
    }

      console.log("blob response:");
      console.log(audioBlob);
      const audioUrl = URL.createObjectURL(audioBlob);

      console.log("audio url response:");
      console.log(audioUrl);
      // Create and play the audio
      const audio = new Audio(audioUrl);
      audio.playbackRate = isArabic ? 1.2 : 1.4;
      if (getIsMuted()) {
        audio.muted = true;
      }

       // Add event listener to check mute status before playing
    const checkMuteBeforePlaying = () => {
      // in hopes of getting the global changed version of the variable
      if (getIsMuted() == false) {
        audio.play(); // it's right after this line here that we need to make it stop playing
      }
      audio.removeEventListener('canplaythrough', checkMuteBeforePlaying);
    };

    audio.addEventListener('canplaythrough', checkMuteBeforePlaying);

    // Optional: Add a method to stop audio if muted mid-playback
    // in hopes of getting the global changed version of the variable
    const stopIfMuted = () => {
      if (getIsMuted() == true) {
        audio.muted = true;
        audio.pause();
      }
    };

    audio.addEventListener('playing', () => {
      // Periodically check if muted during playback
      const muteCheckInterval = setInterval(stopIfMuted, 250);
      
      audio.onended = () => {
        clearInterval(muteCheckInterval);
      };
    });

  } catch (error) {
    console.error('Error:', error);
    alert("Failed to generate speech. Please try again.");
  }
}, [commentary, isArabic, isArabicRef, isMuted]);

  const [isPlaying, setIsPlaying] = useState(false);
  useEffect(() => {
    // Only set up the interval if we're not currently playing audio. and video is playing. else no play
    if (!isPlaying && isVideoPlaying) {
      const intervalTime = isArabic ? 6000 : 5000;
      
      const intervalId = setInterval(async () => {
        if (commentary.length === 0) return;
        
        setIsPlaying(true);
        try {
          await handleTextToSpeech();
        } finally {
          setIsPlaying(false);
        }
      }, intervalTime);
  
      // Clean up the interval when the component unmounts
      return () => clearInterval(intervalId);
    }
  }, [handleTextToSpeech, commentary, isPlaying, isArabic, isVideoPlaying]);


  const fetchCommentary = useCallback(async () => {
    try {
      setIsAIWatching(true);
      const canvas = document.createElement("canvas");
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas
        .getContext("2d")
        .drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL("image/jpeg");

     // Calculate pastCommentaries inside the callback using the ref
     let pastCommentaries = "None";
    
     if (commentaryRef.current && commentaryRef.current.length > 1) {
       const lastN = commentaryRef.current.slice(-2);
       pastCommentaries = lastN.map(item => item.text).join(' ');
     }
     else if (commentaryRef.current && commentaryRef.current.length > 0) {
      const lastN = commentaryRef.current.slice(-1);
       pastCommentaries = lastN.map(item => item.text).join(' ');
     }

     console.log(isArabicRef.current, pastCommentaries);

      
      const response = await fetch("/api/commentary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageData,
          width: canvas.width,
          height: canvas.height,
          isArabic: isArabicRef.current,
          pastCommentaries,
        }),
      });

      const data = await response.json();
      console.log(data);

      if (data.text) {
        setCommentary((prev) => [
          ...prev,
          {
            timestamp: data.timestamp || new Date().toISOString(),
            text: data.text,
            type: "ai",
          },
        ]);
      } else {
        console.error("No commentary text received from API.");
        setError("No commentary received. Please try again.");
      }

      setIsAIWatching(false);
    } catch (error) {
      console.error("Error generating commentary:", error);
      setError(
        "Error generating commentary. Please check the console for details.",
      );
      setIsAIWatching(false);
    }
  }, []);

  // Define the onSendMessage function to handle user messages
  const onSendMessage = useCallback((message) => {
    setCommentary((prev) => [
      ...prev,
      {
        timestamp: new Date().toISOString(),
        text: message,
        type: "user",
      },
    ]);
  }, []);

  
  
  // Chart components

  const TotalCommentariesChart = useCallback(({ commentaries }) => {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-9xl font-bold text-groq-orange">{commentaries}</div>
      </div>
    );
  }, []);

  const LatestLatenciesChart = useCallback(({ latencies = [] }) => {
    const data = latencies.map((l) => ({
      timestamp: new Date(l.timestamp).toLocaleString(),
      latency: l.latency ?? 0,
    }));

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis
            dataKey="timestamp"
            stroke="#6ec9eb"
            tick={{ fontFamily: "Montserrat, sans-serif", fill: "rgb(228, 93, 67)" }}
          />
          <YAxis
            stroke="#6ec9eb"
            tick={{ fontFamily: "Montserrat, sans-serif", fill: "rgb(228, 93, 67" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#000000",
              borderColor: "white",
            }}
            labelStyle={{ color: "white", fontFamily: "Montserrat, sans-serif" }}
            itemStyle={{ color: "white", fontFamily: "Montserrat, sans-serif" }}
          />
          <Legend wrapperStyle={{ fontFamily: "Montserrat, sans-serif", color: "#6ec9eb" }} />
          <Line
            type="monotone"
            dataKey="latency"
            stroke="#6ec9eb"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }, []);

  const LatestCommentariesChart = useCallback(({ commentaries = [] }) => {
    const data = commentaries.map((c) => ({
      timestamp: new Date(c.timestamp).toLocaleString(),
      length: c.commentary?.length || c.text?.length || 0,
    }));

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis
            dataKey="timestamp"
            stroke="#6ec9eb"
            tick={{ fontFamily: "Montserrat, sans-serif", fill: "rgb(228, 93, 67" }}
          />
          <YAxis
            stroke="#6ec9eb"
            tick={{ fontFamily: "Montserrat, sans-serif", fill: "rgb(228, 93, 67" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#000000",
              borderColor: "#6ec9eb",
            }}
            labelStyle={{ color: "#6ec9eb", fontFamily: "Montserrat, sans-serif" }}
            itemStyle={{ color: "#6ec9eb", fontFamily: "Montserrat, sans-serif" }}
          />
          <Legend wrapperStyle={{ fontFamily: "Montserrat, sans-serif", color: "#6ec9eb" }} />
          <Line
            type="monotone"
            dataKey="length"
            stroke="#6ec9eb"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }, []);

  const ScoresOverTimeChart = useCallback(({ scoresData = [] }) => {
    const data = scoresData.map((s) => ({
      timestamp: new Date(s.timestamp).toLocaleString(),
      warriorsScore: s.warriors_score ?? 0,
      cavaliersScore: s.cavaliers_score ?? 0,
    }));

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis
            dataKey="timestamp"
            stroke="#6ec9eb"
            tick={{ fontFamily: "Montserrat, sans-serif", fill: "rgb(228, 93, 67" }}
          />
          <YAxis
            stroke="#6ec9eb"
            tick={{ fontFamily: "Montserrat, sans-serif", fill: "rgb(228, 93, 67" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#000000",
              borderColor: "#6ec9eb",
            }}
            labelStyle={{ color: "#6ec9eb", fontFamily: "Montserrat, sans-serif" }}
            itemStyle={{ color: "#6ec9eb", fontFamily: "Montserrat, sans-serif" }}
          />
          <Legend wrapperStyle={{ fontFamily: "Montserrat, sans-serif", color: "#6ec9eb" }} />
          <Line
            type="monotone"
            dataKey="warriorsScore"
            stroke="#00FFFF" // Neon blue for Warriors
            name="Perez"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="cavaliersScore"
            stroke="#FF3131" // Neon red for Cavaliers
            name="Verstappen"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }, []);

  const GSWinProbabilityChart = useCallback(({ winProbabilityData = [] }) => {
    const data = winProbabilityData.map((wp) => ({
      timestamp: new Date(wp.timestamp).toLocaleString(),
      winProbability: wp.win_probability ?? 50,
    }));

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis
            dataKey="timestamp"
            stroke="#6ec9eb"
            tick={{ fontFamily: "Montserrat, sans-serif", fill: "rgb(228, 93, 67" }}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#6ec9eb"
            tick={{ fontFamily: "Montserrat, sans-serif", fill: "rgb(228, 93, 67" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#000000",
              borderColor: "#6ec9eb",
            }}
            labelStyle={{ color: "#6ec9eb", fontFamily: "Montserrat, sans-serif" }}
            itemStyle={{ color: "#6ec9eb", fontFamily: "Montserrat, sans-serif" }}
          />
          <Legend wrapperStyle={{ fontFamily: "Montserrat, sans-serif", color: "#6ec9eb" }} />
          <Line
            type="monotone"
            dataKey="winProbability"
            stroke="#6ec9eb"
            name="Perez Win Probability %"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }, []);

  const CLEWinProbabilityChart = useCallback(({ winProbabilityData = [] }) => {
    const data = winProbabilityData.map((wp) => ({
      timestamp: new Date(wp.timestamp).toLocaleString(),
      winProbability: 100 - wp.win_probability ?? 50,
    }));
    

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis
            dataKey="timestamp"
            stroke="#6ec9eb"
            tick={{ fontFamily: "Montserrat, sans-serif", fill: "rgb(228, 93, 67" }}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#6ec9eb"
            tick={{ fontFamily: "Montserrat, sans-serif", fill: "rgb(228, 93, 67" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#000000",
              borderColor: "#6ec9eb",
            }}
            labelStyle={{ color: "#6ec9eb", fontFamily: "Montserrat, sans-serif" }}
            itemStyle={{ color: "#6ec9eb", fontFamily: "Montserrat, sans-serif" }}
          />
          <Legend wrapperStyle={{ fontFamily: "Montserrat, sans-serif", color: "#6ec9eb" }} />
          <Line
            type="monotone"
            dataKey="winProbability"
            stroke="#6ec9eb"
            name="Verstappen Win Probability %"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }, []);


  const Spinner = () => (
    <div className="flex items-center justify-center pointer-events-none">
      <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin pointer-events-none point"></div>
      <span className="ml-2 pointer-events-none">
        Switching to {isArabic ? 'العربية' : 'English' }...
      </span>
    </div>
  );


  return (
    <div className="flex flex-col min-h-screen bg-black text-neon-green font-Montserrat, sans-serif">
      <div className="flex flex-row justify-end -mt-16">
       <div className="flex w-48 h-12 bg-slate-600 rounded-sm mb-10">
      <button
        onClick={() => handleLanguageChange('english')}
        disabled={isLoading}
        className={`w-36 h-12 rounded-sm transition-all duration-300 ease-in-out
          ${!isArabic ? 'bg-white text-black' : 'bg-transparent text-white'}
          hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span className="inline-block w-full text-center">
          ENGLISH
        </span>
      </button>
      
      <button
        onClick={() => handleLanguageChange('arabic')}
        disabled={isLoading}
        className={`w-36 h-12 rounded-sm transition-all duration-300 ease-in-out
          ${isArabic ? 'bg-white text-black' : 'bg-transparent text-white'}
          hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span className="inline-block w-full text-center">
          العربية
        </span>
      </button>
    </div>

        <button
          onClick={() => setHideMessages(!hideMessages)}
          className="ml-6 w-36 h-12 border-2 border-white text-groq-orange bg-transparent rounded-sm hover:bg-gray-800 transition-all"

        >
          {hideMessages ? 'Show Chat' : 'Hide Chat'}
        </button>


    <button onClick={handleToggleMute} className="ml-6 flex items-center justify-center w-20 h-12 rounded-sm bg-black border-2 border-white text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 transition-colors duration-200" aria-label={isMuted ? "Unmute" : "Mute"}>
        {isMuted ? <VolumeX className="w-7 h-7" /> : <Volume2 className="w-7 h-7" />}
      </button>
      </div>

      <div className="flex flex-grow">
        {/* hideMessages w full, and the other one is gone */}
        <div className={`p-4 flex flex-col transition-all duration-300 ${hideMessages ? 'w-full px-12' : 'w-2/3'}`}>
          <div className="video-container">
            <video
            muted
              ref={videoRef}
              src={videoSrc}
              controls
              crossOrigin="anonymous"
              className="w-full h-auto object-contain"
            />
            {error && <p className="text-red-500 mt-2">{error}</p>}
            {isAIWatching && <div className="ai-watching">AI is watching</div>}
          </div>
        </div>
        {!hideMessages && (
  <div className="w-1/3 p-4 flex flex-col" style={{ maxHeight: "80vh" }}>
        {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-sm pointer-events-none">
          <div className="text-center text-white pointer-events-none">
            <Spinner />
          </div>
        </div>
      )}
       <h2 className="text-2xl font-bold mb-2 text-white">Live Chat</h2>
       

          <CommentarySidebar
            commentary={commentary}
            showAIMessages={showAIMessages}
            onToggleAIMessages={() => setShowAIMessages(!showAIMessages)}
            // onGenerateCommentary={handleTextToSpeech}
            isAIWatching={isAIWatching}
            onSendMessage={onSendMessage}

          />
        </div>)}
      </div>
         <div className="bg-black p-4">
        <button
          onClick={() => setShowAnalytics(!showAnalytics)}
          className="mb-4"
        >
          {showAnalytics ? "Hide Analytics" : "Show Analytics"}
        </button>
        <MicChatButton />
   
        {showAnalytics && (
          <div className="analytics-container">

<div className="analytics-card">
            <div className="w-full max-w-4xl bg-gray-900 text-gray-200 shadow-md rounded-sm overflow-hidden">
      <div className="bg-gray-800 px-4 py-3 font-bold text-lg">
        F1 Drivers Championship Standings
      </div>
      <div className="grid grid-cols-6 font-semibold border-b border-gray-700 bg-gray-850 text-gray-300">
        <div className="p-2 text-center">Position</div>
        <div className="p-2 col-span-2">Driver</div>
        <div className="p-2 col-span-2">Team</div>
        <div className="p-2 text-center">Points</div>
      </div>
      <div className="grid grid-cols-6 border-b border-gray-700 hover:bg-gray-800 transition-colors">
        <div className="p-2 text-center">1</div>
        <div className="p-2 col-span-2">Max Verstappen</div>
        <div className="p-2 col-span-2">Red Bull Racing</div>
        <div className="p-2 text-center">26</div>
      </div>
      <div className="grid grid-cols-6 border-b border-gray-700 hover:bg-gray-800 transition-colors">
        <div className="p-2 text-center">2</div>
        <div className="p-2 col-span-2">Sergio Perez</div>
        <div className="p-2 col-span-2">Red Bull Racing</div>
        <div className="p-2 text-center">18</div>
      </div>
      <div className="grid grid-cols-6 border-b border-gray-700 hover:bg-gray-800 transition-colors">
        <div className="p-2 text-center">3</div>
        <div className="p-2 col-span-2">Carlos Sainz</div>
        <div className="p-2 col-span-2">Ferrari</div>
        <div className="p-2 text-center">15</div>
      </div>
      <div className="grid grid-cols-6 border-b border-gray-700 hover:bg-gray-800 transition-colors">
        <div className="p-2 text-center">4</div>
        <div className="p-2 col-span-2">Charles Leclerc</div>
        <div className="p-2 col-span-2">Ferrari</div>
        <div className="p-2 text-center">12</div>
      </div>
      <div className="grid grid-cols-6 hover:bg-gray-800 transition-colors">
        <div className="p-2 text-center">5</div>
        <div className="p-2 col-span-2">George Russell</div>
        <div className="p-2 col-span-2">Mercedes</div>
        <div className="p-2 text-center">10</div>
      </div>
    </div>
              {/* <h3 className="text-xl font-semibold mb-2">Past Scores Over Time</h3>
              <ScoresOverTimeChart
                scoresData={analyticsData?.scoresOverTime || []}
              /> */}
            </div>

            <div className="analytics-card">
              <h3 className="text-xl font-semibold mb-2">
              Perez Win Probability
              </h3>
              <GSWinProbabilityChart
                winProbabilityData={analyticsData?.winProbabilityOverTime || []}
              />
            </div>

            <div className="analytics-card">
              <h3 className="text-xl font-semibold mb-2">
              Verstappen Win Probability
              </h3>
              <CLEWinProbabilityChart
                winProbabilityData={analyticsData?.winProbabilityOverTime || []}
              />
            </div>




            <div className="analytics-card">
              <h3 className="text-xl font-semibold mb-2">Total Commentaries</h3>
              <TotalCommentariesChart
                commentaries={analyticsData?.totalCommentaries || 0}
              />
            </div>

            <div className="analytics-card">
              <h3 className="text-xl font-semibold mb-2">Latest Latencies</h3>
              <LatestLatenciesChart
                latencies={analyticsData?.latestLatency || []}
              />
            </div>

            <div className="analytics-card">
              <h3 className="text-xl font-semibold mb-2">
                Latest Commentaries
              </h3>
              <LatestCommentariesChart
                commentaries={analyticsData?.latestCommentaries || []}
              />
            </div>

            
          </div>
        )}
      </div>
      <p className="text-white flex justify-end w-full pb-6 pr-6">Adapted from&nbsp;<a target="_blank" href="https://x.com/alexjpeng"> @alexjpeng</a>&nbsp;NBA OnTheFlyAI demo: <a  target="_blank"  href="https://github.com/apeng-singlestore/WarriorsCommentaryAPI">&nbsp;Github Project.</a></p> 
    </div>
  );
}