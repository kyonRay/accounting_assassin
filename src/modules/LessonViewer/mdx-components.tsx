import type { MDXComponents } from "mdx/types";
import { Callout } from "./components/Callout";
import { SandboxStep } from "./components/SandboxStep";
import { ComparisonDemo } from "./components/ComparisonDemo";

export const mdxComponents: MDXComponents = {
  h1: (props) => <h1 className="text-3xl font-bold mb-4" {...props} />,
  h2: (props) => <h2 className="text-2xl font-semibold mt-6 mb-3" {...props} />,
  p: (props) => <p className="leading-relaxed my-3" {...props} />,
  ul: (props) => <ul className="list-disc pl-6 my-3 space-y-1" {...props} />,
  code: (props) => (
    <code className="bg-graphite/5 px-1.5 py-0.5 rounded font-mono text-sm" {...props} />
  ),
  Callout: Callout as never,
  SandboxStep: SandboxStep as never,
  ComparisonDemo: ComparisonDemo as never,
};
