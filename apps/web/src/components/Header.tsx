import { Link } from "@tanstack/react-router";

import ThemeToggle from "./ThemeToggle";

const baseNavLinkClassName =
	"rounded-full border px-4 py-2 text-sm font-semibold transition hover:bg-muted";

export default function Header() {
	return (
		<header className="sticky top-0 z-50 border-b bg-background/85 px-4 backdrop-blur">
			<nav className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 py-4">
				<Link
					to="/"
					className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm"
				>
					<span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
					Game Companion
				</Link>

				<div className="order-3 flex w-full flex-wrap gap-2 sm:order-2 sm:w-auto sm:items-center">
					<Link
						to="/"
						className={baseNavLinkClassName}
						activeProps={{
							className:
								"rounded-full border border-primary bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold transition",
						}}
					>
						Cards
					</Link>
					<Link
						to="/decks"
						className={baseNavLinkClassName}
						activeProps={{
							className:
								"rounded-full border border-primary bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold transition",
						}}
					>
						Decks
					</Link>
					<Link
						to="/rooms"
						className={baseNavLinkClassName}
						activeProps={{
							className:
								"rounded-full border border-primary bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold transition",
						}}
					>
						Rooms
					</Link>
					<Link
						to="/game"
						className={baseNavLinkClassName}
						activeProps={{
							className:
								"rounded-full border border-primary bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold transition",
						}}
					>
						Play
					</Link>
				</div>

				<div className="ml-auto">
					<ThemeToggle />
				</div>
			</nav>
		</header>
	);
}
