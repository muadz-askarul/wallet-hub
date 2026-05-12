export function calculateNextDueDate(currentDate: Date, period: string): Date {
  const next = new Date(currentDate)
  next.setHours(0, 0, 0, 0)

  switch (period) {
    case "Every Day":
      next.setDate(next.getDate() + 1)
      break
    case "Weekdays":
      next.setDate(next.getDate() + 1)
      while (next.getDay() === 0 || next.getDay() === 6) {
        next.setDate(next.getDate() + 1)
      }
      break
    case "Weekend":
      next.setDate(next.getDate() + 1)
      while (next.getDay() >= 1 && next.getDay() <= 5) {
        next.setDate(next.getDate() + 1)
      }
      break
    case "Every Week":
      next.setDate(next.getDate() + 7)
      break
    case "Every 2 Weeks":
      next.setDate(next.getDate() + 14)
      break
    case "Every 4 Weeks":
      next.setDate(next.getDate() + 28)
      break
    case "Every Month":
      next.setMonth(next.getMonth() + 1)
      break
    case "The end of the month": {
      const firstOfNextNext = new Date(
        next.getFullYear(),
        next.getMonth() + 2,
        1
      )
      firstOfNextNext.setDate(firstOfNextNext.getDate() - 1)
      return firstOfNextNext
    }
    case "Every 2 Month":
      next.setMonth(next.getMonth() + 2)
      break
    case "Every 3 Month":
      next.setMonth(next.getMonth() + 3)
      break
    case "Every 4 Month":
      next.setMonth(next.getMonth() + 4)
      break
    case "Every 6 Month":
      next.setMonth(next.getMonth() + 6)
      break
    case "Anually":
    case "Annually":
      next.setMonth(next.getMonth() + 12)
      break
    default:
      next.setDate(next.getDate() + 1)
  }
  return next
}
