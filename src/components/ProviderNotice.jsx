import { AlertTriangle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS_TEXT = {
  blocked: (name) => ({
    title: `${name} search is not configured yet`,
    description: `Add the ${name} API key in this app's Secrets settings to enable real ${name} results. No sample videos are shown as a substitute.`,
  }),
  quota: (name) => ({
    title: `${name} is temporarily unavailable`,
    description: `The ${name} API's daily request quota is exhausted. Try again later — real results will return automatically.`,
  }),
  credentials: (name) => ({
    title: `${name} rejected the API key`,
    description: `The configured ${name} key is invalid or restricted. Check it in this app's Secrets settings.`,
  }),
  rate: (name) => ({
    title: `${name} rate limit reached`,
    description: `Too many ${name} requests in a short time. Wait a moment and try again.`,
  }),
  network: (name) => ({
    title: `Could not reach ${name}`,
    description: `The ${name} search request failed. Check the connection and try again.`,
  }),
  other: (name) => ({
    title: `${name} search failed`,
    description: `The ${name} request returned an error. Try again in a moment.`,
  }),
};

export default function ProviderNotice({ name, status, error, onRetry }) {
  const text =
    status === "blocked"
      ? STATUS_TEXT.blocked(name)
      : (STATUS_TEXT[error] ?? STATUS_TEXT.other)(name);
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        status === "blocked" ? "border-border bg-card/60" : "border-destructive/30 bg-destructive/10",
      )}
      role="status"
    >
      <div className="flex items-start gap-3">
        {status === "blocked" ? (
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
        )}
        <div>
          <p className="text-sm font-semibold text-foreground">{text.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{text.description}</p>
        </div>
      </div>
      {status === "error" && onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
          Retry
        </Button>
      )}
    </div>
  );
}