import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import type { RetrievedChunk } from "@/features/rag/types";
import { AnswerMarkdown } from "./answer-markdown";

const chunks: RetrievedChunk[] = [
  {
    id: "c1",
    documentName: "refund-policy.md",
    chunkIndex: 0,
    content: "Refunds within 30 days.",
    score: 0.9,
  },
  {
    id: "c2",
    documentName: "shipping.md",
    chunkIndex: 3,
    content: "Shipping takes 5 days.",
    score: 0.7,
  },
];

const meta = {
  title: "Chat/AnswerMarkdown",
  component: AnswerMarkdown,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Renderiza a resposta do modelo em markdown. Marcas como [1] viram chips clicáveis ligados às fontes; HTML cru é ignorado e imagens remotas não são carregadas.",
      },
    },
  },
  args: {
    text: "O reembolso pode ser pedido em até 30 dias [1]. O envio leva cerca de 5 dias úteis [2].",
    chunks,
    streaming: false,
    onCite: fn(),
    messageId: "m1",
  },
  argTypes: {
    text: { control: "text" },
    streaming: { control: "boolean" },
  },
} satisfies Meta<typeof AnswerMarkdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Citations: Story = {
  play: async ({ canvasElement, args }) => {
    const chip = await within(canvasElement).findByRole("button", { name: /refund-policy/ });
    await userEvent.click(chip);
    await expect(args.onCite).toHaveBeenCalledWith(1);
  },
};
export const UnknownCitation: Story = {
  args: { text: "Há uma exceção para produtos digitais [1][7]." },
};
export const CodeBlock: Story = {
  args: {
    text: 'Para consultar a API:\n\n```ts\nconst res = await fetch("/api/chat");\n```\n\nUse `res.ok` para validar [1].',
  },
};
export const List: Story = {
  args: {
    text: "Os passos são:\n\n1. Abra o pedido [1].\n2. Clique em reembolsar.\n3. Aguarde a confirmação [2].\n\n- Prazo: 30 dias\n- Canal: suporte",
  },
};
export const NoRawHtmlOrImages: Story = {
  args: {
    text: "<script>alert(1)</script><b>negrito cru</b>\n\n![gráfico de vendas](https://example.com/track.png)\n\nTexto seguro [1].",
  },
};
