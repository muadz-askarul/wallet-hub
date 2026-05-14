import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"

interface CategorySelectionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (categoryId: string) => void
  type: "income" | "expense"
}

export function CategorySelectionSheet({
  open,
  onOpenChange,
  onSelect,
  type,
}: CategorySelectionSheetProps) {
  const [search, setSearch] = useState("")

  const categories = useLiveQuery(
    () => db.categories.where("type").equals(type).toArray(),
    [type],
    []
  )

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex !max-h-[50svh] flex-col">
        <DrawerHeader className="border-b pb-4 text-left">
          <DrawerTitle>Select Category</DrawerTitle>
          <div className="relative mt-3">
            <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 pl-9 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute top-2.5 right-3 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredCategories.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No categories found.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filteredCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    onSelect(cat.id)
                    onOpenChange(false)
                    setSearch("")
                  }}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted"
                >
                  <div
                    className="flex size-9 items-center justify-center rounded-full text-lg shadow-inner"
                    style={{
                      backgroundColor: cat.color ? `${cat.color}` : "#6b728050",
                    }}
                  >
                    {cat.icon || "📦"}
                  </div>
                  <span className="truncate text-sm font-semibold text-foreground">
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
