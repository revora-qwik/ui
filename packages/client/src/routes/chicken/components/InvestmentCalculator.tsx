import { useState } from "react";

const TOTAL_FARM_COST = 10000; 
const PROFIT_SHARE_PERCENT = 50; 

export default function InvestmentCalculator() {
	const [investment, setInvestment] = useState(500);

	const ownershipPercent = Math.min(
		(investment / TOTAL_FARM_COST) * 100,
		100
	);

	const tokenAllocation = ownershipPercent; 
	
	return (
		<section className="relative bg-background-primary py-8 sm:py-10 flex flex-col items-center gap-6 px-4 overflow-hidden">
			<h2 className="font-luckiest-guy text-2xl sm:text-4xl md:text-5xl text-primary drop-outline-md text-center">
				INVESTMENT CALCULATOR
			</h2>

			<div className="bg-background-secondary/80 border-4 border-front rounded-3xl p-5 sm:p-7 max-w-xl w-full shadow-[0_10px_0_#2b4c55] z-20">


				<div className="flex flex-col gap-1 mb-4">
					<label className="font-luckiest-guy text-xl text-back drop-outline">
						Investment (USDT)
					</label>
					<input
						type="range"
						min={100}
						max={TOTAL_FARM_COST}
						step={100}
						value={investment}
						onChange={(e) => setInvestment(Number(e.target.value))}
						className="w-full"
					/>
					<p className="text-back font-bold text-lg">
						${investment.toLocaleString()}
					</p>
				</div>

				
				<div className="grid grid-cols-2 gap-4 text-center mb-4">
					<div className="bg-background-secondary rounded-xl p-4 border-2 border-front">
						<p className="text-sm font-semibold text-front">
							Total Farm Cost
						</p>
						<p className="text-xl font-black text-back">
							${TOTAL_FARM_COST.toLocaleString()}
						</p>
					</div>

					<div className="bg-background-secondary rounded-xl p-4 border-2 border-front">
						<p className="text-sm font-semibold text-front">
							Profit Pool
						</p>
						<p className="text-xl font-black text-back">
							{PROFIT_SHARE_PERCENT}%
						</p>
					</div>
				</div>

				<div className="bg-amber-200 rounded-2xl p-4 border-4 border-front text-center">
	<p className="font-luckiest-guy text-xl text-back drop-outline">
		Your Ownership
	</p>

	<p className="text-3xl font-black text-back">
		{ownershipPercent.toFixed(2)}%
	</p>

	<p className="mt-2 font-semibold text-front">
		Tokens Received
	</p>

	<p className="text-2xl font-black text-front">
		{tokenAllocation.toFixed(2)} FARM
	</p>
</div>


				
				<p className="mt-4 text-center text-sm sm:text-base text-front font-semibold">
					You own <strong>{ownershipPercent.toFixed(2)}%</strong> of the farm.
					When the farm generates profit, <strong>{PROFIT_SHARE_PERCENT}%</strong> of it
					is distributed among investors based on ownership.
				</p>
			</div>
            
<div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] pointer-events-none">
	<figure className="bg-background-secondary h-32 sm:h-44 md:h-56 rounded-t-[50%]" />
</div>

		</section>
	);
}
