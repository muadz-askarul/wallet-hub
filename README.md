# Wallet Hub

A premium, mobile-first personal finance management application built with React 19, Vite 7, and Tailwind CSS v4. Designed for speed, offline reliability, and a high-end user experience.

## ✨ Features

- **Natural Window Scrolling:** Optimized for mobile browser behavior with sticky headers and responsive navigation.
- **PWA Ready:** Installable on iOS and Android with offline support via Dexie.js.
- **Biometric-Ready Security:** Secure PIN entry system for app locking.
- **Smart Transactions:** Support for income, expenses, and transfers between wallets.
- **Recurring & Bills:** Manage recurring payments and templates with ease.
- **Advanced UI:** Custom gesture-driven buttons, glassmorphic headers, and smooth micro-animations.
- **Dark Mode:** Built-in theme management with seamless transitions.

## 🛠 Tech Stack

- **Framework:** [React 19](https://react.dev/)
- **Build Tool:** [Vite 7](https://vitejs.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Routing:** [React Router 7](https://reactrouter.com/)
- **Database:** [Dexie.js](https://dexie.org/) (IndexedDB wrapper for offline storage)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Primitives:** [@base-ui/react](https://base-ui.com/)
- **Validation:** [Zod](https://zod.dev/) & [React Hook Form](https://react-hook-form.com/)

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (Recommended) or Node.js

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

## 📂 Project Structure

- `src/components/ui`: Atomic UI components built with shadcn/ui and Base UI.
- `src/pages`: Application views (Dashboard, Transactions, Wallet, etc.).
- `src/lib`: Core logic, database schema (`db.ts`), and service layers.
- `src/assets`: Static resources and icons.

## 🎨 Development Conventions

- **Composition:** Uses the Base UI `render` prop convention for clean component nesting.
- **Navigation:** Floating pill-shaped `BottomNavigationBar` with scroll-reactive visibility.
- **Gestures:** Custom `GestureButton` for advanced mobile interactions (Tap/Hold/Swipe).

---

Built with ❤️ for a seamless financial experience.
