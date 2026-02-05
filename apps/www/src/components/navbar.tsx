"use client";
import Link from "next/link";
import Image from "next/image";

function Logo() {
  return (
    <Link href={"/"} className="flex items-center">
      <Image
        src="/icon.png"
        alt="Logo"
        width={40}
        height={40}
        className="h-8 w-8 max-w-full drop-shadow-2xl lg:h-10 lg:w-10"
      />
    </Link>
  );
}

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between py-4 lg:py-8">
      <div className="flex items-center gap-2 md:gap-4">
        <Logo />
        <span
          className="bg-gradient-to-b from-white via-white to-neutral-400 bg-clip-text text-lg font-bold tracking-tighter text-transparent md:text-xl"
          style={{
            textShadow: "0 1px 2px rgba(0,0,0,0.2)",
          }}
        >
          API Hover
        </span>
      </div>
      <section className="flex items-center space-x-2 lg:space-x-6">
        <div className="flex items-center space-x-2 lg:space-x-4">
          <a
            href="https://x.com/lambatameya"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X (Twitter)"
          >
            <Image
              src="/social-icons/x-dark.svg"
              alt="X (Twitter)"
              width={20}
              height={20}
              className="h-4 w-4 opacity-80 transition hover:opacity-100 lg:h-6 lg:w-6"
            />
          </a>
          <a
            href="https://github.com/ameyalambat128/api-hover"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
          >
            <Image
              src="/social-icons/github-dark.svg"
              alt="GitHub"
              width={22}
              height={22}
              className="h-5 w-5 opacity-80 transition hover:opacity-100 lg:h-6 lg:w-6"
            />
          </a>
        </div>
      </section>
    </nav>
  );
}
