import type { MDXComponents } from "mdx/types";
import { Callout } from "./components/Callout";
import { SandboxStep } from "./components/SandboxStep";
import { ComparisonDemo } from "./components/ComparisonDemo";
import { MdxQuizRunner } from "../Quiz/MdxQuizRunner";

export const mdxComponents: MDXComponents = {
  // Block elements
  h1: (props) => <h1 className="text-3xl font-bold mb-4" {...props} />,
  h2: (props) => <h2 className="text-2xl font-semibold mt-6 mb-3" {...props} />,
  h3: (props) => <h3 className="text-xl font-semibold mt-5 mb-2" {...props} />,
  p: (props) => <p className="leading-relaxed my-3" {...props} />,
  ul: (props) => <ul className="list-disc pl-6 my-3 space-y-1" {...props} />,
  ol: (props) => <ol className="list-decimal pl-6 my-3 space-y-1" {...props} />,
  li: (props) => <li className="leading-relaxed" {...props} />,
  blockquote: (props) => (
    <blockquote className="border-l-4 border-graphite/20 pl-4 my-4 italic text-muted" {...props} />
  ),
  hr: () => <hr className="my-6 border-graphite/15" />,
  // Inline
  a: (props) => <a className="text-sandbox underline underline-offset-2 hover:opacity-80" {...props} />,
  strong: (props) => <strong className="font-semibold" {...props} />,
  em: (props) => <em className="italic" {...props} />,
  code: (props) => (
    <code className="bg-graphite/5 px-1.5 py-0.5 rounded font-mono text-sm" {...props} />
  ),
  // Code blocks (pre wraps code with className)
  pre: (props) => (
    <pre className="bg-graphite/95 text-cream rounded-lg p-4 my-4 overflow-x-auto text-sm font-mono leading-relaxed" {...props} />
  ),
  // Tables — the fix for flattened table rendering
  table: (props) => (
    <div className="my-4 overflow-x-auto">
      <table className="min-w-full border-collapse text-sm" {...props} />
    </div>
  ),
  thead: (props) => <thead className="bg-graphite/5 border-b-2 border-graphite/15" {...props} />,
  tbody: (props) => <tbody {...props} />,
  tr: (props) => <tr className="border-b border-graphite/10 last:border-b-0" {...props} />,
  th: (props) => <th className="px-3 py-2 text-left font-semibold align-top" {...props} />,
  td: (props) => <td className="px-3 py-2 align-top" {...props} />,
  // Custom components (unchanged)
  Callout: Callout as never,
  SandboxStep: SandboxStep as never,
  ComparisonDemo: ComparisonDemo as never,
  QuizRunner: MdxQuizRunner as never,
};
