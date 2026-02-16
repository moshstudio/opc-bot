"use client";

import { useState, useEffect } from "react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { getOrCreateCompany } from "@/app/actions/company-actions";
import {
  createEmployee,
  getEmployees,
  updateEmployee,
  deleteEmployee,
} from "@/app/actions/employee-actions";

import {
  EmployeeListPanel,
  EmployeeItem,
} from "@/components/canvas/EmployeeListPanel";
import { EmployeeEditorPanel } from "@/components/canvas/EmployeeEditorPanel";
import { AddEmployeeDialog } from "@/components/canvas/AddEmployeeDialog";

import { Loader2, Users } from "lucide-react";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeItem | null>(
    null,
  );
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // ----- Data fetching -----
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const companyRes = await getOrCreateCompany();
        if (!companyRes.success || !companyRes.company) {
          console.error("Failed to get company");
          setLoading(false);
          return;
        }
        const cId = companyRes.company.id;
        setCompanyId(cId);

        const res = await getEmployees(cId);
        if (res.success && res.employees) {
          setEmployees(
            res.employees.map((emp: any) => ({
              id: emp.id,
              name: emp.name,
              role: emp.role,
              status: emp.status,
              config: emp.config,
              workflow: emp.workflow,
              permissions: emp.permissions,
              isActive: emp.isActive, // Added isActive to mapping
              linkedFrom: emp.linkedFrom,
              linkedTo: emp.linkedTo,
            })),
          );
        }
      } catch (err) {
        console.error("Init error:", err);
      }
      setLoading(false);
    };
    init();
  }, []);

  // ----- CRUD handlers -----
  const handleAddEmployee = async (data: {
    name: string;
    role: string;
    prompt?: string;
    model?: string;
    modelName?: string;
    modelConfig?: any;
    workflow?: any;
  }) => {
    if (!companyId) return;

    const config = {
      model: data.model || "gpt-4o",
      modelName: data.modelName,
      modelConfig: data.modelConfig,
      prompt: data.prompt || "",
      temperature: 0.7,
    };

    const tempId = nanoid();
    const newEmp: EmployeeItem = {
      id: tempId,
      name: data.name,
      role: data.role,
      status: "idle",
      config: JSON.stringify(config),
      workflow: data.workflow ? JSON.stringify(data.workflow) : undefined,
    };
    setEmployees((prev) => [...prev, newEmp]);

    const res = await createEmployee({
      name: data.name,
      role: data.role,
      companyId,
      config,
      workflow: data.workflow,
    });

    if (res.success && res.employee) {
      setEmployees((prev) =>
        prev.map((e) => (e.id === tempId ? { ...e, id: res.employee!.id } : e)),
      );
      toast.success(`员工「${data.name}」已创建`);

      // Auto-select the new employee to show workflow editor
      setSelectedEmployee({
        ...newEmp,
        id: res.employee.id,
      });
    } else {
      setEmployees((prev) => prev.filter((e) => e.id !== tempId));
      toast.error("创建员工失败");
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    const original = employees;
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    if (selectedEmployee?.id === id) setSelectedEmployee(null);
    toast.success("员工已删除");

    const res = await deleteEmployee(id);
    if (!res.success) {
      setEmployees(original);
      toast.error("删除失败");
    }
  };

  const handleDuplicateEmployee = async (emp: EmployeeItem) => {
    if (!companyId) return;

    let config: any = {};
    try {
      if (emp.config) config = JSON.parse(emp.config);
    } catch {}

    const newName = `${emp.name} (副本)`;
    const tempId = nanoid();
    const newEmp: EmployeeItem = {
      id: tempId,
      name: newName,
      role: emp.role,
      status: "idle",
      config: emp.config,
      workflow: emp.workflow,
      permissions: emp.permissions,
    };
    setEmployees((prev) => [...prev, newEmp]);
    toast.success("员工已复制");

    const res = await createEmployee({
      name: newName,
      role: emp.role,
      companyId,
      config,
      workflow: emp.workflow ? JSON.parse(emp.workflow) : undefined,
      permissions: emp.permissions ? JSON.parse(emp.permissions) : undefined,
    });

    if (res.success && res.employee) {
      setEmployees((prev) =>
        prev.map((e) => (e.id === tempId ? { ...e, id: res.employee!.id } : e)),
      );
    } else {
      setEmployees((prev) => prev.filter((e) => e.id !== tempId));
      toast.error("复制员工失败");
    }
  };

  const handleUpdateEmployee = (updatedEmp: any) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === updatedEmp.id ? { ...e, ...updatedEmp } : e)),
    );
    if (selectedEmployee?.id === updatedEmp.id) {
      setSelectedEmployee((prev) => (prev ? { ...prev, ...updatedEmp } : null));
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    // Optimistic update
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isActive: active } : e)),
    );
    if (selectedEmployee?.id === id) {
      setSelectedEmployee((prev) =>
        prev ? { ...prev, isActive: active } : null,
      );
    }

    const res = await updateEmployee(id, { isActive: active });
    if (!res.success) {
      toast.error("更新状态失败");
      // Rollback
      const res2 = await getEmployees(companyId!);
      if (res2.success && res2.employees) {
        setEmployees(
          res2.employees.map((emp: any) => ({
            id: emp.id,
            name: emp.name,
            role: emp.role,
            status: emp.status,
            config: emp.config,
            workflow: emp.workflow,
            permissions: emp.permissions,
            isActive: emp.isActive,
            linkedFrom: emp.linkedFrom,
            linkedTo: emp.linkedTo,
          })),
        );
      }
    } else {
      toast.success(active ? "员工已启用" : "员工已禁用");
    }
  };

  // All employees for sub-employee linking
  const allEmployeesSimple = employees.map((e) => ({
    id: e.id,
    name: e.name,
    role: e.role,
  }));

  if (loading) {
    return (
      <div className='w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950'>
        <div className='text-center space-y-4'>
          <Loader2 className='w-8 h-8 text-violet-500 animate-spin mx-auto' />
          <p className='text-sm text-slate-500'>加载员工数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='w-full h-full relative overflow-hidden bg-slate-50 dark:bg-slate-950'>
      {/* Background effects */}
      <div className='absolute inset-0 pointer-events-none overflow-hidden'>
        <div className='absolute top-[-10%] left-[-10%] w-[35%] h-[35%] bg-violet-500/5 blur-[120px] rounded-full animate-pulse' />
        <div className='absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full animate-pulse delay-700' />
      </div>

      <div className='relative flex h-full'>
        {/* Left: Employee List */}
        <div className='w-[280px] flex-shrink-0 z-10'>
          <EmployeeListPanel
            employees={employees}
            selectedId={selectedEmployee?.id}
            onSelect={setSelectedEmployee}
            onAdd={() => setAddDialogOpen(true)}
            onDelete={handleDeleteEmployee}
            onDuplicate={handleDuplicateEmployee}
            onToggleActive={handleToggleActive}
          />
        </div>

        {/* Right: Editor / Empty State */}
        <div className='flex-1 min-w-0'>
          {selectedEmployee ? (
            <EmployeeEditorPanel
              key={selectedEmployee.id}
              employee={selectedEmployee}
              allEmployees={allEmployeesSimple}
              onClose={() => setSelectedEmployee(null)}
              onUpdate={handleUpdateEmployee}
            />
          ) : (
            <div className='h-full flex items-center justify-center'>
              <div className='text-center space-y-5 max-w-[320px]'>
                <div className='relative inline-block'>
                  <div className='p-5 bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/20 dark:to-purple-900/20 rounded-3xl'>
                    <Users className='w-12 h-12 text-violet-500/60' />
                  </div>
                  <div className='absolute inset-0 bg-violet-400/10 blur-3xl rounded-full' />
                </div>
                <div className='space-y-2'>
                  <h2 className='text-xl font-bold text-slate-800 dark:text-slate-200 tracking-tight'>
                    工作流管理中心
                  </h2>
                  <p className='text-sm text-slate-500 leading-relaxed'>
                    从左侧选择一个员工编辑其工作流，或创建一个新员工开始构建你的
                    AI 团队。每个员工都可以配置独立的工作流。
                  </p>
                </div>
                <button
                  onClick={() => setAddDialogOpen(true)}
                  className='inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]'
                >
                  <Users className='w-4 h-4' />
                  创建新员工
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Employee Dialog */}
      <AddEmployeeDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddEmployee}
      />
    </div>
  );
}
