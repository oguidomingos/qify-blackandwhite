import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import LandingPage from "@/components/landing/landing-page"

export default function HomePage() {
  const { userId } = auth()
  
  if (userId) {
    redirect("/dashboard")
  }
  
  return <LandingPage />
}