import React, { useState, useRef, useEffect } from "react";
import "./chartApp.css";
interface Message {
  text: string;
  isUser: boolean;
  isThinking?: boolean;
}

const ChatApp: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "你好！我是基于 DeepSeek 的 AI 助手。有什么我可以帮助你的吗？",
      isUser: false,
    },
  ]);
  const [inputText, setInputText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新消息
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    // 添加用户消息
    setMessages((prev) => [...prev, { text: inputText, isUser: true }]);
    setInputText("");
    setIsLoading(true);

    // 添加"正在思考"的消息
    setMessages((prev) => [
      ...prev,
      { text: "正在思考...", isUser: false, isThinking: true },
    ]);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: inputText }),
        }
      );

      if (!response.ok) {
        throw new Error("API 请求失败");
      }

      const data = await response.json();

      // 移除"正在思考"消息并添加AI回复
      setMessages((prev) => {
        const filtered = prev.filter((msg) => !msg.isThinking);
        return [...filtered, { text: data.reply, isUser: false }];
      });
    } catch (error) {
      console.error("Error:", error);

      // 移除"正在思考"消息并添加错误消息
      setMessages((prev) => {
        const filtered = prev.filter((msg) => !msg.isThinking);
        return [
          ...filtered,
          { text: "抱歉，出现了错误，请重试。", isUser: false },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      handleSend();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-5 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">DeepSeek 聊天助手</h1>
      <div className="chat-container bg-white rounded-lg shadow-md flex flex-col h-[70vh]">
        <div className="flex-grow p-5 overflow-y-auto messages">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`mb-4 p-3 rounded-lg max-w-[80%] ${
                msg.isUser
                  ? "bg-blue-100 ml-auto user-message"
                  : msg.isThinking
                  ? "bg-gray-100 text-gray-500 italic ai-message"
                  : "bg-gray-200"
              }`}
            >
              {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="border-t p-4 flex input-area">
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="输入你的问题..."
            id="user-input"
            className="flex-grow p-2 border border-gray-300 rounded-full mr-2"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-full"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;
