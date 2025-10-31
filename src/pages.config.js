import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Organizations from './pages/Organizations';
import Teams from './pages/Teams';
import Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Dashboard": Dashboard,
    "Organizations": Organizations,
    "Teams": Teams,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: Layout,
};