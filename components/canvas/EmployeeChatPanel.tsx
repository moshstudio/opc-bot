"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getChatHistory, sendMessage } from "@/app/actions/chat-actions";

import { useModelContext } from "@/components/ModelContext";

interface EmployeeChatPanelProps {
  employee: any;
}

export function EmployeeChatPanel({ employee }: EmployeeChatPanelProps) {
  const { models } = useModelContext();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(
    async (isInitial = false) => {
      if (!employee) return;
      if (!isInitial) setLoading(true);
      try {
        const res = await getChatHistory(employee.id);
        if (res.success && res.messages) {
          setMessages(
            res.messages.map((m: any) => ({
              role: m.role,
              content: m.content,
            })),
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [employee],
  );

  useEffect(() => {
    if (employee?.id) {
      setMessages([]);
      loadHistory(true);
    }
  }, [employee?.id, loadHistory]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || !employee) return;

    const userMsg = input;
    setInput("");

    // Optimistic update
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    // Get model details from context
    let clientModelConfig = undefined;
    try {
      const config =
        typeof employee.config === "string"
          ? JSON.parse(employee.config)
          : employee.config || {};
      const modelId = config.model;
      const modelDetails = models.find((m: any) => m.id === modelId);
      if (modelDetails) {
        clientModelConfig = {
          modelName: modelDetails.name,
          baseUrl: modelDetails.baseUrl,
          apiKey: modelDetails.apiKey,
        };
      }
    } catch (e) {
      console.error("Failed to parse config for chat", e);
    }

    const res = await sendMessage(employee.id, userMsg, clientModelConfig);

    if (res.success && res.message) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.message as string },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        { role: "system", content: `Error: ${res.error}` },
      ]);
    }
    setLoading(false);
  };

  return (
    <div className='flex flex-col h-full'>
      <ScrollArea className='flex-1 pr-4 -mr-4 min-h-0'>
        <div className='space-y-4 pb-4'>
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <span className='text-[10px] text-muted-foreground mb-1 capitalize opacity-70'>
                {msg.role === "user" ? "你" : employee.name || employee.label}
              </span>
              <div
                className={`p-3 rounded-lg text-sm max-w-[90%] shadow-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : msg.role === "system"
                      ? "bg-destructive/10 text-destructive border border-destructive/20"
                      : "bg-muted border"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className='flex items-center gap-2 text-xs text-muted-foreground animate-pulse p-2'>
              <div className='w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]'></div>
              <div className='w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]'></div>
              <div className='w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce'></div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className='mt-auto pt-4'>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className='flex gap-2'
        >
          <Input
            placeholder={`发送给 ${employee.name || employee.label}...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <Button
            type='submit'
            size='icon'
            disabled={loading || !input.trim()}
          >
            <Send className='h-4 w-4' />
          </Button>
        </form>
      </div>
    </div>
  );
}
