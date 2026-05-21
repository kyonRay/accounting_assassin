import type { CheckerFn } from "@/modules/Checker";
import type { VirtualFs } from "@/modules/Sandbox/virtual-fs";

// env shape this checker depends on
interface Ch13Env {
  fs: VirtualFs;
}

export const check: CheckerFn = async (env) => {
  const fs = (env as unknown as Ch13Env).fs;
  if (!fs) {
    return {
      passed: false,
      hints: ["环境状态异常，试试刷新页面后重新开始。"],
    };
  }

  const cursorInstalled = await fs.exists(".progress/cursor-installed");
  const cursorLoggedIn = await fs.exists(".progress/cursor-logged-in");
  const composerTried = await fs.exists(".progress/composer-tried");
  const atRefTried = await fs.exists(".progress/at-ref-tried");
  const backgroundAgentTried = await fs.exists(
    ".progress/background-agent-tried",
  );
  const toolChoiceUnderstood = await fs.exists(
    ".progress/tool-choice-understood",
  );

  if (
    cursorInstalled &&
    cursorLoggedIn &&
    composerTried &&
    atRefTried &&
    backgroundAgentTried &&
    toolChoiceUnderstood
  ) {
    return { passed: true };
  }

  // Build directional first-attempt hint
  const missing: string[] = [];
  if (!cursorInstalled)
    missing.push(
      "安装 Cursor（从 cursor.com 下载或 brew install --cask cursor），并在 Cursor 内安装 cursor CLI 命令到 PATH",
    );
  if (!cursorLoggedIn)
    missing.push("完成 Cursor 登录（通过 cursor.com 网页授权流程）");
  if (!composerTried)
    missing.push(
      "打开 Cursor Composer（Cmd+Shift+P → Open Composer），给它一个跨多文件的任务",
    );
  if (!atRefTried)
    missing.push(
      "在 Cursor 对话框里用 @ 符号引用一个具体文件（例如 @invoice_ocr.py），体验上下文精准锁定",
    );
  if (!backgroundAgentTried)
    missing.push(
      "启动一个 Cursor Background Agent，把一个耗时任务交给它异步运行",
    );
  if (!toolChoiceUnderstood)
    missing.push(
      "阅读 Part IV 综合对比：Claude Code vs Codex vs Cursor，建立三种工具的选择判断框架",
    );

  const firstHint =
    missing.length === 6
      ? [
          "六个步骤都还没完成。",
          "先安装 Cursor 并配置 CLI，",
          "登录账号，",
          "然后依次体验 Composer 多文件编辑、@ 引用、Background Agent，",
          "最后读完三工具对比完成 Part IV 综合。",
        ].join("")
      : `还差：${missing.join("；")}。回到对应步骤，完成操作后点「我跑完了」。`;

  // Second-attempt hint: name the exact marker ids
  const missingIds: string[] = [];
  if (!cursorInstalled) missingIds.push('"cursor-installed"');
  if (!cursorLoggedIn) missingIds.push('"cursor-logged-in"');
  if (!composerTried) missingIds.push('"composer-tried"');
  if (!atRefTried) missingIds.push('"at-ref-tried"');
  if (!backgroundAgentTried) missingIds.push('"background-agent-tried"');
  if (!toolChoiceUnderstood) missingIds.push('"tool-choice-understood"');

  const secondHint =
    `还未完成的步骤 id 是：${missingIds.join("、")}。` +
    "每个 RealStep 框底部的「我跑完了」按钮点下去之后才算完成。" +
    "如果操作已经做过了但没点按钮，请回去点一下。";

  // Third-attempt hint: suggest StuckButton
  const thirdHint =
    "如果六个「我跑完了」都点过了但校验还不通过，说明可能遇到了意外情况。" +
    "点右下角的「我卡住了」按钮，它会帮你诊断问题并给出下一步建议。";

  return { passed: false, hints: [firstHint, secondHint, thirdHint] };
};
