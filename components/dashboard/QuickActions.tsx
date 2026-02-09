import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Users, ListTodo, FileText } from "lucide-react";
import Link from "next/link";

export function QuickActions() {
  return (
    <Card className='col-span-3'>
      <CardHeader>
        <CardTitle>快捷操作</CardTitle>
      </CardHeader>
      <CardContent className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Link href='/dashboard/employees'>
          <Button
            variant='outline'
            className='w-full h-24 flex flex-col gap-2'
          >
            <Users className='h-6 w-6' />
            管理员工
          </Button>
        </Link>
        <Link href='/dashboard/tasks'>
          <Button
            variant='outline'
            className='w-full h-24 flex flex-col gap-2'
          >
            <ListTodo className='h-6 w-6' />
            管理任务
          </Button>
        </Link>
        <Button
          variant='outline'
          className='w-full h-24 flex flex-col gap-2'
          disabled
        >
          <PlusCircle className='h-6 w-6' />
          创建项目 (开发中)
        </Button>
        <Link href='/dashboard/knowledge'>
          <Button
            variant='outline'
            className='w-full h-24 flex flex-col gap-2'
          >
            <FileText className='h-6 w-6' />
            知识库
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
