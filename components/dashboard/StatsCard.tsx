import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  color?: string;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  color = "from-blue-500 to-indigo-500",
}: StatsCardProps) {
  return (
    <Card className='group relative overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 bg-white dark:bg-slate-900 rounded-2xl'>
      {/* Decorative gradient orb */}
      <div
        className={`absolute -right-6 -top-6 w-20 h-20 bg-gradient-to-br ${color} opacity-10 rounded-full blur-2xl group-hover:opacity-20 group-hover:scale-150 transition-all duration-500`}
      />
      <CardContent className='p-5'>
        <div className='flex items-start justify-between'>
          <div className='space-y-3'>
            <p className='text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500'>
              {title}
            </p>
            <div className='text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50'>
              {value}
            </div>
            {description && (
              <p className='text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed'>
                {description}
              </p>
            )}
          </div>
          <div
            className={`p-2.5 rounded-xl bg-gradient-to-br ${color} shadow-md`}
          >
            <Icon className='h-5 w-5 text-white' />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
