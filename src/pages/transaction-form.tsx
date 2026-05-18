import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useLiveQuery } from "dexie-react-hooks"
import { db, type Schedule } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { calculateNextDueDate } from "@/lib/utils/date-calculator"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { NumericInput } from "@/components/ui/numeric-input"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Trash, Repeat } from "lucide-react"
import { PocketSelectionSheet } from "@/components/pocket-selection-sheet"
import { CategorySelectionSheet } from "@/components/category-selection-sheet"
import { PageHeader } from "@/components/ui/page-header"
import { AutoTextSize } from "@/components/ui/auto-text-size"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type TxType = "income" | "expense" | "transfer"

const now = (timestamp?: number) => {
  const d = timestamp ? new Date(timestamp) : new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function TransactionFormPage({
  isScheduleMode,
}: {
  isScheduleMode?: boolean
}) {
  const { id, scheduleId } = useParams()
  const navigate = useNavigate()

  // Form states
  const [type, setType] = useState<TxType>("expense")
  const [amount, setAmount] = useState<number | undefined>(undefined)
  const [date, setDate] = useState(now())
  const [pocketId, setPocketId] = useState<string | undefined>(undefined)
  const [destPocketId, setDestPocketId] = useState<string | undefined>(
    undefined
  )
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined)
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Recurring schedule states
  const [recurringType, setRecurringType] = useState<"bill" | "repeat">(
    "repeat"
  )
  const [recurringPeriod, setRecurringPeriod] = useState<string>("None")
  const [endDateStr, setEndDateStr] = useState("")

  // Draft states for the sheet
  const [draftRecurringType, setDraftRecurringType] = useState<
    "bill" | "repeat"
  >("repeat")
  const [draftRecurringPeriod, setDraftRecurringPeriod] =
    useState<string>("None")
  const [draftEndDateStr, setDraftEndDateStr] = useState("")

  const isRecurring = recurringPeriod !== "None" || !!isScheduleMode

  // Bottom sheets
  const [pocketSheetOpen, setPocketSheetOpen] = useState(false)
  const [destPocketSheetOpen, setDestPocketSheetOpen] = useState(false)
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)
  const [isRepeatSheetOpen, setIsRepeatSheetOpen] = useState(false)

  // Query lookups
  const wallets = useLiveQuery(() => db.wallets.toArray(), [], [])
  const pockets = useLiveQuery(() => db.pockets.toArray(), [], [])
  const categories = useLiveQuery(() => db.categories.toArray(), [], [])

  // Load existing transaction or schedule
  useEffect(() => {
    if (isScheduleMode && scheduleId) {
      const loadSchedule = async () => {
        const sc = await db.schedules.get(scheduleId)
        if (sc) {
          setType(sc.transactionType)
          setAmount(sc.amount)
          setDate(now(sc.nextDueDate))
          setPocketId(sc.pocketId)
          setDestPocketId(sc.destinationPocketId)
          setCategoryId(sc.categoryId)
          setNote(sc.note || "")
          setIsRepeatSheetOpen(false) // Assuming it might have been open, ensure clean state
          setRecurringType(sc.type)
          setRecurringPeriod(sc.period || "None")
          if (sc.endDate) {
            const ed = new Date(sc.endDate)
            setEndDateStr(
              `${ed.getFullYear()}-${String(ed.getMonth() + 1).padStart(2, "0")}-${String(ed.getDate()).padStart(2, "0")}`
            )
          }
        } else {
          toast.error("Schedule not found")
          navigate("/reminders")
        }
      }
      loadSchedule()
      return
    }

    if (!id) return
    const loadTx = async () => {
      const tx = await db.transactions.get(id)
      if (tx) {
        setType(tx.type)
        setAmount(tx.amount)
        setDate(now(tx.date))
        setPocketId(tx.pocketId)
        setDestPocketId(tx.destinationPocketId)
        setCategoryId(tx.categoryId)
        setNote(tx.note || "")
      } else {
        toast.error("Transaction not found")
        navigate("/transactions")
      }
    }
    loadTx()
  }, [id, scheduleId, isScheduleMode, navigate])

  const selectedPocket = pockets?.find((p) => p.id === pocketId)
  const selectedPocketWallet = wallets?.find(
    (w) => w.id === selectedPocket?.walletId
  )
  const selectedDestPocket = pockets?.find((p) => p.id === destPocketId)
  const selectedDestPocketWallet = wallets?.find(
    (w) => w.id === selectedDestPocket?.walletId
  )
  const selectedCategory = categories?.find((c) => c.id === categoryId)

  const handleOpenRepeatSheet = () => {
    setDraftRecurringType(recurringType)
    setDraftRecurringPeriod(recurringPeriod)
    setDraftEndDateStr(endDateStr)
    setIsRepeatSheetOpen(true)
  }

  const handleConfirmRepeat = () => {
    setRecurringType(draftRecurringType)
    setRecurringPeriod(draftRecurringPeriod)
    setEndDateStr(draftEndDateStr)
    setIsRepeatSheetOpen(false)
  }

  const handleSave = async (isContinue = false) => {
    if (!amount || amount <= 0) {
      toast.error("Please enter an amount")
      return
    }
    if (!pocketId) {
      toast.error("Please select a pocket")
      return
    }
    if (type === "transfer" && !destPocketId) {
      toast.error("Please select a destination pocket")
      return
    }
    if (type !== "transfer" && !categoryId) {
      toast.error("Please select a category")
      return
    }

    setSaving(true)
    try {
      if (isScheduleMode) {
        const selectedDate = new Date(date)
        const scheduleData = {
          type: recurringType,
          period: recurringPeriod as any,
          amount,
          note: note.trim() || undefined,
          pocketId: pocketId!,
          categoryId: type !== "transfer" ? categoryId : undefined,
          destinationPocketId: type === "transfer" ? destPocketId : undefined,
          transactionType: type,
          startDate: selectedDate.getTime(),
          nextDueDate: selectedDate.getTime(),
          isActive: 1,
          endDate: endDateStr ? new Date(endDateStr).getTime() : undefined,
        }

        if (scheduleId) {
          await db.schedules.update(scheduleId, scheduleData)
          toast.success("Recurring schedule updated")
        } else {
          await db.schedules.add({
            id: crypto.randomUUID(),
            ...scheduleData,
          })
          toast.success("Recurring schedule created")
        }
        navigate("/reminders")
        return
      }

      const txData = {
        type,
        amount,
        date: new Date(date).getTime(),
        note: note.trim() || undefined,
        pocketId: pocketId!,
        categoryId: type !== "transfer" ? categoryId : undefined,
        destinationPocketId: type === "transfer" ? destPocketId : undefined,
      }

      if (id) {
        await db.transactions.update(id, txData)
        toast.success("Transaction updated")
      } else {
        const isReminder = isRecurring && recurringType === "bill"

        // Only create immediate transaction if NOT a reminder
        if (!isReminder) {
          const savedTxId = crypto.randomUUID()
          await db.transactions.add({
            id: savedTxId,
            ...txData,
          })
        }

        if (isRecurring) {
          const selectedDate = new Date(date)
          // For manual reminders, the selected date is the first due date.
          // For repeat transactions, we calculate the next one.
          const nextDue =
            recurringType === "bill"
              ? selectedDate
              : calculateNextDueDate(selectedDate, recurringPeriod)

          const schedule: Schedule = {
            id: crypto.randomUUID(),
            type: recurringType,
            period: recurringPeriod as any,
            amount,
            note: note.trim() || undefined,
            pocketId: pocketId!,
            categoryId: type !== "transfer" ? categoryId : undefined,
            destinationPocketId: type === "transfer" ? destPocketId : undefined,
            transactionType: type,
            startDate: selectedDate.getTime(),
            nextDueDate: nextDue.getTime(),
            isActive: 1,
            endDate: endDateStr ? new Date(endDateStr).getTime() : undefined,
          }

          await db.schedules.add(schedule)
          toast.success(
            recurringType === "bill"
              ? "Reminder created"
              : "Recurring schedule created"
          )

          if (recurringType === "bill") {
            navigate("/reminders")
            return
          }
        } else {
          toast.success("Transaction added")
        }
      }

      if (isContinue) {
        setAmount(undefined)
        setNote("")
        setDate(now())
        setRecurringPeriod("None")
        setEndDateStr("")
      } else {
        // Use replace if we came from transactions or reminders to avoid history loops
        const from = isScheduleMode ? "/reminders" : "/transactions"
        navigate(from, { replace: true })
      }
    } catch (e) {
      console.error(e)
      toast.error("Failed to save transaction")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (isScheduleMode && scheduleId) {
      try {
        await db.schedules.delete(scheduleId)
        toast.success("Schedule deleted")
        navigate("/bills")
      } catch {
        toast.error("Failed to delete schedule")
      }
      return
    }

    if (!id) return
    try {
      await db.transactions.delete(id)
      toast.success("Transaction deleted")
      navigate("/transactions")
    } catch {
      toast.error("Failed to delete transaction")
    }
  }

  return (
    <>
      <div className="flex h-dvh flex-col overflow-hidden">
        {/* Sticky Header */}
        <PageHeader className="shrink-0 justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="mr-1 size-5" />
            Back
          </button>
          <h1 className="text-base font-semibold">
            {isScheduleMode
              ? scheduleId
                ? "Edit Recurring Schedule"
                : "New Recurring Schedule"
              : id
                ? "Edit Transaction"
                : "New Transaction"}
          </h1>
          <div className="size-8" /> {/* Balance spacer */}
        </PageHeader>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-md space-y-6">
            {/* Type Selector Tabs */}
            <div className="flex rounded-xl border bg-muted/20 p-1">
              {(["expense", "income", "transfer"] as TxType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(t)
                    setCategoryId(undefined)
                  }}
                  className={cn(
                    "flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-all",
                    type === t
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Amount Section */}
            <div className="space-y-1.5 rounded-2xl border bg-muted/5 p-4">
              <label className="text-xs font-semibold tracking-wider text-foreground uppercase">
                Amount
              </label>
              <div className="flex items-center justify-between gap-2 border-b pb-2">
                <AutoTextSize
                  className="shrink-0 font-bold text-foreground"
                  maxSizeRem={1.5}
                  minSizeRem={0.8}
                >
                  Rp
                </AutoTextSize>
                <NumericInput
                  value={amount}
                  onValueChange={(v) => setAmount(v ? parseFloat(v) : 0)}
                  className="h-auto flex-1 border-none bg-transparent p-0 text-right text-3xl font-black text-foreground shadow-none focus-visible:ring-0 dark:bg-transparent"
                  placeholder="0"
                />
                {(!id || isScheduleMode) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "ml-2 h-10 w-10 shrink-0 rounded-xl",
                      isRecurring && "text-primary"
                    )}
                    onClick={handleOpenRepeatSheet}
                  >
                    <Repeat
                      className={cn(
                        "size-5",
                        isRecurring && "animate-spin-once"
                      )}
                    />
                  </Button>
                )}
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 pb-4">
              {/* Date Picker */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  {isRecurring && recurringType === "bill"
                    ? "Due Date"
                    : "Date & Time"}
                </label>
                <Input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 dark:[&::-webkit-calendar-picker-indicator]:invert"
                />
              </div>

              {/* Pocket Picker Button */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  {type === "transfer" ? "From Pocket" : "Pocket"}
                </label>
                <button
                  type="button"
                  onClick={() => setPocketSheetOpen(true)}
                  className="flex w-full items-center justify-between rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:bg-muted"
                >
                  {selectedPocket ? (
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {selectedPocket.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selectedPocketWallet?.name || "Wallet"}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Select a pocket
                    </span>
                  )}
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              </div>

              {/* Destination Pocket (Only for transfers) */}
              {type === "transfer" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">To Pocket</label>
                  <button
                    type="button"
                    onClick={() => setDestPocketSheetOpen(true)}
                    className="flex w-full items-center justify-between rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:bg-muted"
                  >
                    {selectedDestPocket ? (
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {selectedDestPocket.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedDestPocketWallet?.name || "Wallet"}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Select destination pocket
                      </span>
                    )}
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                </div>
              )}

              {/* Category Picker (Only for income/expense) */}
              {type !== "transfer" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Category</label>
                  <button
                    type="button"
                    onClick={() => setCategorySheetOpen(true)}
                    className="flex w-full items-center justify-between rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:bg-muted"
                  >
                    {selectedCategory ? (
                      <div className="flex items-center gap-3">
                        <div
                          className="flex size-8 items-center justify-center rounded-full text-sm"
                          style={{
                            backgroundColor: selectedCategory.color
                              ? `${selectedCategory.color}20`
                              : "#6b728020",
                          }}
                        >
                          {selectedCategory.icon}
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          {selectedCategory.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Select a category
                      </span>
                    )}
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                </div>
              )}

              {/* Note Input */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Note</label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Lunch at Noodle Shop"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="w-full shrink-0 border-t bg-background p-4">
          <div className="mx-auto flex max-w-md gap-2">
            {id || scheduleId ? (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-12 w-12 shrink-0 rounded-xl"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash className="size-5" />
                </Button>
                <Button
                  className="h-12 flex-1 rounded-xl text-base font-bold"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  className={cn(
                    "h-12 rounded-xl text-base font-bold",
                    isScheduleMode ? "w-full" : "w-2/3"
                  )}
                  onClick={() => handleSave(false)}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
                {!isScheduleMode && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 w-1/3 rounded-xl text-base font-bold"
                    onClick={() => handleSave(true)}
                    disabled={saving}
                  >
                    Continue
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Repeating Options Drawer */}
      <Drawer open={isRepeatSheetOpen} onOpenChange={setIsRepeatSheetOpen}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Repeating Schedule</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 py-4">
            <div className="space-y-6">
              <div className="space-y-4">
                {/* Schedule Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Schedule Type
                  </label>
                  <div className="flex rounded-xl bg-muted p-1">
                    <button
                      type="button"
                      onClick={() => setDraftRecurringType("repeat")}
                      className={cn(
                        "flex-1 rounded-lg py-2.5 text-center text-sm font-semibold transition-all",
                        draftRecurringType === "repeat"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Auto-Repeat
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraftRecurringType("bill")}
                      className={cn(
                        "flex-1 rounded-lg py-2.5 text-center text-sm font-semibold transition-all",
                        draftRecurringType === "bill"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Manual Reminder
                    </button>
                  </div>
                </div>

                {/* Period Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Repeat Period
                  </label>
                  <select
                    value={draftRecurringPeriod}
                    onChange={(e) => setDraftRecurringPeriod(e.target.value)}
                    className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    {[
                      "None",
                      "Every Day",
                      "Weekdays",
                      "Weekend",
                      "Every Week",
                      "Every 2 Weeks",
                      "Every 4 Weeks",
                      "Every Month",
                      "The end of the month",
                      "Every 2 Month",
                      "Every 3 Month",
                      "Every 4 Month",
                      "Every 6 Month",
                      "Anually",
                    ].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* End Date (Optional) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    End Date (Optional)
                  </label>
                  <Input
                    type="date"
                    value={draftEndDateStr}
                    onChange={(e) => setDraftEndDateStr(e.target.value)}
                    className="h-12 rounded-xl dark:[&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>
              </div>
            </div>
          </div>
          <DrawerFooter className="border-t">
            <Button
              className="h-12 w-full rounded-xl font-bold"
              onClick={handleConfirmRepeat}
            >
              Done
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Pocket Selection bottom sheet */}
      <PocketSelectionSheet
        open={pocketSheetOpen}
        onOpenChange={setPocketSheetOpen}
        onSelect={setPocketId}
      />

      {/* Destination Pocket Selection bottom sheet */}
      {type === "transfer" && (
        <PocketSelectionSheet
          open={destPocketSheetOpen}
          onOpenChange={setDestPocketSheetOpen}
          onSelect={setDestPocketId}
          excludePocketId={pocketId}
        />
      )}

      {/* Category Selection bottom sheet */}
      {type !== "transfer" && (
        <CategorySelectionSheet
          open={categorySheetOpen}
          onOpenChange={setCategorySheetOpen}
          onSelect={setCategoryId}
          type={type}
        />
      )}

      {/* Deletion Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isScheduleMode ? "Delete Schedule?" : "Delete Transaction?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this{" "}
              {isScheduleMode ? "schedule" : "transaction"}? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
