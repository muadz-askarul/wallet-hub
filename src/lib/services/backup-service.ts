import { db } from "../db"

/**
 * Single Consolidated CSV Backup & Restore Service
 */

// Helper to escape CSV values
function escapeCSV(val: unknown): string {
  if (val === undefined || val === null) return ""
  const str = String(val).replace(/"/g, '""')
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str}"`
  }
  return str
}

export async function exportDataAsCSV() {
  const wallets = await db.wallets.toArray()
  const pockets = await db.pockets.toArray()
  const transactions = await db.transactions.toArray()
  const schedules = await db.schedules.toArray()
  const categories = await db.categories.toArray()
  const settings = await db.settings.toArray()

  const rows: string[] = []
  // Header: table_name, data_json
  rows.push("table_name,data_json")

  const addTableRows = (name: string, data: unknown[]) => {
    data.forEach((item) => {
      rows.push(`${name},${escapeCSV(JSON.stringify(item))}`)
    })
  }

  addTableRows("wallets", wallets)
  addTableRows("pockets", pockets)
  addTableRows("transactions", transactions)
  addTableRows("schedules", schedules)
  addTableRows("categories", categories)
  addTableRows("settings", settings)

  const csvContent = rows.join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const fileName = `wallet_hub_backup_${new Date().toISOString().split("T")[0]}.csv`

  // Use Web Share API if available
  if (
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({
      files: [new File([blob], fileName, { type: "text/csv" })],
    })
  ) {
    try {
      const file = new File([blob], fileName, { type: "text/csv" })
      await navigator.share({
        title: "Wallet Hub Backup",
        text: "My Wallet Hub Data Backup",
        files: [file],
      })
      return true
    } catch (err) {
      console.error("Share failed", err)
      // Fallback to download
    }
  }

  // Fallback: Standard Download
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", fileName)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  return true
}

export async function importDataFromCSV(file: File): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        if (!text) throw new Error("File empty")

        const lines = text.split("\n")
        // Skip header
        const dataLines = lines.slice(1)

        const tableData: Record<string, unknown[]> = {
          wallets: [],
          pockets: [],
          transactions: [],
          schedules: [],
          categories: [],
          settings: [],
        }

        for (const line of dataLines) {
          if (!line.trim()) continue

          // Simple but careful split for table_name,data_json
          // Since data_json is escaped/quoted JSON, we find the first comma
          const firstCommaIndex = line.indexOf(",")
          if (firstCommaIndex === -1) continue

          const tableName = line.substring(0, firstCommaIndex)
          let jsonStr = line.substring(firstCommaIndex + 1)

          // Unescape JSON if it was quoted
          if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) {
            jsonStr = jsonStr
              .substring(1, jsonStr.length - 1)
              .replace(/""/g, '"')
          }

          if (tableData[tableName]) {
            tableData[tableName].push(JSON.parse(jsonStr))
          }
        }

        // Use transaction to ensure atomic update
        await db.transaction(
          "rw",
          [
            db.wallets,
            db.pockets,
            db.transactions,
            db.schedules,
            db.categories,
            db.settings,
          ],
          async () => {
            // Clear current data
            await db.wallets.clear()
            await db.pockets.clear()
            await db.transactions.clear()
            await db.schedules.clear()
            await db.categories.clear()
            await db.settings.clear()

            // Import new data
            if (tableData.wallets.length)
              await db.wallets.bulkAdd(tableData.wallets as never[])
            if (tableData.pockets.length)
              await db.pockets.bulkAdd(tableData.pockets as never[])
            if (tableData.transactions.length)
              await db.transactions.bulkAdd(tableData.transactions as never[])
            if (tableData.schedules.length)
              await db.schedules.bulkAdd(tableData.schedules as never[])
            if (tableData.categories.length)
              await db.categories.bulkAdd(tableData.categories as never[])
            if (tableData.settings.length)
              await db.settings.bulkAdd(tableData.settings as never[])
          }
        )

        resolve(true)
      } catch (err) {
        console.error("Import failed", err)
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error("File read error"))
    reader.readAsText(file)
  })
}
