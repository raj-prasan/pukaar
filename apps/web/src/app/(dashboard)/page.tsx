"use client";

import { OrganizationSwitcher, SignInButton, UserButton } from "@clerk/nextjs";


export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-svh">
      <p>app/web</p>
      <UserButton/>
      <OrganizationSwitcher hidePersonal/>
    </div>
  );
}


