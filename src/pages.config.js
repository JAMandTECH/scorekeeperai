import Home from './pages/Home';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "SuperAdminDashboard": SuperAdminDashboard,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: Layout,
};