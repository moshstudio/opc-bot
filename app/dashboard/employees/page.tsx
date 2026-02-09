"use client";

import { useState } from "react";
import { EmployeeCanvas } from "@/components/canvas/EmployeeCanvas";
import { EmployeeDetailPanel } from "@/components/canvas/EmployeeDetailPanel";

export default function EmployeesPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  return (
    <div className='w-full h-full relative'>
      <EmployeeCanvas
        onNodeClick={(node) =>
          setSelectedEmployee({
            id: node.id,
            label: node.data.label,
            role: node.data.role,
            status: node.data.status,
          })
        }
      />

      {selectedEmployee && (
        <EmployeeDetailPanel
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
}
