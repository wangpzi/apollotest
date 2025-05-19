import React, { useState, useRef, useEffect } from "react";
import "./chartApp.css"; // 确保这个CSS文件存在，或者将样式内联/使用Tailwind
// 假设您使用的 Tailwind CSS，保留 classNames

interface Message {
  text: string;
  isUser: boolean;
  isThinking?: boolean; // 表示正在思考的消息
}

const ChatApp: React.FC = () => {
  // 现有状态
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "你好！我是基于 DeepSeek 的 AI 助手。有什么我可以帮助你的吗？",
      isUser: false,
    },
  ]);
  const [inputText, setInputText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // *** 新增状态：控制是否使用 Agent ***
  const [useAgent, setUseAgent] = useState<boolean>(false);

  // 自动滚动到最新消息
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
  };

  // *** 处理 Agent checkbox 状态变化 ***
  const handleAgentCheckboxChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setUseAgent(e.target.checked);
  };

  const handleSend = async () => {
    const prompt = inputText.trim(); // 获取输入框的值并去除首尾空格
    if (!prompt) return; // 如果输入为空，则不发送请求

    // 添加用户消息
    setMessages((prev) => [...prev, { text: prompt, isUser: true }]);
    setInputText(""); // 清空输入框
    setIsLoading(true); // 设置加载状态

    // 添加"正在思考"的消息 (这个可以根据需要保留或移除)
    setMessages((prev) => [
      ...prev,
      { text: "正在思考...", isUser: false, isThinking: true },
    ]);

    // *** 根据 useAgent 状态决定 API 配置 ***
    let apiUrl: string;
    let requestBody: any; // 使用 any 是因为两种请求体的结构不同
    let handleApiResponse: (data: any) => string; // 定义一个函数来处理不同 API 的响应

    if (useAgent) {
      // *** 使用 Mastura Agent 配置 ***
      apiUrl = `${process.env.REACT_APP_MASTRA_API_URL}`; // 确保这个 URL 是正确的
      requestBody = {
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        // 您可能还需要根据 Agent 配置添加其他参数，例如 stream: false
        // stream: false
      };
      // *** 根据 Mastura 文档解析响应 ***
      handleApiResponse = (data) => {
        if (data && data.text) {
          if (data.text.length > 0) {
            // 如果有多条 assistant 消息，可以将它们连接起来
            return data.text;
          } else {
            console.warn(
              "Agent 返回的 messages 数组中没有找到 role 为 'assistant' 的消息内容。",
              data
            );
            return (
              "Agent 没有返回预期的回复内容 (没有找到 assistant 消息)。原始响应：" +
              JSON.stringify(data, null, 2).substring(0, 200) +
              "..."
            ); // 提供部分原始响应
          }
        } else {
          console.error("Agent 返回的数据结构异常：", data);
          return (
            "Agent 返回的数据结构异常。原始响应：" +
            JSON.stringify(data, null, 2).substring(0, 200) +
            "..."
          ); // 提供部分原始响应
        }
      };
    } else {
      // *** 使用原有的 /api/chat 配置 ***
      apiUrl = `${process.env.REACT_APP_API_URL}/api/chat`;
      requestBody = { prompt: prompt };
      // *** 根据原有 API 结构解析响应 ***
      handleApiResponse = (data) => {
        if (data && typeof data.reply === "string") {
          return data.reply;
        } else {
          console.error("原有聊天 API 返回的数据结构异常：", data);
          return (
            "原有聊天 API 返回的数据结构异常。原始响应：" +
            JSON.stringify(data, null, 2).substring(0, 200) +
            "..."
          ); // 提供部分原始响应
        }
      };
    }

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // *** 如果 Mastura Agent 需要 API Key 或其他头部，在这里添加 ***
          // 例如: 'Authorization': `Bearer YOUR_MASTRA_API_KEY`
          // 或者如果是原有 API 需要，也在这里添加条件判断
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // 尝试解析错误响应体，即使状态码不是 2xx
        let errorDetails = `请求失败: ${response.status} ${response.statusText}`;
        try {
          const errorJson = await response.json();
          errorDetails += `\n详情: ${JSON.stringify(
            errorJson,
            null,
            2
          ).substring(0, 500)}...`; // 显示部分错误详情
        } catch (e) {
          // 如果错误响应不是JSON，获取文本
          const errorText = await response.text();
          errorDetails += `\n响应内容: ${errorText.substring(0, 500)}...`; // 显示部分错误文本
        }
        throw new Error(errorDetails);
      }

      const data = await response.json();
      const replyText = handleApiResponse(data); // 使用定义好的处理函数获取回复文本

      // 移除"正在思考"消息并添加实际回复
      setMessages((prev) => {
        const filtered = prev.filter((msg) => !msg.isThinking);
        return [...filtered, { text: replyText, isUser: false }];
      });
    } catch (error: any) {
      // 将 error 类型改为 any 或 Error 以便访问 message 属性
      console.error("API 请求出错:", error);

      // 移除"正在思考"消息并添加错误消息
      setMessages((prev) => {
        const filtered = prev.filter((msg) => !msg.isThinking);
        // 显示更详细的错误信息
        return [
          ...filtered,
          {
            text: `抱歉，请求失败：${error.message || "未知错误"}`,
            isUser: false,
          },
        ];
      });
    } finally {
      setIsLoading(false); // 结束加载状态
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      handleSend();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-5 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">聊天助手</h1>{" "}
      {/* 可以根据当前模式修改标题 */}
      <div className="chat-container bg-white rounded-lg shadow-md flex flex-col h-[70vh]">
        <div className="flex-grow p-5 overflow-y-auto messages">
          {messages.map((msg, index) => (
            <div
              key={index}
              // 根据 isUser 和 isThinking 应用样式
              className={`mb-4 p-3 rounded-lg max-w-[80%] ${
                msg.isUser
                  ? "bg-blue-100 ml-auto user-message" // 用户消息靠右
                  : msg.isThinking
                  ? "bg-gray-100 text-gray-500 italic ai-message" // 思考中消息
                  : "bg-gray-200 ai-message" // AI 消息靠左 (默认)
              }`}
            >
              {msg.text}
            </div>
          ))}
          {/* 用于自动滚动的空 div */}
          <div ref={messagesEndRef} />
        </div>
        {/* 输入区域 */}
        <div className="border-t p-4 flex flex-col input-area">
          {" "}
          {/* 使用 flex-col 让 checkbox 在输入框上方或下方 */}
          {/* *** Agent checkbox *** */}
          <div className="mb-2">
            {" "}
            {/* 添加一些底部外边距 */}
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-blue-600 mr-2" // Tailwind checkbox 样式
                checked={useAgent}
                onChange={handleAgentCheckboxChange}
                disabled={isLoading} // 加载时禁用 checkbox
              />
              <span className="text-gray-700">Agent</span>
            </label>
          </div>
          {/* 文本输入框和发送按钮 */}
          <div className="inputFlex">
            {" "}
            {/* 包裹输入框和按钮，让它们水平排列 */}
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={
                useAgent
                  ? "输入需要 Code Review 的代码或问题..."
                  : "输入你的问题..."
              }
              id="user-input"
              className="flex-grow p-2 border border-gray-300 rounded-full mr-2"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !inputText.trim()} // 发送按钮在加载中或输入为空时禁用
              className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed" // 添加禁用样式
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;
