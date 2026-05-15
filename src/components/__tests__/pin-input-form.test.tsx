import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { PinInputForm } from "../pin-input-form"

describe("PinInputForm", () => {
  it("should render biometric button when enabled", () => {
    const onBiometricClick = vi.fn()
    render(
      <PinInputForm
        onSubmit={vi.fn()}
        isBiometricEnabled={true}
        onBiometricClick={onBiometricClick}
      />
    )

    const bioButton = screen.getByRole("button", { name: /biometric unlock/i })
    expect(bioButton).toBeDefined()

    fireEvent.click(bioButton)
    expect(onBiometricClick).toHaveBeenCalled()
  })

  it("should not render biometric button when disabled", () => {
    render(<PinInputForm onSubmit={vi.fn()} isBiometricEnabled={false} />)

    const bioButton = screen.queryByRole("button", { name: /fingerprint/i })
    expect(bioButton).toBeNull()
  })
})
