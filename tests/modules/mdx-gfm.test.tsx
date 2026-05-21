import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MDXProvider } from "@mdx-js/react";
import { mdxComponents } from "@/modules/LessonViewer/mdx-components";
import TableFixture from "../fixtures/table-fixture.mdx";

describe("GFM table parsing", () => {
  it("renders | ... | table syntax as real <table> elements", () => {
    const { container } = render(
      <MDXProvider components={mdxComponents}>
        <TableFixture />
      </MDXProvider>,
    );
    const table = container.querySelector("table");
    expect(table).not.toBeNull();
    expect(container.querySelectorAll("th")).toHaveLength(2); // Col A, Col B
    expect(container.querySelectorAll("td")).toHaveLength(4); // 2x2 body cells
  });
});
