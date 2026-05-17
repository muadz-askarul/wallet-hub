import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { NumericInput } from "@/components/ui/numeric-input"
import { Button } from "@/components/ui/button"
import { GripVertical, Trash } from "lucide-react"

export type DraftPocket = {
  id?: string
  name: string
  amount: string
  _key: string // stable drag key
}

interface SortablePocketRowProps {
  pocket: DraftPocket
  onUpdateName: (val: string) => void
  onUpdateAmount: (val: string) => void
  onDelete: () => void
}

export function SortablePocketRow({
  pocket,
  onUpdateName,
  onUpdateAmount,
  onDelete,
}: SortablePocketRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: pocket._key })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 rounded-lg border bg-muted/10 p-3"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-1.5 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-5" />
      </button>

      <div className="flex-1 space-y-2">
        <div>
          <Label className="text-xs text-muted-foreground">Name</Label>
          <Input
            value={pocket.name}
            onChange={(e) => onUpdateName(e.target.value)}
            placeholder="Pocket Name"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Balance (Rp)</Label>
          <NumericInput
            value={pocket.amount}
            onValueChange={onUpdateAmount}
            placeholder="0"
            className="h-8 text-sm"
          />
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="mt-0.5 size-8 self-start text-destructive"
        onClick={onDelete}
      >
        <Trash className="size-4" />
      </Button>
    </div>
  )
}
