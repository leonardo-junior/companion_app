export default function Footer() {
	return (
		<footer className="mt-16 border-t px-4 py-8 text-muted-foreground">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p className="font-semibold text-foreground">Game Companion</p>
					<p>Local-first card creator, deck builder, and random draw helper.</p>
				</div>
				<p className="font-semibold uppercase tracking-[0.25em]">
					Saved in your browser
				</p>
			</div>
		</footer>
	);
}
