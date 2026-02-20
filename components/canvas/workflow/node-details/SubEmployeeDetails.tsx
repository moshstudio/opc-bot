import React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NodeDetailContentProps } from "./types";

export const SubEmployeeDetails: React.FC<NodeDetailContentProps> = ({
  formData,
  setFormData,
  allEmployees,
}) => {
  return (
    <div className='space-y-2'>
      <Label>选择员工</Label>
      <Select
        value={formData.linkedEmployeeId || ""}
        onValueChange={(v) => {
          const emp = allEmployees.find((e) => e.id === v);
          if (emp) {
            setFormData((prev: any) => ({
              ...prev,
              linkedEmployeeId: v,
              employeeName: emp.name,
              employeeRole: emp.role,
              label: emp.name,
            }));
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder='选择员工' />
        </SelectTrigger>
        <SelectContent>
          {allEmployees.map((emp) => (
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
  );
};
