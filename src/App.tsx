import { BrowserRouter, Routes, Route } from "react-router-dom"
import { RootLayout } from "@/components/root-layout"

function HomePage() {
  return (
    <div className="relative min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="mb-4 text-xl font-medium">Home (Dashboard)</h1>
          <p>Scroll down to see the navigation bar hide.</p>
          <p>Scroll up to see it reappear.</p>
        </div>

        {/* Dummy content for scrolling */}
        <div className="mt-8 space-y-4 pb-24 text-muted-foreground">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4">
              Dashboard content {i + 1} - Keep scrolling to test the bottom
              navigation behavior.
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MessagesPage() {
  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-medium">Messages</h1>
      <p className="text-muted-foreground">Your messages will appear here.</p>
    </div>
  )
}

function ProfilePage() {
  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-medium">Profile</h1>
      <p className="text-muted-foreground">
        Manage your account settings here.
      </p>
    </div>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootLayout />}>
          <Route index element={<HomePage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
