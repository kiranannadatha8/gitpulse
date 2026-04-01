import { LuLogOut, LuUser } from "react-icons/lu";
import { useAuth } from "../hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu(): JSX.Element {
  const { user, logout } = useAuth();

  const displayName = user?.displayName ?? user?.username ?? "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label={`User menu for ${displayName}`}
        >
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.avatarUrl ?? undefined} alt={displayName} />
            <AvatarFallback className="text-[11px] font-medium bg-primary text-primary-foreground">
              {initials || <LuUser size={14} />}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium text-foreground">{displayName}</span>
            {user?.username && (
              <span className="text-[11px] text-muted-foreground">@{user.username}</span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 text-[13px] cursor-pointer"
          onSelect={() => void logout()}
        >
          <LuLogOut size={13} aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
