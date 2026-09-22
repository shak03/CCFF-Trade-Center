import { buildLeagueData } from '../lib/buildLeague.js';
import { sendError } from '../lib/http.js';

export default async function handler(req, res) {
  try {
    const data = await buildLeagueData();
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=300');
    res.status(200).json(data);
  } catch (err) {
    sendError(res, err);
  }
}
