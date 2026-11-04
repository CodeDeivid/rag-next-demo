import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { SourceCard } from "./source-card";

const short =
  "Refunds are available within 30 days of purchase. To request one, contact support with your order number.";
const long = Array.from(
  { length: 6 },
  (_, i) =>
    `${i + 1}. Customers may request a full refund within 30 days of purchase, provided the product has not been used and the original receipt is available.`,
).join("\n");

const meta = {
  title: "Chat/SourceCard",
  component: SourceCard,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Cartão de uma fonte usada na resposta: documento, trecho, barra de similaridade e o trecho citado, que pode ser expandido quando é longo.",
      },
    },
  },
  args: {
    n: 1,
    highlighted: false,
    chunk: {
      id: "c1",
      documentName: "refund-policy.md",
      chunkIndex: 2,
      content: short,
      score: 0.91,
    },
  },
  argTypes: {
    n: { control: { type: "number", min: 1 } },
    highlighted: { control: "boolean" },
    chunk: { control: "object" },
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SourceCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ScoreHigh: Story = {};
export const ScoreMedium: Story = {
  args: { chunk: { ...meta.args.chunk, id: "c2", score: 0.62 } },
};
export const ScoreLow: Story = {
  args: { chunk: { ...meta.args.chunk, id: "c3", score: 0.31 } },
};
export const Highlighted: Story = { args: { highlighted: true } };
export const LongExcerptCollapsed: Story = {
  args: { chunk: { ...meta.args.chunk, id: "c4", content: long } },
};
export const LongExcerptExpanded: Story = {
  args: { chunk: { ...meta.args.chunk, id: "c5", content: long } },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button");
    await userEvent.click(button);
    await expect(button).toHaveAttribute("aria-expanded", "true");
  },
};
