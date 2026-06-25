import Link from "next/link";
import { Construction, ArrowLeft } from "lucide-react";

export default function PreviewPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-center p-6">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
        <Construction className="w-6 h-6 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-semibold">Preview Studio</h1>
      <p className="text-muted-foreground max-w-sm">
        Coming in <strong>v0.3</strong>. The preview engine lets you render generated widgets with editable props in real time across device viewports.
      </p>
      <Link
        href="/convert"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to converter
      </Link>
    </div>
  );
}
