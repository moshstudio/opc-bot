import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Braces } from "lucide-react";
import { cn } from "@/lib/utils";

interface VariablePickerProps {
  onSelect: (variable: { value: string; label: string }) => void;
  upstreamVariables: { label: string; value: string; group: string }[];
  className?: string;
  align?: "start" | "end" | "center";
}

export function VariablePicker({
  onSelect,
  upstreamVariables,
  className,
  align = "end",
}: VariablePickerProps) {
  // Group variables by their group name (Node Label)
  const groupedVars = upstreamVariables.reduce(
    (acc, v) => {
      if (!acc[v.group]) acc[v.group] = [];
      acc[v.group].push(v);
      return acc;
    },
    {} as Record<string, typeof upstreamVariables>,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='sm'
          className={cn(
            "h-5 w-5 p-0 text-slate-400 hover:text-violet-600 rounded-md",
            className,
          )}
        >
          <Braces className='w-3 h-3' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className='max-h-[300px] overflow-y-auto w-[240px] p-1'
      >
        <DropdownMenuLabel className='text-[10px] text-slate-400 uppercase tracking-wider px-2 py-1.5'>
          插入变量
        </DropdownMenuLabel>

        {/* System Variables */}
        <DropdownMenuGroup>
          <div className='px-2 py-1 text-[10px] font-semibold text-slate-500 bg-slate-50 dark:bg-slate-900 mx-1 rounded'>
            系统变量
          </div>
          <DropdownMenuItem
            className='text-xs cursor-pointer'
            onClick={() => onSelect({ value: "input", label: "原始输入" })}
          >
            <span className='font-mono text-emerald-600 mr-2'>
              {"{{input}}"}
            </span>
            用户输入
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Upstream Variables */}
        {Object.entries(groupedVars).map(([group, vars]) => (
          <DropdownMenuGroup key={group}>
            <div className='px-2 py-1 mt-1 text-[10px] font-semibold text-slate-500 bg-slate-50 dark:bg-slate-900 mx-1 rounded truncate'>
              {group}
            </div>
            {vars.map((v) => (
              <DropdownMenuItem
                key={v.value}
                className='text-xs cursor-pointer flex items-center justify-between'
                onClick={() => onSelect(v)}
              >
                <div className='flex flex-col truncate max-w-[180px]'>
                  <span>{v.label}</span>
                  <span className='text-[10px] text-slate-400 font-mono truncate'>
                    {`{{${v.value.split("-")[0]}...}}`}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}

        {upstreamVariables.length === 0 && (
          <div className='p-4 text-center text-[10px] text-slate-400 italic'>
            没有可用的上游变量
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
