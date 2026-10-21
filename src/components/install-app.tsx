'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Download, EllipsisVertical, Share2, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BrandMark } from './brand-mark';
import { useDictionary } from './locale-provider';

interface InstallPromptEvent extends Event {
	prompt(): Promise<unknown>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const APP_DISPLAY = '(display-mode: standalone), (display-mode: minimal-ui), (display-mode: fullscreen)';

function subscribeDisplayMode(onChange: () => void) {
	const display = window.matchMedia(APP_DISPLAY);
	display.addEventListener('change', onChange);
	return () => display.removeEventListener('change', onChange);
}

function isStandalone() {
	return window.matchMedia(APP_DISPLAY).matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

// Keep the shortcut hidden until the browser can tell whether this is already an app window.
const serverStandalone = () => true;

export function InstallApp() {
	const copy = useDictionary().install;
	const standalone = useSyncExternalStore(subscribeDisplayMode, isStandalone, serverStandalone);
	const [installed, setInstalled] = useState(false);
	const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
	const [open, setOpen] = useState(false);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		function offerInstall(event: Event) {
			// The floating control is for touch devices; desktop keeps the browser's own install offer.
			if (!window.matchMedia('(any-pointer: coarse)').matches) return;
			event.preventDefault();
			setPrompt(event as InstallPromptEvent);
		}
		function finishInstall() {
			setInstalled(true);
			setPrompt(null);
			setOpen(false);
		}
		window.addEventListener('beforeinstallprompt', offerInstall);
		window.addEventListener('appinstalled', finishInstall);
		return () => {
			window.removeEventListener('beforeinstallprompt', offerInstall);
			window.removeEventListener('appinstalled', finishInstall);
		};
	}, []);

	async function install() {
		if (!prompt || busy) return;
		// The browser event can be used once, and prompt() must run directly from a user gesture.
		const offer = prompt;
		setPrompt(null);
		setBusy(true);
		try {
			await offer.prompt();
			const choice = await offer.userChoice;
			if (choice.outcome === 'accepted') {
				setOpen(false);
				setInstalled(true);
			}
		} catch {
			// The manual browser steps remain available if the native offer has expired.
			setOpen(true);
		} finally {
			setBusy(false);
		}
	}

	if (standalone || installed) return null;

	const guides = [
		{ title: copy.androidTitle, Icon: EllipsisVertical, steps: [copy.androidStep1, copy.androidStep2, copy.androidStep3] },
		{ title: copy.iphoneTitle, Icon: Share2, steps: [copy.iphoneStep1, copy.iphoneStep2, copy.iphoneStep3] }
	];

	return (
		<>
			{/* Allows the footer to scroll clear of the floating shortcut on touch devices. */}
			<div aria-hidden="true" className="hidden h-[calc(6rem+env(safe-area-inset-bottom,0px))] shrink-0 [@media(any-pointer:coarse)]:block" />
			<Dialog open={open} onOpenChange={setOpen}>
				<div className="fixed right-[max(1rem,env(safe-area-inset-right,0px))] bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-40 hidden flex-col items-center gap-1.5 [@media(any-pointer:coarse)]:flex">
					<DialogTrigger asChild>
						<Button
							size="icon-lg"
							className="size-14 touch-manipulation rounded-full shadow-lg shadow-foreground/15"
							aria-label={busy ? copy.installing : copy.action}
							aria-busy={busy}
							title={copy.action}
							disabled={busy}
							onClick={(event) => {
								if (!prompt) return;
								event.preventDefault();
								void install();
							}}
						>
							<Smartphone aria-hidden="true" />
						</Button>
					</DialogTrigger>
					<span aria-hidden="true" className="rounded-full bg-background/95 px-2 py-0.5 text-xs font-semibold text-foreground">
						{copy.shortcut}
					</span>
				</div>
				<DialogContent showCloseButton={false} className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl sm:max-w-md">
					<DialogHeader className="pr-8">
						<BrandMark className="size-12 object-contain" />
						<DialogTitle>{copy.title}</DialogTitle>
						<DialogDescription>{copy.description}</DialogDescription>
					</DialogHeader>
					<DialogClose asChild>
						<Button variant="ghost" size="icon" className="absolute top-2 right-2" aria-label={copy.close}>
							<X aria-hidden="true" />
						</Button>
					</DialogClose>
					{prompt && (
						<Button size="lg" className="h-11 w-full" disabled={busy} aria-busy={busy} onClick={() => void install()}>
							<Download data-icon="inline-start" aria-hidden="true" />
							{busy ? copy.installing : copy.action}
						</Button>
					)}
					<div className="grid gap-5">
						{guides.map(({ title, Icon, steps }) => (
							<section key={title} className="grid gap-2">
								<h3 className="flex items-center gap-2 font-semibold">
									<Icon className="size-4 text-muted-foreground" aria-hidden="true" />
									{title}
								</h3>
								<ol className="grid list-decimal gap-2 pl-5 text-base leading-relaxed text-muted-foreground">
									{steps.map((step) => <li key={step}>{step}</li>)}
								</ol>
							</section>
						))}
					</div>
					<p className="meta-copy text-muted-foreground">{copy.browserHint}</p>
				</DialogContent>
			</Dialog>
		</>
	);
}
