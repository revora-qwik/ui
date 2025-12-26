import { createFileRoute } from "@tanstack/react-router";
import CompanyToken from "./components/CompanyToken";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import HowItWorks from "./components/HowItWorks";
import UpcomingProjects from "./components/UpcomingProjects";

export const Route = createFileRoute("/chicken/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div>
			<Hero />
			<HowItWorks />
			<UpcomingProjects />
			<CompanyToken />
			<Footer />
		</div>
	);
}
