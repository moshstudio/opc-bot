import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkflowNode } from "@/lib/workflow/types";
import { Play, Clock, Globe } from "lucide-react";

interface TestRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: WorkflowNode[];
  onRun: (input: string) => void;
}

export function TestRunDialog({
  open,
  onOpenChange,
  nodes,
  onRun,
}: TestRunDialogProps) {
  const [input, setInput] = useState("");
  const [activeTrigger, setActiveTrigger] = useState<WorkflowNode | null>(null);

  // Identify trigger nodes
  const triggerNodes = React.useMemo(
    () =>
      nodes.filter(
        (n) =>
          n.type === "start" ||
          n.type === "cron_trigger" ||
          n.type === "webhook",
      ),
    [nodes],
  );

  useEffect(() => {
    // If opening and we have triggers, set default if none selected
    if (open && triggerNodes.length > 0) {
      setTimeout(() => {
        setActiveTrigger((prev) => prev || triggerNodes[0]);
      }, 0);
    }
  }, [open, triggerNodes]);

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setActiveTrigger(null);
        setInput("");
      }, 0);
    }
  }, [open]);

  const handleRun = () => {
    onRun(input);
    onOpenChange(false);
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case "start":
        return <Play className='w-4 h-4' />;
      case "cron_trigger":
        return <Clock className='w-4 h-4' />;
      case "webhook":
        return <Globe className='w-4 h-4' />;
      default:
        return <Play className='w-4 h-4' />;
    }
  };

  const getTriggerLabel = (node: WorkflowNode) => {
    switch (node.type) {
      case "start":
        return "用户输入触发";
      case "cron_trigger":
        return `定时触发 (${node.data.cronExpression || node.data.cron || "未配置"})`;
      case "webhook":
        return "Webhook 触发";
      default:
        return node.data.label || "未知触发器";
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>测试运行工作流</DialogTitle>
        </DialogHeader>

        <div className='py-4 space-y-4'>
          {triggerNodes.length === 0 ? (
            <div className='text-center py-8 text-slate-500'>
              <p>未找到触发节点。</p>
              <p className='text-sm'>
                请先添加 &quot;开始&quot;、&quot;定时触发&quot; 或
                &quot;Webhook&quot; 节点。
              </p>
            </div>
          ) : (
            <>
              {triggerNodes.length > 1 && (
                <div className='space-y-2'>
                  <Label>选择触发入口</Label>
                  <div className='flex flex-wrap gap-2'>
                    {triggerNodes.map((node) => (
                      <Button
                        key={node.id}
                        variant={
                          activeTrigger?.id === node.id ? "default" : "outline"
                        }
                        size='sm'
                        onClick={() => setActiveTrigger(node)}
                        className='flex items-center gap-2'
                      >
                        {getTriggerIcon(node.type)}
                        {node.data.label || getTriggerLabel(node)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {activeTrigger && (
                <div className='space-y-4 border rounded-lg p-4 bg-slate-50 dark:bg-slate-900/50'>
                  <div className='flex items-center gap-2 font-medium pb-2 border-b border-slate-200 dark:border-slate-800'>
                    {getTriggerIcon(activeTrigger.type)}
                    {activeTrigger.data.label || getTriggerLabel(activeTrigger)}
                  </div>

                  {activeTrigger.type === "start" && (
                    <div className='space-y-2'>
                      <Label>输入测试内容</Label>
                      <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder='在此输入模拟的用户消息...'
                        rows={5}
                      />
                    </div>
                  )}

                  {activeTrigger.type === "cron_trigger" && (
                    <div className='space-y-2'>
                      <p className='text-sm text-slate-600 dark:text-slate-400'>
                        该节点通常由定时器触发。在测试模式下，您可以立即触发它。
                      </p>
                      <div className='text-xs text-slate-500 p-2 bg-slate-100 dark:bg-slate-800 rounded'>
                        CRON:{" "}
                        {activeTrigger.data.cronExpression ||
                          activeTrigger.data.cron ||
                          "未配置"}
                      </div>
                    </div>
                  )}

                  {activeTrigger.type === "webhook" && (
                    <div className='space-y-2'>
                      <Label>模拟 Payload (JSON)</Label>
                      <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder='{"key": "value"}'
                        rows={5}
                        className='font-mono text-xs'
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            onClick={handleRun}
            disabled={triggerNodes.length === 0}
            className='bg-emerald-600 hover:bg-emerald-700 text-white'
          >
            <Play className='w-4 h-4 mr-2' />
            开始运行
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
