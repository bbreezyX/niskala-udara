/** Decorative city silhouette for the hero, with Monas as the landmark. Two layers for depth. */
export function Skyline({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 960 220" preserveAspectRatio="xMaxYMax meet" className={className} aria-hidden="true">
			<path
				fill="currentColor"
				opacity="0.45"
				d="M0 220V150h40v-30h36v30h28v-58h44v58h22v-40h30v-24h26v64h18V96h40v124M320 220v-92h34v-26h30v26h20v-60h36v152M470 220v-70h26v-34h44v104M600 220V118h30v-22h38v124M700 220v-80h46v-42h32v122M800 220v-96h40v-28h40v124M900 220v-60h60v60z"
			/>
			<path
				fill="currentColor"
				d="M0 220v-36h28v-22h30v58h20v-74h48v74h24v-48h36v-18h28v66h22v-92h20V88h8V60h4v28h8v40h20v92h18v-60l26-22 26 22v60h22v-80h52v80h18v-116h6l2-34 5-16 5 16 2 34h6v116h22v-70h42v70h18v-104h34v-20h24v124h26v-64h48v64h22v-90h18l24-18 24 18h18v90h20v-52h56v52h22v-80h38v80h24v-46h40v46z"
			/>
		</svg>
	);
}
