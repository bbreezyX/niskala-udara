/** Re-mounts on every navigation (unlike the layout), so each page plays the enter animation. */
export default function Template({ children }: { children: React.ReactNode }) {
	return <div className="page-enter">{children}</div>;
}
