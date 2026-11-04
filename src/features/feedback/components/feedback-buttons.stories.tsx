import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { FeedbackButtons } from "./feedback-buttons";

type FetchMode = "ok" | "pending" | "fail";

// Replaces window.fetch for the story so nothing reaches /api/feedback.
const stubFetch = (mode: FetchMode): Decorator =>
  function StubFetch(Story) {
    window.fetch = () =>
      mode === "pending"
        ? new Promise<Response>(() => {})
        : Promise.resolve(new Response("{}", { status: mode === "ok" ? 200 : 500 }));
    return <Story />;
  };

const meta = {
  title: "Chat/FeedbackButtons",
  component: FeedbackButtons,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Polegar para cima e para baixo em uma resposta. O polegar para baixo abre um campo de comentário opcional. O `fetch` é simulado nas stories.",
      },
    },
  },
  args: {
    messageId: "msg-1",
    question: "Qual é o prazo para pedir reembolso?",
    answer: "O prazo é de 30 dias corridos após a compra [1].",
  },
  argTypes: {
    messageId: { control: "text" },
    question: { control: "text" },
    answer: { control: "text" },
  },
  decorators: [stubFetch("ok")],
} satisfies Meta<typeof FeedbackButtons>;

export default meta;
type Story = StoryObj<typeof meta>;

export const None: Story = {};

export const Up: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Útil" }));
    await expect(await c.findByRole("status")).toHaveTextContent(/.+/);
  },
};

export const DownWithCommentForm: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const buttons = c.getAllByRole("button");
    await userEvent.click(buttons[1]);
    const box = await c.findByRole("textbox");
    await userEvent.type(box, "A resposta ignorou o prazo para contratos anuais.");
  },
};

export const Submitting: Story = {
  decorators: [stubFetch("pending")],
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getAllByRole("button")[1]);
  },
};

export const Error: Story = {
  decorators: [stubFetch("fail")],
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getAllByRole("button")[0]);
    await expect(await c.findByRole("status")).toHaveTextContent(/.+/);
  },
};
