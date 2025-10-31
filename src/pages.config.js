import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Organizations from './pages/Organizations';
import Teams from './pages/Teams';
import Players from './pages/Players';
import Games from './pages/Games';
import Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Dashboard": Dashboard,
    "Organizations": Organizations,
    "Teams": Teams,
    "Players": Players,
    "Games": Games,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: Layout,
};