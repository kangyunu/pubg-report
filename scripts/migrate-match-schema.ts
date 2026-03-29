import { LOG_ROOT_PATH } from "./const";

type StoredMatch = Match | LegacyMatch;

const BACKUP_DIR = `${LOG_ROOT_PATH}/.backup-legacy-schema`;

const isNewParticipant = (
  participant: Participant | LegacyParticipant,
): participant is Participant => "stats" in participant;

const normalizeParticipant = (
  participant: Participant | LegacyParticipant,
): Participant => {
  if (isNewParticipant(participant)) {
    return participant;
  }

  return {
    id: String(participant.id),
    teamId: participant.teamId,
    rank: participant.teamRank,
    teamTotal: participant.teamTotal,
    shardId: participant.shard,
    stats: {
      DBNOs: participant.dbnos,
      assists: participant.assists,
      boosts: participant.boosts,
      damageDealt: participant.damageDealt,
      deathType: participant.deathType,
      headshotKills: participant.headshotKills,
      heals: participant.heals,
      killPlace: participant.killPlace,
      killStreaks: participant.killStreaks,
      kills: participant.kills,
      longestKill: participant.longestKill,
      name: participant.name,
      playerId: participant.playerId,
      revives: participant.revives,
      rideDistance: participant.rideDistance,
      roadKills: participant.roadKills,
      swimDistance: participant.swimDistance,
      teamKills: participant.teamKills,
      timeSurvived: participant.timeSurvived,
      vehicleDestroys: participant.vehicleDestroys,
      walkDistance: participant.walkDistance,
      weaponsAcquired: participant.weaponsAcquired,
      winPlace: participant.winPlace,
    },
  };
};

const normalizeMatch = (match: StoredMatch): Match => ({
  id: match.id,
  createdAt: match.createdAt,
  duration: match.duration,
  matchType: match.matchType,
  gameMode: match.gameMode,
  mapName: match.mapName,
  isCustomMatch: match.isCustomMatch,
  shard: match.shard,
  participants: match.participants.map(normalizeParticipant),
});

const main = async () => {
  const filesRef = Bun.file(`${LOG_ROOT_PATH}/files.json`);
  if (!(await filesRef.exists())) {
    throw new Error(`files.json not found: ${LOG_ROOT_PATH}/files.json`);
  }

  const files = (await filesRef.json()) as string[];
  if (!Array.isArray(files) || files.length === 0) {
    console.log("No files to migrate.");
    return;
  }

  let scannedFiles = 0;
  let migratedFiles = 0;
  let scannedMatches = 0;
  let migratedMatches = 0;

  for (const fileRef of files) {
    const filename = fileRef.split("/").pop();
    if (!filename) continue;

    const path = `${LOG_ROOT_PATH}/${filename}`;
    const file = Bun.file(path);
    if (!(await file.exists())) continue;

    const original = (await file.json()) as StoredMatch[];
    if (!Array.isArray(original)) continue;
    scannedFiles += 1;
    scannedMatches += original.length;

    const normalized = original.map(normalizeMatch);

    const originalSerialized = JSON.stringify(original);
    const normalizedSerialized = JSON.stringify(normalized);

    if (originalSerialized === normalizedSerialized) {
      continue;
    }

    const backupPath = `${BACKUP_DIR}/${filename}`;
    await Bun.write(backupPath, JSON.stringify(original, null, 2), {
      createPath: true,
    });
    await Bun.write(path, JSON.stringify(normalized, null, 2), {
      createPath: true,
    });

    migratedFiles += 1;
    migratedMatches += normalized.length;
    console.log(`Migrated ${filename} (${normalized.length} matches)`);
  }

  console.log("\nMigration summary");
  console.log(`- Scanned files: ${scannedFiles}`);
  console.log(`- Migrated files: ${migratedFiles}`);
  console.log(`- Scanned matches: ${scannedMatches}`);
  console.log(`- Migrated matches: ${migratedMatches}`);
  if (migratedFiles > 0) {
    console.log(`- Backup dir: ${BACKUP_DIR}`);
  }
};

await main();
