import Home from './pages/Home';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Organizations from './pages/Organizations';
import Dashboard from './pages/Dashboard';
import Games from './pages/Games';
import LiveScoring from './pages/LiveScoring';
import Teams from './pages/Teams';
import Players from './pages/Players';
import Schedule from './pages/Schedule';
import AllGames from './pages/AllGames';
import Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "SuperAdminDashboard": SuperAdminDashboard,
    "Organizations": Organizations,
    "Dashboard": Dashboard,
    "Games": Games,
    "LiveScoring": LiveScoring,
    "Teams": Teams,
    "Players": Players,
    "Schedule": Schedule,
    "AllGames": AllGames,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: Layout,
};