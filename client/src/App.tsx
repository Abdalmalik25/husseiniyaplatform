import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Admin from "@/pages/Admin";
import Team from "@/pages/Team";
import Credits from "@/pages/Credits";
import Account from "@/pages/Account";
import Auth from "@/pages/Auth";
import Clients from "@/pages/Clients";
import Commerce from "@/pages/Commerce";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/admin" component={Admin} />
    <Route path="/team" component={Team} />
    <Route path="/credits" component={Credits} />
    <Route path="/account" component={Account} />
    <Route path="/auth" component={Auth} />
    <Route path="/clients" component={Clients} />
    <Route path="/commerce" component={Commerce} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster richColors position="top-center" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}