import Image from "next/image";
import Container from "./components/Container";

export default function Page() {
  return (
    <main style={{ backgroundColor: "var(--bg-default)" }} className="min-h-screen">
      <div className="max-w-6xl mx-auto py-20 px-6 lg:flex lg:items-center lg:gap-12">
        <div className="lg:w-1/2">
          <span style={{ backgroundColor: "var(--primary-100)", color: "var(--primary-700)" }} className="inline-block px-3 py-1 rounded-full text-sm font-medium">
            Glacier Edition
          </span>
          <h1 style={{ color: "var(--text-primary)" }} className="mt-6 text-4xl md:text-5xl font-extrabold leading-tight">
            Protect your money with SnapGuard AI
          </h1>
          <p style={{ color: "var(--text-secondary)" }} className="mt-4 text-lg max-w-xl">
            Detect scams, analyze spending, and get personalized money coaching — all in one place.
          </p>
          <div className="mt-8 flex gap-4">
            <a href="/stitch/4858dd7dd3804b62b99f51571a5f1ca0" style={{ backgroundColor: "var(--primary-600)" }} className="px-6 py-3 rounded-md text-white shadow">
              Get started
            </a>
            <a href="/stitch" className="px-6 py-3 rounded-md border" style={{ borderColor: "var(--primary-300)", color: "var(--text-primary)" }}>
              View designs
            </a>
          </div>
        </div>

        <div className="mt-10 lg:mt-0 lg:w-1/2">
          <div className="rounded-lg shadow-lg overflow-hidden">
            <img src="/stitch-screens/4858dd7dd3804b62b99f51571a5f1ca0.png" alt="Landing preview" className="w-full h-auto block" />
          </div>
        </div>
      </div>
    </main>
  );
}

