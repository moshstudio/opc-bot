import { openai } from "@ai-sdk/openai";
import { vectorStore } from "./vector-store";

// Cache and current model name tracking
let localEmbedder: any = null;
let currentModelName: string = "";

async function getEmbedder(modelConfig?: any) {
  // 1. Default if no config provided
  const config = modelConfig || {
    provider: "openai",
    name: "text-embedding-3-small",
  };

  // 2. Handle Local Transformers.js
  if (config.provider === "transformers") {
    const modelName = config.name || "Xenova/bge-small-zh-v1.5";

    // If no embedder cached OR we switched to a different model name
    if (!localEmbedder || currentModelName !== modelName) {
      console.log(`[Transformers.js] 初始化模型: ${modelName}`);
      console.log(
        `[Transformers.js] 注意: 如果是首次使用，系统将自动从 Hugging Face 下载模型文件...`,
      );

      const { pipeline, env } = await import("@xenova/transformers");

      // 配置国内镜像源
      env.remoteHost = "https://hf-mirror.com";
      env.allowLocalModels = false; // 确保尝试从远程下载（如果本地没有）

      try {
        localEmbedder = await pipeline("feature-extraction", modelName);
        currentModelName = modelName;
        console.log(`[Transformers.js] 模型已就绪: ${modelName}`);
      } catch (err: any) {
        console.error(`[Transformers.js] 模型加载/下载失败: ${modelName}`, err);
        throw new Error(
          `本地 Embedding 模型 (${modelName}) 加载失败: ${err.message || "网络连接异常"}。提示：如果是首次运行，系统需要从 Hugging Face 下载约 100MB 模型文件，请确保网络通畅。`,
        );
      }
    }
    return {
      embed: async (text: string) => {
        const output = await localEmbedder(text, {
          pooling: "mean",
          normalize: true,
        });
        return Array.from(output.data) as number[];
      },
    };
  }

  // 3. Handle OpenAI
  const embedder = openai.embedding(config.name || "text-embedding-3-small");
  return {
    embed: async (text: string) => {
      const { embeddings } = await embedder.doEmbed({ values: [text] });
      return embeddings[0];
    },
  };
}

/**
 * 这是一个增强的 RAG 实现，支持动态配置 Embedding 模型
 */
export const rag = {
  /**
   * 索引文档（支持单分片或多分片批量索引）
   */
  index: async ({ connection, entity, entities, modelConfig }: any) => {
    const embedder = await getEmbedder(modelConfig);
    const items = entities || (entity ? [entity] : []);

    if (items.length === 0) return;

    // 批量生成向量
    const vectors = await Promise.all(
      items.map(async (item: any) => {
        const vector = await embedder.embed(item.content);
        return {
          id: item.id,
          vector: vector,
          content: item.content,
          metadata: item.metadata,
        };
      }),
    );

    await vectorStore.upsert({
      indexName: connection.indexName || "default_index",
      vectors,
    });
  },

  /**
   * 调用检索
   */
  retrieve: async ({ connection, query, topK = 3, modelConfig }: any) => {
    const embedder = await getEmbedder(modelConfig);
    const vector = await embedder.embed(query);

    const results = await vectorStore.query({
      indexName: connection.indexName || "default_index",
      queryVector: vector,
      topK,
    });

    return results;
  },

  /**
   * 删除索引
   */
  delete: async ({ connection, id }: any) => {
    await vectorStore.delete({
      indexName: connection.indexName || "default_index",
      id,
    });
  },
};
