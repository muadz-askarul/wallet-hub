import { useState } from "react"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumericInput } from "@/components/ui/numeric-input"
import { seedDefaultCategories } from "@/lib/db"
import { updateSettings } from "@/lib/services/settings-service"
import { useAppLock } from "@/lib/providers/app-lock-provider"
import { toast } from "sonner"
import {
  Wallet,
  Coins,
  Lock,
  ArrowRight,
  Plus,
  Trash,
  Check,
  Shield,
  Layout,
} from "lucide-react"

interface LocalPocket {
  id: string
  name: string
  initialBalance: number
}

interface LocalWallet {
  id: string
  name: string
  pockets: LocalPocket[]
}

export function OnboardingPage() {
  const { refreshLockState } = useAppLock()
  const [step, setStep] = useState<1 | 2>(1)

  // PIN states
  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")

  // Wallets & pockets states
  const [wallets, setWallets] = useState<LocalWallet[]>([
    {
      id: "w-cash",
      name: "Cash",
      pockets: [
        { id: "p-cash-main", name: "Main Cash", initialBalance: 100000 },
      ],
    },
    {
      id: "w-bank",
      name: "Bank Wallet",
      pockets: [
        { id: "p-bank-main", name: "Main Account", initialBalance: 1000000 },
        { id: "p-bank-saving", name: "Savings", initialBalance: 500000 },
      ],
    },
  ])

  // Helper to add wallet
  const handleAddWallet = () => {
    const newWalletId = `w-custom-${Date.now()}`
    setWallets((prev) => [
      ...prev,
      {
        id: newWalletId,
        name: `Wallet ${prev.length + 1}`,
        pockets: [
          {
            id: `p-custom-${Date.now()}`,
            name: "Main Pocket",
            initialBalance: 0,
          },
        ],
      },
    ])
  }

  // Helper to remove wallet
  const handleRemoveWallet = (walletId: string) => {
    if (wallets.length <= 1) {
      toast.error("You need at least one wallet")
      return
    }
    setWallets((prev) => prev.filter((w) => w.id !== walletId))
  }

  // Helper to update wallet name
  const handleUpdateWalletName = (walletId: string, name: string) => {
    setWallets((prev) =>
      prev.map((w) => (w.id === walletId ? { ...w, name } : w))
    )
  }

  // Helper to add pocket to wallet
  const handleAddPocket = (walletId: string) => {
    setWallets((prev) =>
      prev.map((w) => {
        if (w.id !== walletId) return w
        return {
          ...w,
          pockets: [
            ...w.pockets,
            {
              id: `p-custom-${Date.now()}`,
              name: `Pocket ${w.pockets.length + 1}`,
              initialBalance: 0,
            },
          ],
        }
      })
    )
  }

  // Helper to remove pocket from wallet
  const handleRemovePocket = (walletId: string, pocketId: string) => {
    setWallets((prev) =>
      prev.map((w) => {
        if (w.id !== walletId) return w
        if (w.pockets.length <= 1) {
          toast.error("Each wallet needs at least one pocket")
          return w
        }
        return {
          ...w,
          pockets: w.pockets.filter((p) => p.id !== pocketId),
        }
      })
    )
  }

  // Helper to update pocket values
  const handleUpdatePocket = (
    walletId: string,
    pocketId: string,
    updates: Partial<LocalPocket>
  ) => {
    setWallets((prev) =>
      prev.map((w) => {
        if (w.id !== walletId) return w
        return {
          ...w,
          pockets: w.pockets.map((p) =>
            p.id === pocketId ? { ...p, ...updates } : p
          ),
        }
      })
    )
  }

  // Step 1 Submit
  const handleStep1Submit = () => {
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      toast.error("PIN must be exactly 4 digits")
      return
    }
    if (pin !== confirmPin) {
      toast.error("PINs do not match")
      return
    }
    setStep(2)
  }

  // Step 2 Submit
  const handleCompleteSetup = async () => {
    // Basic validations
    for (const w of wallets) {
      if (!w.name.trim()) {
        toast.error("Please fill all wallet names")
        return
      }
      for (const p of w.pockets) {
        if (!p.name.trim()) {
          toast.error(`Please fill all pocket names in wallet: ${w.name}`)
          return
        }
      }
    }

    try {
      // 1. Seed categories
      await seedDefaultCategories()

      // 2. Save configured wallets and pockets to Dexie
      let walletOrder = 0
      for (const localW of wallets) {
        await db.wallets.add({
          id: localW.id,
          name: localW.name.trim(),
          createdAt: Date.now(),
          order: walletOrder++,
        })

        let pocketOrder = 0
        for (const localP of localW.pockets) {
          await db.pockets.add({
            id: localP.id,
            walletId: localW.id,
            name: localP.name.trim(),
            initialBalance: localP.initialBalance,
            createdAt: Date.now(),
            order: pocketOrder++,
          })
        }
      }

      // 3. Update Settings to complete onboarding and enable lock screen
      await updateSettings({
        pin,
        isOnboarded: true,
        lockDelayMinutes: 5,
      })

      // 4. Force AppLockProvider to refresh states
      await refreshLockState()

      toast.success("Setup completed! Enjoy Wallet Hub.")
    } catch (err) {
      console.error(err)
      toast.error("Failed to complete onboarding setup")
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-background px-6 py-12">
      {/* Upper Logo / Branding Header */}
      <div className="mx-auto flex flex-col items-center gap-2 text-center max-w-sm mb-12">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <Coins className="size-8" />
        </div>
        <h1 className="text-3xl font-black tracking-tight mt-2 bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
          Wallet Hub
        </h1>
        <p className="text-sm text-muted-foreground">
          Your sleek, offline-first personal finance space
        </p>
      </div>

      <div className="mx-auto w-full max-w-md flex-1 flex flex-col justify-between">
        {/* Step 1: Security PIN Setup */}
        {step === 1 && (
          <div className="space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Shield className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Set App PIN</h3>
                    <p className="text-xs text-muted-foreground">
                      Protect your ledger behind a secure lock
                    </p>
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  {/* PIN Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      New 4-Digit PIN
                    </label>
                    <Input
                      type="password"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="••••"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                      className="h-11 text-center font-bold tracking-widest text-lg"
                    />
                  </div>

                  {/* Confirm PIN Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      Confirm PIN
                    </label>
                    <Input
                      type="password"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="••••"
                      value={confirmPin}
                      onChange={(e) =>
                        setConfirmPin(e.target.value.replace(/\D/g, ""))
                      }
                      className="h-11 text-center font-bold tracking-widest text-lg"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button
              className="h-12 w-full text-base font-bold gap-2 cursor-pointer mt-8"
              onClick={handleStep1Submit}
            >
              Configure Ledgers
              <ArrowRight className="size-5" />
            </Button>
          </div>
        )}

        {/* Step 2: Wallets, Pockets & Balances */}
        {step === 2 && (
          <div className="space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-foreground">Wallets & Pockets</h3>
                  <p className="text-xs text-muted-foreground">
                    Define wallets, pockets and initial seed amounts
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddWallet}
                  className="h-8 gap-1 rounded-lg text-xs cursor-pointer"
                >
                  <Plus className="size-3" />
                  Add Wallet
                </Button>
              </div>

              <div className="space-y-5 max-h-[50vh] overflow-y-auto pr-1">
                {wallets.map((wallet) => (
                  <div
                    key={wallet.id}
                    className="rounded-2xl border bg-card p-4 shadow-xs space-y-4"
                  >
                    {/* Wallet Header */}
                    <div className="flex items-center justify-between gap-2 border-b pb-3">
                      <div className="flex items-center gap-2 flex-1">
                        <Wallet className="size-4 text-primary shrink-0" />
                        <Input
                          value={wallet.name}
                          onChange={(e) =>
                            handleUpdateWalletName(wallet.id, e.target.value)
                          }
                          className="h-8 border-none bg-transparent p-0 font-bold text-foreground focus-visible:ring-0 shadow-none focus-visible:outline-none focus:bg-muted/10 px-1 rounded-md"
                          placeholder="Wallet Name"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveWallet(wallet.id)}
                        className="flex size-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer transition-colors"
                      >
                        <Trash className="size-4" />
                      </button>
                    </div>

                    {/* Pockets List */}
                    <div className="space-y-3">
                      {wallet.pockets.map((pocket) => (
                        <div
                          key={pocket.id}
                          className="flex items-start justify-between gap-3 rounded-xl bg-muted/30 p-3"
                        >
                          <div className="space-y-2 flex-1">
                            {/* Pocket Name */}
                            <Input
                              value={pocket.name}
                              onChange={(e) =>
                                handleUpdatePocket(wallet.id, pocket.id, {
                                  name: e.target.value,
                                })
                              }
                              className="h-7 border-none bg-transparent p-0 text-xs font-semibold text-foreground focus-visible:ring-0 shadow-none focus-visible:outline-none focus:bg-muted/30 px-1 rounded-md"
                              placeholder="Pocket Name"
                            />

                            {/* Pocket Initial Amount */}
                            <div className="flex items-center gap-1 border-b border-muted">
                              <span className="text-[10px] font-bold text-muted-foreground">
                                Rp
                              </span>
                              <NumericInput
                                value={pocket.initialBalance}
                                onValueChange={(v) =>
                                  handleUpdatePocket(wallet.id, pocket.id, {
                                    initialBalance: v ? parseFloat(v) : 0,
                                  })
                                }
                                className="h-6 flex-1 border-none bg-transparent p-0 text-right text-xs font-bold text-foreground shadow-none focus-visible:ring-0 focus-visible:outline-none dark:bg-transparent"
                                placeholder="0"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleRemovePocket(wallet.id, pocket.id)
                            }
                            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive shrink-0 cursor-pointer transition-colors"
                          >
                            <Trash className="size-3.5" />
                          </button>
                        </div>
                      ))}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddPocket(wallet.id)}
                        className="w-full h-8 border border-dashed hover:border-solid gap-1 text-xs text-muted-foreground cursor-pointer rounded-xl"
                      >
                        <Plus className="size-3" />
                        Add Pocket
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              className="h-12 w-full text-base font-bold gap-2 cursor-pointer mt-8 bg-gradient-to-r from-primary to-blue-600 text-white"
              onClick={handleCompleteSetup}
            >
              Complete Setup
              <Check className="size-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
