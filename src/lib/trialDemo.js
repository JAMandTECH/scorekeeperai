/**
 * Trial Demo Mode — sample data for the interactive simulation.
 * All demo IDs use a "demo-" prefix so they never collide with real records.
 * Demo games are never persisted; they exist only in the browser session.
 *
 * Whether an organization may score real games is decided in one place:
 * isSubscriptionEntitled() in src/lib/subscriptionAccess.js.
 */

export const DEMO_TEAMS = {
  basketball: {
    home: { id: 'demo-bb-home', name: 'Eastside Eagles', sport: 'basketball', division: 'Division A' },
    away: { id: 'demo-bb-away', name: 'Westside Wolves', sport: 'basketball', division: 'Division A' },
  },
  volleyball: {
    home: { id: 'demo-vb-home', name: 'Northside Spikers', sport: 'volleyball', division: 'Premier' },
    away: { id: 'demo-vb-away', name: 'Southside Aces', sport: 'volleyball', division: 'Premier' },
  },
};

const bbPlayer = (id, teamId, num, first, last, pos) => ({
  id, team_id: teamId, jersey_number: String(num), first_name: first, last_name: last, position: pos,
});

const vbPlayer = (id, teamId, num, first, last, pos) => ({
  id, team_id: teamId, jersey_number: String(num), first_name: first, last_name: last, position: pos,
});

export const DEMO_PLAYERS = {
  basketball: {
    home: [
      bbPlayer('demo-bb-h1', 'demo-bb-home', 10, 'James', 'Carter', 'PG'),
      bbPlayer('demo-bb-h2', 'demo-bb-home', 23, 'Michael', 'Thompson', 'SG'),
      bbPlayer('demo-bb-h3', 'demo-bb-home', 33, 'David', 'Lee', 'SF'),
      bbPlayer('demo-bb-h4', 'demo-bb-home', 44, 'Robert', 'Garcia', 'PF'),
      bbPlayer('demo-bb-h5', 'demo-bb-home', 55, 'Thomas', 'Anderson', 'C'),
    ],
    away: [
      bbPlayer('demo-bb-a1', 'demo-bb-away', 3, 'Chris', 'Bennett', 'PG'),
      bbPlayer('demo-bb-a2', 'demo-bb-away', 14, 'Daniel', 'Foster', 'SG'),
      bbPlayer('demo-bb-a3', 'demo-bb-away', 21, 'Andrew', 'Rivera', 'SF'),
      bbPlayer('demo-bb-a4', 'demo-bb-away', 32, 'Marcus', 'Coleman', 'PF'),
      bbPlayer('demo-bb-a5', 'demo-bb-away', 50, 'Steven', 'Patel', 'C'),
    ],
  },
  volleyball: {
    home: [
      vbPlayer('demo-vb-h1', 'demo-vb-home', 4, 'Sarah', 'Mitchell', 'Setter'),
      vbPlayer('demo-vb-h2', 'demo-vb-home', 7, 'Emily', 'Nguyen', 'Outside Hitter'),
      vbPlayer('demo-vb-h3', 'demo-vb-home', 9, 'Jessica', 'Brooks', 'Middle Blocker'),
      vbPlayer('demo-vb-h4', 'demo-vb-home', 11, 'Ashley', 'Reed', 'Opposite'),
      vbPlayer('demo-vb-h5', 'demo-vb-home', 13, 'Megan', 'Sullivan', 'Libero'),
      vbPlayer('demo-vb-h6', 'demo-vb-home', 15, 'Rachel', 'Kim', 'Outside Hitter'),
    ],
    away: [
      vbPlayer('demo-vb-a1', 'demo-vb-away', 2, 'Olivia', 'Hayes', 'Setter'),
      vbPlayer('demo-vb-a2', 'demo-vb-away', 5, 'Sophia', 'Bennett', 'Outside Hitter'),
      vbPlayer('demo-vb-a3', 'demo-vb-away', 8, 'Isabella', 'Cruz', 'Middle Blocker'),
      vbPlayer('demo-vb-a4', 'demo-vb-away', 10, 'Charlotte', 'Diaz', 'Opposite'),
      vbPlayer('demo-vb-a5', 'demo-vb-away', 12, 'Grace', 'Owens', 'Libero'),
      vbPlayer('demo-vb-a6', 'demo-vb-away', 14, 'Amelia', 'Price', 'Outside Hitter'),
    ],
  },
};

const now = new Date();
const isoOffset = (h) => new Date(now.getTime() + h * 3600 * 1000).toISOString();

export const DEMO_GAMES = [
  {
    id: 'demo-bb-game',
    organization_id: 'demo',
    sport: 'basketball',
    status: 'scheduled',
    home_team_id: 'demo-bb-home',
    away_team_id: 'demo-bb-away',
    game_date: isoOffset(2),
    game_type: 'regular_season',
    court_number: '1',
    location: 'Main Gym',
    is_demo: true,
    penalty_limit_per_quarter: 5,
    player_foul_limit: 5,
    timeouts_q1: 1, timeouts_q2: 1, timeouts_q3: 1, timeouts_q4: 1, timeouts_ot: 1,
  },
  {
    id: 'demo-vb-game',
    organization_id: 'demo',
    sport: 'volleyball',
    status: 'scheduled',
    home_team_id: 'demo-vb-home',
    away_team_id: 'demo-vb-away',
    game_date: isoOffset(4),
    game_type: 'regular_season',
    court_number: '2',
    location: 'Main Gym',
    is_demo: true,
  },
];