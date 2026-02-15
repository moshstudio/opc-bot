import { LanceVectorStore } from "@mastra/lance";
import path from "path";

const dbPath = path.resolve(process.cwd(), "./data/mastra/vectors");

/**
 * 获取 LanceVectorStore 实例
 * 注意：参考文档，LanceVectorStore 内部使用 create 静态方法初始化。
 */
export async function getVectorStore() {
  return await LanceVectorStore.create(dbPath);
}

/**
 * 封装向量存储操作，统一接口
 */
export const vectorStore = {
  /**
   * 插入或更新向量数据
   */
  upsert: async ({
    indexName,
    vectors,
  }: {
    indexName: string;
    vectors: any[];
  }) => {
    const store = await getVectorStore();

    // 根据 Mastra 实战经验，upsert 接收核心的 vectors 和 metadata 等
    return await store.upsert({
      indexName,
      vectors: vectors.map((v) => v.vector),
      metadata: vectors.map((v) => ({
        content: v.content,
        ...v.metadata,
      })),
      ids: vectors.map((v) => v.id),
    });
  },

  /**
   * 查询向量
   */
  query: async ({
    indexName,
    queryVector,
    topK,
  }: {
    indexName: string;
    queryVector: number[];
    topK: number;
  }) => {
    const store = await getVectorStore();
    return await store.query({
      indexName,
      queryVector: queryVector,
      topK,
    });
  },

  /**
   * 删除向量 (支持通过 ID 或 metadata 过滤)
   */
  delete: async ({
    indexName,
    id,
    filter,
  }: {
    indexName: string;
    id?: string;
    filter?: any;
  }) => {
    const store = await getVectorStore();

    if (typeof (store as any).delete === "function") {
      return await (store as any).delete({
        indexName,
        filters: filter || { id },
      });
    }

    console.warn(
      "LanceVectorStore delete not fully supported in current wrapper",
    );
  },
};
