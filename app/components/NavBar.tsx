"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const pathname = usePathname();
  const isBostonUniversity = pathname === "/boston-university";

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-logo">
          <span className="navbar-logo-primary">classroom</span>
          <span className="navbar-logo-secondary">finder</span>
        </Link>
        <nav className="navbar-links">
          <Link
            href="/boston-university"
            className={`nav-link ${isBostonUniversity ? "active" : ""}`}
          >
            Boston University
          </Link>
          <span className="nav-link-disabled">Harvard University</span>
          <span className="nav-link-disabled">Northeastern University</span>
          <a href="#" className="nav-link">
            Contact Us
          </a>
        </nav>
      </div>
    </header>
  );
}
