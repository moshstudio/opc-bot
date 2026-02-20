import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";

/**
 * 代码执行 Step
 * 支持 JavaScript (Node.js vm) 和 Python (通过 python 命令)
 */
export const codeStep = createStep({
  id: "code_execution",
  inputSchema: z.object({
    code: z.string(),
    language: z.enum(["javascript", "python"]).optional().default("javascript"),
    input: z.any(),
    variables: z.record(z.string()).optional(),
    companyId: z.string().optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const language = inputData.language || "javascript";
    const context = {
      input: inputData.input,
      vars: inputData.variables || {},
    };

    if (language === "python") {
      return await executePython(inputData.code, context);
    } else {
      return await executeJavascript(inputData.code, context);
    }
  },
});

// ... (previous imports)
import vm from "node:vm";

// ... (codeStep definition)

/**
 * 安全执行 JavaScript
 * 使用 Node.js VM 模块进行上下文隔离和超时控制
 */
async function executeJavascript(code: string, context: any) {
  try {
    // 1. 创建沙盒上下文
    // 只暴露必要的全局对象，屏蔽 process, require 等危险对象
    const sandbox = {
      console: {
        log: (...args: any[]) => console.log("[Sandbox]", ...args),
        error: (...args: any[]) => console.error("[Sandbox]", ...args),
        warn: (...args: any[]) => console.warn("[Sandbox]", ...args),
      },
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      context, // 用户的输入和变量
    };

    vm.createContext(sandbox);

    // 2. 包装用户代码
    // 将用户代码包装在一个 async 函数中，以便支持 await 和返回值
    // 同时兼容 callback 风格或直接 return 风格
    const wrappedCode = `
      (async () => {
        const { input, vars } = context;
        
        // --- 用户代码开始 ---
        ${code}
        // --- 用户代码结束 ---

        // 检查 main 函数
        if (typeof main === 'function') {
           return await main({ ...vars, input, vars });
        }
        
        return undefined;
      })()
    `;

    // 3. 执行代码
    // timeout: 5000ms 防止死循环
    const result = await vm.runInContext(wrappedCode, sandbox, {
      timeout: 5000,
      displayErrors: true,
    });

    return { output: result };
  } catch (error: any) {
    console.error("[Step:code_execution] JS Virtual Machine Error:", error);
    throw new Error(`JavaScript execution failed: ${error.message}`);
  }
}
// ... (executePython definition)

async function executePython(code: string, context: any) {
  let tmpFilePath = "";
  try {
    // 1. 构造 Python 包装脚本
    const wrapperScript = `
import json
import sys
import io

# 设置标准输入输出编码为 UTF-8
sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# --- 用户代码开始 ---
${code}
# --- 用户代码结束 ---

def _mastra_runner():
    try:
        # 从 stdin 读取上下文
        input_str = sys.stdin.read()
        if not input_str:
            ctx = {"input": {}, "vars": {}}
        else:
            ctx = json.loads(input_str)

        input_val = ctx.get("input")
        vars_val = ctx.get("vars", {})

        # 检查是否定义了 main 函数
        if "main" in globals() and callable(globals()["main"]):
            try:
                # 调用 main 函数，传入 input 和 vars
                # 假设用户定义的 main 签名为: def main(input, vars):
                res = main(input=input_val, vars=vars_val)
                
                # 输出结果，使用特殊标记包裹以方便解析
                print("<<MASTRA_OUTPUT>>")
                print(json.dumps(res, ensure_ascii=False))
                print("<<MASTRA_OUTPUT_END>>")
            except Exception as e:
                 sys.stderr.write(f"Execution Error: {str(e)}")
                 sys.exit(1)
        else:
            sys.stderr.write("Execution Error: 'main' function not found. Please define 'def main(input, vars):'.")
            sys.exit(1)

    except Exception as e:
        sys.stderr.write(f"Runner Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    _mastra_runner()
`;

    // 2. 写入临时文件
    const tmpDir = os.tmpdir();
    // 使用随机文件名避免冲突
    const fileName = `mastra_py_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}.py`;
    tmpFilePath = path.join(tmpDir, fileName);

    await fs.writeFile(tmpFilePath, wrapperScript, "utf-8");

    // 3. 执行 Python 脚本
    // 假设 python 命令在环境变量中可用 (Windows/Linux/Mac)
    // 也可以尝试 'python3' 如果 'python' 失败，但这增加了复杂性。
    // 在这里我们默认使用 'python'。
    return await new Promise((resolve, reject) => {
      const pythonProcess = spawn("python", [tmpFilePath]);

      let stdoutData = "";
      let stderrData = "";

      pythonProcess.stdout.on("data", (data) => {
        stdoutData += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        stderrData += data.toString();
      });

      pythonProcess.on("close", (code) => {
        // 删除临时文件
        fs.unlink(tmpFilePath).catch(() => {});

        if (code !== 0) {
          console.error(
            "[Step:code_execution] Python process exited with code:",
            code,
            "stderr:",
            stderrData,
          );
          reject(new Error(`Python execution failed: ${stderrData}`));
          return;
        }

        try {
          // 解析输出
          const startMarker = "<<MASTRA_OUTPUT>>";
          const endMarker = "<<MASTRA_OUTPUT_END>>";
          const startIndex = stdoutData.indexOf(startMarker);
          const endIndex = stdoutData.indexOf(endMarker);

          if (startIndex === -1 || endIndex === -1) {
            // 只有当没有标记时，看看是否整个输出就是 JSON (如果用户代码没打印任何东西)
            // 但我们的 wrapper 保证了会打印标记
            // 如果没找到标记，可能是 main 没执行完就退出了？或者 print 异常
            // 尝试直接解析看看 (fallback)
            try {
              const res = JSON.parse(stdoutData.trim());
              resolve({ output: res });
              return;
            } catch {
              reject(
                new Error(
                  `Invalid output format from Python script. Stdout: ${stdoutData}`,
                ),
              );
              return;
            }
          }

          const jsonStr = stdoutData
            .substring(startIndex + startMarker.length, endIndex)
            .trim();
          const result = JSON.parse(jsonStr);
          resolve({ output: result });
        } catch (error: any) {
          reject(
            new Error(
              `Failed to parse Python result: ${error.message}. Stdout: ${stdoutData}`,
            ),
          );
        }
      });

      pythonProcess.on("error", (err) => {
        fs.unlink(tmpFilePath).catch(() => {});
        reject(new Error(`Failed to spawn python process: ${err.message}`));
      });

      // 4. 写入 input context 到 stdin
      try {
        pythonProcess.stdin.write(JSON.stringify(context));
        pythonProcess.stdin.end();
      } catch (err: any) {
        reject(new Error(`Failed to write to python stdin: ${err.message}`));
      }
    });
  } catch (error: any) {
    // 确保清理临时文件
    if (tmpFilePath) fs.unlink(tmpFilePath).catch(() => {});
    console.error("[Step:code_execution] Python Error:", error);
    throw error;
  }
}
