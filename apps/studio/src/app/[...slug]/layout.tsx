// Minimal layout for Sitefinity-rendered pages.
// Intentionally bare — the SDK's RenderPage injects all SF frontend assets.
export default function SitefinityPageLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
