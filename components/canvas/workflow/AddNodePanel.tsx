import React, { useMemo, useState } from "react";
import { Search, ChevronRight, Plus, Zap, X, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  getVisibleNodesByTab,
  getColorClasses,
  NodeTheme,
} from "./nodeTypeConfig";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface AddNodePanelProps {
  open: boolean;
  onClose: () => void;
  onSelectNode: (type: string, theme: NodeTheme) => void;
}

interface NodeItemProps {
  type: string;
  theme: NodeTheme;
  onSelect: () => void;
}

function NodeItem({ type, theme, onSelect }: NodeItemProps) {
  const colors = getColorClasses(theme.color);
  const Icon = theme.icon;

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      className='flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-move group transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
      onClick={onSelect}
      draggable
      onDragStart={(event) => onDragStart(event, type)}
    >
      <div
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-transform group-hover:scale-105",
          colors.iconBg,
          colors.iconText,
        )}
      >
        <Icon className='w-5 h-5' />
      </div>
      <div className='flex-1 min-w-0'>
        <div className='flex items-center justify-between gap-1'>
          <span className='text-sm font-medium text-slate-700 dark:text-slate-200 truncate'>
            {theme.menuLabel}
          </span>
          {theme.needsDialog && (
            <Badge
              variant='outline'
              className='text-[9px] px-1 h-3.5 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'
            >
              配置
            </Badge>
          )}
        </div>
        {theme.menuDesc && (
          <p className='text-[11px] text-slate-500 dark:text-slate-400 truncate line-clamp-1'>
            {theme.menuDesc}
          </p>
        )}
      </div>
      <ChevronRight className='w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-colors' />
    </div>
  );
}

function MarketplaceItem() {
  return (
    <div className='mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/50'>
      <div className='flex items-center gap-2.5 p-2 rounded-lg bg-violet-50/50 dark:bg-violet-900/10 border border-violet-100/50 dark:border-violet-800/20 group cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors'>
        <div className='flex items-center justify-center w-9 h-9 rounded-lg bg-violet-600 text-white shrink-0'>
          <Store className='w-5 h-5' />
        </div>
        <div className='flex-1 min-w-0 pr-1'>
          <div className='flex items-center gap-1.5'>
            <span className='text-sm font-semibold text-violet-700 dark:text-violet-300'>
              节点市场
            </span>
            <span className='text-[9px] bg-violet-600 text-white px-1.5 py-0 rounded-full font-bold uppercase tracking-wider'>
              NEW
            </span>
          </div>
          <p className='text-[11px] text-violet-600/70 dark:text-violet-400/70 truncate'>
            探索更多第三方节点与工具...
          </p>
        </div>
        <ChevronRight className='w-4 h-4 text-violet-400 group-hover:translate-x-0.5 transition-transform' />
      </div>
    </div>
  );
}

const NODE_SUBCATEGORY_MAPPING: Record<string, string> = {
  llm: "基础",
  knowledge_retrieval: "基础",
  output: "基础",
  agent: "基础",
  question_classifier: "问题理解",
  condition: "逻辑",
  iteration: "逻辑",
  loop: "逻辑",
  code: "转换",
  template_transform: "转换",
  variable_aggregator: "转换",
  document_extractor: "转换",
  variable_assignment: "转换",
  parameter_extractor: "转换",
  http_request: "工具",
  list_operation: "工具",
};

const CATEGORY_ORDER = ["基础", "问题理解", "逻辑", "转换", "工具", "其它"];

export function AddNodePanel({
  open,
  onClose,
  onSelectNode,
}: AddNodePanelProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"node" | "tool" | "start">("node");

  const filteredNodes = useMemo(() => {
    const items = getVisibleNodesByTab(activeTab);
    if (!search) return items;
    return items.filter(
      ([, theme]) =>
        theme.menuLabel.toLowerCase().includes(search.toLowerCase()) ||
        theme.menuDesc?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [activeTab, search]);

  if (!open) return null;

  return (
    <div className='absolute right-4 top-4 bottom-4 w-[300px] z-50 flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-2xl dark:border-slate-800 overflow-hidden ring-1 ring-black/5'>
      {/* Header */}
      <div className='p-4 pb-2 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50'>
        <div className='flex items-center justify-between mb-3'>
          <div className='flex items-center gap-2'>
            <div className='p-1.5 bg-violet-100 dark:bg-violet-900/30 rounded-lg text-violet-600 dark:text-violet-400'>
              <Plus className='w-4 h-4' />
            </div>
            <h2 className='font-bold text-slate-800 dark:text-slate-100'>
              添加工作流节点
            </h2>
          </div>
          <button
            onClick={onClose}
            className='p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
          >
            <X className='w-4 h-4 text-slate-400' />
          </button>
        </div>

        <div className='relative'>
          <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='搜索节点类型或功能...'
            className='pl-9 h-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-violet-500 rounded-xl transition-all'
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v: any) => setActiveTab(v)}
        className='flex-1 flex flex-col min-h-0'
      >
        <div className='px-4 pt-3'>
          <TabsList className='grid grid-cols-3 w-full h-9 p-1 bg-slate-100 dark:bg-slate-800 shadow-inner rounded-xl'>
            <TabsTrigger
              value='node'
              className='text-[11px] font-semibold rounded-lg'
            >
              核心
            </TabsTrigger>
            <TabsTrigger
              value='tool'
              className='text-[11px] font-semibold rounded-lg'
            >
              工具
            </TabsTrigger>
            <TabsTrigger
              value='start'
              className='text-[11px] font-semibold rounded-lg'
            >
              触发器
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value={activeTab}
          className='flex-1 overflow-y-auto px-2 pb-3 mt-2 scrollbar-none'
        >
          <div className='flex flex-col gap-0.5 px-1'>
            {filteredNodes.length > 0 ? (
              activeTab === "node" ? (
                CATEGORY_ORDER.map((category) => {
                  const nodes = filteredNodes.filter(
                    ([type]) =>
                      (NODE_SUBCATEGORY_MAPPING[type] || "其它") === category,
                  );
                  if (nodes.length === 0) return null;

                  return (
                    <div
                      key={category}
                      className='mb-2 last:mb-0'
                    >
                      <div className='px-2 py-1.5 text-xs font-semibold text-slate-500/80 dark:text-slate-400/80'>
                        {category}
                      </div>
                      <div className='flex flex-col gap-0.5'>
                        {nodes.map(([type, theme]) => (
                          <NodeItem
                            key={type}
                            type={type}
                            theme={theme}
                            onSelect={() => onSelectNode(type, theme)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                filteredNodes.map(([type, theme]) => (
                  <NodeItem
                    key={type}
                    type={type}
                    theme={theme}
                    onSelect={() => onSelectNode(type, theme)}
                  />
                ))
              )
            ) : (
              <div className='flex flex-col items-center justify-center py-10 text-center px-4'>
                <div className='w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3'>
                  <Search className='w-6 h-6 text-slate-300' />
                </div>
                <p className='text-sm text-slate-400'>没有找到匹配的节点</p>
              </div>
            )}
            <MarketplaceItem />
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className='p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/50'>
        <div className='flex items-center gap-2 text-[10px] text-slate-400'>
          <Zap className='w-3 h-3 text-amber-500 animate-pulse' />
          <span>支持通过拖拽节点图标到画布中直接添加</span>
        </div>
      </div>
    </div>
  );
}
