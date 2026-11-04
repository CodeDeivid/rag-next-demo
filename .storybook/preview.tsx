import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import chat from "../messages/pt/chat.json";
import common from "../messages/pt/common.json";
import documents from "../messages/pt/documents.json";
import quality from "../messages/pt/quality.json";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    layout: "padded",
    a11y: { test: "error" }, // a story with an axe violation fails, same bar as the app
  },
  decorators: [
    withThemeByClassName({ themes: { light: "", dark: "dark" }, defaultTheme: "light" }),
    (Story) => (
      <NextIntlClientProvider locale="pt" messages={{ common, chat, documents, quality }}>
        <div className="bg-background p-4 text-foreground">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};

export default preview;
