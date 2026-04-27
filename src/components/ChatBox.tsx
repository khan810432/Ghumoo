import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Send } from "lucide-react";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: any;
}

export function ChatBox({
  commuteId,
  currentUserId,
  currentUserName,
}: {
  commuteId: string;
  currentUserId: string;
  currentUserName: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!commuteId) return;
    const q = query(
      collection(db, "commutes", commuteId, "messages"),
      orderBy("timestamp", "asc"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatMessage[];
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });
    return () => unsubscribe();
  }, [commuteId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !commuteId) return;

    const msg = newMessage.trim();
    setNewMessage("");

    try {
      await addDoc(collection(db, "commutes", commuteId, "messages"), {
        senderId: currentUserId,
        senderName: currentUserName,
        text: msg,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending message", error);
    }
  };

  return (
    <div className="flex flex-col h-64 border rounded-xl overflow-hidden bg-gray-50 mt-4">
      <div className="bg-blue-600 text-white p-2 text-sm font-semibold flex items-center justify-center">
        Ride Group Chat
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 relative">
        {messages.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-4">
            No messages yet. Say hello!
          </p>
        )}
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === currentUserId;
          const showName =
            !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
            >
              {showName && (
                <span className="text-[10px] text-gray-500 mb-0.5 ml-1">
                  {msg.senderName}
                </span>
              )}
              <div
                className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm ${isMe ? "bg-blue-600 text-white rounded-tr-none" : "bg-white border text-gray-800 rounded-tl-none"}`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="p-2 bg-white border-t flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 h-9 flex-grow text-sm rounded-full bg-gray-100 border-transparent hover:border-gray-300 focus-visible:ring-1 focus-visible:ring-blue-500"
        />
        <Button
          type="submit"
          size="sm"
          className="rounded-full h-9 w-9 p-0 flex-shrink-0"
          disabled={!newMessage.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
