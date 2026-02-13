"use client";

import { useState } from "react";
import { X, Settings, MessageSquare, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmployeeConfigPanel } from "./EmployeeConfigPanel";
import { EmployeeChatPanel } from "./EmployeeChatPanel";
import { EmployeeLogPanel } from "./EmployeeLogPanel";

interface EmployeeDetailPanelProps {
  employee: any;
  onClose: () => void;
  onUpdate: (data: any) => void;
}

export function EmployeeDetailPanel({
  employee,
  onClose,
  onUpdate,
}: EmployeeDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<"config" | "chat" | "log">(
    "config",
  );

  if (!employee) return null;

  return (
    <div className='absolute top-4 right-4 bottom-4 w-[400px] bg-background border rounded-lg shadow-2xl z-20 flex flex-col overflow-hidden'>
      {/* Header */}
      <div className='flex items-center justify-between p-4 border-b bg-muted/30'>
        <div className='flex items-center gap-2'>
          {/* Tab Switcher */}
          <div className='flex bg-muted p-1 rounded-md'>
            <Button
              variant={activeTab === "config" ? "default" : "ghost"}
              size='sm'
              onClick={() => setActiveTab("config")}
              className='h-7 text-xs px-3'
            >
              <Settings className='w-3 h-3 mr-1.5' />
              配置
            </Button>
            <Button
              variant={activeTab === "chat" ? "default" : "ghost"}
              size='sm'
              onClick={() => setActiveTab("chat")}
              className='h-7 text-xs px-3'
            >
              <MessageSquare className='w-3 h-3 mr-1.5' />
              对话
            </Button>
            <Button
              variant={activeTab === "log" ? "default" : "ghost"}
              size='sm'
              onClick={() => setActiveTab("log")}
              className='h-7 text-xs px-3'
            >
              <Activity className='w-3 h-3 mr-1.5' />
              日志
            </Button>
          </div>
        </div>
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8 text-muted-foreground hover:text-foreground'
          onClick={onClose}
        >
          <X className='h-4 w-4' />
        </Button>
      </div>

      {/* Content */}
      <div className='flex-1 p-4 overflow-hidden'>
        {activeTab === "config" ? (
          <EmployeeConfigPanel
            employee={employee}
            onUpdate={onUpdate}
          />
        ) : activeTab === "chat" ? (
          <EmployeeChatPanel employee={employee} />
        ) : (
          <EmployeeLogPanel employeeId={employee.id} />
        )}
      </div>
    </div>
  );
}
