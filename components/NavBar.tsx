'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Today' },
  { href: '/setup', label: 'Setup' },
  { href: '/summary', label: 'Summary' },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="nav">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className="nav-item"
          data-active={pathname === tab.href}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
