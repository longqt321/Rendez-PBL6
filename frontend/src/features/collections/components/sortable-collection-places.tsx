import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVerticalIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Item, ItemGroup } from "@/components/ui/item"
import { cn } from "@/lib/utils"
import { useReorderCollectionPlaces } from "../hooks/use-collections"

interface SortableItemWrapperProps {
  readonly id: string
  readonly enabled: boolean
  readonly children: React.ReactNode
}

function SortableItemWrapper({ id, enabled, children }: SortableItemWrapperProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !enabled,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <Item
      ref={setNodeRef}
      style={style}
      role="listitem"
      className={cn(
        "relative h-full border-0 p-0 [&>*]:w-full",
        isDragging && "z-20 opacity-85 shadow-lg",
      )}
    >
      {enabled ? (
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="absolute top-2.5 left-2.5 z-10 cursor-grab bg-background/90 backdrop-blur active:cursor-grabbing"
          aria-label="Kéo để sắp xếp thứ tự địa điểm"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon aria-hidden="true" />
        </Button>
      ) : null}
      {children}
    </Item>
  )
}

interface SortableCollectionPlacesProps {
  readonly collectionId: string
  readonly placeIds: string[]
  readonly canReorder: boolean
  readonly renderItem: (placeId: string) => React.ReactNode
}

export function SortableCollectionPlaces({
  collectionId,
  placeIds,
  canReorder,
  renderItem,
}: SortableCollectionPlacesProps) {
  const reorder = useReorderCollectionPlaces(collectionId)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = placeIds.indexOf(String(active.id))
    const newIndex = placeIds.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return

    const nextOrder = arrayMove(placeIds, oldIndex, newIndex)
    reorder.mutate(nextOrder, {
      onError: () => toast.error("Không lưu được thứ tự mới, thử lại nhé"),
    })
  }

  const sortableEnabled = canReorder && placeIds.length > 1

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={placeIds} strategy={rectSortingStrategy}>
        <ItemGroup className="mt-6 grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {placeIds.map((placeId) => (
            <SortableItemWrapper key={placeId} id={placeId} enabled={sortableEnabled}>
              {renderItem(placeId)}
            </SortableItemWrapper>
          ))}
        </ItemGroup>
      </SortableContext>
    </DndContext>
  )
}
