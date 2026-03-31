import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Badge } from "../components/ui/badge";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "../components/ui/card";
import { GAME_ICONS, type GameIconId, getIcon } from "../lib/icons";
import {
	type Card as GameCard,
	getCards,
	type Rarity,
	saveCards,
	syncStoredSessionCard,
} from "../lib/storage";

export const Route = createFileRoute("/")({
	component: CardsPage,
});

const rarityClasses: Record<Rarity, string> = {
	common:
		"border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100",
	rare: "border-blue-300 bg-blue-100 text-blue-950 dark:border-blue-700 dark:bg-blue-950/60 dark:text-blue-100",
	epic: "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-950 dark:border-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-100",
	legendary:
		"border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-100",
};

function CardsPage() {
	const [cards, setCards] = useState<GameCard[]>([]);
	const [name, setName] = useState("");
	const [effect, setEffect] = useState("");
	const [rarity, setRarity] = useState<Rarity>("common");
	const [iconId, setIconId] = useState<GameIconId>(GAME_ICONS[0]);
	const [editingCardId, setEditingCardId] = useState<string | null>(null);

	useEffect(() => {
		setCards(getCards());
	}, []);

	const PreviewIcon = getIcon(iconId);

	function resetForm() {
		setName("");
		setEffect("");
		setRarity("common");
		setIconId(GAME_ICONS[0]);
		setEditingCardId(null);
	}

	function handleCreate(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const trimmedName = name.trim();
		const trimmedEffect = effect.trim();

		if (!trimmedName || !trimmedEffect) {
			return;
		}

		const nextCard: GameCard = {
			id: editingCardId ?? `card-${Date.now()}`,
			name: trimmedName,
			effect: trimmedEffect,
			rarity,
			iconId,
		};

		const nextCards = editingCardId
			? cards.map((card) => (card.id === editingCardId ? nextCard : card))
			: [...cards, nextCard];

		setCards(nextCards);
		saveCards(nextCards);

		if (editingCardId) {
			syncStoredSessionCard(nextCard);
		}

		resetForm();
	}

	function handleEdit(card: GameCard) {
		setEditingCardId(card.id);
		setName(card.name);
		setEffect(card.effect);
		setRarity(card.rarity);
		setIconId(card.iconId as GameIconId);
	}

	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
			<section className="space-y-3">
				<p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
					Cards
				</p>
				<div className="space-y-2">
					<h1 className="text-4xl font-black tracking-tight text-foreground">
						Build your card library.
					</h1>
					<p className="max-w-3xl text-base text-muted-foreground">
						Create custom cards with rarity, icon, and effect text. Every card
						is saved in your browser and ready to use in the game page.
					</p>
				</div>
			</section>

			<div className="grid gap-8 xl:grid-cols-[24rem_minmax(0,1fr)]">
				<section className="rounded-3xl border bg-card p-6 shadow-sm">
					<h2 className="text-xl font-bold text-foreground">
						{editingCardId ? "Edit card" : "Create card"}
					</h2>
					<p className="mt-2 text-sm text-muted-foreground">
						Title on top, rarity under it, icon in the middle, and effect at the
						bottom.
					</p>

					{editingCardId ? (
						<div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
							You are editing an existing card. Save to update it, or cancel to
							go back to create mode.
						</div>
					) : null}

					<form onSubmit={handleCreate} className="mt-6 space-y-5">
						<div className="space-y-2">
							<label
								htmlFor="card-name"
								className="text-sm font-medium text-foreground"
							>
								Name
							</label>
							<input
								id="card-name"
								required
								value={name}
								onChange={(event) => setName(event.target.value)}
								className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
								placeholder="Shield Bash"
							/>
						</div>

						<div className="space-y-2">
							<label
								htmlFor="card-effect"
								className="text-sm font-medium text-foreground"
							>
								Effect
							</label>
							<textarea
								id="card-effect"
								required
								value={effect}
								onChange={(event) => setEffect(event.target.value)}
								className="min-h-24 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
								placeholder="Block the next two attacks."
							/>
						</div>

						<div className="space-y-2">
							<label
								htmlFor="card-rarity"
								className="text-sm font-medium text-foreground"
							>
								Rarity
							</label>
							<select
								id="card-rarity"
								value={rarity}
								onChange={(event) => setRarity(event.target.value as Rarity)}
								className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
							>
								<option value="common">Common</option>
								<option value="rare">Rare</option>
								<option value="epic">Epic</option>
								<option value="legendary">Legendary</option>
							</select>
						</div>

						<fieldset className="space-y-3">
							<legend className="text-sm font-medium text-foreground">
								Icon
							</legend>
							<div className="grid max-h-56 grid-cols-5 gap-2 overflow-y-auto rounded-2xl border bg-muted/30 p-2">
								{GAME_ICONS.map((id) => {
									const IconComponent = getIcon(id);
									const isSelected = id === iconId;

									return (
										<button
											key={id}
											type="button"
											aria-label={id}
											aria-pressed={isSelected}
											title={id}
											onClick={() => setIconId(id)}
											className={`flex aspect-square items-center justify-center rounded-xl border transition ${
												isSelected
													? "border-primary bg-primary/10 text-primary"
													: "border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5"
											}`}
										>
											<IconComponent size={22} />
										</button>
									);
								})}
							</div>
						</fieldset>

						<div className="rounded-2xl border bg-muted/20 p-4">
							<p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
								Live preview
							</p>
							<div className="mt-4 flex justify-center">
								<Card
									className={`h-[290px] w-[210px] border-2 shadow-lg ${rarityClasses[rarity]}`}
								>
									<CardHeader className="pb-2 text-center">
										<CardTitle className="text-lg">
											{name || "Card name"}
										</CardTitle>
										<div className="flex justify-center">
											<Badge
												variant="outline"
												className="capitalize bg-background/70"
											>
												{rarity}
											</Badge>
										</div>
									</CardHeader>
									<CardContent className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
										<PreviewIcon size={56} />
										<p className="text-sm leading-relaxed opacity-90">
											{effect || "Card effect will appear here."}
										</p>
									</CardContent>
								</Card>
							</div>
						</div>

						<button
							type="submit"
							className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
						>
							{editingCardId ? "Update card" : "Save card"}
						</button>

						{editingCardId ? (
							<button
								type="button"
								onClick={resetForm}
								className="w-full rounded-xl border px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
							>
								Cancel edit
							</button>
						) : null}
					</form>
				</section>

				<section className="space-y-4">
					<div className="flex items-center justify-between gap-3">
						<div>
							<h2 className="text-2xl font-bold text-foreground">
								Saved cards
							</h2>
							<p className="text-sm text-muted-foreground">
								{cards.length} card{cards.length === 1 ? "" : "s"} ready for
								decks.
							</p>
						</div>
					</div>

					{cards.length === 0 ? (
						<div className="rounded-3xl border border-dashed bg-muted/20 p-12 text-center text-muted-foreground">
							No cards created yet. Start with your first shield, bomb, or
							sword.
						</div>
					) : (
						<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{cards.map((card) => {
								const IconComponent = getIcon(card.iconId);

								return (
									<Card
										key={card.id}
										className={`h-[320px] border-2 shadow-md ${rarityClasses[card.rarity]} ${editingCardId === card.id ? "ring-2 ring-primary ring-offset-2" : ""}`}
									>
										<CardHeader className="pb-2 text-center">
											<CardTitle className="truncate text-lg" title={card.name}>
												{card.name}
											</CardTitle>
											<div className="flex justify-center">
												<Badge
													variant="outline"
													className="capitalize bg-background/70"
												>
													{card.rarity}
												</Badge>
											</div>
										</CardHeader>
										<CardContent className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
											<IconComponent size={48} />
											<p className="line-clamp-4 text-sm leading-relaxed opacity-90">
												{card.effect}
											</p>
										</CardContent>
										<CardFooter className="mt-auto pt-0">
											<button
												type="button"
												onClick={() => handleEdit(card)}
												className="w-full rounded-xl border bg-background/70 px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-background"
											>
												{editingCardId === card.id ? "Editing" : "Edit card"}
											</button>
										</CardFooter>
									</Card>
								);
							})}
						</div>
					)}
				</section>
			</div>
		</main>
	);
}
