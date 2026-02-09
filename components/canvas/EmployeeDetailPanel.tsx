"use client";

import { useState, useEffect, useRef } from "react";
import { X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getChatHistory, sendMessage } from "@/app/actions/chat-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EmployeeDetailPanelProps {
  employee: { id: string; label: string; role: string; status: string } | null;
  onClose: () => void;
}

export function EmployeeDetailPanel({
  employee,
  onClose,
}: EmployeeDetailPanelProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadHistory = async () => {
    if (!employee) return;
    setLoading(true);
    const res = await getChatHistory(employee.id);
    if (res.success && res.messages) {
      setMessages(
        res.messages.map((m: any) => ({ role: m.role, content: m.content })),
      );
    } else {
      // toast.error("Failed to load chat history");
      console.error("Failed to load history", res.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (employee) {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee]);

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

    const res = await sendMessage(employee.id, userMsg);

    if (res.success && res.message) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.message as string }, // Corrected type mapping
      ]);
    } else {
      // Revert or show error
      setMessages((prev) => [
        ...prev,
        { role: "system", content: `Error: ${res.error}` },
      ]);
    }
    setLoading(false);
  };

  if (!employee) return null;

  return (
    <div className='absolute top-0 right-0 h-full w-96 bg-background border-l shadow-xl z-20 flex flex-col'>
      <div className='flex items-center justify-between p-4 border-b'>
        <div>
          <h3 className='font-semibold text-lg'>{employee.label}</h3>
          <p className='text-xs text-muted-foreground capitalize'>
            {employee.role}
          </p>
        </div>
        <Button
          variant='ghost'
          size='icon'
          onClick={onClose}
        >
          <X className='h-4 w-4' />
        </Button>
      </div>

      <ScrollArea className='flex-1 p-4'>
        <div className='space-y-4'>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm'>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex items-center gap-2'>
                <div
                  className={`w-2 h-2 rounded-full ${employee.status === "active" ? "bg-green-500" : "bg-gray-300"}`}
                />
                <span className='text-sm capitalize'>{employee.status}</span>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className='space-y-4'>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <span className='text-xs text-muted-foreground mb-1 capitalize'>
                  {msg.role === "user" ? "You" : employee.label}
                </span>
                <div
                  className={`p-2 rounded-lg text-sm max-w-[85%] ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : msg.role === "system"
                        ? "bg-red-100 text-red-800"
                        : "bg-muted"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className='text-xs text-muted-foreground animate-pulse'>
                {employee.label} is typing...
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </div>
      </ScrollArea>

      <div className='p-4 border-t mt-auto'>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className='flex gap-2'
        >
          <Input
            placeholder={`Message ${employee.label}...`}
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
