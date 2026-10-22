import Link from "next/link";

export default function NavBar() {
  return (
    <header className="site-header">
      <div className="wrap">
        <Link href="/" className="brand">
          classroom<span>finder</span>
        </Link>
        <a className="contact" href="#">
          Contact
        </a>
      </div>
    </header>
  );
}
