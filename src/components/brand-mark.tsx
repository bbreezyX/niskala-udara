import Image from 'next/image';

export function BrandMark({ className }: { className?: string }) {
	return (
		<Image
			src="/images/brand/niskala-udara-atmosfer.png"
			alt=""
			aria-hidden="true"
			width={72}
			height={72}
			sizes="36px"
			loading="eager"
			className={className}
		/>
	);
}
