import React from "react";
import { CronConfigurator } from "../CronConfigurator";
import { NodeDetailContentProps } from "./types";

export const CronTriggerDetails: React.FC<NodeDetailContentProps> = ({
  formData,
  setFormData,
}) => {
  return (
    <div className='space-y-6'>
      <CronConfigurator
        data={formData}
        onChange={(updates) => setFormData({ ...formData, ...updates })}
      />

      <div className='p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed italic'>
        💡 定时触发器不产生输出变量，但会更新系统周期性变量{" "}
        <code className='bg-amber-100 dark:bg-amber-900/50 px-1 rounded font-mono'>
          sys.timestamp
        </code>
        。
      </div>
    </div>
  );
};
