import * as Base from "fumadocs-ui/components/codeblock";
import type { HTMLAttributes } from "react";
import { useMemo } from "react";
import { createHighlighter } from "shiki";

const highlighter = await createHighlighter({
  langs: ["bash", "ts", "tsx", "typescript"],
  themes: ["github-light", "github-dark"],
});

export type CodeBlockProps = HTMLAttributes<HTMLPreElement> & {
  code: string;
  wrapper?: Base.CodeBlockProps;
  lang: "bash" | "ts" | "tsx" | "typescript";
};

export function CodeBlock({
  code,
  lang,
  wrapper,
  ...props
}: CodeBlockProps): React.ReactElement {
  const html = useMemo(
    () =>
      highlighter.codeToHtml(code, {
        lang,
        defaultColor: false,
        themes: {
          light: "github-light",
          dark: "github-dark",
        },
        transformers: [
          {
            name: "fumadocs:remove-escape",
            code(element) {
              element.children.forEach((line) => {
                if (line.type !== "element") return;

                line.children.forEach((child) => {
                  if (child.type !== "element") return;
                  const textNode = child.children[0];
                  if (!textNode || textNode.type !== "text") return;

                  textNode.value = textNode.value.replace(
                    /\[\\!code/g,
                    "[!code"
                  );
                });
              });

              return element;
            },
          },
        ],
      }),
    [code, lang]
  );

  return (
    <Base.CodeBlock {...wrapper}>
      <Base.Pre {...props} dangerouslySetInnerHTML={{ __html: html }} />
    </Base.CodeBlock>
  );
}
