import { createFileRoute } from "@tanstack/react-router";
import App from "@/smykova/App";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Luisa Spagnoli | Sell-Out & Order Analytics" },
      {
        name: "description",
        content:
          "Interactive merchandising and sell-out performance dashboard integrating multi-PO orders, catalog photos, and retail sell-out tracking.",
      },
      { property: "og:title", content: "Luisa Spagnoli | Sell-Out & Order Analytics" },
      {
        property: "og:description",
        content: "Merchandising and sell-out performance dashboard for the boutique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 antialiased">
      <App />
    </div>
  );
}
