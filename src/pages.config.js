/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminApprovals from './pages/AdminApprovals';
import AllGames from './pages/AllGames';
import AllTeams from './pages/AllTeams';
import AssociateOrganization from './pages/AssociateOrganization';
import Dashboard from './pages/Dashboard';
import DataBackup from './pages/DataBackup';
import Divisions from './pages/Divisions';
import Games from './pages/Games';
import Home from './pages/Home';
import JoinOrganization from './pages/JoinOrganization';
import LiveScoring from './pages/LiveScoring';
import LiveScoringVolleyball from './pages/LiveScoringVolleyball';
import ManualGameEntry from './pages/ManualGameEntry';
import OrganizationJoinRequests from './pages/OrganizationJoinRequests';
import OrganizationMembers from './pages/OrganizationMembers';
import OrganizationSelector from './pages/OrganizationSelector';
import OrganizationSettings from './pages/OrganizationSettings';
import Organizations from './pages/Organizations';
import PendingTeams from './pages/PendingTeams';
import Players from './pages/Players';
import Profile from './pages/Profile';
import PublicGameView from './pages/PublicGameView';
import PublicLanding from './pages/PublicLanding';
import RequestAdminAccess from './pages/RequestAdminAccess';
import RoleSelection from './pages/RoleSelection';
import RolesPermissions from './pages/RolesPermissions';
import Schedule from './pages/Schedule';
import ScorekeeperDashboard from './pages/ScorekeeperDashboard';
import Scorekeepers from './pages/Scorekeepers';
import SocialFeed from './pages/SocialFeed';
import Statistics from './pages/Statistics';
import SubscriptionCancelled from './pages/SubscriptionCancelled';
import SubscriptionCheckout from './pages/SubscriptionCheckout';
import SubscriptionManagement from './pages/SubscriptionManagement';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SuperAdminHome from './pages/SuperAdminHome';
import SuperAdminSetup from './pages/SuperAdminSetup';
import TeamRegistration from './pages/TeamRegistration';
import Teams from './pages/Teams';
import TournamentBracket from './pages/TournamentBracket';
import VerifyAdminCode from './pages/VerifyAdminCode';
import WeeklySummary from './pages/WeeklySummary';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminApprovals": AdminApprovals,
    "AllGames": AllGames,
    "AllTeams": AllTeams,
    "AssociateOrganization": AssociateOrganization,
    "Dashboard": Dashboard,
    "DataBackup": DataBackup,
    "Divisions": Divisions,
    "Games": Games,
    "Home": Home,
    "JoinOrganization": JoinOrganization,
    "LiveScoring": LiveScoring,
    "LiveScoringVolleyball": LiveScoringVolleyball,
    "ManualGameEntry": ManualGameEntry,
    "OrganizationJoinRequests": OrganizationJoinRequests,
    "OrganizationMembers": OrganizationMembers,
    "OrganizationSelector": OrganizationSelector,
    "OrganizationSettings": OrganizationSettings,
    "Organizations": Organizations,
    "PendingTeams": PendingTeams,
    "Players": Players,
    "Profile": Profile,
    "PublicGameView": PublicGameView,
    "PublicLanding": PublicLanding,
    "RequestAdminAccess": RequestAdminAccess,
    "RoleSelection": RoleSelection,
    "RolesPermissions": RolesPermissions,
    "Schedule": Schedule,
    "ScorekeeperDashboard": ScorekeeperDashboard,
    "Scorekeepers": Scorekeepers,
    "SocialFeed": SocialFeed,
    "Statistics": Statistics,
    "SubscriptionCancelled": SubscriptionCancelled,
    "SubscriptionCheckout": SubscriptionCheckout,
    "SubscriptionManagement": SubscriptionManagement,
    "SubscriptionSuccess": SubscriptionSuccess,
    "SuperAdminDashboard": SuperAdminDashboard,
    "SuperAdminHome": SuperAdminHome,
    "SuperAdminSetup": SuperAdminSetup,
    "TeamRegistration": TeamRegistration,
    "Teams": Teams,
    "TournamentBracket": TournamentBracket,
    "VerifyAdminCode": VerifyAdminCode,
    "WeeklySummary": WeeklySummary,
}

export const pagesConfig = {
    mainPage: "PublicLanding",
    Pages: PAGES,
    Layout: __Layout,
};