export default function () {
	return (
		<section className="h-screen relative overflow-hidden">
			<img
				className="absolute object-bottom object-cover w-full h-full"
				src="/images/chicken-bg-hero.png"
				alt="chicken background for hero banner"
			/>

			<img
				className="absolute top-1/4 -translate-y-1/2 left-1/2 -translate-x-1/2 w-3/4 sm:w-1/2 md:w-1/3 lg:w-1/4 animate-jump-in animate-ease-in animate-duration-700"
				src="/images/farmfi-hold.png"
				alt="farm fi banner held by chicken"
			/>
		</section>
	);
}
