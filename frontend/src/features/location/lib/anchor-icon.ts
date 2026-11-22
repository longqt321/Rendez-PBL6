import { BriefcaseIcon, GraduationCapIcon, HomeIcon, MapPinIcon } from "lucide-react"
import type { AnchorKind } from "@rendez/schema"

export function anchorKindIcon(kind: AnchorKind) {
  switch (kind) {
    case "home":
      return HomeIcon
    case "work":
      return BriefcaseIcon
    case "school":
      return GraduationCapIcon
    default:
      return MapPinIcon
  }
}
