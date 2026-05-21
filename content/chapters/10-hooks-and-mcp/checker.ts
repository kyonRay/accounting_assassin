import type { CheckerFn } from "@/modules/Checker";
import type { VirtualFs } from "@/modules/Sandbox/virtual-fs";

// env shape this checker depends on
interface Ch10Env {
  fs: VirtualFs;
}

export const check: CheckerFn = async (env) => {
  const fs = (env as unknown as Ch10Env).fs;
  if (!fs) {
    return {
      passed: false,
      hints: ["环境状态异常，试试刷新页面后重新开始。"],
    };
  }

  const mechanismsUnderstood = await fs.exists(
    ".progress/three-mechanisms-understood",
  );
  const hookInstalled = await fs.exists(".progress/hook-installed");
  const hookVerified = await fs.exists(".progress/hook-verified");
  const mcpInstalled = await fs.exists(".progress/sqlite-mcp-installed");
  const mcpQueryTried = await fs.exists(".progress/mcp-query-tried");

  if (
    mechanismsUnderstood &&
    hookInstalled &&
    hookVerified &&
    mcpInstalled &&
    mcpQueryTried
  ) {
    return { passed: true };
  }

  // Build directional first-attempt hint
  const missing: string[] = [];
  if (!mechanismsUnderstood)
    missing.push(
      "先读完第一节，理解 Skill / Hook / MCP 三件事各自的触发方式和适用场景",
    );
  if (!hookInstalled)
    missing.push(
      "在 .claude/settings.local.json 里配置 PostToolUse hook（追加写日志那个示例）",
    );
  if (!hookVerified)
    missing.push(
      "让 Claude 对任意文件做一次编辑，然后检查 ~/accounting-learner/.edits.log 是否出现了新行",
    );
  if (!mcpInstalled)
    missing.push(
      "安装 SQLite MCP 服务器，并通过 claude mcp list 确认它已连接",
    );
  if (!mcpQueryTried)
    missing.push(
      "创建 accounting.db，用自然语言请求 Claude 执行 SELECT 查询，确认它通过 MCP 工具返回结果",
    );

  const firstHint =
    missing.length === 5
      ? [
          "五个步骤都还没完成。",
          "先读完 Skill/Hook/MCP 对比一节，",
          "再往 settings.local.json 里加 PostToolUse hook，",
          "触发一次编辑验证日志写入，",
          "然后安装 SQLite MCP，",
          "最后用自然语言让 Claude 查询数据库。",
        ].join("")
      : `还差：${missing.join("；")}。回到对应步骤，完成操作后点「我跑完了」。`;

  // Second-attempt hint: name the exact marker ids
  const missingIds: string[] = [];
  if (!mechanismsUnderstood) missingIds.push('"three-mechanisms-understood"');
  if (!hookInstalled) missingIds.push('"hook-installed"');
  if (!hookVerified) missingIds.push('"hook-verified"');
  if (!mcpInstalled) missingIds.push('"sqlite-mcp-installed"');
  if (!mcpQueryTried) missingIds.push('"mcp-query-tried"');

  const secondHint =
    `还未完成的步骤 id 是：${missingIds.join("、")}。` +
    "每个 RealStep 框底部的「我跑完了」按钮点下去之后才算完成。" +
    "如果操作已经做过了但没点按钮，请回去点一下。";

  // Third-attempt hint: suggest StuckButton
  const thirdHint =
    "如果五个「我跑完了」都点过了但校验还不通过，说明可能遇到了意外情况。" +
    "点右下角的「我卡住了」按钮，它会帮你诊断问题并给出下一步建议。";

  return { passed: false, hints: [firstHint, secondHint, thirdHint] };
};
