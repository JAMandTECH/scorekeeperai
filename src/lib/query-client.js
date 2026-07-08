import { QueryClient } from '@tanstack/react-query';

// Retry transient rate-limit / 5xx blips with exponential backoff so a burst
// of parallel queries (e.g. Live Scoring loading teams, players, org at once)
// recovers instead of failing fast and leaving the page stuck.
const isTransient = (error) => {
	const msg = error?.message || '';
	const status = error?.response?.status || error?.status;
	return /rate limit/i.test(msg) || /network/i.test(msg) || (status >= 500 && status < 600) || status === 429;
};

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: (failureCount, error) => isTransient(error) && failureCount < 6,
			retryDelay: (attempt) => Math.min(600 * 2 ** attempt, 8000),
		},
	},
});