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

  const handleToggle = () => {
    setIsArabic(!isArabic);
    console.log(isArabic);
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
    }, 3000); // Fetch analytics every 2 seconds

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
    }, 3000);
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
        startCommentaryInterval();
      };

      const handlePause = () => {
        setIsVideoPlaying(false);
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
        throw new Error('Failed to generate speech');
      }

      
      
      const audioBlob = await response.blob();

      console.log("blob response:");
      console.log(audioBlob);
      const audioUrl = URL.createObjectURL(audioBlob);

      console.log("audio url response:");
      console.log(audioUrl);
      // Create and play the audio
      const audio = new Audio(audioUrl);
      audio.playbackRate = 2.0;
      audio.play();

       // Create an audio element to play the audio
  // const audioElement = new Audio();
  // audioElement.src = URL.createObjectURL(audio);
  // audioElement.play();
    } catch (error) {
      console.error('Error:', error);
      alert("Failed to generate speech. Please try again.");
    }
  }, [commentary]);

  const [isPlaying, setIsPlaying] = useState(false);
  useEffect(() => {
    // Only set up the interval if we're not currently playing audio
    if (!isPlaying) {
      const intervalId = setInterval(async () => {
        if (commentary.length === 0) return;
        
        setIsPlaying(true);
        try {
          await handleTextToSpeech();
        } finally {
          setIsPlaying(false);
        }
      }, 1500);
  
      // Clean up the interval when the component unmounts
      return () => clearInterval(intervalId);
    }
  }, [handleTextToSpeech, commentary, isPlaying]);


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
        <div className="text-9xl font-bold text-neon-green">{commentaries}</div>
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
            stroke="#00FF00"
            tick={{ fontFamily: "Orbitron", fill: "#00FF00" }}
          />
          <YAxis
            stroke="#00FF00"
            tick={{ fontFamily: "Orbitron", fill: "#00FF00" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#000000",
              borderColor: "#00FF00",
            }}
            labelStyle={{ color: "#00FF00", fontFamily: "Orbitron" }}
            itemStyle={{ color: "#00FF00", fontFamily: "Orbitron" }}
          />
          <Legend wrapperStyle={{ fontFamily: "Orbitron", color: "#00FF00" }} />
          <Line
            type="monotone"
            dataKey="latency"
            stroke="#00FF00"
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
            stroke="#00FF00"
            tick={{ fontFamily: "Orbitron", fill: "#00FF00" }}
          />
          <YAxis
            stroke="#00FF00"
            tick={{ fontFamily: "Orbitron", fill: "#00FF00" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#000000",
              borderColor: "#00FF00",
            }}
            labelStyle={{ color: "#00FF00", fontFamily: "Orbitron" }}
            itemStyle={{ color: "#00FF00", fontFamily: "Orbitron" }}
          />
          <Legend wrapperStyle={{ fontFamily: "Orbitron", color: "#00FF00" }} />
          <Line
            type="monotone"
            dataKey="length"
            stroke="#00FF00"
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
            stroke="#00FF00"
            tick={{ fontFamily: "Orbitron", fill: "#00FF00" }}
          />
          <YAxis
            stroke="#00FF00"
            tick={{ fontFamily: "Orbitron", fill: "#00FF00" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#000000",
              borderColor: "#00FF00",
            }}
            labelStyle={{ color: "#00FF00", fontFamily: "Orbitron" }}
            itemStyle={{ color: "#00FF00", fontFamily: "Orbitron" }}
          />
          <Legend wrapperStyle={{ fontFamily: "Orbitron", color: "#00FF00" }} />
          <Line
            type="monotone"
            dataKey="warriorsScore"
            stroke="#00FFFF" // Neon blue for Warriors
            name="Warriors"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="cavaliersScore"
            stroke="#FF3131" // Neon red for Cavaliers
            name="Cavaliers"
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
            stroke="#00FF00"
            tick={{ fontFamily: "Orbitron", fill: "#00FF00" }}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#00FF00"
            tick={{ fontFamily: "Orbitron", fill: "#00FF00" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#000000",
              borderColor: "#00FF00",
            }}
            labelStyle={{ color: "#00FF00", fontFamily: "Orbitron" }}
            itemStyle={{ color: "#00FF00", fontFamily: "Orbitron" }}
          />
          <Legend wrapperStyle={{ fontFamily: "Orbitron", color: "#00FF00" }} />
          <Line
            type="monotone"
            dataKey="winProbability"
            stroke="#00FF00"
            name="Warriors Win Probability %"
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
            stroke="#00FF00"
            tick={{ fontFamily: "Orbitron", fill: "#00FF00" }}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#00FF00"
            tick={{ fontFamily: "Orbitron", fill: "#00FF00" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#000000",
              borderColor: "#00FF00",
            }}
            labelStyle={{ color: "#00FF00", fontFamily: "Orbitron" }}
            itemStyle={{ color: "#00FF00", fontFamily: "Orbitron" }}
          />
          <Legend wrapperStyle={{ fontFamily: "Orbitron", color: "#00FF00" }} />
          <Line
            type="monotone"
            dataKey="winProbability"
            stroke="#00FF00"
            name="Cavaliers Win Probability %"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-black text-neon-green font-orbitron">
      <div className="flex flex-grow">
        <div className="w-2/3 p-4 flex flex-col">
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
        <div className="w-1/3 p-4 flex flex-col" style={{ maxHeight: "80vh" }}>
        <div className="relative w-48 h-12 bg-slate-600 rounded-lg -mt-12 mb-10">
        <button
        onClick={handleToggle}
        className={`absolute h-12 w-24 rounded-lg bg-green-500 transition-transform duration-300 ease-in-out hover:bg-green-600  ${
          isArabic ? 'translate-x-24' : 'translate-x-0'
        }`}
      >
        <span className="inline-block w-full text-center text-white">
          {isArabic ? 'العربية' : 'English'}
        </span>
      </button>
    </div>
          <CommentarySidebar
            commentary={commentary}
            showAIMessages={showAIMessages}
            onToggleAIMessages={() => setShowAIMessages(!showAIMessages)}
            // onGenerateCommentary={handleTextToSpeech}
            isAIWatching={isAIWatching}
            onSendMessage={onSendMessage}
          />
        </div>
      </div>
      <div className="bg-black p-4">
        <button
          onClick={() => setShowAnalytics(!showAnalytics)}
          className="mb-4"
        >
          {showAnalytics ? "Hide Analytics" : "Show Analytics"}
        </button>
        {showAnalytics && (
          <div className="analytics-container">
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

            <div className="analytics-card">
              <h3 className="text-xl font-semibold mb-2">Scores Over Time</h3>
              <ScoresOverTimeChart
                scoresData={analyticsData?.scoresOverTime || []}
              />
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
          </div>
        )}
      </div>
    </div>
  );
}
