import { memo } from "react";
import { Handle, Position, NodeResizer } from "@xyflow/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Server,
  Bot,
  PenTool,
  Copy,
  Trash2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmployeeContext } from "./EmployeeContext";

// Map roles to icons and colors for a more vibrant, premium look
const roleConfig = {
  ceo: {
    icon: User,
    color: "text-blue-600",
    bg: "bg-blue-600/10",
    border: "border-blue-300/50",
  },
  active: {
    icon: User,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-200/50",
  },
  assistant: {
    icon: Bot,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-200/50",
  },
  devops: {
    icon: Server,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-200/50",
  },
  product_manager: {
    icon: PenTool,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-200/50",
  },
  default: {
    icon: User,
    color: "text-slate-500",
    bg: "bg-slate-500/10",
    border: "border-slate-200/50",
  },
};

const roleMap: Record<string, string> = {
  assistant: "助理",
  life_assistant: "生活助理",
  devops: "DevOps 工程师",
  deployment: "部署工程师",
  product_manager: "产品经理",
  content_creator: "内容创作者",
  ceo: "CEO",
};

function EmployeeNode({
  id,
  data,
  selected,
}: {
  id: string;
  data: {
    label: string;
    role?: string;
    status?: string;
    model?: string;
    prompt?: string;
  };
  selected?: boolean;
}) {
  const config =
    roleConfig[data.role as keyof typeof roleConfig] || roleConfig.default;
  const Icon = config.icon;

  const isWorking = data.status === "working";
  const isActive = data.status === "active";
  const isCEO = data.role === "ceo";

  const { onDelete, onDuplicate, onInfo } = useEmployeeContext();

  return (
    <div className='group/node relative focus:outline-none'>
      <NodeResizer
        isVisible={selected}
        minWidth={180}
        minHeight={80}
        handleStyle={{
          width: 12,
          height: 12,
          borderRadius: "100%",
          background: "transparent",
          border: "none",
        }}
        lineStyle={{ border: "none" }}
      />

      {/* Handles must be outside the Card to avoid being clipped by overflow-hidden */}
      <Handle
        type='target'
        position={Position.Top}
        className='w-2.5 h-2.5 bg-primary border-2 border-white dark:border-slate-900 !-top-1 z-10'
      />

      <Card
        className={cn(
          "w-full h-full min-w-[180px] overflow-hidden transition-shadow duration-200",
          "bg-white dark:bg-slate-900 border",
          selected
            ? "border-primary shadow-[0_0_0_1px_rgba(59,130,246,0.1),0_4px_12px_rgba(59,130,246,0.1)]"
            : "border-slate-200/60 dark:border-slate-800/60 shadow-sm",
        )}
      >
        <div
          className={cn("h-0.5 w-full", config.color.replace("text", "bg"))}
        />

        <CardHeader className='p-2 pb-1.5 flex flex-row items-center justify-between space-y-0'>
          <div className='flex items-center gap-2 w-full pr-1'>
            <div className={cn("p-1.5 rounded-lg", config.bg)}>
              <Icon className={cn("w-4 h-4", config.color)} />
            </div>
            <div className='flex flex-col min-w-0 flex-1'>
              <CardTitle className='text-xs font-bold truncate leading-tight text-slate-900 dark:text-slate-100'>
                {data.label}
              </CardTitle>
              <span className='text-[9px] text-muted-foreground uppercase tracking-tight font-medium opacity-70'>
                {roleMap[data.role as string] || data.role || "员工"}
              </span>
            </div>
          </div>

          <div className='relative flex items-center justify-center ml-1'>
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                isActive
                  ? "bg-emerald-500"
                  : isWorking
                    ? "bg-amber-500"
                    : "bg-slate-300 dark:bg-slate-600",
              )}
            />
            {isWorking && (
              <div className='absolute inset-0 w-2 h-2 bg-amber-500 rounded-full animate-pulse opacity-75' />
            )}
          </div>
        </CardHeader>

        <CardContent className='p-2 pt-1 space-y-1.5'>
          {data.model && (
            <div className='flex flex-wrap gap-1'>
              <Badge
                variant='outline'
                className='text-[9px] h-4 px-1 font-medium bg-primary/5 border-primary/10 text-primary'
              >
                {data.model}
              </Badge>
            </div>
          )}

          <div
            className={cn(
              "flex items-center gap-1.5 text-[10px] py-1 px-1.5 rounded transition-colors",
              data.prompt
                ? "bg-slate-50 dark:bg-slate-800/50 text-slate-500"
                : "text-slate-400 italic",
            )}
          >
            <div
              className={cn(
                "w-1 h-1 rounded-full",
                data.prompt ? "bg-primary" : "bg-slate-300",
              )}
            />
            <span className='truncate'>
              {data.prompt ? "指令激活" : "无指令"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Handles must be outside the Card to avoid being clipped by overflow-hidden */}
      <Handle
        type='source'
        position={Position.Bottom}
        className='w-2.5 h-2.5 bg-primary border-2 border-white dark:border-slate-900 !-bottom-1 z-10'
      />

      {/* Floating Action Bar - Flowise style */}
      {/* 外层容器从卡片右边缘开始（right-0），包含不可见的桥接区域（pl-3），消除间隙 */}
      <div
        className={cn(
          "absolute right-0 top-2 translate-x-full pl-3 flex flex-col gap-2 transition-all duration-200 z-10",
          "opacity-0 invisible group-hover/node:opacity-100 group-hover/node:visible",
        )}
      >
        <button
          className='p-1.5 bg-white dark:bg-slate-800 rounded-full shadow-md border border-slate-200 dark:border-slate-700 hover:text-primary hover:border-primary/50 transition-colors'
          onClick={(e) => {
            e.stopPropagation();
            onInfo(id);
          }}
          title='设置/详情'
        >
          <Settings className='w-3.5 h-3.5' />
        </button>

        {!isCEO && (
          <>
            <button
              className='p-1.5 bg-white dark:bg-slate-800 rounded-full shadow-md border border-slate-200 dark:border-slate-700 hover:text-blue-500 hover:border-blue-500/50 transition-colors'
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(id, data);
              }}
              title='复制员工'
            >
              <Copy className='w-3.5 h-3.5' />
            </button>
            <button
              className='p-1.5 bg-white dark:bg-slate-800 rounded-full shadow-md border border-slate-200 dark:border-slate-700 hover:text-red-500 hover:border-red-500/50 transition-colors'
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id);
              }}
              title='删除员工'
            >
              <Trash2 className='w-3.5 h-3.5' />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default memo(EmployeeNode);
