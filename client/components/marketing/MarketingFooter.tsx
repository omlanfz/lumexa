import Link from "next/link";
import Image from "next/image";

export default function MarketingFooter() {
  return (
    <footer className="bg-[#030810] border-t border-gray-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0">
                <Image
                  src="https://res.cloudinary.com/dunx0blwp/image/upload/v1772141559/logo_yr5wyw.jpg"
                  alt="Lumexa AI School"
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                />
              </div>
              <span className="text-white font-black text-lg tracking-tight">
                Lumexa{" "}
                <span className="text-purple-400 font-bold">AI School</span>
              </span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              Live 1-on-1 coding and AI classes for kids ages 6–18. Expert teachers, real projects, and a clear path from beginner to AI Innovator.
            </p>
            <p className="text-gray-700 text-xs mt-4">
              © {new Date().getFullYear()} Lumexa AI School. All rights reserved.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-3">Platform</h4>
            <ul className="space-y-2">
              {[
                { label: "Learning Pathways", href: "/courses" },
                { label: "Pricing", href: "/pricing" },
                { label: "Free Trial", href: "/trial" },
                { label: "About Us", href: "/about" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-3">Account</h4>
            <ul className="space-y-2">
              {[
                { label: "Sign In", href: "/login" },
                { label: "Register", href: "/register" },
                { label: "Parent Dashboard", href: "/dashboard" },
                { label: "Teacher Hub", href: "/teacher-dashboard" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-800/40 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-700 text-xs">
            Turning kids into AI builders, one class at a time. 🚀
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-700">
            <span>Privacy Policy</span>
            <span>·</span>
            <span>Terms of Service</span>
            <span>·</span>
            <span>COPPA Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
