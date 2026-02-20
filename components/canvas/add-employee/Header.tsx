import { UserPlus } from "lucide-react";
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
      className={`relative px-6 pt-6 pb-4 bg-gradient-to-br ${
        color || "from-violet-500 to-purple-600"
      } transition-all duration-500`}
    >
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wOCkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IGZpbGw9InVybCgjYSkiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiLz48L3N2Zz4=')] opacity-50" />
      <DialogHeader className='relative z-10'>
        <div className='flex items-center gap-3 mb-1'>
          <div className='p-2 bg-white/20 backdrop-blur-sm rounded-xl text-xl'>
            <UserPlus className='h-5 w-5 text-white' />
          </div>
          <DialogTitle className='text-xl font-bold text-white tracking-tight'>
            添加新员工
          </DialogTitle>
        </div>
        <DialogDescription className='text-white/70 text-sm pl-[3.25rem]'>
          创建一个新的 AI 员工，创建后可在工作流画布中编辑。
        </DialogDescription>
      </DialogHeader>
    </div>
  );
}
