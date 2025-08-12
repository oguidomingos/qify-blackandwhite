import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = auth()

  if (!userId) {
    redirect("/sign-in")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex min-h-screen">
        {/* Progress Sidebar */}
        <div className="hidden lg:flex lg:w-80 lg:flex-col bg-slate-900/50 border-r border-slate-700/50">
          <div className="flex-1 flex flex-col py-8 px-6">
            <div className="flex items-center space-x-2 mb-8">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold">Q</span>
              </div>
              <span className="text-xl font-bold text-white">Qify Setup</span>
            </div>
            
            <div className="space-y-4">
              <div className="text-sm text-slate-400 uppercase tracking-wider font-medium">
                Configuração Inicial
              </div>
              <div className="space-y-2">
                <div className="text-slate-300 text-sm">
                  Configure seu agente SDR em poucos passos simples
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}