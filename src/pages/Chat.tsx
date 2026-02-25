import { useState } from "react";

const Chat = () => {
  const [activeTab, setActiveTab] = useState<"chat" | "activity">("chat");

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Mobile tab toggle */}
      <div className="flex md:hidden border-b border-border">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === "chat"
              ? "text-foreground border-b-2 border-foreground"
              : "text-muted-foreground"
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === "activity"
              ? "text-foreground border-b-2 border-foreground"
              : "text-muted-foreground"
          }`}
        >
          Activity
        </button>
      </div>

      {/* Chat panel */}
      <div
        className={`flex-1 flex flex-col md:w-[58%] md:max-w-[58%] ${
          activeTab !== "chat" ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="border-b border-border px-5 py-4">
          <h1 className="text-sm font-semibold text-foreground">Chat</h1>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <p className="text-sm text-muted-foreground">No messages yet</p>
        </div>

        {/* Input bar */}
        <div className="border-t border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Type a message…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <button className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90">
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Activity panel */}
      <div
        className={`md:w-[42%] md:max-w-[42%] border-l border-border flex flex-col ${
          activeTab !== "activity" ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="border-b border-border px-5 py-4">
          <h1 className="text-sm font-semibold text-foreground">Activity</h1>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </div>
      </div>
    </div>
  );
};

export default Chat;
