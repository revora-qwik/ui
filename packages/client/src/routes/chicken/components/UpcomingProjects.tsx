import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

export default function () {
	const [currentIndex, setCurrentIndex] = useState(0);
	const itemsPerView = 4;
	const maxIndex = Math.max(0, upcomingProjects.length - itemsPerView);
	const scrollAccumulator = useRef(0);

	const handlePrev = () => {
		setCurrentIndex((prev) => Math.max(0, prev - 1));
	};

	const handleNext = () => {
		setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
	};

	const handleWheel = (e: React.WheelEvent) => {
		// Use horizontal scroll if available, otherwise use vertical
		const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;

		scrollAccumulator.current += delta;

		// Threshold to trigger a slide change (adjust for sensitivity)
		const threshold = 50;

		if (scrollAccumulator.current > threshold) {
			setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
			scrollAccumulator.current = 0;
		} else if (scrollAccumulator.current < -threshold) {
			setCurrentIndex((prev) => Math.max(0, prev - 1));
			scrollAccumulator.current = 0;
		}
	};

	return (
		<section className="bg-background-secondary gap-y-6 sm:gap-y-8 md:gap-y-12 flex flex-col items-center py-8 sm:py-12 md:py-20 px-4 sm:px-6">
			<h1 className="font-luckiest-guy text-2xl sm:text-4xl md:text-5xl lg:text-7xl drop-outline-md text-primary text-center">
				UPCOMING PROJECTS: FUTURE FARMS
			</h1>

			<div className="relative w-full px-8 sm:px-16 md:px-24 lg:px-36">
				<button
					type="button"
					onClick={handlePrev}
					disabled={currentIndex === 0}
					className="absolute -left-2 sm:left-0 md:left-2 top-1/2 -translate-y-1/2 z-10 p-1 sm:p-2 rounded-full bg-card border-2 sm:border-4 border-front disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 transition-transform"
				>
					<ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-front" />
				</button>

				<div className="overflow-hidden" onWheel={handleWheel}>
					<div
						className="flex gap-x-6 transition-transform duration-300 ease-in-out"
						style={{
							transform: `translateX(-${currentIndex * (100 / itemsPerView + 2)}%)`,
						}}
					>
						{upcomingProjects.map((project, i) => (
							<div
								key={`${i} ${project.title}`}
								className={twMerge(
									"relative overflow-hidden rounded-xl sm:rounded-2xl shrink-0 flex flex-col items-center gap-y-2 sm:gap-y-3 md:gap-y-5 w-[calc(100%-12px)] sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)] lg:w-[calc(25%-18px)] p-2 sm:p-3 md:p-4 bg-card border-2 sm:border-4 border-front group",
									!project.active && "grayscale",
								)}
							>
								<div className="overflow-hidden relative rounded-inherit border-2 sm:border-4 border-front">
									<img
										src={project.image}
										alt={project.title}
										className="w-full transition-transform duration-300 group-hover:scale-110"
									/>
									{project.video && (
										<video
											src={project.video}
											autoPlay
											loop
											muted
											className="absolute w-full h-full top-0 left-0 transition-transform duration-300 group-hover:scale-110"
										/>
									)}
								</div>

								<h3 className="text-back text-xl sm:text-2xl md:text-3xl lg:text-4xl drop-outline text-center">
									{project.title}
								</h3>

								{project.active && (
									<figure className="absolute bg-red-500 -right-20 sm:-right-24 md:-right-28 top-4 sm:top-5 md:top-6 rotate-45 py-1 sm:py-2 px-20 sm:px-28 md:px-32 text-back text-base sm:text-xl md:text-2xl drop-outline font-black shadow-md border-2 sm:border-3 border-front">
										LIVE
									</figure>
								)}

								{!project.active && (
									<figure className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-back drop-outline-md text-[100px] sm:text-[140px] md:text-[180px] lg:text-[200px] font-black">
										?
									</figure>
								)}
							</div>
						))}
					</div>
				</div>

				<button
					type="button"
					onClick={handleNext}
					disabled={currentIndex >= maxIndex}
					className="absolute -right-2 sm:right-0 md:right-2 top-1/2 -translate-y-1/2 z-10 p-1 sm:p-2 rounded-full bg-card border-2 sm:border-4 border-front disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 transition-transform"
				>
					<ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-front" />
				</button>
			</div>
		</section>
	);
}

const upcomingProjects = [
	{
		title: "Chicken Farm",
		active: true,
		image: "/images/card-farm-chicken.png",
		video: "/videos/chickens-feeding.mp4",
	},
	{
		title: "Coming Soon",
		active: false,
		image: "/images/card-farm-milk.png",
	},
	{
		title: "Coming Soon",
		active: false,
		image: "/images/card-farm-tractor.png",
	},

	...Array.from({ length: 12 }, () => ({
		title: "Project Locked",
		active: false,
		image: "/images/card-farm-land.png",
	})),
];
