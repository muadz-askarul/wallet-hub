import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import App from "../App"

describe("App Routing", () => {
  it("renders bottom navigation items", () => {
    render(<App />)
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /bills/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /budget/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /wallet/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /settings/i })).toBeInTheDocument()
  })
})
