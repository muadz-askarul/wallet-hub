import { useState } from "react"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumericInput } from "@/components/ui/numeric-input"
import { seedDefaultCategories } from "@/lib/db"
import { updateSettings } from "@/lib/services/settings-service"
import { useAppLock } from "@/lib/providers/app-lock-provider"
import { hashPin } from "@/lib/utils/crypto"
import { toast } from "sonner"
import { PinCreationForm } from "@/components/pin-creation-form"
import { Wallet, Coins, Plus, Trash, Check } from "lucide-react"

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

export function OnboardingPage({ storageError }: { storageError?: boolean }) {
  const { refreshLockState } = useAppLock()
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // PIN states
  const [pin, setPin] = useState("")

  // Wallets & pockets states
  const [wallets, setWallets] = useState<LocalWallet[]>([
    {
      id: "w-cash",
      name: "Cash",
      pockets: [{ id: "p-cash-main", name: "Main Cash", initialBalance: 0 }],
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

  // Step 1 Submit (called when PinCreationForm completes both enter and confirm steps)
  const handlePinComplete = async (completedPin: string) => {
    setPin(completedPin)
    /* Skip Biometrics setup
    const supported = await isBiometricSupported()
    if (supported) {
      setStep(3)
    } else {
      setStep(2)
    }
    */
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
            createdAt: Date.now(),
            order: pocketOrder++,
          })

          if (localP.initialBalance > 0) {
            await db.transactions.add({
              id: crypto.randomUUID(),
              type: "income",
              amount: localP.initialBalance,
              date: Date.now(),
              note: "Starting Balance",
              pocketId: localP.id,
            })
          }
        }
      }

      // 3. Update Settings to complete onboarding and enable lock screen
      const hashedPin = await hashPin(pin)
      await updateSettings({
        pin: hashedPin,
        isOnboarded: true,
        lockDelayMinutes: 5,
        isBiometricEnabled: false,
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
      <div className="mx-auto mb-12 flex max-w-sm flex-col items-center gap-2 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <Coins className="size-8" />
        </div>
        <h1 className="mt-2 bg-primary bg-clip-text text-3xl font-black tracking-tight text-transparent">
          Wallet Hub
        </h1>
        <p className="text-sm text-muted-foreground">
          Your sleek, offline-first personal finance space
        </p>

        {storageError && (
          <div className="mt-6 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <p className="font-bold">Storage Unavailable</p>
            <p className="mt-1 text-xs leading-relaxed opacity-90">
              Your browser has disabled IndexedDB (likely Private Browsing mode
              or restricted settings). Please use normal mode or enable storage
              to use Wallet Hub.
            </p>
          </div>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-between">
        {/* Step 1: Security PIN Setup */}
        {step === 1 && (
          <div className="flex flex-1 flex-col items-center justify-center p-4">
            <PinCreationForm length={4} onComplete={handlePinComplete} />
          </div>
        )}

        {/* Step 3: Biometric Setup (Disabled)
        {step === 3 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-8 p-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Fingerprint className="size-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Biometric Unlock</h2>
              <p className="max-w-[300px] text-sm text-muted-foreground">
                Would you like to use biometrics (Fingerprint/FaceID) to unlock
                the app faster?
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 pt-4">
              <Button
                className="h-12 w-full cursor-pointer font-bold"
                onClick={() => handleBiometricSetup(true)}
              >
                Enable Biometric
              </Button>
              <Button
                variant="ghost"
                className="h-12 w-full cursor-pointer text-muted-foreground"
                onClick={() => handleBiometricSetup(false)}
              >
                Maybe Later
              </Button>
            </div>
          </div>
        )}
        */}

        {/* Step 2: Wallets, Pockets & Balances */}
        {step === 2 && (
          <div className="flex flex-1 flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-foreground">
                    Wallets & Pockets
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Define wallets, pockets and initial seed amounts
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddWallet}
                  className="h-8 cursor-pointer gap-1 rounded-lg text-xs"
                >
                  <Plus className="size-3" />
                  Add Wallet
                </Button>
              </div>

              <div className="max-h-[50vh] space-y-5 overflow-y-auto pr-1">
                {wallets.map((wallet) => (
                  <div
                    key={wallet.id}
                    className="space-y-4 rounded-2xl border bg-card p-4 shadow-xs"
                  >
                    {/* Wallet Header */}
                    <div className="flex items-center justify-between gap-2 border-b pb-3">
                      <div className="flex flex-1 items-center gap-2">
                        <Wallet className="size-4 shrink-0 text-primary" />
                        <Input
                          value={wallet.name}
                          onChange={(e) =>
                            handleUpdateWalletName(wallet.id, e.target.value)
                          }
                          className="h-8 rounded-md border-none bg-transparent p-0 px-1 font-bold text-foreground shadow-none focus:bg-muted/10 focus-visible:ring-0 focus-visible:outline-none"
                          placeholder="Wallet Name"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveWallet(wallet.id)}
                        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10"
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
                          <div className="flex-1 space-y-2">
                            {/* Pocket Name */}
                            <Input
                              value={pocket.name}
                              onChange={(e) =>
                                handleUpdatePocket(wallet.id, pocket.id, {
                                  name: e.target.value,
                                })
                              }
                              className="h-10 rounded-md border-none bg-transparent p-0 px-1 text-xs font-semibold text-foreground shadow-none focus:bg-muted/30 focus-visible:ring-0 focus-visible:outline-none"
                              placeholder="Pocket Name"
                            />

                            {/* Pocket Initial Amount */}
                            <div className="flex items-center gap-1 border-b border-muted">
                              <span className="text-sm font-bold text-muted-foreground">
                                Rp
                              </span>
                              <NumericInput
                                value={pocket.initialBalance}
                                onValueChange={(v) =>
                                  handleUpdatePocket(wallet.id, pocket.id, {
                                    initialBalance: v ? parseFloat(v) : 0,
                                  })
                                }
                                className="h-10 flex-1 border-none bg-transparent p-0 text-right text-sm font-bold text-foreground shadow-none focus-visible:ring-0 focus-visible:outline-none dark:bg-transparent"
                                placeholder="0"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleRemovePocket(wallet.id, pocket.id)
                            }
                            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <Trash className="size-3.5" />
                          </button>
                        </div>
                      ))}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddPocket(wallet.id)}
                        className="h-8 w-full cursor-pointer gap-1 rounded-xl border border-dashed text-xs text-muted-foreground hover:border-solid"
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
              className="mt-8 h-12 w-full cursor-pointer gap-2 bg-primary text-base font-bold text-white"
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
