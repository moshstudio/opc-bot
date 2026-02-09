"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTask } from "@/app/actions/task-actions";
import { getEmployees } from "@/app/actions/employee-actions";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

interface CreateTaskDialogProps {
  companyId: string;
}

export function CreateTaskDialog({ companyId }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("unassigned");
  const [employees, setEmployees] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      getEmployees(companyId).then((res) => {
        if (res.success && res.employees) {
          setEmployees(res.employees);
        }
      });
    }
  }, [open, companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    await createTask({
      title,
      description,
      assignedToId: assignedTo,
      companyId,
    });

    setOpen(false);
    setTitle("");
    setDescription("");
    setAssignedTo("unassigned");
    router.refresh();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className='mr-2 h-4 w-4' /> 新建任务
      </Button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
      >
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>创建任务</DialogTitle>
            <DialogDescription>为您的 AI 团队添加新任务。</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit}
            className='grid gap-4 py-4'
          >
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label
                htmlFor='title'
                className='text-right'
              >
                标题
              </Label>
              <Input
                id='title'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className='col-span-3'
                placeholder='例如：研究市场趋势'
                required
              />
            </div>
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label
                htmlFor='description'
                className='text-right'
              >
                描述
              </Label>
              <Textarea
                id='description'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className='col-span-3'
                placeholder='任务详情...'
              />
            </div>
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label
                htmlFor='assignee'
                className='text-right'
              >
                分配给
              </Label>
              <Select
                value={assignedTo}
                onValueChange={setAssignedTo}
              >
                <SelectTrigger className='col-span-3'>
                  <SelectValue placeholder='选择员工' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='unassigned'>未分配</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem
                      key={emp.id}
                      value={emp.id}
                    >
                      {emp.name} ({emp.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type='submit'>创建任务</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
