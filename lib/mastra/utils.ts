/**
 * 简单的文本分片工具
 * @param text 原始文本
 * @param chunkSize 分片大小 (字符数)
 * @param chunkOverlap 重叠大小 (字符数)
 */
export function splitText(
  text: string,
  chunkSize: number = 800,
  chunkOverlap: number = 150,
): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    // 如果不是最后一段，尽量在换行或标点处切割
    if (end < text.length) {
      const remainingText = text.slice(start, end + 50); // 多看50个字符找断点
      const lastNewline = remainingText.lastIndexOf("\n", chunkSize);
      const lastPeriod = remainingText.lastIndexOf("。", chunkSize);
      const lastPeriodEn = remainingText.lastIndexOf(". ", chunkSize);

      const breakPoint =
        lastNewline > chunkSize * 0.8
          ? lastNewline
          : lastPeriod > chunkSize * 0.8
            ? lastPeriod + 1
            : lastPeriodEn > chunkSize * 0.8
              ? lastPeriodEn + 1
              : chunkSize;

      end = start + breakPoint;
    }

    chunks.push(text.slice(start, end).trim());
    start = end - chunkOverlap;

    // 防止死循环或太小的分片影响质量
    if (start >= text.length - chunkOverlap / 2) break;
  }

  return chunks.filter((c) => c.length > 10); // 过滤掉太短的分片
}
