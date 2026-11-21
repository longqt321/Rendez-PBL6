import { Link } from "react-router"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { useMe } from "@/features/profile/hooks/use-me"
import { cn } from "@/lib/utils"
import { useUserSuggestions } from "../hooks/use-user-suggestions"
import { FollowButton } from "./follow-button"

interface UserSuggestionsSectionProps {
  readonly variant?: "grid" | "sidebar"
}

export function UserSuggestionsSection({ variant = "grid" }: UserSuggestionsSectionProps) {
  const { data: me } = useMe()
  const { data: suggestions, isPending, isError } = useUserSuggestions()

  if (!me || isError) return null

  const gridClass =
    variant === "sidebar"
      ? "mt-2 flex flex-col gap-2"
      : "mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3"

  if (isPending) {
    return (
      <section className="mb-4" aria-label="Gợi ý theo dõi">
        <h2 className="text-sm font-semibold">Gợi ý theo dõi</h2>
        <div className={gridClass}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-surface" />
          ))}
        </div>
      </section>
    )
  }

  const items = suggestions ?? []
  if (items.length === 0) return null

  return (
    <section className="mb-4" aria-label="Gợi ý theo dõi">
      <h2 className="text-sm font-semibold">Gợi ý theo dõi</h2>
      <ul className={cn(gridClass)}>
        {items.map((suggestion) => (
          <li key={suggestion.user.id}>
            <Item
              variant="outline"
              className="rounded-surface bg-card transition-colors hover:bg-muted"
              render={<Link to={`/u/${suggestion.user.handle}`} />}
            >
              <ItemMedia>
                <Avatar size="lg">
                  {suggestion.user.avatarUrl && (
                    <AvatarImage
                      src={suggestion.user.avatarUrl}
                      alt={`Ảnh đại diện của ${suggestion.user.name}`}
                    />
                  )}
                  <AvatarFallback className="bg-accent text-sm font-bold text-accent-foreground">
                    {suggestion.user.initials}
                  </AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="text-sm font-semibold">{suggestion.user.name}</ItemTitle>
                <ItemDescription className="text-xs">
                  @{suggestion.user.handle} · {suggestion.reason}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <FollowButton user={suggestion.user} />
              </ItemActions>
            </Item>
          </li>
        ))}
      </ul>
    </section>
  )
}
