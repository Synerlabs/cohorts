import Link from "next/link";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col items-center py-12 sm:px-6 lg:p-8">
      <div className="flex xl:max-w-screen-xl w-full justify-between items-center">
        <div className="flex">
          <div className="flex font-bold">
            <span>c</span>
            <span className="-ml-[3px]">o</span>
          </div>
          <span className="text-[30px] font-bold tracking-tighter">
            cohorts.
          </span>
        </div>

        <nav className="flex gap-8">
          <Link href={"/"}>Home</Link>
          <Link href={"/about"}>About</Link>
          <Link href={"/contact"}>Contact</Link>
          <Link href={"/sign-up"}>Sign Up</Link>
        </nav>
      </div>
      <main className="sm:mx-auto sm:w-full sm:max-w-md md:max-w-screen-md lg:max-w-screen-lg flex-1 flex">
        {children}
      </main>
    </div>
  );
}
