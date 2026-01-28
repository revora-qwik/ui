import { useState } from "react";

const TOTAL_FARM_COST = 10000;
const PROFIT_SHARE_PERCENT = 50;

export default function InvestmentCalculator() {
  const [investment, setInvestment] = useState(500);

  const ownershipPercent = Math.min((investment / TOTAL_FARM_COST) * 100, 100);

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
		  <p className="text-base sm:text-lg md:text-xl font-semibold text-front text-wrap">
            ${investment.toLocaleString()}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center mb-4">
          <div className="bg-background-secondary rounded-xl p-4 border-2 border-front flex flex-col gap-y-2">
            <p className="text-back uppercase font-semibold text-sm sm:text-base md:text-md lg:text-lg drop-outline tracking-wider">
              Total Farm Cost
            </p>

			<p className="uppercase font-luckiest-guy text-primary text-base sm:text-3xl md:text-4xl lg:text-5xl leading-none tracking-wide drop-outline">
              ${TOTAL_FARM_COST.toLocaleString()}
            </p>
          </div>

          <div className="bg-background-secondary rounded-xl p-4 border-2 border-front flex flex-col gap-y-2" >
            <p className="text-back uppercase font-semibold text-sm sm:text-base md:text-md lg:text-lg drop-outline tracking-wider">
              Profit Pool
            </p>
			<p className="uppercase font-luckiest-guy text-primary text-base sm:text-3xl md:text-4xl lg:text-5xl leading-none tracking-wide drop-outline">
              {PROFIT_SHARE_PERCENT}%
            </p>
          </div>
        </div>

        <div className=" rounded-2xl p-4 border-4 border-front text-center flex gap-y-8 flex-col">
          <div className="flex flex-col gap-y-2">
            <p className="text-back uppercase font-semibold text-sm sm:text-base md:text-md lg:text-lg drop-outline tracking-wider">
              Your Ownership
            </p>
			<p className="uppercase font-luckiest-guy text-primary text-base sm:text-3xl md:text-4xl lg:text-5xl leading-none tracking-wide drop-outline">
              {ownershipPercent.toFixed(2)}%
            </p>
          </div>

          <div className="flex flex-col gap-y-2">
            <p className="text-back uppercase font-semibold text-sm sm:text-base md:text-md lg:text-lg drop-outline tracking-wider">
              Tokens Received
            </p>

			<p className="uppercase font-luckiest-guy text-primary text-base sm:text-3xl md:text-4xl lg:text-5xl leading-none tracking-wide drop-outline">
              {tokenAllocation.toFixed(2)} FARM
            </p>
          </div>
        </div>

		<p className="text-base sm:text-lg md:text-xl font-semibold text-front mt-4 text-center">
          You own <strong>{ownershipPercent.toFixed(2)}%</strong> of the farm.
          When the farm generates profit,{" "}
          <strong>{PROFIT_SHARE_PERCENT}%</strong> of it is distributed among
          investors based on ownership.
        </p>
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] pointer-events-none">
        <figure className="bg-background-secondary h-32 sm:h-44 md:h-56 rounded-t-[50%]" />
      </div>
    </section>
  );
}
