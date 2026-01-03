import { createFileRoute } from "@tanstack/react-router";
import CompanyToken from "./components/CompanyToken";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import HowItWorks from "./components/HowItWorks";
import UpcomingProjects from "./components/UpcomingProjects";
import InvestmentCalculator from "./components/InvestmentCalculator";

export const Route = createFileRoute("/chicken/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div>
			<Hero />
			<HowItWorks />
			<InvestmentCalculator />
			<UpcomingProjects />
			<CompanyToken />
			<Footer />
		</div>
	);
}
