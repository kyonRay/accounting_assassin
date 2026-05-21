import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MDXProvider } from "@mdx-js/react";
import { mdxComponents } from "@/modules/LessonViewer/mdx-components";

// Pull out individual renderers so we can test them directly.
// MDXProvider only applies components to MDX-compiled output, not raw JSX —
// so we render the components explicitly with the appropriate prop types.
type BlockComp = React.ComponentType<React.HTMLAttributes<HTMLElement>>;
type AnchorComp = React.ComponentType<React.AnchorHTMLAttributes<HTMLAnchorElement>>;

const comps = mdxComponents as Record<string, unknown>;
const Table = comps.table as BlockComp;
const Thead = comps.thead as BlockComp;
const Tbody = comps.tbody as BlockComp;
const Tr = comps.tr as BlockComp;
const Th = comps.th as BlockComp;
const Td = comps.td as BlockComp;
const Ol = comps.ol as BlockComp;
const Blockquote = comps.blockquote as BlockComp;
const Pre = comps.pre as BlockComp;
const A = comps.a as AnchorComp;
const Hr = comps.hr as React.ComponentType;

function MdxTableFixture() {
  return (
    <MDXProvider components={mdxComponents}>
      <Table>
        <Thead>
          <Tr><Th>列 A</Th><Th>列 B</Th></Tr>
        </Thead>
        <Tbody>
          <Tr><Td>单元 1</Td><Td>单元 2</Td></Tr>
          <Tr><Td>单元 3</Td><Td>单元 4</Td></Tr>
        </Tbody>
      </Table>
    </MDXProvider>
  );
}

describe("MDX table rendering", () => {
  it("renders <table> with header and body cells styled (not collapsed)", () => {
    const { container } = render(<MdxTableFixture />);
    // 4 td cells + 2 th cells
    expect(container.querySelectorAll("th")).toHaveLength(2);
    expect(container.querySelectorAll("td")).toHaveLength(4);
    // Wrapper div for overflow-x-auto
    const table = container.querySelector("table");
    expect(table?.parentElement?.className).toMatch(/overflow-x-auto/);
    // Visible text
    expect(screen.getByText("列 A")).toBeInTheDocument();
    expect(screen.getByText("单元 4")).toBeInTheDocument();
  });

  it("renders list/blockquote/code-block with project styling", () => {
    const { container } = render(
      <>
        <Ol><li>A</li><li>B</li></Ol>
        <Blockquote>引用文字</Blockquote>
        <Pre><code>print(1)</code></Pre>
        <A href="#x">链接</A>
        <Hr />
      </>
    );
    expect(container.querySelector("ol")?.className).toMatch(/list-decimal/);
    expect(container.querySelector("blockquote")?.className).toMatch(/border-l-4/);
    expect(container.querySelector("pre")?.className).toMatch(/bg-graphite/);
    expect(container.querySelector("a")?.className).toMatch(/text-sandbox/);
    expect(container.querySelector("hr")?.className).toMatch(/border-graphite/);
  });
});
