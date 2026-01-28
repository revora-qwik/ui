import { useState } from "react";

export default function () {
	const [pressedSocials, setPressedSocials] = useState<Record<string, boolean>>(
		{},
	);

	const handleSocialPress = (name: string) => {
		setPressedSocials((prev) => ({ ...prev, [name]: true }));
	};

	const handleSocialRelease = (name: string) => {
		setPressedSocials((prev) => ({ ...prev, [name]: false }));
	};

	return (
		<section className="bg-background-secondary py-4 sm:py-6 flex flex-col sm:flex-row px-4 sm:px-12 md:px-20 lg:px-32 items-center gap-4 sm:gap-0">
			<div className="flex items-center gap-x-6 sm:gap-x-8 md:gap-x-12">
				{socialLinks.map((social) => (
					<button
						key={social.name}
						type="button"
						onMouseDown={() => handleSocialPress(social.name)}
						onMouseUp={() => handleSocialRelease(social.name)}
						onMouseLeave={() => handleSocialRelease(social.name)}
						onClick={() => window.open(social.href, "_blank")}
						className="hover:scale-105 cursor-pointer"
					>
						<img
							className="size-10 sm:size-12 md:size-14"
							src={
								pressedSocials[social.name] ? social.pressedIcon : social.icon
							}
							alt={social.name}
						/>
					</button>
				))}
			</div>

			<figure className="hidden sm:block flex-1" />

			<div className="flex flex-wrap justify-center items-center gap-x-4 sm:gap-x-6 md:gap-x-8 lg:gap-x-12 gap-y-2 font-bold uppercase text-lg sm:text-xl md:text-2xl lg:text-3xl pt-2 sm:pt-3">
				{navLinks.map((link) => (
					<a key={link.label} href={link.to} className="hover:opacity-80">
						{link.emoji}
						{link.label}
					</a>
				))}
			</div>
		</section>
	);
}

const socialLinks = [
	{
		name: "x",
		icon: "/images/icon-unpressed-x.png",
		pressedIcon: "/images/icon-pressed-x.png",
		href: "https://x.com/revoralabs",
	},
	{
		name: "telegram",
		icon: "/images/icon-unpressed-telegram.png",
		pressedIcon: "/images/icon-pressed-telegram.png",
		href: "https://telegram.org",
	},
	{
		name: "facebook",
		icon: "/images/icon-unpressed-facebook.png",
		pressedIcon: "/images/icon-pressed-facebook.png",
		href: "https://facebook.com",
	},
];

const navLinks = [
	{ emoji: "📜", label: "Whitepaper", to: "/whitepaper" },
	{ emoji: "👪", label: "Community", to: "/community" },
	{ emoji: "🏢", label: "About Us", to: "/about" },
];
