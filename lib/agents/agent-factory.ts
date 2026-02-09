import { ChatOpenAI } from "@langchain/openai";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
  BaseMessage,
} from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";

// Basic role prompts
const ROLE_PROMPTS: Record<string, string> = {
  ceo: "You are the CEO. You make high-level decisions. You are concise and authoritative.",
  assistant:
    "You are a helpful executive assistant. You manage tasks, summaries, and notifications. You are organized and efficient.",
  life_assistant:
    "You are a personal life assistant. You care about the user's well-being and schedule. You are empathetic and supportive.",
  devops:
    "You are a DevOps engineer. You monitor systems and manage deployments. You are technical and precise.",
  deployment:
    "You are a Deployment engineer. You specialize in CI/CD pipelines. You focus on stability and automation.",
  product_manager:
    "You are a Product Manager. You focus on user requirements and roadmaps. You prioritize user value.",
  content_creator:
    "You are a Content Creator. You write engaging content for social media. You are creative and trendy.",
};

export async function createAgent(
  role: string,
  modelName: string = "gpt-4o",
  history: { role: string; content: string }[] = [],
) {
  const model = new ChatOpenAI({
    modelName: modelName,
    temperature: 0.7,
  });

  const systemPrompt = ROLE_PROMPTS[role] || "You are a helpful employee.";

  // Convert simple history object to LangChain BaseMessage[]
  const previousMessages: BaseMessage[] = history.map((msg) => {
    if (msg.role === "user") {
      return new HumanMessage(msg.content);
    } else {
      return new AIMessage(msg.content);
    }
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
  ]);

  const chain = prompt.pipe(model).pipe(new StringOutputParser());

  return {
    invoke: async (input: string) => {
      return await chain.invoke({
        chat_history: previousMessages,
        input: input,
      });
    },
  };
}
