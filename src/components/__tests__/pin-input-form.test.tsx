import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { PinInputForm } from "../pin-input-form"

describe("PinInputForm", () => {
  it("should render number grid", () => {
    render(<PinInputForm onSubmit={vi.fn()} />)

    expect(screen.getByText("1")).toBeDefined()
    expect(screen.getByText("0")).toBeDefined()
  })
})
