"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const pathname = usePathname();
  const onBostonUniversity = pathname.startsWith("/boston-university");

  return (
    <header className="site-header">
      <div className="wrap">
        <div className="header-left">
          <Link href="/" className="brand">
            classroom<span>finder</span>
          </Link>
          <nav className="schools" aria-label="Schools">
            <Link
              href="/boston-university"
              className={onBostonUniversity ? "active" : ""}
              aria-current={onBostonUniversity ? "page" : undefined}
            >
              Boston University
            </Link>
            <span className="soon-school" title="Coming soon">
              Harvard
            </span>
            <span className="soon-school" title="Coming soon">
              Northeastern
            </span>
          </nav>
        </div>
        <a className="contact" href="#">
          Contact
        </a>
      </div>
    </header>
  );
}
