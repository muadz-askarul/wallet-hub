import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { WalletPage } from "../wallet"

describe("WalletPage", () => {
  it("renders wallet page with add button", () => {
    render(<WalletPage />)
    expect(screen.getByText("Wallets & Pockets")).toBeInTheDocument()
    expect(screen.getByText("Add Wallet")).toBeInTheDocument()
  })
})
