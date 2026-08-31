import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Navbar from "@/components/marketing/Navbar";
import LandingHero from "@/components/marketing/LandingHero";

export default async function Home() {
  let session = null;

  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }

  if (session) {
    redirect("/projects");
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-24 px-4 md:px-8">
        <LandingHero />
      </div>
    </div>
  );
}
