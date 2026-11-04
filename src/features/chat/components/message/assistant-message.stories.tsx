import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn, userEvent, within } from "storybook/test";
import type { RagUIMessage, RetrievedChunk } from "@/features/rag/types";
import { NOT_FOUND_ANSWER } from "@/features/rag/types";
import { AssistantMessage } from "./assistant-message";

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

const msg = (text: string, withSources = true): RagUIMessage => ({
  id: "a1",
  role: "assistant",
  parts: [
    ...(withSources ? [{ type: "data-sources" as const, data: { chunks } }] : []),
    { type: "text" as const, text },
  ],
});

const meta = {
  title: "Chat/AssistantMessage",
  component: AssistantMessage,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Uma resposta do assistente: texto com citações, ações (fontes, copiar, regenerar, feedback) e o cartão de "não encontrei" quando os documentos não respondem.',
      },
    },
  },
  args: {
    message: msg(
      "O reembolso pode ser pedido em até 30 dias [1]. O envio leva cerca de 5 dias [2].",
    ),
    question: "Qual é o prazo de reembolso?",
    streaming: false,
    busy: false,
    failed: false,
    selected: false,
    onSelect: fn(),
    onCite: fn(),
    onShowSources: fn(),
    onRegenerate: fn(),
  },
  argTypes: {
    streaming: { control: "boolean" },
    busy: { control: "boolean" },
    failed: { control: "boolean" },
    selected: { control: "boolean" },
  },
} satisfies Meta<typeof AssistantMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Streaming: Story = {
  args: { streaming: true, message: msg("O reembolso pode ser pedido em até 30 dias", false) },
};
export const FinishedWithCitations: Story = { args: { selected: true } };
export const NotFound: Story = { args: { message: msg(NOT_FOUND_ANSWER, false) } };
export const FailedWithoutAnswer: Story = { args: { failed: true, message: msg("", false) } };
export const LongAnswerWithCodeBlock: Story = {
  args: {
    message: msg(
      "Para consultar o status do pedido [1], envie uma requisição autenticada:\n\n```ts\nconst res = await fetch(`/api/orders/${id}`, {\n  headers: { authorization: `Bearer ${token}` },\n});\nconst order = await res.json();\n```\n\nSe `res.ok` for falso, tente de novo após alguns segundos. O prazo de entrega informado no pedido considera dias úteis [2].",
    ),
  },
};

export const FeedbackSelected: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByRole("button", { name: "Útil" }));
  },
};
