import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db, type Category } from "@/lib/db"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Plus, Pencil, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"

const COMMON_ICONS = [
  "🛍️",
  "🛒",
  "📋",
  "🏥",
  "💄",
  "🍜",
  "🍿",
  "☕",
  "🚗",
  "👗",
  "📚",
  "🏠",
  "🎁",
  "📦",
  "💼",
  "💵",
  "🎓",
  "🎉",
  "💰",
  "🍕",
  "🎮",
  "✈️",
  "🏋️",
  "🎵",
  "💊",
  "🐾",
  "🌱",
  "🔧",
  "💻",
  "📱",
]

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#f43f5e",
  "#6b7280",
]

interface CategoryFormData {
  name: string
  type: "income" | "expense"
  icon: string
  color: string
}

const defaultForm = (): CategoryFormData => ({
  name: "",
  type: "expense",
  icon: "📦",
  color: "#6b7280",
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CategoryManagementSheet({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"expense" | "income">("expense")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<CategoryFormData>(defaultForm())
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const categories = useLiveQuery(
    () => db.categories.where("type").equals(tab).toArray(),
    [tab],
    []
  )

  const openAdd = () => {
    setEditing(null)
    setForm({ ...defaultForm(), type: tab })
    setFormOpen(true)
  }

  const openEdit = (cat: Category) => {
    setEditing(cat)
    setForm({
      name: cat.name,
      type: cat.type,
      icon: cat.icon || "📦",
      color: cat.color || "#6b7280",
    })
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    if (editing) {
      await db.categories.update(editing.id, {
        name: form.name.trim(),
        icon: form.icon,
        color: form.color,
      })
    } else {
      await db.categories.add({
        id: crypto.randomUUID(),
        name: form.name.trim(),
        type: form.type,
        icon: form.icon,
        color: form.color,
      })
    }
    setFormOpen(false)
  }

  const handleDelete = async () => {
    if (!deletingId) return
    await db.categories.delete(deletingId)
    setDeletingId(null)
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="flex max-h-[90dvh] flex-col">
          <DrawerHeader className="border-b text-left">
            <div className="flex items-center justify-between">
              <DrawerTitle>Categories</DrawerTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Type Tab */}
            <div className="mt-3 flex rounded-lg border p-1">
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "flex-1 rounded-md py-1.5 text-sm font-medium capitalize transition-colors",
                    tab === t
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </DrawerHeader>

          {/* Category List */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 rounded-xl border px-4 py-3"
                >
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-full text-xl"
                    style={{
                      backgroundColor: cat.color
                        ? `${cat.color}CC`
                        : "#6b728066",
                    }}
                  >
                    {cat.icon || "📦"}
                  </div>
                  <span className="flex-1 font-medium">{cat.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    onClick={() => openEdit(cat)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive"
                    onClick={() => setDeletingId(cat.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Add Button */}
          <div className="border-t p-4">
            <Button className="w-full" onClick={openAdd}>
              <Plus className="mr-2 size-4" />
              Add Category
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Add / Edit Form Sheet */}
      <Drawer open={formOpen} onOpenChange={setFormOpen}>
        <DrawerContent>
          <DrawerHeader className="border-b text-left">
            <DrawerTitle>
              {editing ? "Edit Category" : "Add Category"}
            </DrawerTitle>
          </DrawerHeader>
          <div className="space-y-5 p-4 pb-8">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Category name"
              />
            </div>

            {/* Icon Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Icon</label>
              <div className="grid grid-cols-10 gap-1">
                {COMMON_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setForm({ ...form, icon })}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg text-xl transition-colors",
                      form.icon === icon
                        ? "bg-primary/20 ring-2 ring-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setForm({ ...form, color })}
                    className={cn(
                      "size-8 rounded-full transition-transform",
                      form.color === color &&
                        "scale-125 ring-2 ring-primary ring-offset-2"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 rounded-xl border px-4 py-3">
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-xl"
                style={{ backgroundColor: `${form.color}CC` }}
              >
                {form.icon}
              </div>
              <span className="font-medium">{form.name || "Preview"}</span>
            </div>

            <Button
              className="w-full"
              onClick={handleSave}
              disabled={!form.name.trim()}
            >
              {editing ? "Save Changes" : "Add Category"}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this category. Transactions linked to
              it will still exist but lose their category assignment.
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
