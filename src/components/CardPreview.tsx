import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { getIcon } from "../lib/icons";
import type { Card as GameCard, Rarity } from "../lib/storage";

const rarityClasses: Record<Rarity, string> = {
	common:
		"border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100",
	rare: "border-blue-300 bg-blue-100 text-blue-950 dark:border-blue-700 dark:bg-blue-950/60 dark:text-blue-100",
	epic: "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-950 dark:border-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-100",
	legendary:
		"border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-100",
};

export function CardPreview({
	card,
	compact = false,
}: {
	card: Pick<GameCard, "name" | "effect" | "rarity" | "iconId">;
	compact?: boolean;
}) {
	const IconComponent = getIcon(card.iconId);

	return (
		<Card
			className={`mx-auto w-full border-2 ${rarityClasses[card.rarity]} ${
				compact ? "max-w-[16rem]" : "max-w-[18rem]"
			}`}
		>
			<CardHeader className="pb-2 text-center">
				<CardTitle className={compact ? "text-base" : "text-xl"}>
					{card.name}
				</CardTitle>
				<div className="flex justify-center">
					<Badge variant="outline" className="capitalize bg-background/70">
						{card.rarity}
					</Badge>
				</div>
			</CardHeader>
			<CardContent
				className={`flex flex-1 flex-col items-center justify-center gap-3 text-center ${compact ? "min-h-[12rem]" : "min-h-[16rem]"}`}
			>
				<IconComponent size={compact ? 42 : 58} />
				<p
					className={`leading-relaxed opacity-90 ${compact ? "line-clamp-3 text-xs" : "text-sm"}`}
				>
					{card.effect}
				</p>
			</CardContent>
		</Card>
	);
}

export { rarityClasses };
