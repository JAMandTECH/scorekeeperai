import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Organizations from './pages/Organizations';
import Teams from './pages/Teams';
import Players from './pages/Players';
import Games from './pages/Games';
import LiveScoring from './pages/LiveScoring';
import Statistics from './pages/Statistics';
import AllTeams from './pages/AllTeams';
import AllGames from './pages/AllGames';
import SuperAdminSetup from './pages/SuperAdminSetup';
import RequestAdminAccess from './pages/RequestAdminAccess';
import AdminApprovals from './pages/AdminApprovals';
import VerifyAdminCode from './pages/VerifyAdminCode';
import LiveScoringVolleyball from './pages/LiveScoringVolleyball';
import Divisions from './pages/Divisions';
import Scorekeepers from './pages/Scorekeepers';
import PublicLanding from './pages/PublicLanding';
import RoleSelection from './pages/RoleSelection';
import AssociateOrganization from './pages/AssociateOrganization';
import OrganizationSelector from './pages/OrganizationSelector';
import OrganizationSettings from './pages/OrganizationSettings';
import DataBackup from './pages/DataBackup';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SuperAdminHome from './pages/SuperAdminHome';
import ScorekeeperDashboard from './pages/ScorekeeperDashboard';
import TournamentBracket from './pages/TournamentBracket';
import SocialFeed from './pages/SocialFeed';


export const PAGES = {
    "Home": Home,
    "Dashboard": Dashboard,
    "Organizations": Organizations,
    "Teams": Teams,
    "Players": Players,
    "Games": Games,
    "LiveScoring": LiveScoring,
    "Statistics": Statistics,
    "AllTeams": AllTeams,
    "AllGames": AllGames,
    "SuperAdminSetup": SuperAdminSetup,
    "RequestAdminAccess": RequestAdminAccess,
    "AdminApprovals": AdminApprovals,
    "VerifyAdminCode": VerifyAdminCode,
    "LiveScoringVolleyball": LiveScoringVolleyball,
    "Divisions": Divisions,
    "Scorekeepers": Scorekeepers,
    "PublicLanding": PublicLanding,
    "RoleSelection": RoleSelection,
    "AssociateOrganization": AssociateOrganization,
    "OrganizationSelector": OrganizationSelector,
    "OrganizationSettings": OrganizationSettings,
    "DataBackup": DataBackup,
    "SuperAdminDashboard": SuperAdminDashboard,
    "SuperAdminHome": SuperAdminHome,
    "ScorekeeperDashboard": ScorekeeperDashboard,
    "TournamentBracket": TournamentBracket,
    "SocialFeed": SocialFeed,
}

export const pagesConfig = {
    mainPage: "PublicLanding",
    Pages: PAGES,
};