/** Mirrors `CampaignRequests.MAX_IMPORT_ROWS` on the backend — a bit over a year of daily rows. */
export const MAX_IMPORT_ROWS = 400;

/** An export of 400 days is a few hundred KB; anything near this is not a stats export. */
export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
