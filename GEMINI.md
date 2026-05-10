# Wallet Hub

A React + TypeScript application built with Vite, Tailwind CSS v4, and shadcn/ui (Base UI edition).

## Tech Stack

- **Framework:** React 19
- **Build Tool:** Vite 7
- **Language:** TypeScript
- **Routing:** React Router 7
- **Styling:** Tailwind CSS v4
- **UI Primitives:** @base-ui/react
- **Components:** shadcn/ui (located in `src/components/ui`)
- **Validation:** Zod
- **Forms:** React Hook Form
- **PWA:** vite-plugin-pwa (Auto-update enabled)
- **Icons:** Lucide React
- **Package Manager:** bun

## Project Structure

- `src/components/ui`: Atomic UI components (shadcn/ui + custom).
  - `button.tsx`: Enhanced Base UI button. Supports `variant`, `size`, and a `loading` prop (shows `Spinner`).
  - `bottom-navigation-bar.tsx`: Floating, scroll-reactive navigation.
  - `gesture-button.tsx`: Advanced mobile button (Tap/Hold/Swipe).
  - `input-otp.tsx`: High-quality OTP/PIN input field.
- `src/components`: Shared components and Layouts.
  - `pin-input-form.tsx`: Configurable PIN entry form with validation, top icon, and mobile-friendly number grid.
  - `root-layout.tsx`: Main application shell with navigation.
  - `theme-provider.tsx`: Dark mode management.
- `src/lib`: Utility functions and shared logic.
- `src/assets`: Static assets like images and SVGs.
- `public/`: Public assets including PWA manifest.

## Getting Started

### Installation

```bash
bun install
```

### Development

```bash
bun run dev
```

### Build

```bash
bun run build
```

### Linting & Formatting

```bash
bun run lint
bun run lint:fix
bun run format
```

### Type Checking

```bash
bun run typecheck
```

## Development Conventions

- **Navigation:** Use `react-router-dom` for all client-side routing.
- **Composition:** Follow the **Base UI `render` prop convention** for component composition (replaces Radix `asChild`).
- **Custom Components:**
  - **`BottomNavigationBar`**: Floating pill-shaped nav. Supports `size="default" | "sm"`, `autoShowDelay` (resurface hidden bar after ms), and `startSlot` / `endSlot` for placing independent floating components like the `GestureButton`.
  - **`GestureButton`**: Specialized for mobile. Supports `onTap`, `onHold` (with release hint), and `swipeActions` (multi-directional with WhatsApp-style tracks).
- **Styling:** Follow Tailwind CSS v4 conventions. Themes and custom variants are defined in `src/index.css`.
- **Dark Mode:** Supported via `ThemeProvider` and Tailwind's `dark` variant.
