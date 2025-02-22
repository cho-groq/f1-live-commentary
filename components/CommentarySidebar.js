// components/CommentarySidebar.js

import { useEffect, useRef, useState } from 'react';

export default function CommentarySidebar({
  commentary,
  isAIWatching,
  isArabic,
}) {
  const chatBoxRef = useRef(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [commentary]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      if (onSendMessage) {
        onSendMessage(message);
      }
      setMessage('');
    }
  };

  return (
    <div
      className="commentary bg-black rounded-lg flex flex-col h-full text-neon-green"
      style={{ maxHeight: '70vh' }}
    >
      <div className="p-4 bg-black border-b border-gray-600 flex-shrink-0">
        
        {/* <button
          onClick={onToggleAIMessages}
          className="w-full"
        >
          {showAIMessages ? 'Hide AI Messages' : 'Show AI Messages'}
        </button> */}
      </div>
      <div
        className="flex-grow overflow-y-auto p-4 bg-black"
        ref={chatBoxRef}
      >
        <div className="space-y-4">
          {commentary.map((comment, index) => {
             // Only render up to the second-to-last element and don't render first element
            if (index === 0 || index === commentary.length - 1) {
              return null;
            }
            if (true) {
              return (
                <div
                  key={index}
                  className={`p-3 rounded shadow ${
                    comment.type === 'user'
                      ? 'bg-green-600 text-white text-right'
                      : 'bg-gray-700 text-white'
                  }`}
                >
                   <p className={`text-xs text-gray-400`}>
                    {new Date(comment.timestamp).toLocaleTimeString()}
                  </p>
                  <p className="mt-1">{comment.text}</p>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
      <form
        onSubmit={handleSubmit}
        className="p-4 bg-black border-t border-gray-600 flex gap-2 flex-shrink-0 flex-end justify-end"
      >
        {/* <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-grow px-3 py-2 bg-gray-600 text-white rounded-l-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          type="submit"
          className="send"
        >
          Send
        </button> */}
        <button
          type="button"
          // onClick={onGenerateCommentary}
          className="generate-commentary"
          disabled={isAIWatching}
        >
          {isAIWatching ? 'SPEAKING...' : 'SPEAK'}
        </button>
      </form>
    </div>
  );
}
