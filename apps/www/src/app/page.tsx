"use client";

import Navbar from "@/components/navbar";
import { Background } from "@/components/background";
import Image from "next/image";
import { motion } from "framer-motion";
import Footer from "@/components/footer";
import AddToBrowserButton from "@/components/add-to-browser-button";
import { MousePointerClick } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#111010] text-white">
      {/* Background Grid */}
      <Background />

      <main className="relative z-10">
        <div className="mx-6 max-w-6xl lg:mx-auto">
          <Navbar />

          {/* Hero Section */}
          <section className="flex min-h-[80vh] flex-col items-center justify-center py-20 text-center">
            {/* Hero Tagline */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mb-8 overflow-visible lg:mb-12"
            >
              <h1
                className="mb-6 bg-gradient-to-b from-white via-white to-neutral-400 bg-clip-text pb-3 text-center text-3xl font-bold leading-tight tracking-tight text-transparent md:text-5xl lg:text-6xl"
                style={{
                  textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              >
                <span className="block">
                  <span className="inline-flex items-baseline gap-3">
                    <span>Stop guessing which</span>
                    <span className="inline-block -translate-y-[0.02em] align-baseline font-mono text-[0.92em] font-semibold tracking-tight text-zinc-300">
                      /endpoint
                    </span>
                  </span>
                </span>
                <span className="mt-1 block">
                  that{" "}
                  <MousePointerClick
                    aria-hidden="true"
                    strokeWidth={1.8}
                    className="mx-1 inline-block h-[0.62em] w-[0.62em] align-[-0.06em] text-zinc-300/80"
                  />
                  click hit.
                </span>
              </h1>

              <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-400 md:text-xl">
                Hover any UI element to see the API calls tied to clicks,
                submits, and Enter presses. Session-only tracking with no
                persistence.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mb-8 lg:mb-12"
            >
              <AddToBrowserButton />
            </motion.div>

            {/* Hero Image */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="relative"
            >
              {/* Blurred shadow behind image */}
              <div className="absolute inset-0 -z-10 scale-110 bg-gradient-to-r from-gray-500/20 via-gray-500/20 to-gray-500/20 blur-3xl" />

              {/* Main hero image */}
              <div className="relative overflow-hidden rounded-2xl shadow-2xl">
                <Image
                  src="/hero-promo.png"
                  alt="Dark Docs 2.0 Preview"
                  width={1200}
                  height={800}
                  className="h-auto max-w-full"
                  priority
                />
              </div>
            </motion.div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
