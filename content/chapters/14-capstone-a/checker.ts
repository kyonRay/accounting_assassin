import type { CheckerFn } from "@/modules/Checker";
import type { VirtualFs } from "@/modules/Sandbox/virtual-fs";

// env shape this checker depends on
interface Ch14Env {
  fs: VirtualFs;
}

export const check: CheckerFn = async (env) => {
  const fs = (env as unknown as Ch14Env).fs;
  if (!fs) {
    return {
      passed: false,
      hints: ["环境状态异常，试试刷新页面后重新开始。"],
    };
  }

  const depsInstalled = await fs.exists(".progress/deps-installed");
  const invoiceOcrScaffolded = await fs.exists(
    ".progress/invoice-ocr-scaffolded",
  );
  const invoiceOcrRan = await fs.exists(".progress/invoice-ocr-ran");
  const bankClassifierScaffolded = await fs.exists(
    ".progress/bank-classifier-scaffolded",
  );
  const bankClassifierRan = await fs.exists(".progress/bank-classifier-ran");
  const reportAggregatorScaffolded = await fs.exists(
    ".progress/report-aggregator-scaffolded",
  );
  const reportAggregatorRan = await fs.exists(
    ".progress/report-aggregator-ran",
  );
  const capstoneAReviewed = await fs.exists(".progress/capstone-a-reviewed");

  if (
    depsInstalled &&
    invoiceOcrScaffolded &&
    invoiceOcrRan &&
    bankClassifierScaffolded &&
    bankClassifierRan &&
    reportAggregatorScaffolded &&
    reportAggregatorRan &&
    capstoneAReviewed
  ) {
    return { passed: true };
  }

  // Build directional first-attempt hint
  const missing: string[] = [];
  if (!depsInstalled)
    missing.push(
      "安装 pandas 和 openpyxl（运行 pip3 install --user pandas openpyxl）",
    );
  if (!invoiceOcrScaffolded)
    missing.push(
      "用 Claude 搭建 invoice-ocr 批量发票处理项目（capstone-a/invoice-ocr/）",
    );
  if (!invoiceOcrRan)
    missing.push(
      "运行 batch_ocr.py 批量处理发票文件夹，生成 Excel 汇总",
    );
  if (!bankClassifierScaffolded)
    missing.push(
      "用 Claude 搭建 bank-classifier 银行流水分类项目（capstone-a/bank-classifier/）",
    );
  if (!bankClassifierRan)
    missing.push(
      "运行 bank_classify.py 对银行 CSV 流水做分类，生成分类后的 CSV",
    );
  if (!reportAggregatorScaffolded)
    missing.push(
      "用 Claude 搭建 report-aggregator 多表汇总项目（capstone-a/report-aggregator/）",
    );
  if (!reportAggregatorRan)
    missing.push(
      "运行 aggregate.py 把多个 Excel 报表聚合成一张汇总表",
    );
  if (!capstoneAReviewed)
    missing.push(
      "回顾三个工具完成情况，点击「我跑完了」完成毕业作品 A",
    );

  const firstHint =
    missing.length === 8
      ? [
          "八个步骤都还没完成。",
          "先安装 pandas 和 openpyxl 依赖，",
          "然后依次用 Claude 搭建并运行三个小工具：",
          "invoice-ocr（批量发票 OCR + Excel 汇总）、",
          "bank-classifier（银行流水分类）、",
          "report-aggregator（多表汇总），",
          "最后回顾完成情况。",
        ].join("")
      : `还差：${missing.join("；")}。回到对应步骤，完成操作后点「我跑完了」。`;

  // Second-attempt hint: name the exact marker ids
  const missingIds: string[] = [];
  if (!depsInstalled) missingIds.push('"deps-installed"');
  if (!invoiceOcrScaffolded) missingIds.push('"invoice-ocr-scaffolded"');
  if (!invoiceOcrRan) missingIds.push('"invoice-ocr-ran"');
  if (!bankClassifierScaffolded) missingIds.push('"bank-classifier-scaffolded"');
  if (!bankClassifierRan) missingIds.push('"bank-classifier-ran"');
  if (!reportAggregatorScaffolded)
    missingIds.push('"report-aggregator-scaffolded"');
  if (!reportAggregatorRan) missingIds.push('"report-aggregator-ran"');
  if (!capstoneAReviewed) missingIds.push('"capstone-a-reviewed"');

  const secondHint =
    `还未完成的步骤 id 是：${missingIds.join("、")}。` +
    "每个 RealStep 框底部的「我跑完了」按钮点下去之后才算完成。" +
    "如果操作已经做过了但没点按钮，请回去点一下。";

  // Third-attempt hint: suggest StuckButton
  const thirdHint =
    "如果八个「我跑完了」都点过了但校验还不通过，说明可能遇到了意外情况。" +
    "点右下角的「我卡住了」按钮，它会帮你诊断问题并给出下一步建议。";

  return { passed: false, hints: [firstHint, secondHint, thirdHint] };
};
