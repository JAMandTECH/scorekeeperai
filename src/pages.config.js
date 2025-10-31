import Home from './pages/Home';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Organizations from './pages/Organizations';
import Dashboard from './pages/Dashboard';
import Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "SuperAdminDashboard": SuperAdminDashboard,
    "Organizations": Organizations,
    "Dashboard": Dashboard,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: Layout,
};