import { Logo } from "@/components/marketing/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-white p-7 shadow-[0_24px_50px_-30px_rgb(20_33_61/0.35)] sm:p-9">
          {children}
        </div>
      </main>
    </div>
  );
}
