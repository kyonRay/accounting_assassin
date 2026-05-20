export interface FriendlyError {
  title: string;
  nextStep: string;
  technical: string;
}

export function mapErrorToFriendly(error: Error): FriendlyError {
  // Chapter not found:
  const notFoundMatch = error.message.match(/^Chapter not found:\s*(.+)$/);
  if (notFoundMatch) {
    return {
      title: "找不到这一章",
      nextStep: `章节 "${notFoundMatch[1]}" 不存在。可能是课程内容还没加载完,或这一章还没准备好。`,
      technical: error.message,
    };
  }

  // Generic fallback:
  return {
    title: "课程加载失败",
    nextStep: "可以试着切换到其他章节,或者重启 App。",
    technical: `${error.name}: ${error.message}`,
  };
}
