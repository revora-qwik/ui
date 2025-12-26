export default function () {
	return (
		<section className="relative bg-background-primary flex flex-col w-full items-center px-4 sm:px-6 lg:px-8">
			<div className="absolute overflow-x-hidden -top-12 sm:-top-16 md:-top-24 w-full">
				<figure className="bg-background-primary h-40 sm:h-60 md:h-80 relative left-1/2 -translate-x-1/2 w-[120%] rounded-t-[50%]" />
			</div>

			<h1
				data-text="HOW IT WORKS"
				className="uppercase font-luckiest-guy text-primary drop-outline-md text-3xl sm:text-5xl md:text-6xl lg:text-7xl z-1 relative text-center"
			>
				HOW IT WORKS
			</h1>

			<div className="flex flex-col md:flex-row relative z-1 justify-evenly py-8 sm:py-12 md:py-20 gap-8 md:gap-4 w-full">
				{howItWorksHints.map((hint, i) => (
					<div
						key={hint.title}
						className="flex flex-col items-center group animate-jump-in animate-duration-700"
						style={{ animationDelay: `${i * 0.2}s` }}
					>
						<img
							className="size-32 sm:size-40 md:size-48 lg:size-56 group-hover:animate-jump"
							src={hint.icon}
							alt={`${hint.title} icon`}
						/>

						<h3 className="uppercase font-luckiest-guy text-primary text-3xl sm:text-4xl md:text-5xl lg:text-6xl drop-outline-md text-center">
							{hint.title}
						</h3>
						<p className="text-base sm:text-lg md:text-xl font-semibold text-front w-full max-w-[320px] sm:max-w-[380px] md:max-w-[420px] text-wrap text-center">
							{hint.description}
						</p>
					</div>
				))}
			</div>
		</section>
	);
}

const howItWorksHints = [
	{
		title: "1.Invest",
		description:
			"Invest in the farm's future with us and be prepared for the ride.",
		icon: "/images/icon-invest.png",
	},
	{
		title: "2.Receive Token",
		description: "Get FARM tokens as exchange for your investment in our farm.",
		icon: "/images/icon-token.png",
	},
	{
		title: "3.Earn RevShare",
		description: "Earn a share of the farm's revenue based on your investment.",
		icon: "/images/icon-revshare.png",
	},
];
