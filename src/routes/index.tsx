import { createFileRoute } from "@tanstack/react-router";
import { CheckScanner } from "@/components/CheckScanner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Northbank Check Scanner — Analyze Checks with Azure AI" },
      {
        name: "description",
        content:
          "Upload a bank check image and extract structured data instantly using Azure AI Document Intelligence.",
      },
      { property: "og:title", content: "Northbank Check Scanner" },
      {
        property: "og:description",
        content: "Scan and analyze bank checks with Azure AI Document Intelligence.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <CheckScanner />;
}
