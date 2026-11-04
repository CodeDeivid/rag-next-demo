import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import type { UploadItem } from "../types";
import { UploadRow } from "./upload-row";

const item = (name: string, status: UploadItem["status"]): UploadItem => ({
  id: name,
  file: new File(["x"], name),
  status,
});

const meta = {
  title: "Documents/UploadRow",
  component: UploadRow,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Uma linha da fila de envio: mostra o arquivo, a etapa atual (envio, divisão em trechos, embeddings, pronto) e, em caso de erro, o motivo com opção de tentar de novo.",
      },
    },
  },
  args: {
    item: item("politica-de-reembolso.md", { stage: "queued" }),
    onRetry: fn(),
    onDismiss: fn(),
  },
  argTypes: { item: { control: "object" } },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UploadRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SendingPercent: Story = {
  args: { item: item("politica-de-reembolso.md", { stage: "sending", sent: 0.42 }) },
};
export const Chunking: Story = {
  args: { item: item("manual-do-produto.md", { stage: "chunking" }) },
};
export const Embedding: Story = {
  args: { item: item("manual-do-produto.md", { stage: "embedding", done: 7, total: 18 }) },
};
export const Done: Story = {
  args: {
    item: item("politica-de-reembolso.md", {
      stage: "done",
      result: {
        document: {
          id: "d1",
          name: "politica-de-reembolso.md",
          chunkCount: 12,
          shared: false,
          createdAt: "2026-11-04T10:00:00Z",
        },
        chunksInserted: 12,
        chunksSkipped: 0,
      },
    }),
  },
};
export const ErrorWithRetry: Story = {
  args: { item: item("contrato.md", { stage: "error", code: "upload_failed", retryable: true }) },
};
export const FileRejected: Story = {
  args: {
    item: item("planilha.xlsx", { stage: "error", code: "unsupported_type", retryable: false }),
  },
};
