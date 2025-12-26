export default function () {
	return (
		<section className="bg-accent pt-8 sm:pt-12 md:pt-16 pb-8 sm:pb-10 md:pb-12 border-t-2 sm:border-t-4 border-front flex flex-col items-center">
			<div className="flex flex-col md:flex-row items-center justify-evenly w-full px-4 sm:px-12 md:px-16 lg:px-24 gap-6 sm:gap-8 md:gap-x-12 relative">
				<div className="relative w-1/2 sm:w-2/5 md:w-1/3 lg:w-1/4">
					<figure className="absolute w-full h-full rounded-full bg-radial from-amber-200 to-transparent blur-3xl top-0 left-0 scale-125" />
					<img
						src="/images/token-company.png"
						alt="Future company token"
						className="relative z-1 animate-wiggle animate-infinite animate-ease-in-out animate-duration-6000"
					/>
				</div>

				<div className="flex flex-col gap-y-1 text-center md:text-left">
					<h2 className="font-luckiest-guy text-3xl sm:text-5xl md:text-6xl lg:text-8xl drop-outline-md text-primary">
						FUTURE COMPANY TOKEN
					</h2>
					<p className="text-back uppercase font-semibold text-sm sm:text-base md:text-lg lg:text-xl drop-outline leading-relaxed sm:leading-loose">
						A token for the entire ecosystem, tradable with speculative gains!
						STAY TUNED!
						<br />
						Don't put all your eggs in one basket! Invest in every business at
						once.
					</p>
				</div>
			</div>
		</section>
	);
}
