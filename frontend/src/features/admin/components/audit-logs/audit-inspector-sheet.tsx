import type { AuditLogEntry } from "@rendez/schema"
import { ArrowRightIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Item, ItemContent, ItemTitle } from "@/components/ui/item"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime } from "@/lib/format"
import { auditActionVariant } from "../../lib/admin-constants"
import { AdminStatGrid } from "../shared/admin-stat-grid"

function renderMetaValue(value: unknown): string {
  if (value === null) return "null"
  if (value === undefined) return "-"
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return JSON.stringify(value, null, 2)
}

export function AuditInspectorSheet({
  entry,
  onClose,
}: Readonly<{ entry: AuditLogEntry | null; onClose: () => void }>) {
  return (
    <Sheet open={entry !== null} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        {entry ? <AuditInspectorBody entry={entry} /> : null}
      </SheetContent>
    </Sheet>
  )
}

function AuditInspectorBody({ entry }: Readonly<{ entry: AuditLogEntry }>) {
  const metaEntries = Object.entries(entry.meta)
  const roleFrom = entry.meta.roleFrom
  const roleTo = entry.meta.roleTo
  const prevStatus = entry.meta.previousStatus
  const nextStatus = entry.meta.nextStatus

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <Badge variant={auditActionVariant(entry.action)} className="font-mono text-xs">
            {entry.action}
          </Badge>
          <span className="text-sm font-medium">{entry.entity}</span>
        </SheetTitle>
        <SheetDescription>{formatDateTime(entry.createdAt)}</SheetDescription>
      </SheetHeader>

      <div className="space-y-4 px-4 pb-6 text-xs">
        <AdminStatGrid
          items={[
            {
              label: "Người thực hiện",
              value: entry.actor ? `${entry.actor.name} (@${entry.actor.handle})` : "Hệ thống",
            },
            { label: "Địa chỉ IP", value: entry.ip ?? "-", mono: true },
            { label: "Mã đối tượng", value: entry.entityId ?? "-", mono: true, fullWidth: true },
          ]}
        />

        {typeof roleFrom === "string" && typeof roleTo === "string" && roleFrom !== roleTo ? (
          <Item variant="outline" size="sm">
            <ItemContent>
              <ItemTitle className="flex items-center gap-2 text-xs font-normal">
                Vai trò:
                <Badge variant="outline">{roleFrom}</Badge>
                <ArrowRightIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                <Badge variant="default">{roleTo}</Badge>
              </ItemTitle>
            </ItemContent>
          </Item>
        ) : null}

        {typeof prevStatus === "string" && typeof nextStatus === "string" ? (
          <Item variant="outline" size="sm">
            <ItemContent>
              <ItemTitle className="flex items-center gap-2 text-xs font-normal">
                Trạng thái:
                <Badge variant="outline">{prevStatus}</Badge>
                <ArrowRightIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                <Badge variant="secondary">{nextStatus}</Badge>
              </ItemTitle>
            </ItemContent>
          </Item>
        ) : null}

        <Separator />

        <div className="space-y-2">
          <SheetDescription className="font-semibold text-foreground">
            Dữ liệu đính kèm
          </SheetDescription>
          {metaEntries.length === 0 ? (
            <SheetDescription>Không có metadata.</SheetDescription>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table aria-label="Bảng metadata nhật ký">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-36">Trường</TableHead>
                    <TableHead>Giá trị</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metaEntries.map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell className="font-mono text-xs font-medium">{key}</TableCell>
                      <TableCell className="font-mono text-xs break-all whitespace-pre-wrap text-muted-foreground">
                        {renderMetaValue(value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
