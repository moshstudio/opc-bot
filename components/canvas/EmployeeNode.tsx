import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge"; // Need to add badge? I'll use simple div if not available or add it.
import { User, Server, Bot, PenTool } from "lucide-react";

// Map roles to icons
const roleIcons = {
  active: User, // Check schema roles
  assistant: Bot,
  devops: Server,
  product_manager: PenTool,
  default: User,
};

function EmployeeNode({
  data,
}: {
  data: { label: string; role?: string; status?: string };
}) {
  const Icon =
    roleIcons[data.role as keyof typeof roleIcons] || roleIcons.default;

  return (
    <Card className='w-48 shadow-lg border-2'>
      <Handle
        type='target'
        position={Position.Top}
        className='w-3 h-3 bg-muted-foreground'
      />
      <CardHeader className='p-3 pb-0'>
        <CardTitle className='text-sm font-medium flex items-center gap-2'>
          <Icon className='w-4 h-4' />
          {data.label}
        </CardTitle>
      </CardHeader>
      <CardContent className='p-3 pt-2 text-xs text-muted-foreground'>
        <div className='flex flex-col gap-1'>
          <span>Role: {data.role || "Employee"}</span>
          <span>Status: {data.status || "Idle"}</span>
        </div>
      </CardContent>
      <Handle
        type='source'
        position={Position.Bottom}
        className='w-3 h-3 bg-muted-foreground'
      />
    </Card>
  );
}

export default memo(EmployeeNode);
