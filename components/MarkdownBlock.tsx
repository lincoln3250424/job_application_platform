import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownBlock({ content }: { content: string }) {
  return (
    <div className="prose-agent">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
