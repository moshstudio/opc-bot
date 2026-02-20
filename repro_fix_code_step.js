const { z } = require("zod");

async function test() {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

  const code = `
    async function main({ summary, items }) {
      return { 
        result: 'Summary: ' + summary + ', Items: ' + items 
      };
    }
  `;

  const inputData = {
    code,
    input: "some input",
    variables: {
      summary: "My Summary",
      items: ["Item 1", "Item 2"],
    },
  };

  const context = {
    input: inputData.input,
    vars: inputData.variables || {},
  };

  try {
    const fn = new AsyncFunction(
      "context",
      `
        const { input, vars } = context;
        
        ${inputData.code}
        
        if (typeof main === 'function') {
          // PROPOSED FIX: Spread vars into the context
          return await main({ ...vars, input, vars });
        }
        return undefined;
        `,
    );

    const result = await fn(context);
    console.log("Result with proposed fix:", result);
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
