import { Target } from "lucide-react"

export function GoalsPage() {
  return (
    <div className="flex h-[80vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
        <Target className="h-12 w-12" />
      </div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Goals</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Track your savings goals. Coming soon!
      </p>
    </div>
  )
}
