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

export const normalizeMatch = (match: Match | LegacyMatch): Match => ({
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
