export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <main className="flex flex-1 overflow-hidden">
            {children}
        </main>
    )
}
