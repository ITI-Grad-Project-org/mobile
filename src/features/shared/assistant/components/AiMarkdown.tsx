import { useCSSVariable } from "@/tw";
import { useMemo } from "react";
import Markdown from "react-native-markdown-display";

/**
 * Assistant answers come back as Markdown-flavoured prose from Gemini, so raw
 * `Text` renders literal asterisks and hyphens on anything list-shaped.
 *
 * There is no sanitization step here on purpose: React Native has no HTML sink,
 * so the web guidance about escaping before injection does not apply. The real
 * leak risk is rendering a `failed` summary (a raw backend exception) — that is
 * filtered upstream in useAiChat, which never puts one in a message body.
 */
export function AiMarkdown({ text }: { text: string }) {
  const foreground = useCSSVariable("--foreground");
  const muted = useCSSVariable("--muted-foreground");
  const primary = useCSSVariable("--primary");
  const border = useCSSVariable("--border");
  const secondary = useCSSVariable("--secondary");

  const styles = useMemo(
    () => ({
      body: { color: foreground, fontSize: 14, lineHeight: 20 },
      paragraph: { marginTop: 0, marginBottom: 8 },
      heading1: { color: foreground, fontSize: 18, fontWeight: "700" as const, marginBottom: 6 },
      heading2: { color: foreground, fontSize: 16, fontWeight: "700" as const, marginBottom: 6 },
      heading3: { color: foreground, fontSize: 15, fontWeight: "600" as const, marginBottom: 4 },
      strong: { fontWeight: "700" as const, color: foreground },
      em: { fontStyle: "italic" as const },
      bullet_list: { marginBottom: 4 },
      ordered_list: { marginBottom: 4 },
      list_item: { marginBottom: 2 },
      code_inline: {
        backgroundColor: secondary,
        color: foreground,
        borderRadius: 4,
        paddingHorizontal: 4,
        fontSize: 13,
      },
      fence: {
        backgroundColor: secondary,
        color: foreground,
        borderWidth: 1,
        borderColor: border,
        borderRadius: 12,
        padding: 10,
        fontSize: 12.5,
      },
      code_block: {
        backgroundColor: secondary,
        color: foreground,
        borderRadius: 12,
        padding: 10,
        fontSize: 12.5,
      },
      blockquote: {
        backgroundColor: "transparent",
        borderLeftWidth: 3,
        borderLeftColor: primary,
        paddingLeft: 10,
        marginLeft: 0,
      },
      link: { color: primary, textDecorationLine: "underline" as const },
      hr: { backgroundColor: border, height: 1 },
      table: { borderColor: border, borderWidth: 1, borderRadius: 8 },
      th: { padding: 6, color: foreground },
      td: { padding: 6, color: muted },
    }),
    [foreground, muted, primary, border, secondary]
  );

  return <Markdown style={styles}>{text}</Markdown>;
}
