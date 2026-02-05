import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import { Background } from "@/components/background";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#111010] text-white">
      <Background />

      <main className="relative z-10">
        <div className="mx-6 max-w-4xl lg:mx-auto">
          <Navbar />

          <section className="py-16 md:py-24">
            <div className="mx-auto max-w-3xl">
              <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
                Privacy Policy
              </h1>
              <p className="mt-3 text-sm text-gray-400">
                Last updated: February 5, 2026
              </p>

              <div className="mt-10 space-y-8 text-sm leading-relaxed text-gray-300 md:text-base">
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-white">Summary</h2>
                  <p>
                    API Hover processes interaction and network metadata locally
                    in your browser to help you understand which UI actions
                    trigger API calls. We do not collect, sell, or share
                    personal data, and we do not transmit extension data to our
                    servers.
                  </p>
                </div>

                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-white">
                    What the extension processes
                  </h2>
                  <p>When API Hover is enabled, it observes:</p>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>
                      Interaction metadata like element type, labels, ids,
                      roles, and truncated text for clicks, submits, and Enter
                      key presses.
                    </li>
                    <li>
                      Network request metadata like method, URL, and status for
                      fetch/XHR requests.
                    </li>
                    <li>
                      Timing data to associate interactions with requests.
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-white">
                    Where data lives
                  </h2>
                  <p>
                    Data is stored in session memory (via
                    <span className="font-semibold text-white">
                      {" "}
                      chrome.storage.session
                    </span>
                    ) and is scoped per tab. It is cleared when the tab closes
                    or the browser restarts.
                  </p>
                </div>

                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-white">
                    Website analytics
                  </h2>
                  <p>
                    This website uses basic analytics to understand aggregate
                    usage. It does not collect or store sensitive content from
                    pages you visit.
                  </p>
                </div>

                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-white">
                    Contact
                  </h2>
                  <p>
                    Questions about privacy? Email{" "}
                    <a
                      href="mailto:i@ameyalambat.com"
                      className="underline transition-colors hover:text-gray-100"
                    >
                      i@ameyalambat.com
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
