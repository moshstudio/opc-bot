import { UserPlus, Sparkles } from "lucide-react";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface HeaderProps {
  color?: string;
}

export function Header({ color }: HeaderProps) {
  return (
    <div
      className={`relative px-6 py-4 bg-gradient-to-br ${
        color || "from-violet-600 to-indigo-700"
      } transition-all duration-700 ease-in-out overflow-hidden`}
    >
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xNSkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IGZpbGw9InVybCgjYSkiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiLz48L3N2Zz4=')] opacity-40 mix-blend-overlay" />

      <DialogHeader className='relative z-10'>
        <div className='flex items-center gap-3'>
          <div className='flex items-center justify-center w-9 h-9 bg-white/15 backdrop-blur-md rounded-xl text-white border border-white/20 transform transition-transform hover:scale-110 duration-500'>
            <UserPlus className='h-4.5 w-4.5' />
          </div>
          <div>
            <DialogTitle className='text-lg font-bold text-white tracking-tight flex items-center gap-2'>
              添加新员工
              <Sparkles className='h-3.5 w-3.5 text-amber-300 animate-bounce' />
            </DialogTitle>
            <DialogDescription className='text-white/80 text-xs font-medium'>
              招募具备专业技能的 AI 助手
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
    </div>
  );
}
