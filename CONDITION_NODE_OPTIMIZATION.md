# Condition Node Optimization Plan

## Objective

Optimize the Condition node to correctly identify output fields from previous nodes, support multiple condition judgments with AND/OR logic, and provide a user-friendly configuration interface.

## 1. Data Structure Changes

Modify the `Condition` node data structure to support a group of conditions instead of a single check.

### Old Structure

```typescript
interface ConditionNodeData {
  conditionType: string;
  conditionValue: string;
  conditionVariable?: string; // Sometimes used, not exposed in UI previously
}
```

### New Structure

```typescript
interface ConditionItem {
  id: string;
  variable: string; // e.g. "node-1" or "node-1.summary"
  operator:
    | "contains"
    | "equals"
    | "not_equals"
    | "gt"
    | "lt"
    | "ge"
    | "le"
    | "matches_regex"
    | "is_empty"
    | "is_not_empty";
  value: string; // The comparison value
}

interface ConditionNodeData {
  logicalOperator: "AND" | "OR";
  conditions: ConditionItem[];
}
```

## 2. Frontend Implementation (`NodeDetailsPanel.tsx`)

### Variable Selector

- Unlike `variable_aggregator` which selects whole nodes, this selector will dive into node outputs.
- **Source**: Traverse upstream nodes (connected via edges).
- **Schema Parsing**:
  - If node has `outputSchema`, parse it to find fields.
  - Generates options like `{{NodeName.FieldName}}` (machine name: `nodeId.field`).
  - Fallback: Allow selecting the whole node output `{{NodeName}}` (machine name: `nodeId`).

### Condition Builder UI

- **List View**: Show added conditions.
- **Row Component**:
  1. **Variable**: Select from upstream variables.
  2. **Operator**: Dropdown (Equals, Contains, >, <, etc.).
  3. **Value**: Input field (text/number).
- **Group Logic**: Toggle between "Match ALL (AND)" and "Match ANY (OR)".

## 3. Backend Implementation (`node-executors.ts`)

### `conditionExecutor` Update

- **Logic**:
  1. Retrieve `conditions` list and `logicalOperator`.
  2. Iterate through conditions.
  3. For each condition:
     - **Variable Resolution**: Support dot notation (e.g. `nodeId.field`).
       - Fetch `nodeId` output from `context.variables`.
       - If output is JSON string, parse it.
       - Extract `field`.
     - **Comparison**: Execute the operator logic.
  4. Aggregate results using `logicalOperator` (AND = `results.every()`, OR = `results.some()`).
  5. Return `"true"` or `"false"`.

## 4. Backwards Compatibility

- The executor will check if `conditions` array exists.
- If not, it falls back to the legacy `conditionType`/`conditionValue` logic.

## 5. User Workflow

1. User connects Node A -> Condition Node.
2. User opens Condition Node.
3. Clicks "Add Condition".
4. Selects Node A's output "summary".
5. Sets Operator "Contains".
6. Enters Value "Error".
7. Saves.
