"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  User,
  Bot,
  Copy,
  Check,
  Loader2,
  MessageSquare,
  Eraser,
  Sparkles,
  ArrowDownCircle,
  Brain,
  Wrench,
  ChevronDown,
  ChevronRight,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getChatHistory, clearChatHistory } from "@/app/actions/chat-actions";
import { useModelContext } from "@/components/ModelContext";
import { Markdown } from "@/components/ui/markdown";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// --- Types ---

interface ToolCallData {
  toolCallId: string;
  toolName: string;
  args: any;
  result?: any;
  status: "calling" | "done" | "error";
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  reasoning?: string;
  toolCalls?: ToolCallData[];
}

interface EmployeeChatPanelProps {
  employee: any;
}

// --- Constants ---

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  get_employee_logs: "获取员工日志",
  send_site_notification: "发送站内通知",
  send_email_notification: "发送邮件通知",
  search_knowledge: "搜索知识库",
};

// --- Sub-components ---

function ToolCallCard({ toolCall }: { toolCall: ToolCallData }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className='my-2 rounded-xl border border-border/40 bg-muted/10 overflow-hidden text-xs transition-all hover:bg-muted/20 hover:border-border/60'>
      <button
        className='w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left'
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className={cn(
            "flex items-center justify-center w-6 h-6 rounded-lg border shadow-sm transition-colors",
            toolCall.status === "calling"
              ? "bg-blue-50/50 border-blue-200/50 dark:bg-blue-900/20"
              : toolCall.status === "error"
                ? "bg-destructive/5 border-destructive/20"
                : "bg-green-50/50 border-green-200/50 dark:bg-green-900/20",
          )}
        >
          {toolCall.status === "calling" ? (
            <Loader2 className='w-3.5 h-3.5 animate-spin text-blue-500' />
          ) : toolCall.status === "error" ? (
            <Wrench className='w-3.5 h-3.5 text-destructive' />
          ) : (
            <Check className='w-3.5 h-3.5 text-green-600 dark:text-green-400' />
          )}
        </div>
        <div className='flex flex-col -space-y-0.5 min-w-0'>
          <span className='font-bold text-foreground/70 truncate'>
            {TOOL_DISPLAY_NAMES[toolCall.toolName] || toolCall.toolName}
          </span>
          <span className='text-[9px] text-muted-foreground uppercase tracking-widest font-semibold opacity-50'>
            {toolCall.status === "calling"
              ? "正在调用插件..."
              : toolCall.status === "error"
                ? "调用失败"
                : "已成功执行"}
          </span>
        </div>
        <span className='ml-auto text-muted-foreground/30'>
          {expanded ? (
            <ChevronDown className='w-4 h-4' />
          ) : (
            <ChevronRight className='w-4 h-4' />
          )}
        </span>
      </button>
      {expanded && (
        <div className='px-3.5 pb-3.5 pt-0.5 space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-200'>
          <div className='space-y-1.5'>
            <div className='flex items-center gap-2 pl-1'>
              <div className='w-1 h-1 rounded-full bg-primary/40' />
              <p className='text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest'>
                Input Parameters
              </p>
            </div>
            <pre className='text-[11px] bg-background/40 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap break-all border border-border/20 font-mono text-muted-foreground'>
              {JSON.stringify(toolCall.args, null, 2)}
            </pre>
          </div>
          {toolCall.result !== undefined && (
            <div className='space-y-1.5'>
              <div className='flex items-center gap-2 pl-1'>
                <div className='w-1 h-1 rounded-full bg-green-500/40' />
                <p className='text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest'>
                  Result
                </p>
              </div>
              <pre className='text-[11px] bg-background/40 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap break-all max-h-48 border border-border/20 font-mono text-foreground/80'>
                {typeof toolCall.result === "string"
                  ? toolCall.result
                  : JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReasoningBlock({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!content) return null;

  return (
    <div className='mb-4 rounded-2xl border border-primary/10 bg-primary/[0.02] dark:bg-primary/[0.01] overflow-hidden transition-all duration-500 hover:border-primary/20'>
      <button
        className='w-full flex items-center gap-3 px-4 py-3 text-xs hover:bg-primary/[0.03] transition-colors text-left'
        onClick={() => setExpanded(!expanded)}
      >
        <div className='flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary'>
          <Brain className='w-3.5 h-3.5' />
        </div>
        <div className='flex flex-col -space-y-0.5'>
          <span className='font-bold text-primary/80 tracking-tight'>
            深度思考系统
          </span>
          <span className='text-[9px] text-primary/40 uppercase tracking-widest font-bold'>
            {isStreaming ? "思维链建模中..." : "思维链路已生成"}
          </span>
        </div>
        {isStreaming && (
          <div className='flex items-center gap-0.5 ml-1'>
            <div
              className='w-1 h-1 rounded-full bg-primary animate-bounce'
              style={{ animationDelay: "0ms" }}
            />
            <div
              className='w-1 h-1 rounded-full bg-primary animate-bounce'
              style={{ animationDelay: "150ms" }}
            />
            <div
              className='w-1 h-1 rounded-full bg-primary animate-bounce'
              style={{ animationDelay: "300ms" }}
            />
          </div>
        )}
        <span className='ml-auto text-primary/30'>
          {expanded ? (
            <ChevronDown className='w-4 h-4' />
          ) : (
            <ChevronRight className='w-4 h-4' />
          )}
        </span>
      </button>
      {expanded && (
        <div className='px-5 pb-4 pt-1 animate-in fade-in slide-in-from-top-1 duration-300'>
          <div className='relative'>
            <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 via-primary/10 to-transparent rounded-full' />
            <p className='text-[13.5px] text-foreground/70 whitespace-pre-wrap leading-relaxed font-serif italic pl-5 py-1'>
              {content}
              {isStreaming && (
                <span className='inline-block w-1.5 h-4 bg-primary/30 ml-1 rounded-sm animate-pulse align-middle' />
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main Component ---

export function EmployeeChatPanel({ employee }: EmployeeChatPanelProps) {
  const { models } = useModelContext();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // --- Load History ---
  const loadHistory = useCallback(
    async (isInitial = false) => {
      if (!employee?.id) return;
      if (!isInitial) setLoading(true);
      try {
        const res = await getChatHistory(employee.id);
        if (res.success && res.messages) {
          setMessages(
            res.messages.map((m: any) => ({
              role: m.role as Message["role"],
              content: m.content,
              timestamp: m.createdAt
                ? new Date(m.createdAt).getTime()
                : Date.now(),
            })),
          );
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
        toast.error("无法加载聊天记录");
      } finally {
        setLoading(false);
      }
    },
    [employee?.id],
  );

  useEffect(() => {
    if (employee?.id) {
      setMessages([]);
      loadHistory(true);
    }
  }, [employee?.id, loadHistory]);

  // Cleanup abort on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // --- Auto scroll ---
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  const handleScroll = (e: any) => {
    const target = e.target;
    const isAtBottom =
      target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
    setShowScrollDown(!isAtBottom && messages.length > 5);
  };

  // --- Send Message (Streaming) ---
  const handleSend = async () => {
    if (!input.trim() || !employee || sending) return;

    const userMsg = input.trim();
    setInput("");
    setSending(true);

    // Optimistic user message
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMsg, timestamp: Date.now() },
    ]);

    // Prepare model config
    let clientModelConfig: any = undefined;
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
          provider: modelDetails.provider,
        };
      }
    } catch (e) {
      console.error("Failed to parse config for chat", e);
    }

    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.id,
          message: userMsg,
          clientModelConfig,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = "请求失败";
        try {
          errorMsg = JSON.parse(errorText).error || errorMsg;
        } catch {
          errorMsg = errorText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const body = response.body;
      if (!body) throw new Error("Response body is empty");

      const reader = body.getReader();
      const decoder = new TextDecoder();

      // Add streaming assistant message placeholder
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "",
          timestamp: Date.now(),
          isStreaming: true,
          reasoning: "",
          toolCalls: [],
        },
      ]);

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          try {
            const event = JSON.parse(data);

            setMessages((prev) => {
              const newMsgs = [...prev];
              const last = newMsgs[newMsgs.length - 1];
              if (!last || last.role !== "assistant" || !last.isStreaming)
                return prev;

              const updated = { ...last };

              switch (event.type) {
                case "text-delta":
                  updated.content = (updated.content || "") + event.content;
                  break;
                case "reasoning":
                  updated.reasoning = (updated.reasoning || "") + event.content;
                  break;
                case "tool-call":
                  updated.toolCalls = [
                    ...(updated.toolCalls || []),
                    {
                      toolCallId: event.toolCallId,
                      toolName: event.toolName,
                      args: event.args,
                      status: "calling" as const,
                    },
                  ];
                  break;
                case "tool-result":
                  updated.toolCalls = (updated.toolCalls || []).map((tc) =>
                    tc.toolCallId === event.toolCallId
                      ? {
                          ...tc,
                          result: event.result,
                          status: "done" as const,
                        }
                      : tc,
                  );
                  break;
                case "error":
                  updated.content += `\n\n错误: ${event.message}`;
                  updated.isStreaming = false;
                  break;
                case "finish":
                  updated.isStreaming = false;
                  if (event.fullText) updated.content = event.fullText;
                  break;
              }

              newMsgs[newMsgs.length - 1] = updated;
              return newMsgs;
            });
          } catch {
            // Skip invalid JSON lines
          }
        }
      }

      // Ensure streaming flag is cleared
      setMessages((prev) => {
        const newMsgs = [...prev];
        const last = newMsgs[newMsgs.length - 1];
        if (last && last.role === "assistant" && last.isStreaming) {
          newMsgs[newMsgs.length - 1] = { ...last, isStreaming: false };
        }
        return newMsgs;
      });
    } catch (error: any) {
      if (error.name === "AbortError") {
        // User cancelled — finalize the streaming message as-is
        setMessages((prev) => {
          const newMsgs = [...prev];
          const last = newMsgs[newMsgs.length - 1];
          if (last && last.role === "assistant" && last.isStreaming) {
            newMsgs[newMsgs.length - 1] = { ...last, isStreaming: false };
          }
          return newMsgs;
        });
      } else {
        console.error("Send error:", error);
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content: `错误: ${error.message || "网络请求出现错误"}`,
            timestamp: Date.now(),
          },
        ]);
        toast.error(error.message || "网络请求出现错误");
      }
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  };

  // --- Stop Generation ---
  const handleStop = () => {
    abortRef.current?.abort();
  };

  // --- Clear History ---
  const handleClear = async () => {
    if (!employee?.id || messages.length === 0) return;

    try {
      const res = await clearChatHistory(employee.id);
      if (res.success) {
        setMessages([]);
        toast.success("对话已清空");
      } else {
        toast.error("清空失败: " + res.error);
      }
    } catch {
      toast.error("操作出错");
    }
  };

  // --- Copy ---
  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(index);
    toast.success("已复制到剪贴板");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // --- Format Time ---
  const formatTime = (ts?: number) => {
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // --- Render ---
  return (
    <div className='flex flex-col h-full bg-background/50 backdrop-blur-xl rounded-2xl overflow-hidden border border-border/40 shadow-2xl shadow-black/5'>
      {/* Header */}
      <div className='flex items-center justify-between px-5 py-3 bg-muted/20 border-b border-border/30'>
        <div className='flex items-center gap-3'>
          <div className='relative'>
            <div className='w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' />
            <div className='absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-20' />
          </div>
          <div className='flex flex-col -space-y-0.5'>
            <span className='text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70'>
              {employee.name || employee.role || "AI Assistant"}
            </span>
            <span className='text-[10px] text-muted-foreground font-medium uppercase tracking-wider opacity-60'>
              {employee.role || "智能助手"} · 在线
            </span>
          </div>
        </div>
        <AlertDialog>
          <TooltipProvider>
            <Tooltip>
              <AlertDialogTrigger asChild>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='w-8 h-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors'
                    disabled={messages.length === 0 || loading || sending}
                  >
                    <Eraser className='w-4 h-4' />
                  </Button>
                </TooltipTrigger>
              </AlertDialogTrigger>
              <TooltipContent
                side='bottom'
                className='text-[11px]'
              >
                清空对话历史
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确定要清空对话历史吗？</AlertDialogTitle>
              <AlertDialogDescription>
                此操作将永久删除与 {employee.name || "该员工"}{" "}
                的所有对话记录，且无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClear}
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              >
                确定清空
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Messages Area */}
      <div className='relative flex-1 overflow-hidden'>
        <ScrollArea
          className='h-full'
          onScrollCapture={handleScroll}
        >
          <div className='px-4 md:px-6 py-6 space-y-6'>
            {/* Empty State */}
            {messages.length === 0 && !loading && (
              <div className='flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in zoom-in-95 duration-700'>
                <div className='relative mb-8'>
                  <div className='absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 opacity-20' />
                  <div className='relative w-24 h-24 bg-gradient-to-br from-primary/10 to-primary/5 rounded-[2.5rem] flex items-center justify-center border border-primary/10 shadow-xl shadow-primary/5 transform -rotate-3 hover:rotate-0 transition-transform duration-500'>
                    <MessageSquare className='w-10 h-10 text-primary/60' />
                  </div>
                  <div className='absolute -bottom-2 -right-2 w-10 h-10 bg-background rounded-2xl flex items-center justify-center border border-border/50 shadow-lg animate-bounce duration-300'>
                    <Sparkles className='w-5 h-5 text-amber-500/80' />
                  </div>
                </div>

                <h3 className='text-xl font-bold tracking-tight text-foreground mb-2'>
                  我是 {employee.name || "AI 助手"}
                </h3>
                <p className='text-sm text-muted-foreground max-w-xs mb-10 leading-relaxed font-medium opacity-80'>
                  随时准备为您提供帮助。您可以尝试询问：
                </p>

                <div className='grid grid-cols-1 gap-3 w-full max-w-[280px]'>
                  {[
                    { text: "分析当前的执行进度", icon: "📊" },
                    { text: "总结本周的关键任务", icon: "📝" },
                    { text: "检索员工相关的日志", icon: "🔍" },
                  ].map((item) => (
                    <button
                      key={item.text}
                      onClick={() => setInput(item.text)}
                      className='group flex items-center gap-3 p-3 bg-muted/30 hover:bg-primary/5 border border-border/40 hover:border-primary/30 rounded-2xl transition-all duration-300 text-left hover:translate-x-1'
                    >
                      <span className='text-lg bg-background w-8 h-8 rounded-xl flex items-center justify-center border border-border/30 shadow-sm group-hover:shadow-primary/5'>
                        {item.icon}
                      </span>
                      <span className='text-[13px] font-semibold text-foreground/70 group-hover:text-primary transition-colors'>
                        {item.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading Skeleton */}
            {loading && messages.length === 0 && (
              <div className='flex flex-col gap-4 py-8 animate-pulse'>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-3",
                      i % 2 === 1 ? "flex-row" : "flex-row-reverse",
                    )}
                  >
                    <div className='w-8 h-8 rounded-full bg-muted shrink-0' />
                    <div
                      className={cn(
                        "h-12 rounded-2xl bg-muted",
                        i % 2 === 1
                          ? "w-2/3 rounded-tl-sm"
                          : "w-1/2 rounded-tr-sm",
                      )}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-4 group animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row",
                )}
              >
                {/* Avatar */}
                <div className='shrink-0 mt-1'>
                  <Avatar
                    className={cn(
                      "w-9 h-9 border-2 transition-transform duration-300 group-hover:scale-105",
                      msg.role === "user"
                        ? "border-primary/10 ring-4 ring-primary/5"
                        : "border-background ring-4 ring-muted shadow-sm",
                    )}
                  >
                    {msg.role === "user" ? (
                      <AvatarFallback className='bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-inner'>
                        <User className='w-5 h-5' />
                      </AvatarFallback>
                    ) : (
                      <>
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/bottts/svg?seed=${employee.name || "Assistant"}&backgroundColor=f8fafc`}
                        />
                        <AvatarFallback className='bg-muted'>
                          <Bot className='w-5 h-5 text-muted-foreground' />
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                </div>

                {/* Message Content */}
                <div
                  className={cn(
                    "flex flex-col gap-1.5 min-w-0",
                    msg.role === "user" ? "items-end" : "items-start",
                    "max-w-[82%]",
                  )}
                >
                  {/* Sender + Time */}
                  <div
                    className={cn(
                      "flex items-center gap-2 px-1.5",
                      msg.role === "user" && "flex-row-reverse",
                    )}
                  >
                    <span className='text-[11px] font-bold text-foreground/50 uppercase tracking-widest'>
                      {msg.role === "user" ? "你" : employee.name || "AI"}
                    </span>
                    <span className='w-1 h-1 rounded-full bg-border' />
                    <span className='text-[10px] text-muted-foreground/50 font-medium'>
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>

                  {/* Bubble */}
                  <div
                    className={cn(
                      "relative px-4.5 py-3 rounded-[1.25rem] text-[14.5px] leading-[1.6] shadow-sm",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none shadow-primary/10 font-medium"
                        : msg.role === "system"
                          ? "bg-destructive/5 text-destructive border border-destructive/20 rounded-tl-none italic text-xs"
                          : "bg-background border border-border/60 rounded-tl-none group-hover:border-border/80 transition-all",
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <div className='space-y-1'>
                        {/* Reasoning Block */}
                        {msg.reasoning && (
                          <ReasoningBlock
                            content={msg.reasoning}
                            isStreaming={msg.isStreaming}
                          />
                        )}

                        {/* Tool Calls */}
                        {msg.toolCalls && msg.toolCalls.length > 0 && (
                          <div className='space-y-1'>
                            {msg.toolCalls.map((tc) => (
                              <ToolCallCard
                                key={tc.toolCallId}
                                toolCall={tc}
                              />
                            ))}
                          </div>
                        )}

                        {/* Text Content */}
                        {msg.content && <Markdown>{msg.content}</Markdown>}

                        {/* Streaming cursor */}
                        {msg.isStreaming && (
                          <span className='inline-flex h-4.5 w-1.5 bg-primary/60 ml-1 rounded-sm animate-pulse align-middle' />
                        )}
                      </div>
                    ) : (
                      <p className='whitespace-pre-wrap break-words'>
                        {msg.content}
                      </p>
                    )}

                    {/* Action buttons */}
                    {msg.role === "assistant" &&
                      !msg.isStreaming &&
                      msg.content && (
                        <div
                          className={cn(
                            "absolute top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300",
                            "-right-10",
                          )}
                        >
                          <button
                            onClick={() => copyToClipboard(msg.content, i)}
                            className='p-2 rounded-xl bg-background border border-border/50 shadow-sm text-muted-foreground hover:text-foreground hover:border-border transition-all active:scale-90'
                          >
                            {copiedId === i ? (
                              <Check className='w-3.5 h-3.5 text-green-500' />
                            ) : (
                              <Copy className='w-3.5 h-3.5' />
                            )}
                          </button>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator — before stream starts */}
            {sending && !messages.find((m) => m.isStreaming) && (
              <div className='flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300'>
                <Avatar className='w-8 h-8 shrink-0 ring-2 ring-border/50'>
                  <AvatarFallback className='text-xs'>
                    <Bot className='w-4 h-4' />
                  </AvatarFallback>
                </Avatar>
                <div className='bg-muted/50 border border-border/60 px-4 py-3 rounded-2xl rounded-tl-sm'>
                  <div className='flex items-center gap-1.5'>
                    <div
                      className='w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce'
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className='w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce'
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className='w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce'
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div
              ref={scrollRef}
              className='h-2'
            />
          </div>
        </ScrollArea>

        {/* Scroll to bottom */}
        {showScrollDown && (
          <button
            onClick={() => scrollToBottom()}
            className='absolute bottom-3 right-4 p-1.5 bg-background border shadow-lg rounded-full text-primary hover:scale-110 active:scale-95 transition-all z-20'
          >
            <ArrowDownCircle className='w-5 h-5' />
          </button>
        )}
      </div>

      {/* Input Area */}
      <div className='px-5 py-5 border-t border-border/30 bg-background/40 backdrop-blur-md'>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className='relative max-w-4xl mx-auto'
        >
          <div className='relative group/input transition-all duration-300'>
            <div className='absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-2xl blur opacity-0 group-focus-within/input:opacity-100 transition duration-500' />
            <div className='relative flex items-end gap-2 bg-background/80 border border-border/60 focus-within:border-primary/50 rounded-2xl p-2 pl-4 transition-all duration-300 shadow-sm group-focus-within/input:shadow-xl group-focus-within/input:shadow-primary/5'>
              <textarea
                placeholder={`向 ${employee.name || "AI"} 请教问题...`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={sending}
                rows={Math.min(6, Math.max(1, input.split("\n").length))}
                className='flex-1 w-full resize-none bg-transparent border-none focus:ring-0 py-2.5 text-[14px] leading-relaxed placeholder:text-muted-foreground/30 scrollbar-hide outline-none font-medium'
              />
              <div className='flex items-center pb-1 pr-1 gap-1.5'>
                {sending ? (
                  <Button
                    type='button'
                    size='icon'
                    variant='ghost'
                    onClick={handleStop}
                    className='h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all active:scale-90'
                  >
                    <Square className='h-4 w-4 fill-current' />
                  </Button>
                ) : (
                  <Button
                    type='submit'
                    size='icon'
                    disabled={!input.trim()}
                    className={cn(
                      "h-10 w-10 rounded-xl transition-all duration-500 shadow-lg",
                      input.trim()
                        ? "bg-primary text-primary-foreground shadow-primary/20 hover:scale-105 active:scale-95"
                        : "bg-muted text-muted-foreground/30 opacity-40 grayscale",
                    )}
                  >
                    <Send className='h-4.5 w-4.5' />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>
        <div className='mt-3 flex items-center justify-center gap-2 opacity-30 select-none'>
          <Sparkles className='w-3 h-3 text-primary animate-pulse' />
          <p className='text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] text-center'>
            AI Content Generated by Large Language Model
          </p>
          <Sparkles className='w-3 h-3 text-primary animate-pulse' />
        </div>
      </div>
    </div>
  );
}
