import { db, type Schedule, type Transaction } from "../db"
import { calculateNextDueDate } from "../utils/date-calculator"

export async function processAutoRepeatTransactions() {
  const now = Date.now()
  const activeSchedules = await db.schedules
    .where("type")
    .equals("repeat")
    .filter((s) => s.isActive === 1 && s.nextDueDate <= now)
    .toArray()

  if (activeSchedules.length === 0) return

  await db.transaction("rw", [db.transactions, db.schedules], async () => {
    for (const schedule of activeSchedules) {
      let currentDue = new Date(schedule.nextDueDate)
      const transactionsToAdd: Transaction[] = []

      while (currentDue.getTime() <= now) {
        // Stop if we hit the optional end date
        if (schedule.endDate && currentDue.getTime() > schedule.endDate) {
          schedule.isActive = 0
          break
        }

        const newTx: Transaction = {
          id: crypto.randomUUID(),
          type: schedule.transactionType,
          amount: schedule.amount,
          date: currentDue.getTime(),
          note: schedule.note,
          pocketId: schedule.pocketId,
          categoryId: schedule.categoryId,
          destinationPocketId: schedule.destinationPocketId,
        }

        transactionsToAdd.push(newTx)
        schedule.lastTriggeredDate = currentDue.getTime()

        // Advance to next due date
        const nextDue = calculateNextDueDate(currentDue, schedule.period)
        currentDue = nextDue

        // Disable if next occurrences are beyond end date
        if (schedule.endDate && currentDue.getTime() > schedule.endDate) {
          schedule.isActive = 0
          break
        }
      }

      schedule.nextDueDate = currentDue.getTime()

      // Bulk add all generated transactions
      if (transactionsToAdd.length > 0) {
        await db.transactions.bulkAdd(transactionsToAdd)
      }
      await db.schedules.put(schedule)
    }
  })
}

export async function triggerBillPayment(scheduleId: string) {
  const schedule = await db.schedules.get(scheduleId)
  if (!schedule) return

  await db.transaction("rw", [db.transactions, db.schedules], async () => {
    const newTx: Transaction = {
      id: crypto.randomUUID(),
      type: schedule.transactionType,
      amount: schedule.amount,
      date: Date.now(), // Bill completed now
      note: schedule.note,
      pocketId: schedule.pocketId,
      categoryId: schedule.categoryId,
      destinationPocketId: schedule.destinationPocketId,
    }

    await db.transactions.add(newTx)

    schedule.lastTriggeredDate = schedule.nextDueDate
    const nextDue = calculateNextDueDate(
      new Date(schedule.nextDueDate),
      schedule.period
    )

    if (schedule.endDate && nextDue.getTime() > schedule.endDate) {
      schedule.isActive = 0
    }

    schedule.nextDueDate = nextDue.getTime()
    await db.schedules.put(schedule)
  })
}
