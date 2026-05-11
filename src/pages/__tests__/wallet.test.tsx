import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { WalletPage } from "../wallet"

describe("WalletPage", () => {
  it("renders wallet page with add button", () => {
    render(<WalletPage />)
    expect(
      screen.getByRole("heading", { name: /^wallets$/i })
    ).toBeInTheDocument()
    expect(screen.getByText("No wallets configured.")).toBeInTheDocument()
  })
})
