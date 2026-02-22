import { Node } from "@xyflow/react";

export interface UpstreamVariable {
  label: string;
  value: string;
  group: string;
  type?: string;
}

export interface NodeDetailContentProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleChange: (key: string, value: any) => void;
  upstreamVariables: UpstreamVariable[];
  upstreamNodeIds: string[];
  nodes: Node[];
  allEmployees: { id: string; name: string; role: string }[];
  models: { id: string; name: string; provider: string; category: string }[];
}
