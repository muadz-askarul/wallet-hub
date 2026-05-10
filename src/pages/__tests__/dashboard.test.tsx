import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { DashboardPage } from "../dashboard"

describe("DashboardPage", () => {
  it("renders assets, liabilities, and total sections", () => {
    render(<DashboardPage />)
    expect(screen.getByText("Total Balance")).toBeInTheDocument()
    expect(screen.getByText("Assets")).toBeInTheDocument()
    expect(screen.getByText("Liabilities")).toBeInTheDocument()
    expect(screen.getByText("Recent Transactions")).toBeInTheDocument()
  })
})
